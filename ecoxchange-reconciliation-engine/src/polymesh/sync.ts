/**
 * Spec 18 § 2.5 / § 2.7 — sync orchestration: fetch → normalize → upsert.
 *
 * Run shape mirrors `db/engine-runs.ts`: open a run row, accumulate counters and
 * per-asset errors, close it. One asset failing does not abort the run — it is
 * recorded against that asset and the sync moves on, the same way the
 * verification engine treats a project failure.
 */

import { requireClient } from "./db.js";
import { PolymeshClient, PolymeshQueryError } from "./client.js";
import { loadPolymeshConfig, type PolymeshConfig } from "./config.js";
import {
  ASSET_QUERY,
  DISTRIBUTIONS_QUERY,
  HOLDERS_QUERY,
  PAGE_SIZE,
} from "./queries.js";
import {
  normalizeAsset,
  normalizeDistribution,
  normalizeHolder,
  type ChainAsset,
  type ChainAssetHolder,
  type ChainDistribution,
  type PolymeshAsset,
  type PolymeshHolder,
  type PolymeshSyncRun,
  type SyncTriggerType,
} from "./models.js";
import { reconcileAsset } from "./reconcile.js";

interface Connection<T> {
  totalCount: number;
  nodes: T[];
}

export interface SyncOptions {
  triggerType?: SyncTriggerType;
  /** Restrict the run to one asset. Used by the manual trigger. */
  assetId?: string;
  config?: PolymeshConfig;
  client?: PolymeshClient;
}

export interface SyncSummary {
  runId: string | null;
  network: string;
  assetsAttempted: number;
  assetsSynced: number;
  assetsErrored: number;
  holdersUpserted: number;
  distributionsFound: number;
  reconciled: number;
  /**
   * Distributions with no pcp_submissions link. Until the Capital Platform
   * integration is live this equals distributionsFound — an all-unmatched board
   * is the expected state, not a failure. Reported so that is legible.
   */
  unlinked: number;
  status: "OK" | "PARTIAL" | "FAILED" | "SKIPPED";
  errors: Array<{ asset_id: string; error_message: string }>;
}

/** Assets to sync: everything tracked on this network, or one if pinned. */
async function loadTrackedAssets(
  network: string,
  assetId?: string,
): Promise<PolymeshAsset[]> {
  let q = requireClient().from("polymesh_assets").select("*").eq("network", network);
  if (assetId) q = q.eq("asset_id", assetId);
  const { data, error } = await q;
  if (error) throw new Error(`loadTrackedAssets: ${error.message}`);
  return (data ?? []) as PolymeshAsset[];
}

async function createSyncRun(
  network: string,
  triggerType: SyncTriggerType,
): Promise<PolymeshSyncRun> {
  const { data, error } = await requireClient()
    .from("polymesh_sync_runs")
    .insert({ network, trigger_type: triggerType })
    .select()
    .single();
  if (error) throw new Error(`createSyncRun: ${error.message}`);
  if (!data) throw new Error("createSyncRun: no row returned");
  return data as PolymeshSyncRun;
}

async function completeSyncRun(
  runId: string,
  summary: Omit<SyncSummary, "runId" | "status" | "network" | "reconciled" | "unlinked">,
): Promise<void> {
  const { error } = await requireClient()
    .from("polymesh_sync_runs")
    .update({
      completed_at: new Date().toISOString(),
      assets_attempted: summary.assetsAttempted,
      assets_synced: summary.assetsSynced,
      assets_errored: summary.assetsErrored,
      holders_upserted: summary.holdersUpserted,
      distributions_found: summary.distributionsFound,
      errors: summary.errors.length ? summary.errors : null,
    })
    .eq("id", runId);
  if (error) throw new Error(`completeSyncRun: ${error.message}`);
}

/** Pages a connection until every node is read or `totalCount` is reached. */
async function fetchAllPages<T>(
  client: PolymeshClient,
  query: string,
  key: string,
  assetId: string,
): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  for (;;) {
    const data = await client.query<Record<string, Connection<T>>>(query, {
      assetId,
      first: PAGE_SIZE,
      offset,
    });
    const conn = data[key];
    if (!conn) break;
    out.push(...conn.nodes);
    offset += PAGE_SIZE;
    if (out.length >= conn.totalCount || conn.nodes.length === 0) break;
  }
  return out;
}

async function syncOneAsset(
  client: PolymeshClient,
  asset: PolymeshAsset,
  snapshotAt: string,
): Promise<{
  holders: number;
  distributions: number;
  reconciled: number;
  unlinked: number;
}> {
  // 1. Asset state.
  const assetData = await client.query<{ asset: ChainAsset | null }>(ASSET_QUERY, {
    assetId: asset.asset_id,
  });
  if (!assetData.asset) {
    throw new PolymeshQueryError(
      `asset ${asset.asset_id} not found on ${client.network}`,
    );
  }

  const { error: assetErr } = await requireClient()
    .from("polymesh_assets")
    .update({
      ...normalizeAsset(assetData.asset),
      last_synced_at: snapshotAt,
      sync_status: "ok",
      sync_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", asset.id);
  if (assetErr) throw new Error(`update polymesh_assets: ${assetErr.message}`);

  // 2. Holder snapshot — append-only, one snapshot_at for the whole run so a
  //    re-run of the same run cannot duplicate rows (see 012_polymesh.sql).
  const chainHolders = await fetchAllPages<ChainAssetHolder>(
    client,
    HOLDERS_QUERY,
    "assetHolders",
    asset.asset_id,
  );
  const holderRows = chainHolders
    .map((h) => normalizeHolder(h, asset.id, snapshotAt))
    .filter((h): h is Omit<PolymeshHolder, "id"> => h !== null);

  if (holderRows.length) {
    const { error } = await requireClient()
      .from("polymesh_holders")
      .upsert(holderRows, {
        onConflict: "polymesh_asset_id,holder_did,snapshot_at",
        ignoreDuplicates: true,
      });
    if (error) throw new Error(`upsert polymesh_holders: ${error.message}`);
  }

  // 3. Distributions. Upsert on the chain's own identifier so re-syncing an
  //    already-seen distribution updates chain facts without disturbing the
  //    reconciliation columns, which reconcile.ts owns.
  const chainDistributions = await fetchAllPages<ChainDistribution>(
    client,
    DISTRIBUTIONS_QUERY,
    "distributions",
    asset.asset_id,
  );
  if (chainDistributions.length) {
    const rows = chainDistributions.map((d) => normalizeDistribution(d, asset.id));
    const { error } = await requireClient()
      .from("polymesh_distributions")
      .upsert(rows, { onConflict: "polymesh_asset_id,distribution_id" });
    if (error) throw new Error(`upsert polymesh_distributions: ${error.message}`);
  }

  // 4. Reconcile against verification_records. Closes the loop described in
  //    § 3.4: Layer C submits, Layer A observes on-chain, this confirms they agree.
  const reconciliation = await reconcileAsset(asset);

  // Holders whose balance would not parse are dropped rather than stored as
  // zero (see normalizeHolder). Silently losing them would understate the cap
  // table, so the difference is logged.
  const droppedHolders = chainHolders.length - holderRows.length;
  if (droppedHolders > 0) {
    console.warn(
      `[polymesh] ${asset.asset_id}: dropped ${droppedHolders} holder row(s) with unparseable balances or missing DIDs`,
    );
  }

  return {
    holders: holderRows.length,
    distributions: chainDistributions.length,
    reconciled: reconciliation.changed,
    unlinked: reconciliation.unlinked,
  };
}

/**
 * Runs a full sync. Returns a summary rather than throwing on partial failure,
 * following `marketplace-refresh.ts` — the caller decides how loud to be.
 */
export async function runPolymeshSync(
  options: SyncOptions = {},
): Promise<SyncSummary> {
  const config = options.config ?? loadPolymeshConfig();
  const client = options.client ?? new PolymeshClient(config);
  const triggerType = options.triggerType ?? "scheduled";

  const summary: SyncSummary = {
    runId: null,
    network: config.network,
    assetsAttempted: 0,
    assetsSynced: 0,
    assetsErrored: 0,
    holdersUpserted: 0,
    distributionsFound: 0,
    reconciled: 0,
    unlinked: 0,
    status: "OK",
    errors: [],
  };

  const assets = await loadTrackedAssets(config.network, options.assetId);
  if (assets.length === 0) {
    // Nothing mapped yet is the normal state before the first asset is issued.
    summary.status = "SKIPPED";
    return summary;
  }

  const run = await createSyncRun(config.network, triggerType);
  summary.runId = run.id;
  const snapshotAt = run.started_at;

  for (const asset of assets) {
    summary.assetsAttempted++;
    try {
      const result = await syncOneAsset(client, asset, snapshotAt);
      summary.assetsSynced++;
      summary.holdersUpserted += result.holders;
      summary.distributionsFound += result.distributions;
      summary.reconciled += result.reconciled;
      summary.unlinked += result.unlinked;
    } catch (err) {
      const message = (err as Error).message;
      summary.assetsErrored++;
      summary.errors.push({ asset_id: asset.asset_id, error_message: message });
      await requireClient()
        .from("polymesh_assets")
        .update({ sync_status: "error", sync_error: message })
        .eq("id", asset.id);
    }
  }

  if (summary.assetsErrored > 0) {
    summary.status = summary.assetsSynced > 0 ? "PARTIAL" : "FAILED";
  }

  await completeSyncRun(run.id, summary);
  return summary;
}

export async function getRecentSyncRuns(limit = 20): Promise<PolymeshSyncRun[]> {
  const { data, error } = await requireClient()
    .from("polymesh_sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getRecentSyncRuns: ${error.message}`);
  return (data ?? []) as PolymeshSyncRun[];
}

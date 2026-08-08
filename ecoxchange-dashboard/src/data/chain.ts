/**
 * Spec 18 § 2.8 — chain view loader.
 *
 * Follows the same live/demo split as `data/index.ts`: read Supabase directly
 * with the anon key when configured, fall back to static demo data otherwise.
 * The `polymesh_*` tables carry public-read RLS policies (012_polymesh.sql)
 * precisely so this read works with the anon key — the data mirrors a public
 * ledger, and the transparency claim depends on it being checkable.
 */

import { supabase } from "../lib/supabase.js";
import { demoChainView, DEMO_CHAIN_PROJECT_ID } from "./demo-chain.js";
import type {
  ChainAssetSummary,
  ChainDistribution,
  ChainHolder,
  ChainVerificationLink,
  ChainView,
} from "../types/chain.js";

export async function loadChainView(projectId: string): Promise<ChainView | null> {
  if (supabase) return loadChainViewLive(projectId);
  return projectId === DEMO_CHAIN_PROJECT_ID ? demoChainView : null;
}

interface DbAsset extends ChainAssetSummary {
  id: string;
}

/**
 * PostgREST's code for `undefined_table`.
 *
 * A build can be pointed at a Supabase project where migration 012 has not been
 * applied yet — which is the normal state right now, since Phase 1 is gated on a
 * live-chain validation that has not happened. "The chain tables do not exist"
 * is the same user-facing fact as "no asset is mapped to this project": there is
 * nothing on chain to show. Surfacing it as an error would put a red failure
 * state on a transparency page for a condition that is neither a failure nor
 * anything a reader can act on.
 */
const UNDEFINED_TABLE = "42P01";

async function loadChainViewLive(projectId: string): Promise<ChainView | null> {
  const { data: asset, error } = await supabase!
    .from("polymesh_assets")
    .select(
      "id, asset_id, ticker, asset_name, total_supply, total_supply_raw, decimals, network, issuer_did, is_divisible, last_synced_at, sync_status",
    )
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) {
    if (error.code === UNDEFINED_TABLE) return null;
    throw new Error(`loadChainView: ${error.message}`);
  }
  if (!asset) return null;
  const a = asset as DbAsset;

  const [holderResult, distributionResult] = await Promise.all([
    loadHolders(a.id),
    loadDistributions(a.id),
  ]);

  return {
    asset: a,
    snapshotAt: holderResult.snapshotAt,
    holders: holderResult.holders,
    distributions: distributionResult,
  };
}

/**
 * Holders are append-only snapshots, so "current" is every row sharing the
 * newest `snapshot_at` — not the newest row per holder, which would blend two
 * snapshots into a cap table that never existed.
 */
async function loadHolders(
  polymeshAssetId: string,
): Promise<{ snapshotAt: string | null; holders: ChainHolder[] }> {
  const { data: latest, error: latestErr } = await supabase!
    .from("polymesh_holders")
    .select("snapshot_at")
    .eq("polymesh_asset_id", polymeshAssetId)
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestErr) throw new Error(`loadChainView holders: ${latestErr.message}`);

  const snapshotAt = (latest as { snapshot_at: string } | null)?.snapshot_at ?? null;
  if (!snapshotAt) return { snapshotAt: null, holders: [] };

  const { data, error } = await supabase!
    .from("polymesh_holders")
    .select("holder_did, balance, balance_raw")
    .eq("polymesh_asset_id", polymeshAssetId)
    .eq("snapshot_at", snapshotAt)
    .order("balance", { ascending: false });
  if (error) throw new Error(`loadChainView holders: ${error.message}`);

  return { snapshotAt, holders: (data ?? []) as ChainHolder[] };
}

interface DbDistribution extends Omit<ChainDistribution, "verification"> {
  verification_record_id: string | null;
}

async function loadDistributions(
  polymeshAssetId: string,
): Promise<ChainDistribution[]> {
  const { data, error } = await supabase!
    .from("polymesh_distributions")
    .select(
      "distribution_id, block_number, block_timestamp, extrinsic_hash, currency, amount_per_share, amount_per_share_raw, total_amount, total_amount_raw, payment_at, expires_at, reconciliation_status, reconciliation_notes, verification_record_id",
    )
    .eq("polymesh_asset_id", polymeshAssetId)
    .order("payment_at", { ascending: false });
  if (error) throw new Error(`loadChainView distributions: ${error.message}`);

  const rows = (data ?? []) as DbDistribution[];
  const recordIds = [
    ...new Set(
      rows.map((r) => r.verification_record_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  if (recordIds.length === 0) {
    return rows.map((r) => ({ ...r, verification: null }));
  }

  const { data: records, error: recErr } = await supabase!
    .from("verification_records")
    .select(
      "id, period_start, period_end, status, inv_vs_expected_pct, inv_vs_utility_pct, util_vs_expected_pct",
    )
    .in("id", recordIds);
  if (recErr) throw new Error(`loadChainView verification: ${recErr.message}`);

  const byId = new Map(
    ((records ?? []) as ChainVerificationLink[]).map((r) => [r.id, r]),
  );

  return rows.map((r) => ({
    ...r,
    verification: r.verification_record_id
      ? (byId.get(r.verification_record_id) ?? null)
      : null,
  }));
}

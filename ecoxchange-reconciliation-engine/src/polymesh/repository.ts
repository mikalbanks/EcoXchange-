/**
 * Read accessors backing the Spec 18 § 2.6 HTTP surface.
 *
 * Every function returns empty rather than throwing when Supabase is
 * unconfigured, so the chain endpoints degrade to "nothing synced yet" instead
 * of 500ing on a server booted without persistence.
 */

import { getSupabase } from "./db.js";
import type {
  PolymeshAsset,
  PolymeshDistribution,
  PolymeshHolder,
} from "./models.js";
import type { VerificationRecord } from "../db/types.js";

export async function listAssets(network?: string): Promise<PolymeshAsset[]> {
  const client = getSupabase();
  if (!client) return [];
  let q = client.from("polymesh_assets").select("*").order("created_at");
  if (network) q = q.eq("network", network);
  const { data, error } = await q;
  if (error) throw new Error(`listAssets: ${error.message}`);
  return (data ?? []) as PolymeshAsset[];
}

export async function getAssetByProject(
  projectId: string,
): Promise<PolymeshAsset | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client
    .from("polymesh_assets")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw new Error(`getAssetByProject: ${error.message}`);
  return (data as PolymeshAsset | null) ?? null;
}

/**
 * The most recent holder snapshot for an asset. Holders are stored as
 * append-only snapshots, so "current" means "every row sharing the newest
 * snapshot_at" — not the newest row per holder, which would blend snapshots.
 */
export async function getCurrentHolders(
  polymeshAssetId: string,
): Promise<{ snapshotAt: string | null; holders: PolymeshHolder[] }> {
  const client = getSupabase();
  if (!client) return { snapshotAt: null, holders: [] };

  const { data: latest, error: latestErr } = await client
    .from("polymesh_holders")
    .select("snapshot_at")
    .eq("polymesh_asset_id", polymeshAssetId)
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestErr) throw new Error(`getCurrentHolders: ${latestErr.message}`);
  const snapshotAt = (latest as { snapshot_at: string } | null)?.snapshot_at ?? null;
  if (!snapshotAt) return { snapshotAt: null, holders: [] };

  const { data, error } = await client
    .from("polymesh_holders")
    .select("*")
    .eq("polymesh_asset_id", polymeshAssetId)
    .eq("snapshot_at", snapshotAt)
    .order("balance", { ascending: false });
  if (error) throw new Error(`getCurrentHolders: ${error.message}`);
  return { snapshotAt, holders: (data ?? []) as PolymeshHolder[] };
}

/** A distribution joined to the verification record it reconciles against. */
export interface DistributionWithVerification extends PolymeshDistribution {
  verification: Pick<
    VerificationRecord,
    | "id"
    | "period_start"
    | "period_end"
    | "status"
    | "inv_vs_expected_pct"
    | "inv_vs_utility_pct"
    | "util_vs_expected_pct"
  > | null;
}

/**
 * Distribution history with the verification join resolved. This is what
 * `VerificationLinkBadge` renders — the three-source deviation percentages come
 * from here, not from a second round trip.
 */
export async function getDistributions(
  polymeshAssetId: string,
): Promise<DistributionWithVerification[]> {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from("polymesh_distributions")
    .select("*")
    .eq("polymesh_asset_id", polymeshAssetId)
    .order("payment_at", { ascending: false });
  if (error) throw new Error(`getDistributions: ${error.message}`);

  const distributions = (data ?? []) as PolymeshDistribution[];
  const recordIds = [
    ...new Set(
      distributions
        .map((d) => d.verification_record_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (recordIds.length === 0) {
    return distributions.map((d) => ({ ...d, verification: null }));
  }

  const { data: records, error: recErr } = await client
    .from("verification_records")
    .select(
      "id,period_start,period_end,status,inv_vs_expected_pct,inv_vs_utility_pct,util_vs_expected_pct",
    )
    .in("id", recordIds);
  if (recErr) throw new Error(`getDistributions verification: ${recErr.message}`);

  const byId = new Map(
    ((records ?? []) as DistributionWithVerification["verification"][])
      .filter((r): r is NonNullable<DistributionWithVerification["verification"]> =>
        Boolean(r),
      )
      .map((r) => [r.id, r]),
  );

  return distributions.map((d) => ({
    ...d,
    verification: d.verification_record_id
      ? (byId.get(d.verification_record_id) ?? null)
      : null,
  }));
}

/**
 * Spec 18 § 2 — types for the Polymesh chain read path.
 *
 * The `Chain*` types mirror the SubQuery middleware's entity shapes exactly as
 * published in `docs/polymesh-middleware-schema.graphql` (polymesh-subquery
 * v19.6.0). The `Polymesh*` types mirror the Supabase rows in migration
 * 012_polymesh.sql. `normalize*` below is the only place the two meet.
 *
 * Several spec assumptions do not survive contact with the real schema; each
 * divergence is handled here and noted at the point it bites.
 */

import type { PolymeshNetwork } from "./config.js";

/**
 * Polymesh represents balances as integers scaled by 10^6. There is no
 * per-asset `decimals` field on the chain — the scale is a chain-wide constant,
 * which is why `polymesh_assets.decimals` is documentation rather than an
 * arithmetic input.
 */
export const CHAIN_DECIMALS = 6;

const RAW_RE = /^(-)?(\d+)$/;

/**
 * Unscaled chain integer → exact decimal string.
 *
 * String/BigInt math only — never `Number()` then divide. A 10^6-scaled integer
 * pushed through float division loses precision on large balances, and the
 * whole point of this surface is that the numbers are checkable against a public
 * ledger. Same discipline as `server/services/distribution/money.ts`: "a cent
 * created or destroyed by rounding is a defect, not a tolerance."
 *
 * The result is a decimal STRING, handed straight to a NUMERIC column. Postgres
 * parses it exactly; converting to a JS number first would not.
 *
 * Returns null for absent or malformed input, so a bad value stays visibly
 * empty rather than silently becoming 0 — a zero balance and an unreadable
 * balance are different facts.
 */
export function descaleToString(
  raw: string | number | null | undefined,
): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const text = typeof raw === "number" ? String(raw) : raw.trim();
  const match = RAW_RE.exec(text);
  if (!match) return null;

  const [, sign = "", digits] = match;
  const padded = digits.padStart(CHAIN_DECIMALS + 1, "0");
  const whole = padded.slice(0, padded.length - CHAIN_DECIMALS);
  const fraction = padded.slice(padded.length - CHAIN_DECIMALS).replace(/0+$/, "");
  return fraction ? `${sign}${whole}.${fraction}` : `${sign}${whole}`;
}

/**
 * Display-only convenience: the descaled value as a JS number.
 *
 * Never use this to produce a value that gets stored. Persist the raw string
 * and the exact decimal string from `descaleToString`; this exists for chart
 * axes and totals where a float is already the ceiling on precision.
 */
export function descaleToNumber(
  raw: string | number | null | undefined,
): number | null {
  const decimal = descaleToString(raw);
  return decimal === null ? null : Number(decimal);
}

/** The chain integer, verbatim, for the `*_raw` columns. */
export function rawString(
  raw: string | number | null | undefined,
): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const text = typeof raw === "number" ? String(raw) : raw.trim();
  return RAW_RE.test(text) ? text : null;
}

/**
 * `Distribution.paymentAt` and `expiresAt` are BigInt **milliseconds**, not the
 * ISO `Date` used elsewhere in the schema. Returns null for absent/unparseable
 * values so a missing `expiresAt` stays null rather than becoming epoch zero.
 */
export function msToIso(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const ms = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms).toISOString();
}

// ─── Chain shapes (see docs/polymesh-middleware-schema.graphql) ──────────────

export interface ChainBlock {
  blockId: number;
  hash: string;
  datetime: string;
}

export interface ChainIdentity {
  did: string;
}

export interface ChainAsset {
  /** In this schema version `Asset.id` is the ticker. */
  id: string;
  ticker: string | null;
  name: string | null;
  type: string | null;
  isDivisible: boolean;
  isFrozen: boolean;
  totalSupply: string;
  owner: ChainIdentity | null;
}

export interface ChainAssetHolder {
  id: string;
  identity: ChainIdentity | null;
  amount: string;
}

export interface ChainDistribution {
  /** "<assetId>/<localId>". */
  id: string;
  localId: number;
  /** An Asset reference, NOT a currency string — the spec assumed a string. */
  currency: { id: string } | null;
  perShare: string;
  amount: string;
  remaining: string;
  taxes: string;
  paymentAt: string;
  expiresAt: string | null;
  createdBlock: ChainBlock | null;
}

// ─── Supabase row shapes (migration 012_polymesh.sql) ────────────────────────

export type SyncStatus = "pending" | "ok" | "error";
export type ReconciliationStatus = "unmatched" | "matched" | "discrepancy";
export type SyncTriggerType = "manual" | "scheduled";

export interface PolymeshAsset {
  id: string;
  project_id: string | null;
  asset_id: string;
  ticker: string | null;
  asset_name: string | null;
  /** Decimal string, not a number — NUMERIC round-trips exactly, a float does not. */
  total_supply: string | null;
  /** The unscaled chain integer, verbatim. Source of truth. */
  total_supply_raw: string | null;
  decimals: number | null;
  network: PolymeshNetwork;
  issuer_did: string | null;
  is_divisible: boolean | null;
  last_synced_at: string | null;
  sync_status: SyncStatus;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolymeshHolder {
  id: string;
  polymesh_asset_id: string;
  holder_did: string;
  balance: string;
  balance_raw: string | null;
  snapshot_at: string;
}

export interface PolymeshDistribution {
  id: string;
  polymesh_asset_id: string;
  distribution_id: string;
  block_number: number | null;
  block_timestamp: string | null;
  extrinsic_hash: string | null;
  currency: string | null;
  amount_per_share: string | null;
  amount_per_share_raw: string | null;
  total_amount: string | null;
  total_amount_raw: string | null;
  payment_at: string | null;
  expires_at: string | null;
  verification_record_id: string | null;
  reconciliation_status: ReconciliationStatus;
  reconciliation_notes: string | null;
  raw_event: unknown;
  synced_at: string;
}

export interface PolymeshSyncRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  network: string;
  assets_attempted: number;
  assets_synced: number;
  assets_errored: number;
  holders_upserted: number;
  distributions_found: number;
  errors: Array<{ asset_id: string; error_message: string }> | null;
  trigger_type: SyncTriggerType;
}

// ─── Normalization: chain → row ─────────────────────────────────────────────

/** Fields of `polymesh_assets` derived from chain state (not identity/mapping). */
export type AssetChainFields = Pick<
  PolymeshAsset,
  | "ticker"
  | "asset_name"
  | "total_supply"
  | "total_supply_raw"
  | "issuer_did"
  | "is_divisible"
>;

export function normalizeAsset(asset: ChainAsset): AssetChainFields {
  return {
    ticker: asset.ticker ?? asset.id,
    asset_name: asset.name,
    total_supply: descaleToString(asset.totalSupply),
    total_supply_raw: rawString(asset.totalSupply),
    issuer_did: asset.owner?.did ?? null,
    is_divisible: asset.isDivisible,
  };
}

export function normalizeHolder(
  holder: ChainAssetHolder,
  polymeshAssetId: string,
  snapshotAt: string,
): Omit<PolymeshHolder, "id"> | null {
  // `AssetHolder.id` is "<assetId>/<did>"; fall back to parsing it when the
  // identity relation comes back null rather than dropping the balance.
  const did = holder.identity?.did ?? holder.id.split("/")[1] ?? null;
  if (!did) return null;
  const balance = descaleToString(holder.amount);
  // A holder whose balance will not parse is a data problem worth seeing, not a
  // zero-balance holder. Drop it rather than assert a balance the chain did not
  // give us; the sync counts the difference.
  if (balance === null) return null;
  return {
    polymesh_asset_id: polymeshAssetId,
    holder_did: did,
    balance,
    balance_raw: rawString(holder.amount),
    snapshot_at: snapshotAt,
  };
}

export type NewDistribution = Omit<
  PolymeshDistribution,
  "id" | "synced_at" | "verification_record_id" | "reconciliation_status" | "reconciliation_notes"
>;

export function normalizeDistribution(
  dist: ChainDistribution,
  polymeshAssetId: string,
): NewDistribution {
  return {
    polymesh_asset_id: polymeshAssetId,
    distribution_id: dist.id,
    block_number: dist.createdBlock?.blockId ?? null,
    block_timestamp: dist.createdBlock?.datetime ?? null,
    // The chain's Distribution entity carries no extrinsic hash — only
    // DistributionPayment does, via createdEvent. The creating block hash is
    // stored so explorer links resolve; the UI labels it as a block link.
    extrinsic_hash: dist.createdBlock?.hash ?? null,
    currency: dist.currency?.id ?? null,
    amount_per_share: descaleToString(dist.perShare),
    amount_per_share_raw: rawString(dist.perShare),
    total_amount: descaleToString(dist.amount),
    total_amount_raw: rawString(dist.amount),
    payment_at: msToIso(dist.paymentAt),
    expires_at: msToIso(dist.expiresAt),
    // `remaining` and `taxes` have no column of their own; they are preserved
    // here so nothing observed on chain is silently discarded.
    raw_event: dist as unknown,
  };
}

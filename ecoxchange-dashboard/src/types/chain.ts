/**
 * Spec 18 § 2.8 — types for the Polymesh chain view.
 *
 * This supersedes the Base-Sepolia-shaped types in `smart-contract-interfaces.ts`
 * for anything Polymesh. Those describe an EVM chain EcoXchange is migrating
 * off; nothing here is EVM.
 */

import type { VerificationStatus } from "../utils/types.js";

export type PolymeshNetwork = "testnet" | "mainnet";
export type ReconciliationStatus = "unmatched" | "matched" | "discrepancy";

export interface ChainAssetSummary {
  asset_id: string;
  ticker: string | null;
  asset_name: string | null;
  /**
   * Decimal strings, not numbers. Postgres NUMERIC arrives as a string and the
   * chain's own value is a 10^6-scaled integer — parsing to a float here would
   * throw away precision on the one surface whose selling point is that the
   * figures are checkable against a public ledger. Parse only at the point of
   * display, and only for layout (chart axes), never for a displayed figure.
   */
  total_supply: string | null;
  total_supply_raw: string | null;
  decimals: number | null;
  network: PolymeshNetwork;
  issuer_did: string | null;
  is_divisible: boolean | null;
  last_synced_at: string | null;
  sync_status: "pending" | "ok" | "error";
}

export interface ChainHolder {
  holder_did: string;
  balance: string;
  balance_raw: string | null;
}

/** The verification record a distribution reconciles against, if any. */
export interface ChainVerificationLink {
  id: string;
  period_start: string;
  period_end: string;
  status: VerificationStatus;
  inv_vs_expected_pct: number | null;
  inv_vs_utility_pct: number | null;
  util_vs_expected_pct: number | null;
}

export interface ChainDistribution {
  distribution_id: string;
  block_number: number | null;
  block_timestamp: string | null;
  /**
   * The creating block's hash. Polymesh's Distribution entity carries no
   * extrinsic hash of its own, so the UI must link and label this as a block,
   * not an extrinsic — see 012_polymesh.sql.
   */
  extrinsic_hash: string | null;
  currency: string | null;
  amount_per_share: string | null;
  amount_per_share_raw: string | null;
  total_amount: string | null;
  total_amount_raw: string | null;
  payment_at: string | null;
  expires_at: string | null;
  reconciliation_status: ReconciliationStatus;
  reconciliation_notes: string | null;
  verification: ChainVerificationLink | null;
}

export interface ChainView {
  asset: ChainAssetSummary;
  snapshotAt: string | null;
  holders: ChainHolder[];
  distributions: ChainDistribution[];
}

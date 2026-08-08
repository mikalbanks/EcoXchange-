/**
 * Demo Polymesh chain data for the Savannah project (Spec 18 § 2.8).
 *
 * Mirrors the shape the live Supabase loader returns so the chain view demos
 * identically with or without a database.
 *
 * ── What this fixture is careful to teach ───────────────────────────────────
 *
 * A badge only goes green when a `pcp_submissions` row links the payment to a
 * verification record. Date proximity is never enough. So in this fixture:
 *
 *   ECOSAV/6  matched      — a real (client_mode='http') submission, verified
 *                            period, amounts agree.
 *   ECOSAV/5  discrepancy  — submission exists but was made in mock mode, so it
 *                            is not evidence a payment really happened.
 *   ECOSAV/4  discrepancy  — submission exists, but the period is FLAGGED.
 *   ECOSAV/3  unmatched    — no submission. A verified period closed shortly
 *                            before it, and the note says so, but the badge
 *                            stays yellow because proximity is not proof.
 *
 * ECOSAV/3 is the important one: it is exactly the case an earlier draft got
 * wrong by rendering it green. A demo that shows everything matched teaches a
 * reviewer the wrong model of when the claim holds.
 *
 * Amounts are decimal STRINGS, matching NUMERIC-over-PostgREST and the raw
 * 10^6-scaled chain integers alongside them. Testnet, demo identifiers; nothing
 * here is a deployed asset, and the UI labels the network on every surface.
 */

import type { ChainView } from "../types/chain.js";

/** DIDs are 66-char hex on Polymesh; these are demo values, clearly patterned. */
const DEMO_DIDS = [
  "0x9a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9",
  "0x4f3e2d1c0b9a8877665544332211ffeeddccbbaa998877665544332211aabbcc",
  "0x1122334455667788990011223344556677889900112233445566778899001122",
  "0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899",
  "0x7766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa9988",
];

export const DEMO_CHAIN_PROJECT_ID = "demo-savannah-5mw";

export const demoChainView: ChainView = {
  asset: {
    asset_id: "ECOSAV",
    ticker: "ECOSAV",
    asset_name: "EcoXchange Savannah Community Solar Note",
    total_supply: "17700",
    total_supply_raw: "17700000000",
    decimals: 6,
    network: "testnet",
    issuer_did: DEMO_DIDS[0],
    is_divisible: true,
    last_synced_at: "2024-12-02T11:00:00.000Z",
    sync_status: "ok",
  },
  snapshotAt: "2024-12-02T11:00:00.000Z",
  holders: [
    { holder_did: DEMO_DIDS[1], balance: "8142", balance_raw: "8142000000" },
    { holder_did: DEMO_DIDS[2], balance: "4425", balance_raw: "4425000000" },
    { holder_did: DEMO_DIDS[3], balance: "3186", balance_raw: "3186000000" },
    { holder_did: DEMO_DIDS[4], balance: "1947", balance_raw: "1947000000" },
  ],
  distributions: [
    {
      distribution_id: "ECOSAV/6",
      block_number: 9_412_880,
      block_timestamp: "2024-11-04T09:12:00.000Z",
      extrinsic_hash:
        "0x5c1d9e77a3b04f2681ce4a7d0b93f6e2185c7a90d4bf3e6218cd07a9b4e5f312",
      currency: "USDC",
      amount_per_share: "1.9271",
      amount_per_share_raw: "1927100",
      total_amount: "34110",
      total_amount_raw: "34110000000",
      payment_at: "2024-11-05T00:00:00.000Z",
      expires_at: null,
      reconciliation_status: "matched",
      reconciliation_notes: null,
      verification: {
        id: "ver-2024-10",
        period_start: "2024-10-01",
        period_end: "2024-10-31",
        status: "verified",
        inv_vs_expected_pct: -1.42,
        inv_vs_utility_pct: 3.88,
        util_vs_expected_pct: -5.1,
      },
    },
    {
      distribution_id: "ECOSAV/5",
      block_number: 9_298_401,
      block_timestamp: "2024-10-03T08:47:00.000Z",
      extrinsic_hash:
        "0xb70e4a2f16c8d95301fa7be4c2d80916af35e7c1049d8b62731ea5c08f4d6912",
      currency: "USDC",
      amount_per_share: "2.1044",
      amount_per_share_raw: "2104400",
      total_amount: "37248",
      total_amount_raw: "37248000000",
      payment_at: "2024-10-04T00:00:00.000Z",
      expires_at: null,
      reconciliation_status: "discrepancy",
      reconciliation_notes:
        "Linked submission was made in mock mode — this payment did not originate from a real Capital Platform call.",
      verification: {
        id: "ver-2024-09",
        period_start: "2024-09-01",
        period_end: "2024-09-30",
        status: "verified",
        inv_vs_expected_pct: 0.94,
        inv_vs_utility_pct: 2.71,
        util_vs_expected_pct: -1.75,
      },
    },
    {
      distribution_id: "ECOSAV/4",
      block_number: 9_180_115,
      block_timestamp: "2024-09-04T10:05:00.000Z",
      extrinsic_hash:
        "0x2e9f4c81a05b7d3612ef8a04c9d7b615238fa0c74e91d5b3086af24c7e1d9053",
      currency: "USDC",
      amount_per_share: "2.4318",
      amount_per_share_raw: "2431800",
      total_amount: "43042",
      total_amount_raw: "43042000000",
      payment_at: "2024-09-05T00:00:00.000Z",
      expires_at: null,
      reconciliation_status: "discrepancy",
      reconciliation_notes:
        "Payment settled against a FLAGGED period (2024-08-01).",
      verification: {
        id: "ver-2024-08",
        period_start: "2024-08-01",
        period_end: "2024-08-31",
        status: "flagged",
        inv_vs_expected_pct: -11.6,
        inv_vs_utility_pct: 1.2,
        util_vs_expected_pct: -12.7,
      },
    },
    {
      distribution_id: "ECOSAV/3",
      block_number: 9_061_772,
      block_timestamp: "2024-08-06T07:39:00.000Z",
      extrinsic_hash:
        "0x8d3a1e60b492f7c5013ae6f28b40d971c5e83a26f0d194b75c28ea3106fd7b84",
      currency: "USDC",
      amount_per_share: "2.3907",
      amount_per_share_raw: "2390700",
      total_amount: "42315",
      total_amount_raw: "42315000000",
      payment_at: "2024-08-07T00:00:00.000Z",
      expires_at: null,
      reconciliation_status: "unmatched",
      reconciliation_notes:
        "No submission record links this payment to a verified period. " +
        "2024-07-01 closed shortly before it and may be the period it settles — " +
        "confirm against the Capital Platform before treating this as reconciled.",
      verification: null,
    },
  ],
};

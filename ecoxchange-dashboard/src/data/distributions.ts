import { supabase } from "../lib/supabase.js";
import { summarizeDistributions } from "../utils/distributions-summary.js";
import demoDistJson from "./demo-distributions.json";
import type {
  DistributionPref,
  DistributionPreference,
  DistributionRecord,
  DistributionSummary,
  InvestorHolding,
} from "../types/distributions.js";

// Mock identity until Polymath auth lands.
export const DEMO_INVESTOR_ID = "demo-investor";

interface DemoDist {
  holdings: InvestorHolding[];
  history: DistributionRecord[];
}
const demoDist = demoDistJson as DemoDist;

// ─── Local preference store (demo / pre-auth capture) ──────────────────────────
const prefKey = (offeringId: string) => `drip:${offeringId}`;

function readLocalPref(offeringId: string): DistributionPref | null {
  try {
    const v = localStorage.getItem(prefKey(offeringId));
    return v === "cash_out" || v === "reinvest" ? v : null;
  } catch {
    return null;
  }
}

function writeLocalPref(offeringId: string, pref: DistributionPref): void {
  try {
    localStorage.setItem(prefKey(offeringId), pref);
  } catch {
    /* storage unavailable — preference stays in-memory only */
  }
}

// ─── Reads ─────────────────────────────────────────────────────────────────────
export async function getInvestorHoldings(
  _investorId: string,
): Promise<InvestorHolding[]> {
  // Investor tables are RLS-gated until auth, so the anon dashboard reads demo
  // data and overlays any locally-captured preference.
  return demoDist.holdings.map((h) => ({
    ...h,
    current_preference: readLocalPref(h.offering_id) ?? h.current_preference,
  }));
}

export async function getDistributionPreference(
  _investorId: string,
  offeringId: string,
): Promise<DistributionPreference | null> {
  const pref =
    readLocalPref(offeringId) ??
    demoDist.holdings.find((h) => h.offering_id === offeringId)
      ?.current_preference ??
    "cash_out";
  return {
    id: `local-${offeringId}`,
    investor_id: DEMO_INVESTOR_ID,
    offering_id: offeringId,
    preference: pref,
    reinvest_target_offering_id: null,
    updated_at: new Date().toISOString(),
  };
}

// ─── Write (optimistic; localStorage now, Supabase upsert once auth lands) ──────
export async function updateDistributionPreference(
  investorId: string,
  offeringId: string,
  preference: DistributionPref,
  reinvestTargetId?: string,
): Promise<DistributionPreference> {
  writeLocalPref(offeringId, preference);

  // Attempt the live upsert too; under the anon key this is RLS-blocked, so we
  // swallow failures — the localStorage capture is the source of truth for now.
  if (supabase) {
    try {
      await supabase.from("distribution_preferences").upsert(
        {
          investor_id: investorId,
          offering_id: offeringId,
          preference,
          reinvest_target_offering_id: reinvestTargetId || offeringId,
          updated_at: new Date().toISOString(),
          updated_by: "investor",
        },
        { onConflict: "investor_id,offering_id" },
      );
    } catch {
      /* expected until auth provides a writable session */
    }
  }

  return {
    id: `local-${offeringId}`,
    investor_id: investorId,
    offering_id: offeringId,
    preference,
    reinvest_target_offering_id: reinvestTargetId || offeringId,
    updated_at: new Date().toISOString(),
  };
}

export async function getDistributionSummary(
  _investorId: string,
): Promise<DistributionSummary> {
  return summarizeDistributions(demoDist.history);
}

// Savannah 5 MW operating verification history (Spec 3): the 12 months of
// OPERATIONS ending June 2026 — distinct from demo-savannah.json, which is
// the 2024 BACKTEST year. Never mix the two datasets in one view.
//
// Exactly one month is flagged: June 2026 at −19.7% (inverter vs expected),
// the story month the whole verification demo pivots on. kWh values for
// Jan–Jun 2026 are the upgrade-spec §3.7 table verbatim; the spec's
// 2026-07…2026-12 rows seed Jul–Dec 2025 here so the flagged month is the
// most recent one. One deliberate departure from the spec table: May 2026
// runs at −7.2% (spec: +1.7%) so the two-month progressive decline that
// Spec 7's soiling rule (and its example card) describes actually exists
// in the data.
//
// Deviations are COMPUTED from the kWh values below, so the three
// percentages are always arithmetically consistent (demo-verification.test
// enforces this).

import type {
  AnomalyClassification,
  VerificationRecord,
} from "../utils/types.js";

export const FLAGGED_MONTH = "2026-06-01";

/**
 * Spec 19 §3.2 — the month with no utility reading, exercising the two-way
 * degrade path (`reconcile()` STEP 4). The month still VERIFIES on the
 * inverter-vs-satellite check; the absence is stated, not hidden.
 *
 * This also resolves a standing inconsistency: the project's utility_provider
 * is NULL, so a populated utility reading on every single month was never
 * coherent.
 */
export const UTILITY_MISSING_MONTH = "2025-10-01";

// [period_start, inverter_kwh, utility_kwh, expected_kwh, ghi_kwh_m2]
// utility_kwh is null for the month with no utility reading.
const ROWS: Array<[string, number, number | null, number, number]> = [
  ["2025-07-01", 785_600, 754_300, 771_200, 186.8],
  ["2025-08-01", 748_900, 720_100, 738_500, 174.6],
  ["2025-09-01", 652_300, 626_800, 641_700, 131.3],
  ["2025-10-01", 558_200, null, 552_100, 140.2],
  ["2025-11-01", 468_700, 450_100, 471_300, 90.0],
  ["2025-12-01", 442_100, 424_800, 449_500, 87.0],
  ["2026-01-01", 485_200, 462_100, 478_600, 93.7],
  ["2026-02-01", 502_800, 479_300, 495_100, 106.7],
  ["2026-03-01", 618_400, 593_700, 625_200, 140.5],
  ["2026-04-01", 712_300, 685_400, 698_900, 185.5],
  // May 2026: early soiling accumulation — production slipping but still
  // inside the ±15% band, so the month verifies while setting up June.
  ["2026-05-01", 691_900, 678_500, 745_600, 184.9],
  // June 2026: the flagged month (−19.7% vs expected).
  ["2026-06-01", 612_400, 588_200, 762_800, 203.1],
];

const PPA_RATE = 0.085;

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (a: number, b: number) => round1(((a - b) / b) * 100);

const JUNE_FLAG_REASONS = [
  "Inverter production 19.7% BELOW expected (tolerance: -15%). Possible causes: panel degradation exceeding model, soiling, shading, inverter fault, curtailment.",
  "Utility meter 22.9% BELOW expected (tolerance: -20%).",
];

// Classification the TS classifier (ecoxchange-reconciliation-engine
// classify.ts, Rule 3 — soiling) emits for June's inputs: two-month
// progressive decline (−7.2% → −19.7%) with inverter and utility agreeing
// (+4.0%). Keep this text in sync with that rule's template.
const JUNE_CLASSIFICATION: AnomalyClassification = {
  category: "soiling",
  confidence: "medium",
  reasoning:
    "Production has declined progressively — 7.2% below expected last " +
    "month, 19.7% this month. Inverter and utility meter agree, ruling " +
    "out a monitoring error. This pattern is consistent with soiling " +
    "accumulation.",
  recommended_action:
    "Schedule panel cleaning. After cleaning, compare next month's " +
    "production to expected generation. Consider adding a soiling " +
    "monitoring sensor or adjusting the cleaning schedule for this site.",
};

/** reconcile.ts STEP 4, verbatim. Not blocking — the month still verifies. */
const TWO_WAY_NOTE =
  "Utility meter data not available — verification based on inverter vs. satellite only (two-way check).";

export const SAVANNAH_VERIFICATION_HISTORY: VerificationRecord[] = ROWS.map(
  ([period_start, inverter_kwh, utility_kwh, expected_kwh, ghi_kwh_m2]) => {
    const flagged = period_start === FLAGGED_MONTH;
    const flag_reasons = flagged ? [...JUNE_FLAG_REASONS] : [];
    if (utility_kwh === null) flag_reasons.push(TWO_WAY_NOTE);

    return {
      period_start,
      inverter_kwh,
      utility_kwh,
      expected_kwh,
      inv_vs_expected_pct: pct(inverter_kwh, expected_kwh),
      // Note the divisor: reconcile.ts:71 divides INV→UTL by the INVERTER
      // reading, not the utility reading.
      inv_vs_utility_pct:
        utility_kwh === null
          ? null
          : round1(((inverter_kwh - utility_kwh) / inverter_kwh) * 100),
      util_vs_expected_pct:
        utility_kwh === null ? null : pct(utility_kwh, expected_kwh),
      status: flagged ? "flagged" : "verified",
      flag_reasons,
      estimated_revenue: Math.round(inverter_kwh * PPA_RATE),
      ghi_kwh_m2,
      // Spec 19: this whole series is a modelled operating history.
      data_provenance: "simulated" as const,
      ...(flagged ? { classification: JUNE_CLASSIFICATION } : {}),
    };
  },
);

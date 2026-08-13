// Mirror of /ecoxchange-reconciliation-engine/src/reconciliation/reconcile.ts.
// Keep in sync.
//
// SPEC 23 DIVERGENCE — read before trusting a verdict from this file.
//
// The engine now judges CHECK A (inverter vs expected) against a per-plant
// adaptive band derived from that plant's own residual volatility, not against
// the flat ±15% below. This bridge deliberately does NOT implement that: it
// serves developer onboarding, where a prospective project has no verification
// history and therefore no calibration, so the engine itself would run it at
// PENDING_CALIBRATION cap bands rather than at ±15%.
//
// The consequence, stated so nobody has to rediscover it: a verdict from this
// bridge is NOT the verdict the engine would produce for a calibrated plant,
// and it is more permissive than the engine's cap bands too. Treat it as an
// onboarding preview. If this ever needs to agree with the engine, import
// `thresholds.ts` rather than widening these constants.

export interface ToleranceConfig {
  inv_vs_expected_upper_pct: number;
  inv_vs_expected_lower_pct: number;
  inv_vs_utility_pct: number;
  util_vs_expected_upper_pct: number;
  util_vs_expected_lower_pct: number;
  min_data_completeness_pct: number;
}

export const DEFAULT_TOLERANCES: ToleranceConfig = {
  inv_vs_expected_upper_pct: 15,
  inv_vs_expected_lower_pct: -15,
  inv_vs_utility_pct: 10,
  util_vs_expected_upper_pct: 20,
  util_vs_expected_lower_pct: -20,
  min_data_completeness_pct: 90,
};

export type DataQuality = "complete" | "partial" | "missing" | "error";

export interface RawReading {
  kwh_gross?: number | null;
  kwh_net?: number | null;
  data_quality?: DataQuality;
  quality_notes?: string;
  raw_response?: unknown;
}

export interface ReconciliationInput {
  inverter_reading: RawReading | null;
  utility_reading: RawReading | null;
  expected_kwh: number;
  tolerances?: ToleranceConfig;
}

export type VerificationStatus = "verified" | "flagged" | "pending";

export interface ReconciliationOutput {
  status: VerificationStatus;
  inverter_kwh: number | null;
  utility_kwh: number | null;
  expected_kwh: number;
  inv_vs_expected_pct: number | null;
  inv_vs_utility_pct: number | null;
  util_vs_expected_pct: number | null;
  flag_reasons: string[];
  tolerance_config: ToleranceConfig;
}

export function reconcile(input: ReconciliationInput): ReconciliationOutput {
  const tolerances = input.tolerances ?? DEFAULT_TOLERANCES;
  const expected_kwh = input.expected_kwh;
  const reasons: string[] = [];
  let blocking = false;

  const inverter_kwh = input.inverter_reading?.kwh_gross ?? null;
  const utility_kwh = input.utility_reading?.kwh_net ?? null;

  if (inverter_kwh === null) {
    return {
      status: "pending",
      inverter_kwh: null,
      utility_kwh,
      expected_kwh,
      inv_vs_expected_pct: null,
      inv_vs_utility_pct: null,
      util_vs_expected_pct:
        utility_kwh !== null && expected_kwh > 0
          ? ((utility_kwh - expected_kwh) / expected_kwh) * 100
          : null,
      flag_reasons: ["Inverter production data not available for this period"],
      tolerance_config: tolerances,
    };
  }

  if (
    input.inverter_reading?.data_quality === "missing" ||
    input.inverter_reading?.data_quality === "error"
  ) {
    return {
      status: "pending",
      inverter_kwh,
      utility_kwh,
      expected_kwh,
      inv_vs_expected_pct: null,
      inv_vs_utility_pct: null,
      util_vs_expected_pct: null,
      flag_reasons: [
        `Inverter data quality: ${input.inverter_reading.data_quality}`,
      ],
      tolerance_config: tolerances,
    };
  }

  if (input.inverter_reading?.data_quality === "partial") {
    reasons.push(
      `Inverter data is partial: ${input.inverter_reading.quality_notes ?? "some days missing"}`,
    );
  }

  const inv_vs_expected_pct =
    expected_kwh > 0 ? ((inverter_kwh - expected_kwh) / expected_kwh) * 100 : 0;

  let inv_vs_utility_pct: number | null = null;
  if (utility_kwh !== null && inverter_kwh > 0) {
    inv_vs_utility_pct = ((inverter_kwh - utility_kwh) / inverter_kwh) * 100;
  }

  let util_vs_expected_pct: number | null = null;
  if (utility_kwh !== null && expected_kwh > 0) {
    util_vs_expected_pct = ((utility_kwh - expected_kwh) / expected_kwh) * 100;
  }

  if (inv_vs_expected_pct > tolerances.inv_vs_expected_upper_pct) {
    reasons.push(
      `Inverter production ${inv_vs_expected_pct.toFixed(1)}% ABOVE expected (threshold: +${tolerances.inv_vs_expected_upper_pct}%). Possible causes: satellite underestimate, meter calibration error, system upgrade not reflected in specs.`,
    );
    blocking = true;
  }
  if (inv_vs_expected_pct < tolerances.inv_vs_expected_lower_pct) {
    reasons.push(
      `Inverter production ${Math.abs(inv_vs_expected_pct).toFixed(1)}% BELOW expected (threshold: ${tolerances.inv_vs_expected_lower_pct}%). Possible causes: panel degradation exceeding model, soiling, shading, inverter fault, curtailment.`,
    );
    blocking = true;
  }
  if (
    inv_vs_utility_pct !== null &&
    Math.abs(inv_vs_utility_pct) > tolerances.inv_vs_utility_pct
  ) {
    reasons.push(
      `Inverter and utility meter diverge by ${Math.abs(inv_vs_utility_pct).toFixed(1)}% (threshold: ±${tolerances.inv_vs_utility_pct}%). Possible causes: significant on-site consumption, meter fault, data lag between sources.`,
    );
    blocking = true;
  }
  if (util_vs_expected_pct !== null) {
    if (util_vs_expected_pct > tolerances.util_vs_expected_upper_pct) {
      reasons.push(
        `Utility meter ${util_vs_expected_pct.toFixed(1)}% ABOVE expected (threshold: +${tolerances.util_vs_expected_upper_pct}%). Possible causes: satellite irradiance underestimate, meter error.`,
      );
      blocking = true;
    }
    if (util_vs_expected_pct < tolerances.util_vs_expected_lower_pct) {
      reasons.push(
        `Utility meter ${Math.abs(util_vs_expected_pct).toFixed(1)}% BELOW expected (threshold: ${tolerances.util_vs_expected_lower_pct}%). Possible causes: high on-site consumption, curtailment, system issue.`,
      );
      blocking = true;
    }
  }

  if (utility_kwh === null) {
    reasons.push(
      "Utility meter data not available — verification based on inverter vs. satellite only (two-way check).",
    );
  }

  return {
    status: blocking ? "flagged" : "verified",
    inverter_kwh,
    utility_kwh,
    expected_kwh,
    inv_vs_expected_pct,
    inv_vs_utility_pct,
    util_vs_expected_pct,
    flag_reasons: reasons,
    tolerance_config: tolerances,
  };
}

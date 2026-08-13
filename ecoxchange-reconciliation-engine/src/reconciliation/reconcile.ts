import type {
  ReconciliationInput,
  ReconciliationOutput,
} from "../utils/types.js";
import { classifyAnomaly } from "./classify.js";
import { calibrationLabel, toToleranceConfig } from "./thresholds.js";

/**
 * Three-way reconciliation: inverter ↔ utility meter ↔ expected (satellite).
 * Pure function. See spec §3.2.
 */
export function reconcile(input: ReconciliationInput): ReconciliationOutput {
  const { inverter_reading, utility_reading, expected_generation, tolerances } =
    input;

  const expected_kwh = expected_generation.expected_kwh;
  const flag_reasons: string[] = [];
  let has_blocking_gap = false;

  const inverter_kwh = inverter_reading?.kwh_gross ?? null;
  const utility_kwh = utility_reading?.kwh_net ?? null;

  // STEP 1: data availability
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
    inverter_reading?.data_quality === "missing" ||
    inverter_reading?.data_quality === "error"
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
        `Inverter data quality: ${inverter_reading.data_quality}`,
      ],
      tolerance_config: tolerances,
    };
  }

  if (inverter_reading?.data_quality === "partial") {
    flag_reasons.push(
      `Inverter data is partial: ${inverter_reading.quality_notes ?? "some days missing"}`,
    );
  }

  // STEP 2: deviation percentages
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

  // STEP 3: tolerance checks
  //
  // CHECK A is the only leg with per-plant adaptive bands (spec 23). When
  // `bands` is supplied, the effective CHECK A thresholds come from the plant's
  // own calibration; `tolerances` still supplies B and C, which stay flat
  // because neither leg has a measured residual distribution behind it.
  const bandLabel = input.bands ? calibrationLabel(input.bands) : null;
  const gateUpper = input.bands
    ? input.bands.gate
    : tolerances.inv_vs_expected_upper_pct;
  const gateLower = input.bands
    ? -input.bands.gate
    : tolerances.inv_vs_expected_lower_pct;
  const bandNote = input.bands
    ? `plant gate band: ±${input.bands.gate.toFixed(1)}%, ${bandLabel}`
    : null;

  if (inv_vs_expected_pct > gateUpper) {
    flag_reasons.push(
      `Inverter production ${inv_vs_expected_pct.toFixed(1)}% ABOVE expected ` +
        `(${bandNote ?? `threshold: +${gateUpper}%`}). ` +
        `Possible causes: satellite underestimate, meter calibration error, system upgrade not reflected in specs.`,
    );
    has_blocking_gap = true;
  }
  if (inv_vs_expected_pct < gateLower) {
    flag_reasons.push(
      `Inverter production ${Math.abs(inv_vs_expected_pct).toFixed(1)}% BELOW expected ` +
        `(${bandNote ?? `threshold: ${gateLower}%`}). ` +
        `Possible causes: panel degradation exceeding model, soiling, shading, inverter fault, curtailment.`,
    );
    has_blocking_gap = true;
  }

  // Spec 23 §5. The detect band observes; two consecutive breaches block.
  // Residual lag-1 autocorrelation is +0.445, so a repeat is signal where a
  // single month usually is not — and sustained moderate underperformance that
  // never trips the wide gate is exactly what real degradation looks like.
  let detect_exceeded = false;
  let persistence_triggered = false;
  if (input.bands) {
    detect_exceeded = Math.abs(inv_vs_expected_pct) > input.bands.detect;
    persistence_triggered = detect_exceeded && input.prior_detect_exceeded === true;
    if (persistence_triggered) {
      flag_reasons.push(
        `Production has been outside the ±${input.bands.detect.toFixed(1)}% detection band ` +
          `for two consecutive periods (${bandLabel}). Sustained divergence of this ` +
          `shape indicates a developing issue — soiling, degradation beyond model, ` +
          `or partial equipment failure — rather than single-month noise.`,
      );
      has_blocking_gap = true;
    }
  }

  if (inv_vs_utility_pct !== null) {
    if (Math.abs(inv_vs_utility_pct) > tolerances.inv_vs_utility_pct) {
      flag_reasons.push(
        `Inverter and utility meter diverge by ${Math.abs(inv_vs_utility_pct).toFixed(1)}% ` +
          `(threshold: ±${tolerances.inv_vs_utility_pct}%). ` +
          `Possible causes: significant on-site consumption, meter fault, data lag between sources.`,
      );
      has_blocking_gap = true;
    }
  }

  if (util_vs_expected_pct !== null) {
    if (util_vs_expected_pct > tolerances.util_vs_expected_upper_pct) {
      flag_reasons.push(
        `Utility meter ${util_vs_expected_pct.toFixed(1)}% ABOVE expected ` +
          `(threshold: +${tolerances.util_vs_expected_upper_pct}%). ` +
          `Possible causes: satellite irradiance underestimate, meter error.`,
      );
      has_blocking_gap = true;
    }
    if (util_vs_expected_pct < tolerances.util_vs_expected_lower_pct) {
      flag_reasons.push(
        `Utility meter ${Math.abs(util_vs_expected_pct).toFixed(1)}% BELOW expected ` +
          `(threshold: ${tolerances.util_vs_expected_lower_pct}%). ` +
          `Possible causes: high on-site consumption, curtailment, system issue.`,
      );
      has_blocking_gap = true;
    }
  }

  // STEP 4: verdict
  if (utility_kwh === null) {
    flag_reasons.push(
      "Utility meter data not available — verification based on inverter vs. satellite only (two-way check).",
    );
  }

  const status = has_blocking_gap ? "flagged" : "verified";

  return {
    status,
    inverter_kwh,
    utility_kwh,
    expected_kwh,
    inv_vs_expected_pct,
    inv_vs_utility_pct,
    util_vs_expected_pct,
    flag_reasons,
    // Records the bands actually used, not the defaults — with adaptive CHECK A
    // the two differ, and this JSONB is what an investor dispute is settled from.
    tolerance_config: input.bands
      ? toToleranceConfig(input.bands, tolerances)
      : tolerances,
    // Diagnosis only — the verdict above is already decided (spec 7).
    ...(status === "flagged"
      ? {
          classification: classifyAnomaly(
            inv_vs_expected_pct,
            inv_vs_utility_pct,
            util_vs_expected_pct,
            input.classification_context,
          ),
        }
      : {}),
    ...(input.bands
      ? {
          calibration_id: input.bands.calibrationId,
          gate_band_pct: input.bands.gate,
          detect_band_pct: input.bands.detect,
          detect_exceeded,
          persistence_triggered,
          pending_calibration: input.bands.calibrationId === null,
        }
      : {}),
  };
}

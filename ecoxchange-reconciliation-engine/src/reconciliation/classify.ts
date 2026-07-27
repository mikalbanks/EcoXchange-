// Anomaly classification for FLAGGED reconciliation records (upgrade
// spec 7). Heuristic, not ML: each rule matches the known physical
// signature of a failure mode using the deviations the engine already
// computes plus optional monthly context. The classifier NEVER changes
// the verified/flagged/pending verdict — it only adds diagnosis to a
// record that is already flagged. Rules are transcribed from the spec
// verbatim (thresholds, ordering, confidence levels).

export type AnomalyCategory =
  | "soiling"
  | "inverter_fault"
  | "curtailment"
  | "meter_error"
  | "weather_anomaly"
  | "degradation"
  | "shading"
  | "unknown";

export interface AnomalyClassification {
  category: AnomalyCategory;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  recommended_action: string;
}

export interface ClassificationContext {
  months_since_last_clean?: number | null;
  has_tracking?: boolean;
  season?: "winter" | "spring" | "summer" | "fall";
  prior_month_status?: "verified" | "flagged" | "pending";
  prior_month_inv_vs_expected?: number | null;
  /** GHI for the period vs the location's historical average, in percent. */
  ghi_vs_historical_avg_pct?: number | null;
  inverter_uptime_pct?: number | null;
}

export function classifyAnomaly(
  inv_vs_expected_pct: number | null,
  inv_vs_utility_pct: number | null,
  util_vs_expected_pct: number | null,
  context: ClassificationContext = {},
): AnomalyClassification {
  const {
    prior_month_status = "verified",
    prior_month_inv_vs_expected = null,
    ghi_vs_historical_avg_pct = null,
  } = context;
  void util_vs_expected_pct; // reported in the record; rules key off the other two

  // ─────────────────────────────────────────────
  // RULE 1: Weather Anomaly
  // Signature: expected itself is the outlier — satellite shows unusually
  // low irradiance and the inverter tracks expected reasonably well.
  // ─────────────────────────────────────────────
  if (ghi_vs_historical_avg_pct !== null && ghi_vs_historical_avg_pct < -20) {
    if (inv_vs_expected_pct !== null && Math.abs(inv_vs_expected_pct) < 10) {
      return {
        category: "weather_anomaly",
        confidence: "high",
        reasoning:
          `Satellite irradiance for this period was ` +
          `${Math.abs(ghi_vs_historical_avg_pct).toFixed(0)}% below the ` +
          `historical average for this location. The system appears to be ` +
          `performing normally given the reduced solar resource.`,
        recommended_action:
          "No action required. Production shortfall is due to weather, " +
          "not system performance. Monitor next month for return to " +
          "normal levels.",
      };
    }
  }

  // ─────────────────────────────────────────────
  // RULE 2: Inverter Fault
  // Signature: inverter significantly below expected AND significantly
  // below the utility meter — under-reporting or partially offline.
  // ─────────────────────────────────────────────
  if (
    inv_vs_expected_pct !== null &&
    inv_vs_expected_pct < -15 &&
    inv_vs_utility_pct !== null &&
    inv_vs_utility_pct < -8
  ) {
    return {
      category: "inverter_fault",
      confidence: "high",
      reasoning:
        `Inverter reports ${Math.abs(inv_vs_expected_pct).toFixed(1)}% less ` +
        `than expected, and ${Math.abs(inv_vs_utility_pct).toFixed(1)}% less ` +
        `than the utility meter. This pattern is consistent with partial ` +
        `inverter downtime or a monitoring gap.`,
      recommended_action:
        "Check inverter uptime logs for outages during this period. " +
        "Verify inverter firmware and communication module status. If " +
        "inverter was replaced or restarted, update the project record.",
    };
  }

  // ─────────────────────────────────────────────
  // RULE 3: Soiling
  // Signature: progressive decline over consecutive months, with
  // inverter and utility agreeing (rules out a monitoring error).
  // ─────────────────────────────────────────────
  if (
    inv_vs_expected_pct !== null &&
    inv_vs_expected_pct > -25 &&
    inv_vs_expected_pct < -10 &&
    prior_month_inv_vs_expected !== null &&
    prior_month_inv_vs_expected < -5 &&
    (inv_vs_utility_pct === null || Math.abs(inv_vs_utility_pct) < 8)
  ) {
    return {
      category: "soiling",
      confidence: "medium",
      reasoning:
        `Production has declined progressively — ` +
        `${Math.abs(prior_month_inv_vs_expected).toFixed(1)}% below expected ` +
        `last month, ${Math.abs(inv_vs_expected_pct).toFixed(1)}% this month. ` +
        `Inverter and utility meter agree, ruling out a monitoring error. ` +
        `This pattern is consistent with soiling accumulation.`,
      recommended_action:
        "Schedule panel cleaning. After cleaning, compare next month's " +
        "production to expected generation. Consider adding a soiling " +
        "monitoring sensor or adjusting the cleaning schedule for this site.",
    };
  }

  // ─────────────────────────────────────────────
  // RULE 4: Curtailment
  // Signature: sudden drop from a verified month, with the inverter
  // reporting MORE than the utility meter exported.
  // ─────────────────────────────────────────────
  if (
    inv_vs_expected_pct !== null &&
    inv_vs_expected_pct < -15 &&
    prior_month_status === "verified" &&
    inv_vs_utility_pct !== null &&
    inv_vs_utility_pct > 5
  ) {
    return {
      category: "curtailment",
      confidence: "medium",
      reasoning:
        `Production dropped ${Math.abs(inv_vs_expected_pct).toFixed(1)}% from ` +
        `a previously verified month, and inverter reports ` +
        `${inv_vs_utility_pct.toFixed(1)}% more than the utility meter ` +
        `exported. This pattern is consistent with grid curtailment — the ` +
        `system produced power that was not accepted by the grid.`,
      recommended_action:
        "Check with the utility for curtailment events during this " +
        "period. If curtailment is confirmed, exclude curtailed days from " +
        "the verification window and re-run reconciliation.",
    };
  }

  // ─────────────────────────────────────────────
  // RULE 5: Meter Error
  // Signature: inverter tracks expected well, but the utility meter
  // diverges significantly from both.
  // ─────────────────────────────────────────────
  if (
    inv_vs_expected_pct !== null &&
    Math.abs(inv_vs_expected_pct) < 10 &&
    inv_vs_utility_pct !== null &&
    Math.abs(inv_vs_utility_pct) > 15
  ) {
    return {
      category: "meter_error",
      confidence: "medium",
      reasoning:
        `Inverter production aligns with expected generation (within ` +
        `${Math.abs(inv_vs_expected_pct).toFixed(1)}%), but the utility ` +
        `meter diverges by ${Math.abs(inv_vs_utility_pct).toFixed(1)}%. ` +
        `This suggests a utility meter reading error, data lag, or a ` +
        `change in on-site consumption.`,
      recommended_action:
        "Verify utility meter data for this period. Check for estimated " +
        "vs. actual reads. If the meter was recently replaced or " +
        "recalibrated, note the change date.",
    };
  }

  // ─────────────────────────────────────────────
  // RULE 6: Accelerated Degradation
  // Signature: steady deficit with stable month-over-month deviation,
  // all sources agreeing.
  // ─────────────────────────────────────────────
  if (
    inv_vs_expected_pct !== null &&
    inv_vs_expected_pct > -30 &&
    inv_vs_expected_pct < -12 &&
    prior_month_inv_vs_expected !== null &&
    Math.abs(inv_vs_expected_pct - prior_month_inv_vs_expected) < 3 &&
    (inv_vs_utility_pct === null || Math.abs(inv_vs_utility_pct) < 6)
  ) {
    return {
      category: "degradation",
      confidence: "low",
      reasoning:
        `Production is consistently ` +
        `${Math.abs(inv_vs_expected_pct).toFixed(1)}% below expected, with ` +
        `stable month-over-month deviation. This may indicate that actual ` +
        `panel degradation exceeds the modeled rate of 0.75%/yr.`,
      recommended_action:
        "Consider updating the degradation rate assumption for this " +
        "project. A site inspection to check for hotspots, cracked cells, " +
        "or junction box issues is recommended.",
    };
  }

  // ─────────────────────────────────────────────
  // DEFAULT: Unknown
  // ─────────────────────────────────────────────
  return {
    category: "unknown",
    confidence: "low",
    reasoning:
      "The deviation pattern does not match a known failure signature. " +
      "Manual investigation is recommended.",
    recommended_action:
      "Review inverter logs, utility meter data, and site conditions for " +
      "this period. Contact the site operator for any known events " +
      "(equipment changes, outages, construction nearby).",
  };
}

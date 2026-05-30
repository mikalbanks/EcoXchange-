import type {
  ToleranceConfig,
  VerificationRecord,
  VerificationStatus,
} from "../data/types.js";

export const DEFAULT_TOLERANCES: ToleranceConfig = {
  inv_vs_expected_upper_pct: 15,
  inv_vs_expected_lower_pct: -15,
  inv_vs_utility_pct: 10,
  util_vs_expected_upper_pct: 20,
  util_vs_expected_lower_pct: -20,
  min_data_completeness_pct: 90,
};

interface ReconcileResult {
  status: VerificationStatus;
  inv_vs_expected_pct: number | null;
  inv_vs_utility_pct: number | null;
  util_vs_expected_pct: number | null;
  flag_reasons: string[];
}

export function normalizeToleranceConfig(value: unknown): ToleranceConfig {
  if (!value || typeof value !== "object") return DEFAULT_TOLERANCES;
  const raw = value as Partial<ToleranceConfig>;
  return {
    inv_vs_expected_upper_pct: numberOrDefault(
      raw.inv_vs_expected_upper_pct,
      15,
    ),
    inv_vs_expected_lower_pct: numberOrDefault(
      raw.inv_vs_expected_lower_pct,
      -15,
    ),
    inv_vs_utility_pct: numberOrDefault(raw.inv_vs_utility_pct, 10),
    util_vs_expected_upper_pct: numberOrDefault(
      raw.util_vs_expected_upper_pct,
      20,
    ),
    util_vs_expected_lower_pct: numberOrDefault(
      raw.util_vs_expected_lower_pct,
      -20,
    ),
    min_data_completeness_pct: numberOrDefault(
      raw.min_data_completeness_pct,
      90,
    ),
  };
}

export function applyReconciliation(
  record: VerificationRecord,
): VerificationRecord {
  const tolerances = normalizeToleranceConfig(record.tolerance_config);
  const result = reconcileStoredValues(record, tolerances);
  const persisted =
    record.persisted_status ?? normalizePersistedStatus(record.status);
  const mismatch =
    persisted !== undefined &&
    result.status !== "data_required" &&
    persisted !== result.status;

  return {
    ...record,
    ...result,
    tolerance_config: tolerances,
    persisted_status: persisted,
    verification_mismatch: mismatch,
    flag_reasons: mismatch
      ? [
          ...result.flag_reasons,
          `Stored status is ${persisted}; recalculated engine status is ${result.status}.`,
        ]
      : result.flag_reasons,
  };
}

function reconcileStoredValues(
  record: VerificationRecord,
  tolerances: ToleranceConfig,
): ReconcileResult {
  const expected = record.expected_kwh;
  const inverter = record.inverter_kwh;
  const utility = record.utility_kwh;
  const flagReasons: string[] = [];
  let hasBlockingGap = false;

  if (expected === null || expected <= 0) {
    return {
      status: "data_required",
      inv_vs_expected_pct: null,
      inv_vs_utility_pct: null,
      util_vs_expected_pct: null,
      flag_reasons: ["Expected production is not available for this period."],
    };
  }

  const utilVsExpected =
    utility !== null ? ((utility - expected) / expected) * 100 : null;

  if (inverter === null) {
    return {
      status: "pending",
      inv_vs_expected_pct: null,
      inv_vs_utility_pct: null,
      util_vs_expected_pct: utilVsExpected,
      flag_reasons: [
        "Inverter production data is not available for this period.",
      ],
    };
  }

  const invVsExpected = ((inverter - expected) / expected) * 100;
  const invVsUtility =
    utility !== null && inverter > 0
      ? ((inverter - utility) / inverter) * 100
      : null;

  if (invVsExpected > tolerances.inv_vs_expected_upper_pct) {
    flagReasons.push(
      `Inverter production is ${invVsExpected.toFixed(1)}% above expected production.`,
    );
    hasBlockingGap = true;
  }

  if (invVsExpected < tolerances.inv_vs_expected_lower_pct) {
    flagReasons.push(
      `Inverter production is ${Math.abs(invVsExpected).toFixed(1)}% below expected production.`,
    );
    hasBlockingGap = true;
  }

  if (
    invVsUtility !== null &&
    Math.abs(invVsUtility) > tolerances.inv_vs_utility_pct
  ) {
    flagReasons.push(
      `Inverter and utility meter data diverge by ${Math.abs(invVsUtility).toFixed(1)}%.`,
    );
    hasBlockingGap = true;
  }

  if (
    utilVsExpected !== null &&
    utilVsExpected > tolerances.util_vs_expected_upper_pct
  ) {
    flagReasons.push(
      `Utility meter production is ${utilVsExpected.toFixed(1)}% above expected production.`,
    );
    hasBlockingGap = true;
  }

  if (
    utilVsExpected !== null &&
    utilVsExpected < tolerances.util_vs_expected_lower_pct
  ) {
    flagReasons.push(
      `Utility meter production is ${Math.abs(utilVsExpected).toFixed(1)}% below expected production.`,
    );
    hasBlockingGap = true;
  }

  if (utility === null) {
    flagReasons.push(
      "Utility meter data is not available; verification is based on inverter and satellite model data.",
    );
  }

  return {
    status: hasBlockingGap ? "flagged" : "verified",
    inv_vs_expected_pct: invVsExpected,
    inv_vs_utility_pct: invVsUtility,
    util_vs_expected_pct: utilVsExpected,
    flag_reasons: flagReasons,
  };
}

function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizePersistedStatus(
  status: VerificationStatus,
): Exclude<VerificationStatus, "data_required"> | undefined {
  return status === "data_required" ? undefined : status;
}

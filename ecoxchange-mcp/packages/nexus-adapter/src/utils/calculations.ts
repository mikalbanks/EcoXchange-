import type { DbProject, DbVerificationRecord } from "../db/types.js";

const HOURS_PER_YEAR = 8760;
const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

export function yearsOperating(commissioningDate: string, asOf = new Date()): number {
  const start = new Date(commissioningDate + "T00:00:00Z").getTime();
  return Math.max(0, (asOf.getTime() - start) / MS_PER_YEAR);
}

/**
 * Annualized kWh derived from N months of inverter readings.
 * Returns null if no valid inverter data is present.
 */
export function annualKwh(records: DbVerificationRecord[]): number | null {
  const withData = records.filter((r) => r.inverter_kwh !== null);
  if (withData.length === 0) return null;
  const sum = withData.reduce((s, r) => s + (r.inverter_kwh ?? 0), 0);
  return (sum * 12) / withData.length;
}

export function capacityFactorPct(
  project: Pick<DbProject, "capacity_kw_dc">,
  records: DbVerificationRecord[],
): number | null {
  const annual = annualKwh(records);
  if (annual === null || project.capacity_kw_dc <= 0) return null;
  return (annual / (project.capacity_kw_dc * HOURS_PER_YEAR)) * 100;
}

/** mean |deviation| in percent. Skips records with no inverter data. */
export function meanAbsDeviationPct(records: DbVerificationRecord[]): number {
  const xs = records
    .map((r) => r.inv_vs_expected_pct)
    .filter((v): v is number => v !== null);
  if (xs.length === 0) return 0;
  return xs.reduce((s, v) => s + Math.abs(v), 0) / xs.length;
}

export function maxAbsDeviationPct(records: DbVerificationRecord[]): number {
  const xs = records
    .map((r) => r.inv_vs_expected_pct)
    .filter((v): v is number => v !== null);
  if (xs.length === 0) return 0;
  return xs.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
}

export function stdDevPct(records: DbVerificationRecord[]): number {
  const xs = records
    .map((r) =>
      r.inverter_kwh !== null && r.expected_kwh > 0
        ? r.inverter_kwh / r.expected_kwh
        : null,
    )
    .filter((v): v is number => v !== null);
  if (xs.length < 2) return 0;
  const mean = xs.reduce((s, v) => s + v, 0) / xs.length;
  const variance =
    xs.reduce((s, v) => s + (v - mean) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance) * 100; // pct
}

export function monthsBelowFraction(
  records: DbVerificationRecord[],
  fraction: number,
): number {
  return records.filter(
    (r) =>
      r.inverter_kwh !== null &&
      r.expected_kwh > 0 &&
      r.inverter_kwh / r.expected_kwh < fraction,
  ).length;
}

export function consecutiveUnderperformanceMax(
  records: DbVerificationRecord[],
): number {
  let best = 0;
  let cur = 0;
  for (const r of records) {
    if (
      r.inverter_kwh !== null &&
      r.expected_kwh > 0 &&
      r.inverter_kwh < r.expected_kwh
    ) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

/**
 * OLS slope of (inverter/expected) ratio vs time-since-commissioning (years).
 * Returned as a percentage-per-year (e.g. -0.0075 → -0.75 %/yr).
 * Null if fewer than 3 data points.
 */
export function observedDegradationTrendPctPerYear(
  project: Pick<DbProject, "commissioning_date">,
  records: DbVerificationRecord[],
): number | null {
  const pts = records
    .map((r) => {
      if (r.inverter_kwh === null || r.expected_kwh <= 0) return null;
      const t = yearsOperating(
        project.commissioning_date,
        new Date(r.period_start + "T00:00:00Z"),
      );
      return { x: t, y: r.inverter_kwh / r.expected_kwh };
    })
    .filter((p): p is { x: number; y: number } => p !== null);
  if (pts.length < 3) return null;
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p.x, 0);
  const sy = pts.reduce((s, p) => s + p.y, 0);
  const sxx = pts.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom; // ratio per year
  return slope * 100; // pct per year
}

export function flagRatePct(records: DbVerificationRecord[]): number {
  if (records.length === 0) return 0;
  const flagged = records.filter((r) => r.status === "flagged").length;
  return (flagged / records.length) * 100;
}

export function dataCompletenessPct(records: DbVerificationRecord[]): number {
  if (records.length === 0) return 0;
  const full = records.filter(
    (r) => r.inverter_kwh !== null && r.utility_kwh !== null,
  ).length;
  return (full / records.length) * 100;
}

export function twoWayVerificationMonths(records: DbVerificationRecord[]): number {
  return records.filter(
    (r) => r.inverter_kwh !== null && r.utility_kwh === null,
  ).length;
}

export function revenueVolatilityPct(
  records: DbVerificationRecord[],
): number {
  const xs = records
    .map((r) => r.estimated_revenue ?? 0)
    .filter((v) => v > 0);
  if (xs.length < 2) return 0;
  const mean = xs.reduce((s, v) => s + v, 0) / xs.length;
  if (mean === 0) return 0;
  const variance =
    xs.reduce((s, v) => s + (v - mean) ** 2, 0) / (xs.length - 1);
  return (Math.sqrt(variance) / mean) * 100;
}

/**
 * 5th-percentile monthly revenue × 12 → conservative annual revenue floor.
 */
export function revenueAtRiskP95Annual(
  records: DbVerificationRecord[],
): number | null {
  const xs = records
    .map((r) => r.estimated_revenue ?? 0)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const idx = Math.max(0, Math.floor(0.05 * xs.length));
  return xs[idx] * 12;
}

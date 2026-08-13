/**
 * Spec 23 §4 — fitting a plant's calibration.
 *
 * Pure module: takes verification history in, gives a fit out. Persistence and
 * versioning live in `db/project-calibration.ts`; the rules that make a
 * calibration trustworthy are enforced in both places, because only one of them
 * is a database.
 *
 * The load-bearing rules, all from §4:
 *
 *   - Fit over STABLE SEASON ONLY (Mar–Nov). Including winter inflates the MAD
 *     roughly 2.4x (12.0% vs 5.1%, spec 20 §4.1) and produces bands too wide all
 *     year. Winter is handled by a multiplier at judgment time instead.
 *   - Under 4 stable months, there is no fit. The plant runs at cap bands and is
 *     PENDING_CALIBRATION, which IS NOT A VERIFIED STATE.
 *   - Frozen at write. Never re-fit on a rolling basis: a rolling fit absorbs
 *     the degradation trend, and a degradation monitor that calibrates away
 *     degradation monitors nothing.
 */
import {
  COHORT_MEDIAN_MAD_PCT,
  MIN_MONTHS_FOR_OWN_SEASONAL_FACTORS,
  MIN_STABLE_MONTHS_FOR_CALIBRATION,
  SEASONAL_FACTORS,
  STABLE_SEASON_MONTHS,
} from "./thresholds.js";

/** The slice of a verification record a fit needs. */
export interface CalibrationInputRecord {
  /** ISO date, first of the month. */
  period_start: string;
  /** Inverter vs expected, percent. Null rows (pending periods) are ignored. */
  inv_vs_expected_pct: number | null;
}

export interface CalibrationFit {
  residualMadPct: number;
  plantFactor: number;
  seasonalFactors: Record<number, number>;
  windowStart: string;
  windowEnd: string;
  nMonthsUsed: number;
  /** True when seasonalFactors are the cohort priors rather than the plant's. */
  usedCohortSeasonalFactors: boolean;
}

/** Why a fit could not be produced. Callers map this to PENDING_CALIBRATION. */
export interface CalibrationShortfall {
  reason: "insufficient_stable_months";
  stableMonthsAvailable: number;
  stableMonthsRequired: number;
}

export type CalibrationResult =
  | { ok: true; fit: CalibrationFit }
  | { ok: false; shortfall: CalibrationShortfall };

function monthOf(periodStart: string): number {
  // period_start is a DATE ("2024-06-01"). Parsing with the Date constructor
  // would apply a timezone and can roll a first-of-month back a day; slicing the
  // ISO string cannot.
  const month = Number(periodStart.slice(5, 7));
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`unparseable period_start: ${periodStart}`);
  }
  return month;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/** Median absolute deviation about the median — robust to a single bad month. */
function medianAbsoluteDeviation(values: number[]): number {
  const med = median(values);
  return median(values.map((v) => Math.abs(v - med)));
}

/**
 * Per-month factors from the plant's own history, normalised so the stable
 * season sits at 1.0. Only produced with >= 24 months; below that the cohort
 * priors are better than a factor fitted on one or two observations per month.
 */
function ownSeasonalFactors(
  usable: Array<{ month: number; residual: number }>,
): Record<number, number> | null {
  const byMonth = new Map<number, number[]>();
  for (const { month, residual } of usable) {
    const bucket = byMonth.get(month);
    if (bucket) bucket.push(Math.abs(residual));
    else byMonth.set(month, [Math.abs(residual)]);
  }

  const stableSpread = median(
    usable
      .filter((r) => STABLE_SEASON_MONTHS.has(r.month))
      .map((r) => Math.abs(r.residual)),
  );
  if (!Number.isFinite(stableSpread) || stableSpread <= 0) return null;

  const factors: Record<number, number> = {};
  for (let month = 1; month <= 12; month++) {
    const bucket = byMonth.get(month);
    // A month the plant has never recorded keeps the cohort prior rather than
    // inventing a factor from nothing.
    factors[month] =
      bucket && bucket.length > 0
        ? round2(median(bucket) / stableSpread)
        : SEASONAL_FACTORS[month]!;
  }
  return factors;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Fit a calibration from a plant's verification history.
 *
 * `records` may be in any order and may contain nulls and winter months; this
 * filters. It does NOT filter flagged periods: a flagged month is still a real
 * observation of how this plant behaves, and excluding them would fit the band
 * to the plant's good months only and then act surprised when it flags.
 */
export function fitCalibration(records: CalibrationInputRecord[]): CalibrationResult {
  const usable = records
    .filter(
      (r): r is CalibrationInputRecord & { inv_vs_expected_pct: number } =>
        r.inv_vs_expected_pct !== null && Number.isFinite(r.inv_vs_expected_pct),
    )
    .map((r) => ({
      periodStart: r.period_start,
      month: monthOf(r.period_start),
      residual: r.inv_vs_expected_pct,
    }));

  const stable = usable.filter((r) => STABLE_SEASON_MONTHS.has(r.month));

  if (stable.length < MIN_STABLE_MONTHS_FOR_CALIBRATION) {
    return {
      ok: false,
      shortfall: {
        reason: "insufficient_stable_months",
        stableMonthsAvailable: stable.length,
        stableMonthsRequired: MIN_STABLE_MONTHS_FOR_CALIBRATION,
      },
    };
  }

  const residualMadPct = medianAbsoluteDeviation(stable.map((r) => r.residual));

  // The plant's central tendency against the model: 1.0 means the model has it
  // right on average, 0.95 means it consistently makes 5% less than modeled.
  // Distinct from the MAD, which is about spread rather than level.
  const plantFactor = round4(1 + median(stable.map((r) => r.residual)) / 100);

  const own =
    usable.length >= MIN_MONTHS_FOR_OWN_SEASONAL_FACTORS
      ? ownSeasonalFactors(usable)
      : null;

  const periods = usable.map((r) => r.periodStart).sort();

  return {
    ok: true,
    fit: {
      // A perfectly-tracking plant would fit a MAD of 0 and then flag on any
      // deviation at all. The floor in computeBand already prevents that, but
      // storing a 0 would make the stored fit look like a failed computation.
      residualMadPct: round4(Math.max(residualMadPct, 0.01)),
      plantFactor,
      seasonalFactors: own ?? { ...SEASONAL_FACTORS },
      windowStart: periods[0]!,
      windowEnd: periods[periods.length - 1]!,
      nMonthsUsed: stable.length,
      usedCohortSeasonalFactors: own === null,
    },
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * The cohort fallback, for a plant with no history at all. Not a calibration —
 * callers still treat this as PENDING_CALIBRATION — but useful for reporting
 * what a median plant's bands would look like.
 */
export const COHORT_FALLBACK_MAD_PCT = COHORT_MEDIAN_MAD_PCT;

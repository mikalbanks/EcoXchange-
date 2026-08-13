/**
 * Spec 23 §2–§3 — per-plant adaptive threshold bands.
 *
 * Supersedes the flat ±15% inverter-vs-expected band in spec v2 §3.1. That band
 * flags 40.7% of real plant-months (spec 20 §4, n=31,356), and a gate that
 * blocks 41% of distributions is not a gate.
 *
 * A band here is `k × the plant's own residual MAD`, clamped, then widened in
 * winter. Two sensitivities:
 *
 *   GATE   — wide. Breaching it blocks distribution for the period.
 *   DETECT — narrow. Breaching it alone blocks nothing; breaching it two months
 *            running does, because residual lag-1 autocorrelation is +0.445
 *            (spec 20 §6.1) — real excursions persist, single-month noise
 *            usually does not.
 *
 * Pure module: no I/O, no clock, no database. Everything here is a function of
 * its arguments, which is what makes the numbers reproducible six months after
 * a distribution when someone disputes it.
 *
 * Applies to CHECK A (inverter vs expected) ONLY. CHECK B (inverter vs utility)
 * and CHECK C (utility vs expected) keep their flat tolerances — those legs have
 * no measured residual distribution behind them, and inventing adaptive bands
 * for an unvalidated leg is exactly the error spec 20 was written to correct.
 */
import type { ToleranceConfig } from "../config/tolerances.js";

/**
 * Month number (1-12) to band multiplier, measured across 2,621 plants
 * (spec 20). Winter months carry lower factors because a winter residual is
 * dominated by low-irradiance noise rather than by plant behaviour.
 *
 * MEASURED COHORT DATA, NOT TUNING KNOBS. Re-derive these only by re-running
 * the cohort backtest; do not nudge one to make a plant look better.
 */
export const SEASONAL_FACTORS: Readonly<Record<number, number>> = Object.freeze({
  1: 0.73,
  2: 0.98,
  3: 1.04,
  4: 1.07,
  5: 1.06,
  6: 1.05,
  7: 1.06,
  8: 1.06,
  9: 1.05,
  10: 1.02,
  11: 0.94,
  12: 0.8,
});

/** Per-plant residual MAD, stable season, out-of-sample (spec 20). */
export const COHORT_MEDIAN_MAD_PCT = 3.1;

/** Months excluded from calibration and given a widened band at judgment time. */
export const WINTER_MONTHS: ReadonlySet<number> = new Set([12, 1, 2]);

/** Months a calibration may be fitted over — the complement of WINTER_MONTHS. */
export const STABLE_SEASON_MONTHS: ReadonlySet<number> = new Set([
  3, 4, 5, 6, 7, 8, 9, 10, 11,
]);

/** Fewer stable-season months than this and the plant is PENDING_CALIBRATION. */
export const MIN_STABLE_MONTHS_FOR_CALIBRATION = 4;

/** Below this many months of own history, borrow the cohort seasonal factors. */
export const MIN_MONTHS_FOR_OWN_SEASONAL_FACTORS = 24;

export interface ThresholdConfig {
  /** Multiplier on the plant's residual MAD. */
  k: number;
  /** Band never narrows below this, however quiet the plant. */
  floorPct: number;
  /** Band never widens beyond this, however noisy the plant. */
  capPct: number;
  /** Applied on top of the clamped band in WINTER_MONTHS. */
  winterMult: number;
}

/** Breaching this blocks distribution. */
export const GATE: ThresholdConfig = Object.freeze({
  k: 6,
  floorPct: 10,
  capPct: 30,
  winterMult: 2.0,
});

/** Breaching this observes; breaching it twice running blocks. */
export const DETECT: ThresholdConfig = Object.freeze({
  k: 3,
  floorPct: 5,
  capPct: 15,
  winterMult: 1.8,
});

export interface Bands {
  /** Percent, winter multiplier already applied. */
  gate: number;
  /** Percent, winter multiplier already applied. */
  detect: number;
  /** True when the winter multiplier was applied to both. */
  winterApplied: boolean;
  /** The calibration these came from; null when PENDING_CALIBRATION. */
  calibrationId: string | null;
  /** Version of that calibration, for the flag string. Null when pending. */
  calibrationVersion: number | null;
}

/**
 * The minimum a band computation needs to know about a plant. Structural rather
 * than the DB row type, so `resolveBands` can be unit-tested without a database
 * and the replay harness can feed it fitted values directly.
 */
export interface CalibrationBasis {
  id: string | null;
  calibrationVersion: number | null;
  residualMadPct: number;
}

/**
 * §3. Clamp first, then apply the winter multiplier.
 *
 * The order matters and is not interchangeable: clamping after multiplying
 * would cap the winter band at the same 30% as summer, erasing the widening
 * exactly where it was measured to be needed. A winter gate band is therefore
 * legitimately up to 60%.
 */
export function computeBand(madPct: number, month: number, cfg: ThresholdConfig): number {
  if (!Number.isFinite(madPct) || madPct < 0) {
    throw new RangeError(
      `residual MAD must be a finite, non-negative percentage; got ${madPct}`,
    );
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`month must be an integer 1-12; got ${month}`);
  }
  const band = Math.min(Math.max(cfg.k * madPct, cfg.floorPct), cfg.capPct);
  return WINTER_MONTHS.has(month) ? band * cfg.winterMult : band;
}

/**
 * Bands for one plant-month.
 *
 * With no calibration the plant runs at CAP bands (§4.1) — the widest, most
 * permissive setting, because a plant we have not measured is one we cannot
 * make claims about. That state is PENDING_CALIBRATION and, per §4.1, **is not
 * a verified state**: callers must not present it as one.
 */
export function resolveBands(
  calibration: CalibrationBasis | null,
  month: number,
): Bands {
  const winterApplied = WINTER_MONTHS.has(month);

  if (calibration === null) {
    return {
      gate: capBand(month, GATE),
      detect: capBand(month, DETECT),
      winterApplied,
      calibrationId: null,
      calibrationVersion: null,
    };
  }

  return {
    gate: computeBand(calibration.residualMadPct, month, GATE),
    detect: computeBand(calibration.residualMadPct, month, DETECT),
    winterApplied,
    calibrationId: calibration.id,
    calibrationVersion: calibration.calibrationVersion,
  };
}

function capBand(month: number, cfg: ThresholdConfig): number {
  return WINTER_MONTHS.has(month) ? cfg.capPct * cfg.winterMult : cfg.capPct;
}

/**
 * Project a gate band onto the existing ToleranceConfig shape.
 *
 * This is what keeps CHECK A adaptive while B and C stay flat without
 * `reconcile()` having to branch on whether a calibration exists: it receives a
 * ToleranceConfig either way, and only the inv_vs_expected pair has moved.
 *
 * The band is symmetric — spec 20 measured |residual|, so there is no basis for
 * an asymmetric adaptive band, and inventing one would be a guess wearing a
 * measurement's clothes.
 */
export function toToleranceConfig(bands: Bands, base: ToleranceConfig): ToleranceConfig {
  return {
    ...base,
    inv_vs_expected_upper_pct: bands.gate,
    inv_vs_expected_lower_pct: -bands.gate,
  };
}

/** Human-readable calibration reference for a flag string, per §6. */
export function calibrationLabel(bands: Bands): string {
  return bands.calibrationVersion === null
    ? "uncalibrated"
    : `calibration v${bands.calibrationVersion}`;
}

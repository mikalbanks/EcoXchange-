/**
 * Spec 19 G1 — independence assertion.
 *
 * INV (inverter-reported) and EXP (physics-modelled) are meant to be
 * independent measurements of the same physical month. Independent measurements
 * do not agree to three decimal places. Satellite irradiance alone carries
 * 5–10% monthly uncertainty.
 *
 * One month at 0.000% is a rounding coincidence. Three consecutive months is a
 * broken pipeline — either the two legs are the same number wearing different
 * labels, or a fixture generated at `monthly_deviation_pct: 0` has been mistaken
 * for engine output. That is exactly what happened in June 2026
 * (docs/spec-19-diagnostic.md): twelve records where `inverter_kwh` was
 * byte-identical to `expected_kwh`, served for two months as verification.
 *
 * This check FAILS the run. It does not warn. A warning is what lets the next
 * fixture reach a public surface.
 *
 * It lives here rather than inside `reconcile()` because `reconcile()` is a pure
 * single-period function with no visibility across periods — the pattern is only
 * detectable over a series. Call it at the boundary where records are emitted or
 * persisted, before anything is written.
 */

/** Deviations closer to zero than this count as identically zero. */
export const ZERO_DEVIATION_EPSILON = 0.001;

/** Consecutive zero-deviation periods tolerated before the run fails. */
export const MAX_CONSECUTIVE_ZERO_PERIODS = 2;

export class IndependenceViolationError extends Error {
  readonly periods: string[];

  constructor(periods: string[]) {
    super(
      `Deviation identically zero across ${periods.length} periods — ` +
        "INV and EXP are not independent. Refusing to emit verification records. " +
        `Affected periods: ${periods.join(", ")}. ` +
        "This usually means expected generation is being reused as the inverter " +
        "reading, or a backtest generated at monthly_deviation_pct: 0 is being " +
        "treated as engine output. See docs/spec-19-diagnostic.md.",
    );
    this.name = "IndependenceViolationError";
    this.periods = periods;
  }
}

export interface IndependenceCheckPeriod {
  /** Period identifier used in the error message, e.g. "2024-01-01". */
  period_start: string;
  /** Null (no inverter reading) breaks a run of zeros rather than extending it. */
  inv_vs_expected_pct: number | null;
}

/**
 * Throws {@link IndependenceViolationError} when the series contains three or
 * more consecutive periods whose INV→EXP deviation is identically zero.
 *
 * Periods are evaluated in the order given; sort chronologically before calling.
 */
export function assertDeviationIndependence(
  periods: readonly IndependenceCheckPeriod[],
): void {
  let run: string[] = [];
  let longest: string[] = [];

  for (const p of periods) {
    const isZero =
      p.inv_vs_expected_pct !== null &&
      Math.abs(p.inv_vs_expected_pct) < ZERO_DEVIATION_EPSILON;

    if (isZero) {
      run.push(p.period_start);
      if (run.length > longest.length) longest = [...run];
    } else {
      run = [];
    }
  }

  if (longest.length > MAX_CONSECUTIVE_ZERO_PERIODS) {
    throw new IndependenceViolationError(longest);
  }
}

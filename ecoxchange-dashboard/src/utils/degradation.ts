// TS mirror of the Python degradation models (verification-engine
// losses.py) so the DegradationCurve chart can render offline with the
// exact same numbers the engine produces. degradation.test.ts pins the
// same breakpoints as the Python test suite — if either side drifts, a
// test fails.

export const DEFAULT_LINEAR_RATE = 0.0075; // 0.75%/yr (NREL)

// NREL-informed piecewise segments (Jordan et al. 2016; Jordan & Kurtz 2013).
export const PIECEWISE_YEAR_0_1_RATE = 0.02; // 2% total first-year LID
export const PIECEWISE_YEAR_1_5_RATE = 0.007; // 0.7%/yr
export const PIECEWISE_YEAR_5_25_RATE = 0.005; // 0.5%/yr
export const PIECEWISE_YEAR_25_PLUS_RATE = 0.008; // 0.8%/yr

/** Historical "linear" model — geometric (1-rate)^years, name kept for
 *  API compatibility with the engine. */
export function linearDegradationFactor(
  years: number,
  rate: number = DEFAULT_LINEAR_RATE,
): number {
  if (years <= 0) return 1;
  return Math.max(0, (1 - rate) ** years);
}

/** Piecewise NREL model — multiplicative phases, each linear within its
 *  segment. Mirrors verification_engine.losses.piecewise_nrel_degradation_factor. */
export function piecewiseNrelDegradationFactor(years: number): number {
  if (years <= 0) return 1;

  let factor = 1;

  // Phase 1: LID (year 0–1)
  if (years <= 1) {
    factor *= 1 - PIECEWISE_YEAR_0_1_RATE * years;
    return Math.max(0, factor);
  }
  factor *= 1 - PIECEWISE_YEAR_0_1_RATE;

  // Phase 2: early life (year 1–5)
  let remaining = years - 1;
  if (remaining <= 4) {
    factor *= 1 - PIECEWISE_YEAR_1_5_RATE * remaining;
    return Math.max(0, factor);
  }
  factor *= 1 - PIECEWISE_YEAR_1_5_RATE * 4;

  // Phase 3: mature (year 5–25)
  remaining = years - 5;
  if (remaining <= 20) {
    factor *= 1 - PIECEWISE_YEAR_5_25_RATE * remaining;
    return Math.max(0, factor);
  }
  factor *= 1 - PIECEWISE_YEAR_5_25_RATE * 20;

  // Phase 4: end of life (year 25+)
  remaining = years - 25;
  factor *= 1 - PIECEWISE_YEAR_25_PLUS_RATE * remaining;

  return Math.max(0, factor);
}

export interface DegradationCurvePoint {
  year: number;
  linear: number; // output factor 0..1
  piecewise: number;
}

export function buildDegradationCurves(
  horizonYears = 30,
  linearRate: number = DEFAULT_LINEAR_RATE,
): DegradationCurvePoint[] {
  const points: DegradationCurvePoint[] = [];
  for (let year = 0; year <= horizonYears; year++) {
    points.push({
      year,
      linear: linearDegradationFactor(year, linearRate),
      piecewise: piecewiseNrelDegradationFactor(year),
    });
  }
  return points;
}

export function yearsSince(commissioningDate: string, asOf = new Date()): number {
  const start = new Date(`${commissioningDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, (asOf.getTime() - start) / (365.25 * 86_400_000));
}

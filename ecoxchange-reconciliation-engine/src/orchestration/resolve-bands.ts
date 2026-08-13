/**
 * Spec 23 — the one place that reads the database to answer "what bands is this
 * plant-period judged against, and did the previous period exceed detect?".
 *
 * Kept separate from `verify-period.ts` on purpose. `verifyPeriod` and
 * `reconcile` stay pure functions of their arguments, which is what lets the
 * band math be unit-tested exhaustively and lets the replay harness feed
 * thousands of plant-months through without a connection. This module is the
 * only impure part, and it does nothing but two lookups.
 */
import { getActiveCalibration } from "../db/project-calibration.js";
import { getVerificationRecord } from "../db/verification-records.js";
import { resolveBands, type Bands } from "../reconciliation/thresholds.js";

export interface PeriodBandContext {
  bands: Bands;
  prior_detect_exceeded: boolean;
  /** True when the plant has no calibration. NOT a verified state (§4.1). */
  pending_calibration: boolean;
}

/** The month number a period_start falls in, without timezone interference. */
function monthOf(periodStart: string): number {
  const month = Number(periodStart.slice(5, 7));
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`unparseable period_start: ${periodStart}`);
  }
  return month;
}

/** The first of the month immediately before `periodStart`. */
export function priorPeriodStart(periodStart: string): string {
  const year = Number(periodStart.slice(0, 4));
  const month = monthOf(periodStart);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
}

/**
 * Resolve bands and persistence state for one project-period.
 *
 * The prior-period lookup is by exact calendar month, not "the most recent
 * record". §5 requires two *consecutive* months: if a period is missing from the
 * history, the chain is broken and persistence resets. Taking the latest record
 * instead would let a breach in March pair with one in September.
 */
export async function resolveBandsForPeriod(
  projectId: string,
  periodStart: string,
): Promise<PeriodBandContext> {
  const [calibration, prior] = await Promise.all([
    getActiveCalibration(projectId),
    getVerificationRecord(projectId, priorPeriodStart(periodStart)),
  ]);

  const bands = resolveBands(
    calibration === null
      ? null
      : {
          id: calibration.id,
          calibrationVersion: calibration.calibration_version,
          residualMadPct: calibration.residual_mad_pct,
        },
    monthOf(periodStart),
  );

  return {
    bands,
    prior_detect_exceeded: prior?.detect_exceeded === true,
    pending_calibration: calibration === null,
  };
}

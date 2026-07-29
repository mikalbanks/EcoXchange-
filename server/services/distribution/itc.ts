/**
 * Spec 17 § 10 — investment tax credit. **[CPA] gated.**
 *
 * Two paths, chosen at `itc_treatment`:
 *
 *   `transferred_6418` — the credit is sold for cash. Proceeds enter
 *   `itc_transfer_proceeds` as revenue and flow through the ordinary waterfall.
 *   No partnership flip, no credit allocation, no member-level credit tracking.
 *
 *   `allocated` — the credit is allocated to members and appears on their K-1s,
 *   which requires member-level tracking and whose value varies enormously by
 *   each member's tax situation.
 *
 * **Recapture tracking is required under both paths.**
 *
 * This module computes vesting and surfaces exposure. It deliberately does not
 * compute the tax consequence of a recapture event — § 10.2 says detect and
 * alert, and a recapture calculation is a CPA's work product, not a function.
 */
import { type Cents, applyMicroPercent, formatCents, parseCents } from "./money";
import { parseMicroPercent, ONE_PERCENT_MICRO } from "@shared/spec17-terms";
import type { RecaptureEvent } from "@shared/schema";

/** The credit vests 20% per year over five years from placed-in-service. */
export const VESTING_PCT_PER_YEAR = 20;
export const RECAPTURE_PERIOD_YEARS = 5;

/**
 * Whole years elapsed, on anniversary boundaries. The anniversary is the
 * boundary that matters: a credit placed in service on 1 June vests its second
 * tranche on 1 June, not on 1 January.
 */
export function fullYearsElapsed(from: Date, asOf: Date): number {
  let years = asOf.getUTCFullYear() - from.getUTCFullYear();

  const beforeAnniversary =
    asOf.getUTCMonth() < from.getUTCMonth() ||
    (asOf.getUTCMonth() === from.getUTCMonth() && asOf.getUTCDate() < from.getUTCDate());

  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
}

/** `min(100, 20 × full years elapsed)`, as a percent. */
export function vestedPct(placedInService: Date, asOf: Date): number {
  return Math.min(100, VESTING_PCT_PER_YEAR * fullYearsElapsed(placedInService, asOf));
}

/** Percent string for persistence into `itc_positions.vested_pct` (6,3). */
export function formatVestedPct(pct: number): string {
  return pct.toFixed(3);
}

export function recapturePeriodEnd(vestingStart: Date): Date {
  return new Date(
    Date.UTC(
      vestingStart.getUTCFullYear() + RECAPTURE_PERIOD_YEARS,
      vestingStart.getUTCMonth(),
      vestingStart.getUTCDate(),
    ),
  );
}

export interface ItcPositionLike {
  id: string;
  spvId: string;
  memberId: string | null;
  placedInServiceDate: Date;
  vestingStart: Date;
  creditAmount: string;
  treatment: string;
  recapturePeriodEnds: Date;
  recaptureEvents: RecaptureEvent[];
}

export interface RecaptureExposure {
  positionId: string;
  memberId: string | null;
  treatment: string;
  creditAmount: Cents;
  vestedPct: number;
  vestedAmount: Cents;
  /** The amount still at risk if the project were disposed of today. */
  unvestedAmount: Cents;
  recapturePeriodEnds: Date;
  daysRemaining: number;
  /** True while the position is inside the five-year window. */
  atRisk: boolean;
  events: RecaptureEvent[];
}

/**
 * Exposure for one position as of a date.
 *
 * The unvested amount is the credit still at risk — it is *not* a tax
 * liability, and is labelled as exposure everywhere it surfaces.
 */
export function computeExposure(position: ItcPositionLike, asOf: Date): RecaptureExposure {
  const creditAmount = parseCents(position.creditAmount);
  const pct = vestedPct(position.vestingStart, asOf);
  const vestedAmount = applyMicroPercent(creditAmount, pct * ONE_PERCENT_MICRO);

  const msRemaining = position.recapturePeriodEnds.getTime() - asOf.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / 86_400_000));

  return {
    positionId: position.id,
    memberId: position.memberId,
    treatment: position.treatment,
    creditAmount,
    vestedPct: pct,
    vestedAmount,
    unvestedAmount: creditAmount - vestedAmount,
    recapturePeriodEnds: position.recapturePeriodEnds,
    daysRemaining,
    atRisk: daysRemaining > 0,
    events: position.recaptureEvents,
  };
}

export interface SpvRecaptureExposure {
  asOf: Date;
  positions: RecaptureExposure[];
  totalCreditAmount: Cents;
  totalUnvestedAmount: Cents;
  /** Positions still inside their five-year window. */
  positionsAtRisk: number;
  /** Positions with a recorded event that has not been escalated to the CPA. */
  unescalatedEvents: { positionId: string; event: RecaptureEvent }[];
  alerts: string[];
}

/**
 * SPV-wide exposure, for the dashboard.
 *
 * § 10.2 is explicit that the five-year window outlives the attention span of
 * any operational process, so this is surfaced for the *entire* period rather
 * than only when something happens. A recapture discovered late is a tax
 * liability plus penalties, landing on investors.
 */
export function computeSpvExposure(
  positions: ItcPositionLike[],
  asOf: Date,
  options: { alertWithinDays?: number } = {},
): SpvRecaptureExposure {
  const alertWithinDays = options.alertWithinDays ?? 90;
  const exposures = positions.map((p) => computeExposure(p, asOf));
  const alerts: string[] = [];
  const unescalatedEvents: { positionId: string; event: RecaptureEvent }[] = [];

  for (const exposure of exposures) {
    if (exposure.atRisk && exposure.daysRemaining <= alertWithinDays) {
      alerts.push(
        `ITC position ${exposure.positionId}: recapture period ends in ${exposure.daysRemaining} days ` +
          `with ${formatCents(exposure.unvestedAmount)} still unvested`,
      );
    }
    for (const event of exposure.events) {
      if (event.escalatedAt === null) {
        unescalatedEvents.push({ positionId: exposure.positionId, event });
        alerts.push(
          `ITC position ${exposure.positionId}: ${event.kind} on ${event.occurredOn} has not been ` +
            `escalated for CPA review — ${event.detail}`,
        );
      }
    }
  }

  return {
    asOf,
    positions: exposures,
    totalCreditAmount: exposures.reduce((sum, e) => sum + e.creditAmount, 0),
    totalUnvestedAmount: exposures.reduce((sum, e) => sum + e.unvestedAmount, 0),
    positionsAtRisk: exposures.filter((e) => e.atRisk).length,
    unescalatedEvents,
    alerts,
  };
}

/**
 * Record a recapture-triggering event.
 *
 * Deliberately computes no tax consequence. It captures *what happened* and
 * *how much was unvested at the time*, and marks the position for escalation —
 * the amount actually recaptured is a CPA determination.
 */
export function recordRecaptureEvent(
  position: ItcPositionLike,
  event: { kind: RecaptureEvent["kind"]; detail: string; occurredOn: Date },
): RecaptureEvent {
  const pct = vestedPct(position.vestingStart, event.occurredOn);
  return {
    occurredOn: event.occurredOn.toISOString().slice(0, 10),
    kind: event.kind,
    detail: event.detail,
    unvestedPctAtEvent: formatVestedPct(100 - pct),
    escalatedAt: null,
  };
}

/**
 * The credit amount from eligible basis, rate and adders. `adders` are
 * additional percentage points (energy community, domestic content), each a
 * percent string.
 */
export function computeCreditAmount(args: {
  eligibleBasis: string;
  creditRatePct: string;
  adders?: Record<string, string> | null;
}): Cents {
  const basis = parseCents(args.eligibleBasis);
  const adderMicro = Object.values(args.adders ?? {}).reduce(
    (sum, pct) => sum + parseMicroPercent(pct),
    0,
  );
  return applyMicroPercent(basis, parseMicroPercent(args.creditRatePct) + adderMicro);
}

/**
 * Spec 17 § 7.5 — mid-period transfers.
 *
 *   weighted_units = Σ (units_held_in_slice × days_in_slice) / days_in_period
 *
 * A transfer must move economics, not duplicate or destroy them, so the sum of
 * per-member weighted units is asserted against the day-weighted outstanding
 * total. Both the intermediate and the final rounding are exact integer
 * arithmetic (`largestRemainder`), so the stored six-decimal values sum to the
 * outstanding total to the micro-unit.
 *
 * **Period convention.** `periodStart` and `periodEnd` are both *inclusive*
 * dates: January 2026 is `2026-01-01` → `2026-01-31`, which is 31 days. A
 * position's `effectiveTo` is inclusive on the same basis; `null` means the
 * position is still open.
 */
import { largestRemainder, parseUnits, formatUnits, type MicroUnits } from "./money";

const MS_PER_DAY = 86_400_000;

export interface PositionSlice {
  memberId: string;
  effectiveFrom: Date;
  /** Inclusive. `null` = still current. */
  effectiveTo: Date | null;
  /** Units string as stored, e.g. `"1000.000000"`. */
  units: string;
}

export interface WeightedMember {
  memberId: string;
  /** Exact `Σ units_micro × days`, used as the allocation weight. */
  microUnitDays: bigint;
  /** Rounded to six decimals for persistence and display. */
  weightedUnits: string;
  weightedMicroUnits: MicroUnits;
}

export interface WeightingResult {
  members: WeightedMember[];
  daysInPeriod: number;
  /** Day-weighted units outstanding across the whole SPV. */
  totalWeightedMicroUnits: MicroUnits;
  totalWeightedUnits: string;
}

/** Whole days between two dates at UTC midnight. */
function utcDayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY);
}

export function daysInPeriod(periodStart: Date, periodEnd: Date): number {
  const days = utcDayIndex(periodEnd) - utcDayIndex(periodStart) + 1;
  if (days <= 0) {
    throw new Error(`period end ${periodEnd.toISOString()} precedes start ${periodStart.toISOString()}`);
  }
  return days;
}

/**
 * Days a slice overlaps the period, on the inclusive convention above. Returns
 * 0 when the slice is entirely outside the period.
 */
export function overlapDays(slice: PositionSlice, periodStart: Date, periodEnd: Date): number {
  const sliceFrom = utcDayIndex(slice.effectiveFrom);
  const sliceTo = slice.effectiveTo ? utcDayIndex(slice.effectiveTo) : Number.POSITIVE_INFINITY;
  const from = Math.max(sliceFrom, utcDayIndex(periodStart));
  const to = Math.min(sliceTo, utcDayIndex(periodEnd));
  return to < from ? 0 : to - from + 1;
}

/**
 * Day-weight every member's holding across the period.
 *
 * Members with zero weighted units are retained in the output with a zero
 * weight — a member who held nothing this period still belongs on the run, and
 * dropping them would quietly hide a transfer-out.
 */
export function computeWeightedUnits(
  slices: PositionSlice[],
  periodStart: Date,
  periodEnd: Date,
): WeightingResult {
  const days = daysInPeriod(periodStart, periodEnd);
  const byMember = new Map<string, bigint>();

  for (const slice of slices) {
    const overlap = overlapDays(slice, periodStart, periodEnd);
    const current = byMember.get(slice.memberId) ?? 0n;
    if (overlap === 0) {
      byMember.set(slice.memberId, current);
      continue;
    }
    byMember.set(slice.memberId, current + parseUnits(slice.units) * BigInt(overlap));
  }

  const totalMicroUnitDays = Array.from(byMember.values()).reduce((a, b) => a + b, 0n);

  // The day-weighted outstanding total, rounded half-up to micro-units once.
  const bigDays = BigInt(days);
  const totalWeightedMicroUnits =
    totalMicroUnitDays === 0n
      ? 0n
      : (totalMicroUnitDays * 2n + bigDays) / (bigDays * 2n);

  // Split that total across members by their exact micro-unit-days, so the
  // per-member figures sum to it precisely (§ 7.5's assertion).
  const weights = Array.from(byMember.entries()).map(([memberId, microUnitDays]) => ({
    id: memberId,
    weight: microUnitDays,
  }));

  const allocated =
    totalWeightedMicroUnits === 0n
      ? new Map(weights.map((w) => [w.id, 0n] as const))
      : largestRemainder(totalWeightedMicroUnits, weights);

  const members: WeightedMember[] = weights
    .map((w) => {
      const micro = allocated.get(w.id) ?? 0n;
      return {
        memberId: w.id,
        microUnitDays: w.weight,
        weightedMicroUnits: micro,
        weightedUnits: formatUnits(micro),
      };
    })
    .sort((a, b) => (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0));

  const summed = members.reduce((acc, m) => acc + m.weightedMicroUnits, 0n);
  if (summed !== totalWeightedMicroUnits) {
    throw new Error(
      `weighted units sum to ${formatUnits(summed)} but outstanding is ${formatUnits(totalWeightedMicroUnits)}`,
    );
  }

  return {
    members,
    daysInPeriod: days,
    totalWeightedMicroUnits,
    totalWeightedUnits: formatUnits(totalWeightedMicroUnits),
  };
}

/**
 * Units outstanding on a given date, ignoring day-weighting. Used by the cap
 * table reconciliation (§ 11.3), which compares point-in-time holdings against
 * the transfer agent rather than period averages.
 */
export function unitsOutstandingOn(slices: PositionSlice[], asOf: Date): Map<string, MicroUnits> {
  const asOfDay = utcDayIndex(asOf);
  const byMember = new Map<string, MicroUnits>();

  for (const slice of slices) {
    const from = utcDayIndex(slice.effectiveFrom);
    const to = slice.effectiveTo ? utcDayIndex(slice.effectiveTo) : Number.POSITIVE_INFINITY;
    const current = byMember.get(slice.memberId) ?? 0n;
    const active = from <= asOfDay && asOfDay <= to;
    byMember.set(slice.memberId, active ? current + parseUnits(slice.units) : current);
  }

  return byMember;
}

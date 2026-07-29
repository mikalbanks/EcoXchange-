/**
 * Spec 17 § 7.2 — the tier loop.
 *
 * Pure: no database, no clock, no randomness. The same distributable cash, the
 * same terms and the same member state always produce byte-identical output,
 * which is what makes § 2.1's replay guarantee testable.
 *
 * Fully traced. Every tier persists demand, allocated and unmet — a
 * partially-satisfied preferred return is a claim on future cash, and an
 * investor is entitled to see it rather than infer it from a smaller number.
 */
import {
  type Cents,
  allocateByWeights,
  assertSumEquals,
  formatCents,
  minCents,
  sumCents,
} from "./money";
import {
  computeTierDemand,
  preferredAccrualThisPeriod,
  tierClassLabel,
  type MemberState,
  type TierContext,
} from "./tiers";
import { TierType, type WaterfallTier, type MemberClass } from "@shared/spec17-terms";
import type { TierResultRecord } from "@shared/schema";

export interface WaterfallInput {
  distributable: Cents;
  tiers: WaterfallTier[];
  classes: MemberClass[];
  members: MemberState[];
  daysInPeriod: number;
}

export interface MemberWaterfallResult {
  memberId: string;
  memberClass: string;
  /** Gross before withholding and before the de-minimis carry rules. */
  gross: Cents;
  /** `{ tierSeq: amount }`. */
  byTier: Record<string, Cents>;
  /** Unpaid cumulative preferred rolling into the next period. */
  accruedUnpaidPreferredAfter: Cents;
  /** Capital repaid this period, for the capital account ledger. */
  capitalReturned: Cents;
  /** Profit distributions this period, i.e. everything that is not capital. */
  profitDistributed: Cents;
}

export interface WaterfallResult {
  tierResults: TierResultRecord[];
  members: MemberWaterfallResult[];
  totalDistributed: Cents;
  /** Cash the tiers did not claim. Rolls into the run's carry-forward. */
  undistributed: Cents;
}

export function runWaterfall(input: WaterfallInput): WaterfallResult {
  const { distributable, classes, daysInPeriod } = input;

  if (distributable < 0) {
    throw new Error(`distributable cash cannot be negative: ${formatCents(distributable)}`);
  }

  // Working copies. Later tiers must see the effect of earlier ones — a
  // catch-up tier reads the preferred that was just paid, and return of capital
  // reduces the basis a later preferred tier would accrue on.
  const state: MemberState[] = input.members.map((m) => ({ ...m }));
  const byId = new Map(state.map((m) => [m.memberId, m]));

  const accruedAfter = new Map<string, Cents>(state.map((m) => [m.memberId, m.accruedUnpaidPreferred]));
  const capitalReturned = new Map<string, Cents>(state.map((m) => [m.memberId, 0]));
  const profitDistributed = new Map<string, Cents>(state.map((m) => [m.memberId, 0]));
  const byTierPerMember = new Map<string, Record<string, Cents>>(
    state.map((m) => [m.memberId, {} as Record<string, Cents>]),
  );

  const tierResults: TierResultRecord[] = [];
  let remaining = distributable;

  const ordered = [...input.tiers].sort((a, b) => a.seq - b.seq);

  for (const tier of ordered) {
    const ctx: TierContext = { members: state, classes, daysInPeriod, remaining };

    // Demand is computed even when there is no cash left, so the trace records
    // what the tier was owed rather than silently showing nothing.
    const demand = computeTierDemand(tier, ctx);
    const allocated = remaining <= 0 ? 0 : minCents(demand.total, remaining);

    const perMember = allocateWithinTier(allocated, demand.perMember);
    applyTierEffects(tier, ctx, perMember, {
      byId,
      accruedAfter,
      capitalReturned,
      profitDistributed,
    });

    for (const [memberId, amount] of perMember) {
      if (amount === 0) continue;
      byTierPerMember.get(memberId)![String(tier.seq)] = amount;
    }

    tierResults.push({
      seq: tier.seq,
      type: tier.type,
      class: tierClassLabel(tier),
      demand: formatCents(demand.total),
      allocated: formatCents(allocated),
      unmet: formatCents(demand.total - allocated),
      accrues: demand.accrues,
      perMember: Object.fromEntries(
        Array.from(perMember.entries())
          .filter(([, amount]) => amount !== 0)
          .map(([memberId, amount]) => [memberId, formatCents(amount)]),
      ),
      perMemberDemand: Object.fromEntries(
        Array.from(demand.perMember.entries())
          .filter(([, amount]) => amount !== 0)
          .map(([memberId, amount]) => [memberId, formatCents(amount)]),
      ),
    });

    remaining -= allocated;
  }

  const members: MemberWaterfallResult[] = state
    .map((m) => {
      const byTier = byTierPerMember.get(m.memberId)!;
      return {
        memberId: m.memberId,
        memberClass: m.memberClass,
        gross: sumCents(Object.values(byTier)),
        byTier,
        accruedUnpaidPreferredAfter: accruedAfter.get(m.memberId) ?? 0,
        capitalReturned: capitalReturned.get(m.memberId) ?? 0,
        profitDistributed: profitDistributed.get(m.memberId) ?? 0,
      };
    })
    .sort((a, b) => (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0));

  const totalDistributed = sumCents(members.map((m) => m.gross));

  // The § 7.4 guard, before anything is persisted.
  assertSumEquals(
    members.map((m) => m.gross),
    distributable - remaining,
    "runWaterfall",
  );

  return {
    tierResults,
    members,
    totalDistributed,
    undistributed: remaining,
  };
}

/**
 * Split a tier's allocation across members in proportion to what each was owed.
 *
 * When the tier is fully funded this is exact by construction; when it is
 * partially funded, every member takes the same proportional haircut and the
 * odd cents go by largest remainder.
 */
function allocateWithinTier(allocated: Cents, demands: Map<string, Cents>): Map<string, Cents> {
  const entries = Array.from(demands.entries());

  if (allocated === 0) {
    return new Map(entries.map(([id]) => [id, 0]));
  }

  const totalDemand = sumCents(demands.values());
  if (totalDemand === allocated) {
    return new Map(entries);
  }

  return allocateByWeights(
    allocated,
    entries.map(([id, demand]) => ({ id, weight: BigInt(Math.max(0, demand)) })),
  );
}

/**
 * Fold a tier's payments back into the running member state so subsequent tiers
 * see them, and record the pieces the capital account ledger needs.
 */
function applyTierEffects(
  tier: WaterfallTier,
  ctx: TierContext,
  perMember: Map<string, Cents>,
  acc: {
    byId: Map<string, MemberState>;
    accruedAfter: Map<string, Cents>;
    capitalReturned: Map<string, Cents>;
    profitDistributed: Map<string, Cents>;
  },
): void {
  const accrualThisPeriod =
    tier.type === TierType.PREFERRED_RETURN ? preferredAccrualThisPeriod(tier, ctx) : null;

  for (const [memberId, paid] of perMember) {
    const member = acc.byId.get(memberId);
    if (!member) continue;

    member.cumulativeDistributions += paid;

    if (tier.type === TierType.RETURN_OF_CAPITAL) {
      // Capital repaid is not profit; it shrinks the basis future preferred
      // accrues on.
      member.unreturnedCapital = Math.max(0, member.unreturnedCapital - paid);
      acc.capitalReturned.set(memberId, acc.capitalReturned.get(memberId)! + paid);
      continue;
    }

    member.cumulativeProfitDistributed += paid;
    acc.profitDistributed.set(memberId, acc.profitDistributed.get(memberId)! + paid);
  }

  if (tier.type !== TierType.PREFERRED_RETURN || accrualThisPeriod === null) return;

  // Roll the preferred balance: carried + accrued − paid when cumulative;
  // straight to zero when not, because non-cumulative preferred expires
  // unpaid rather than becoming a claim on future cash.
  for (const member of ctx.members) {
    if (member.memberClass !== tier.class) continue;

    if (!tier.cumulative) {
      acc.accruedAfter.set(member.memberId, 0);
      continue;
    }

    const carried = acc.accruedAfter.get(member.memberId) ?? 0;
    const accrued = accrualThisPeriod.get(member.memberId) ?? 0;
    const paid = perMember.get(member.memberId) ?? 0;
    const next = carried + accrued - paid;

    if (next < 0) {
      throw new Error(
        `tier ${tier.seq}: member ${member.memberId} paid ${formatCents(paid)} against ` +
          `${formatCents(carried + accrued)} of preferred — overpayment`,
      );
    }
    acc.accruedAfter.set(member.memberId, next);
    member.accruedUnpaidPreferred = next;
  }
}

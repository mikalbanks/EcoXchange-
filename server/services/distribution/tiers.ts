/**
 * Spec 17 § 7.1 — tier demand and within-tier distribution.
 *
 * Each tier type answers two questions: *what is this tier owed* (its demand)
 * and *how does a payment split across members*. Both are returned together as
 * a per-member demand map, so the tier loop in `waterfall.ts` can allocate
 * `min(demand, remaining)` proportionally through the one rounding primitive
 * without knowing anything about tier semantics.
 */
import {
  type Cents,
  type MicroUnits,
  applyMicroPercentProrated,
  sumCents,
} from "./money";
import {
  TierType,
  parseMicroPercent,
  ONE_HUNDRED_PERCENT_MICRO,
  type WaterfallTier,
  type MemberClass,
} from "@shared/spec17-terms";
import { parseCents } from "./money";

/**
 * Preferred return accrues on an Actual/365 Fixed day count. Fixed rather than
 * Actual/Actual so a leap year does not silently change the accrual, and stated
 * here rather than buried at a call site because the convention is a term.
 */
export const DAY_COUNT_DENOMINATOR = 365;

/**
 * Per-member state entering the waterfall. Every balance here is *derived from
 * the capital account ledger* (§ 7.3) — none of it is stored as independent
 * mutable state, because a denormalized balance that drifts from its ledger is
 * how disputes start.
 */
export interface MemberState {
  memberId: string;
  memberClass: string;
  /** Day-weighted units for this period (§ 7.5), the within-class split weight. */
  weightedMicroUnits: MicroUnits;
  contributedCapital: Cents;
  unreturnedCapital: Cents;
  /** Carried unpaid preferred from prior periods. Zero for non-cumulative tiers. */
  accruedUnpaidPreferred: Cents;
  cumulativeDistributions: Cents;
  cumulativeProfitDistributed: Cents;
}

export interface TierDemand {
  total: Cents;
  perMember: Map<string, Cents>;
  /** True when an unmet balance survives into the next period. */
  accrues: boolean;
}

export interface TierContext {
  members: MemberState[];
  classes: MemberClass[];
  daysInPeriod: number;
  /** Cash still unallocated when this tier is reached. */
  remaining: Cents;
}

function emptyDemand(members: MemberState[], accrues = false): TierDemand {
  return {
    total: 0,
    perMember: new Map(members.map((m) => [m.memberId, 0])),
    accrues,
  };
}

function membersOfClass(members: MemberState[], classCode: string): MemberState[] {
  return members.filter((m) => m.memberClass === classCode);
}

/**
 * Spread an amount across members in proportion to their day-weighted units.
 * Returned as *demands*, not final allocations — the tier loop still applies
 * the `min(demand, remaining)` haircut and does the authoritative rounding.
 */
function spreadByUnits(amount: Cents, members: MemberState[]): Map<string, Cents> {
  const result = new Map<string, Cents>();
  const totalUnits = members.reduce((sum, m) => sum + m.weightedMicroUnits, 0n);
  if (totalUnits === 0n || amount === 0) {
    for (const m of members) result.set(m.memberId, 0);
    return result;
  }
  // Floor here; the tier loop's largest-remainder pass assigns the odd cents.
  let assigned = 0;
  for (const m of members) {
    const share = Number((BigInt(amount) * m.weightedMicroUnits) / totalUnits);
    result.set(m.memberId, share);
    assigned += share;
  }
  // Push the unassigned remainder onto the largest holder so the demand total
  // matches `amount` exactly; final per-member cents are settled downstream.
  if (assigned < amount && members.length > 0) {
    const largest = [...members].sort((a, b) =>
      a.weightedMicroUnits === b.weightedMicroUnits
        ? a.memberId < b.memberId
          ? -1
          : 1
        : a.weightedMicroUnits > b.weightedMicroUnits
          ? -1
          : 1,
    )[0];
    result.set(largest.memberId, result.get(largest.memberId)! + (amount - assigned));
  }
  return result;
}

// ─── preferred_return ───────────────────────────────────────────────────────

/**
 * Accrues on unreturned (or contributed) capital at `rate_pct`.
 *
 * `compounding: "compound"` accrues on the basis *plus* previously unpaid
 * preferred; `"simple"` accrues on the basis alone. These diverge materially by
 * year 10, which is why the terms schema requires the field explicitly.
 *
 * `cumulative: true` carries unpaid preferred forward as a claim on future
 * cash; `false` lets it expire at period end.
 */
export function preferredReturnDemand(
  tier: Extract<WaterfallTier, { type: typeof TierType.PREFERRED_RETURN }>,
  ctx: TierContext,
): TierDemand {
  const demand = emptyDemand(ctx.members, tier.cumulative);
  const microPct = parseMicroPercent(tier.rate_pct);
  const classMembers = membersOfClass(ctx.members, tier.class);

  for (const member of classMembers) {
    const capitalBasis =
      tier.basis === "contributed_capital" ? member.contributedCapital : member.unreturnedCapital;

    const accrualBasis =
      tier.compounding === "compound" ? capitalBasis + member.accruedUnpaidPreferred : capitalBasis;

    const accruedThisPeriod = applyMicroPercentProrated(
      accrualBasis,
      microPct,
      ctx.daysInPeriod,
      DAY_COUNT_DENOMINATOR,
    );

    // Non-cumulative preferred does not carry: only this period's accrual is
    // ever owed, and last period's shortfall is gone.
    const owed = tier.cumulative
      ? member.accruedUnpaidPreferred + accruedThisPeriod
      : accruedThisPeriod;

    demand.perMember.set(member.memberId, owed);
  }

  demand.total = sumCents(demand.perMember.values());
  return demand;
}

/**
 * This period's fresh accrual only, ignoring any carried balance. The engine
 * needs it separately to roll `accrued_unpaid_preferred` forward correctly:
 * carried + accrued − paid.
 */
export function preferredAccrualThisPeriod(
  tier: Extract<WaterfallTier, { type: typeof TierType.PREFERRED_RETURN }>,
  ctx: TierContext,
): Map<string, Cents> {
  const microPct = parseMicroPercent(tier.rate_pct);
  const result = new Map<string, Cents>();
  for (const member of ctx.members) {
    if (member.memberClass !== tier.class) {
      result.set(member.memberId, 0);
      continue;
    }
    const capitalBasis =
      tier.basis === "contributed_capital" ? member.contributedCapital : member.unreturnedCapital;
    const accrualBasis =
      tier.compounding === "compound" ? capitalBasis + member.accruedUnpaidPreferred : capitalBasis;
    result.set(
      member.memberId,
      applyMicroPercentProrated(accrualBasis, microPct, ctx.daysInPeriod, DAY_COUNT_DENOMINATOR),
    );
  }
  return result;
}

// ─── return_of_capital ──────────────────────────────────────────────────────

/** Pays down unreturned capital until zero. */
export function returnOfCapitalDemand(
  tier: Extract<WaterfallTier, { type: typeof TierType.RETURN_OF_CAPITAL }>,
  ctx: TierContext,
): TierDemand {
  const demand = emptyDemand(ctx.members);
  for (const member of membersOfClass(ctx.members, tier.class)) {
    demand.perMember.set(member.memberId, Math.max(0, member.unreturnedCapital));
  }
  demand.total = sumCents(demand.perMember.values());
  return demand;
}

// ─── catch_up ───────────────────────────────────────────────────────────────

/**
 * Pays one class until it holds `target_pct` of all *profit* distributions.
 *
 * Profit distributions exclude return of capital, so the comparison is against
 * `cumulativeProfitDistributed`, not gross cash. With target `t`,
 * catch-up class total `G` and everyone else's total `P`, the tier is satisfied
 * when `G / (G + P) = t`, i.e. `G = P × t / (1 − t)`.
 */
export function catchUpDemand(
  tier: Extract<WaterfallTier, { type: typeof TierType.CATCH_UP }>,
  ctx: TierContext,
): TierDemand {
  const demand = emptyDemand(ctx.members);
  const targetMicro = parseMicroPercent(tier.target_pct);

  if (targetMicro >= ONE_HUNDRED_PERCENT_MICRO) {
    throw new Error(`catch_up tier ${tier.seq}: target_pct must be below 100%`);
  }

  const classMembers = membersOfClass(ctx.members, tier.class);
  if (classMembers.length === 0) return demand;

  const catchUpProfit = sumCents(classMembers.map((m) => m.cumulativeProfitDistributed));
  const otherProfit = sumCents(
    ctx.members.filter((m) => m.memberClass !== tier.class).map((m) => m.cumulativeProfitDistributed),
  );

  // G = P × t / (1 − t), exact in BigInt.
  const numerator = BigInt(otherProfit) * BigInt(targetMicro);
  const denominator = BigInt(ONE_HUNDRED_PERCENT_MICRO - targetMicro);
  const requiredTotal = Number((numerator + denominator - 1n) / denominator); // ceil
  const shortfall = Math.max(0, requiredTotal - catchUpProfit);

  if (shortfall === 0) return demand;

  for (const [memberId, amount] of spreadByUnits(shortfall, classMembers)) {
    demand.perMember.set(memberId, amount);
  }
  demand.total = sumCents(demand.perMember.values());
  return demand;
}

// ─── residual_split ─────────────────────────────────────────────────────────

/**
 * Fixed percentage split of whatever is left. Demand is by definition the
 * remaining cash — this tier never leaves money on the table.
 */
export function residualSplitDemand(
  tier: Extract<WaterfallTier, { type: typeof TierType.RESIDUAL_SPLIT }>,
  ctx: TierContext,
): TierDemand {
  const demand = emptyDemand(ctx.members);
  if (ctx.remaining <= 0) return demand;

  // Split across classes by percentage, then within each class by units.
  let assignedToClasses = 0;
  const classAmounts: { classCode: string; amount: Cents }[] = [];

  for (const split of tier.splits) {
    const amount = applyMicroPercentProrated(ctx.remaining, parseMicroPercent(split.pct), 1, 1);
    classAmounts.push({ classCode: split.class, amount });
    assignedToClasses += amount;
  }

  // Percent rounding can leave (or overshoot by) a cent or two; settle it on
  // the largest split so the tier demand equals `remaining` exactly.
  if (assignedToClasses !== ctx.remaining && classAmounts.length > 0) {
    const largest = [...classAmounts].sort((a, b) =>
      a.amount === b.amount ? (a.classCode < b.classCode ? -1 : 1) : b.amount - a.amount,
    )[0];
    largest.amount += ctx.remaining - assignedToClasses;
  }

  for (const { classCode, amount } of classAmounts) {
    const classMembers = membersOfClass(ctx.members, classCode);
    for (const [memberId, memberAmount] of spreadByUnits(amount, classMembers)) {
      demand.perMember.set(memberId, (demand.perMember.get(memberId) ?? 0) + memberAmount);
    }
  }

  demand.total = sumCents(demand.perMember.values());
  return demand;
}

// ─── fixed_amount ───────────────────────────────────────────────────────────

/** A scheduled payment to a class, e.g. a management fee paid as a tier. */
export function fixedAmountDemand(
  tier: Extract<WaterfallTier, { type: typeof TierType.FIXED_AMOUNT }>,
  ctx: TierContext,
): TierDemand {
  const demand = emptyDemand(ctx.members);
  const amount = parseCents(tier.amount);
  const classMembers = membersOfClass(ctx.members, tier.class);
  if (classMembers.length === 0 || amount <= 0) return demand;

  for (const [memberId, memberAmount] of spreadByUnits(amount, classMembers)) {
    demand.perMember.set(memberId, memberAmount);
  }
  demand.total = sumCents(demand.perMember.values());
  return demand;
}

// ─── pro_rata ───────────────────────────────────────────────────────────────

/** Straight pro-rata across all units — the simplest possible waterfall. */
export function proRataDemand(_tier: WaterfallTier, ctx: TierContext): TierDemand {
  const demand = emptyDemand(ctx.members);
  if (ctx.remaining <= 0) return demand;
  for (const [memberId, amount] of spreadByUnits(ctx.remaining, ctx.members)) {
    demand.perMember.set(memberId, amount);
  }
  demand.total = sumCents(demand.perMember.values());
  return demand;
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

export function computeTierDemand(tier: WaterfallTier, ctx: TierContext): TierDemand {
  switch (tier.type) {
    case TierType.PREFERRED_RETURN:
      return preferredReturnDemand(tier, ctx);
    case TierType.RETURN_OF_CAPITAL:
      return returnOfCapitalDemand(tier, ctx);
    case TierType.CATCH_UP:
      return catchUpDemand(tier, ctx);
    case TierType.RESIDUAL_SPLIT:
      return residualSplitDemand(tier, ctx);
    case TierType.FIXED_AMOUNT:
      return fixedAmountDemand(tier, ctx);
    case TierType.PRO_RATA:
      return proRataDemand(tier, ctx);
    default: {
      const exhaustive: never = tier;
      throw new Error(`unhandled tier type: ${JSON.stringify(exhaustive)}`);
    }
  }
}

/** The class a tier pays, for the audit trace. `null` for multi-class tiers. */
export function tierClassLabel(tier: WaterfallTier): string | null {
  switch (tier.type) {
    case TierType.RESIDUAL_SPLIT:
      return tier.splits.map((s) => s.class).join("/");
    case TierType.PRO_RATA:
      return null;
    default:
      return tier.class;
  }
}

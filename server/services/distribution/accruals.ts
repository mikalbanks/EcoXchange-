/**
 * Spec 17 § 7.3 — accrual balances.
 *
 * `unreturned_capital`, `accrued_unpaid_preferred`, `cumulative_distributions`
 * and cumulative profit are maintained per member, per class, across periods —
 * but they are **derived**, never stored as independent mutable state. A
 * denormalized balance that drifts from its ledger is how disputes start.
 *
 * The two sources are both append-only:
 *   · `capital_account_entries` — contributions and their reversals
 *   · `distribution_runs.tier_results` — what each tier owed and paid, per member
 *
 * Because a cumulative preferred tier's demand is `carried + accrued`, a
 * member's closing balance is exactly `demand − paid` for that tier. That is
 * why `TierResultRecord` records per-member demand alongside per-member
 * payment: it makes the carry derivable instead of remembered.
 */
import { type Cents, parseCents, type MicroUnits } from "./money";
import { CapEntryType, type TierResultRecord } from "@shared/schema";
import { TierType } from "@shared/spec17-terms";
import type { MemberState } from "./tiers";

export interface LedgerEntryLike {
  memberId: string;
  entryType: string;
  bookAmount: string;
  taxAmount: string;
}

export interface PriorRunLike {
  id: string;
  status: string;
  tierResults: TierResultRecord[];
  /** Set when this run has been reversed by a later one. */
  reversedBy: string | null;
  /** Set when this run *is* a reversal of an earlier one. */
  reverses: string | null;
}

export interface MemberIdentity {
  memberId: string;
  memberClass: string;
}

/**
 * Runs that count toward the running balances.
 *
 * A reversed run and its reversing counterpart net to zero (§ 12), so both are
 * dropped rather than added with opposite signs — the arithmetic is the same
 * and the intent is clearer. A `computed` run has not been approved and must
 * not move any balance.
 */
export function effectiveRuns(runs: PriorRunLike[]): PriorRunLike[] {
  return runs.filter(
    (run) =>
      run.reversedBy === null &&
      run.reverses === null &&
      (run.status === "approved" || run.status === "submitted" || run.status === "settled"),
  );
}

export interface DerivedBalances {
  contributedCapital: Cents;
  unreturnedCapital: Cents;
  accruedUnpaidPreferred: Cents;
  cumulativeDistributions: Cents;
  cumulativeProfitDistributed: Cents;
}

/**
 * Rebuild every member's balances from the two append-only sources.
 *
 * `weightedUnits` is supplied separately because it is a property of the period
 * being computed, not of history.
 */
export function deriveMemberStates(args: {
  members: MemberIdentity[];
  ledger: LedgerEntryLike[];
  priorRuns: PriorRunLike[];
  weightedUnits: Map<string, MicroUnits>;
}): MemberState[] {
  const balances = new Map<string, DerivedBalances>(
    args.members.map((m) => [
      m.memberId,
      {
        contributedCapital: 0,
        unreturnedCapital: 0,
        accruedUnpaidPreferred: 0,
        cumulativeDistributions: 0,
        cumulativeProfitDistributed: 0,
      },
    ]),
  );

  // Contributions build the capital basis. Reversals of contributions carry the
  // opposite sign in `bookAmount`, so a plain sum is already net of them.
  for (const entry of args.ledger) {
    const balance = balances.get(entry.memberId);
    if (!balance) continue;
    if (entry.entryType !== CapEntryType.CONTRIBUTION && entry.entryType !== CapEntryType.REVERSAL) {
      continue;
    }
    if (entry.entryType === CapEntryType.REVERSAL) {
      // Only reversals *of contributions* affect capital; the source type is
      // encoded in the sign and the reversed entry, so a reversal that restores
      // a distribution nets out through the run filter above instead.
      continue;
    }
    balance.contributedCapital += parseCents(entry.bookAmount);
  }

  for (const balance of balances.values()) {
    balance.unreturnedCapital = balance.contributedCapital;
  }

  // Replay the runs in chronological order.
  for (const run of effectiveRuns(args.priorRuns)) {
    for (const tier of run.tierResults) {
      const isCapital = tier.type === TierType.RETURN_OF_CAPITAL;
      const isPreferred = tier.type === TierType.PREFERRED_RETURN;

      for (const [memberId, amountString] of Object.entries(tier.perMember)) {
        const balance = balances.get(memberId);
        if (!balance) continue;
        const paid = parseCents(amountString);

        balance.cumulativeDistributions += paid;
        if (isCapital) {
          balance.unreturnedCapital = Math.max(0, balance.unreturnedCapital - paid);
        } else {
          balance.cumulativeProfitDistributed += paid;
        }
      }

      if (!isPreferred) continue;

      // Closing preferred balance = demand − paid, for every member the tier
      // touched. Non-accruing (non-cumulative) tiers expire to zero instead.
      const touched = new Set([
        ...Object.keys(tier.perMemberDemand ?? {}),
        ...Object.keys(tier.perMember),
      ]);

      for (const memberId of touched) {
        const balance = balances.get(memberId);
        if (!balance) continue;
        if (!tier.accrues) {
          balance.accruedUnpaidPreferred = 0;
          continue;
        }
        const demand = parseCents(tier.perMemberDemand?.[memberId] ?? "0");
        const paid = parseCents(tier.perMember[memberId] ?? "0");
        balance.accruedUnpaidPreferred = Math.max(0, demand - paid);
      }
    }
  }

  return args.members
    .map((m) => {
      const balance = balances.get(m.memberId)!;
      return {
        memberId: m.memberId,
        memberClass: m.memberClass,
        weightedMicroUnits: args.weightedUnits.get(m.memberId) ?? 0n,
        contributedCapital: balance.contributedCapital,
        unreturnedCapital: balance.unreturnedCapital,
        accruedUnpaidPreferred: balance.accruedUnpaidPreferred,
        cumulativeDistributions: balance.cumulativeDistributions,
        cumulativeProfitDistributed: balance.cumulativeProfitDistributed,
      };
    })
    .sort((a, b) => (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0));
}

/**
 * Sub-minimum amounts a member is still owed from prior periods (§ 7.4).
 *
 * Carried amounts are never dropped and never rounded away — a member who falls
 * below the de-minimis threshold three periods running is paid the accumulated
 * total in the fourth.
 */
export function deriveCarriedForward(
  /** Chronological, oldest first. */
  runs: PriorRunLike[],
  allocations: { distributionRunId: string; memberId: string; carriedForwardOut: string }[],
): Map<string, Cents> {
  const byRun = new Map<string, typeof allocations>();
  for (const allocation of allocations) {
    const bucket = byRun.get(allocation.distributionRunId);
    if (bucket) bucket.push(allocation);
    else byRun.set(allocation.distributionRunId, [allocation]);
  }

  // Carry-forward is already a running balance: each run's `carriedForwardOut`
  // includes whatever it brought in, so the most recent counted run wins. Driven
  // off the run order rather than the allocation array so the result does not
  // depend on how the rows happened to come back from the database.
  const latestByMember = new Map<string, Cents>();
  for (const run of effectiveRuns(runs)) {
    for (const allocation of byRun.get(run.id) ?? []) {
      latestByMember.set(allocation.memberId, parseCents(allocation.carriedForwardOut));
    }
  }

  return latestByMember;
}

/**
 * Spec 17 § 7.4 — de-minimis distributions and the rounding residual.
 *
 * Allocations below `min_distribution_per_member_cents` carry forward to that
 * member's next period. **Never dropped, never rounded away.** A member who
 * falls below the threshold three periods running receives the full accumulated
 * amount in the fourth.
 *
 * Whatever the tiers did not claim is the run's residual, handled per
 * `rounding_residual_treatment`: carried forward, or swept to the sponsor class.
 */
import { type Cents, allocateByWeights, assertSumEquals, formatCents, sumCents } from "./money";
import { RoundingResidualTreatment } from "@shared/spec17-terms";

export interface CarryInput {
  memberId: string;
  memberClass: string;
  /** This period's gross from the waterfall. */
  gross: Cents;
  /** Sub-minimum amounts brought forward from prior periods. */
  carriedForwardIn: Cents;
}

export interface CarryResult {
  memberId: string;
  memberClass: string;
  /** What actually goes out this period. Either zero or at or above the minimum. */
  payable: Cents;
  carriedForwardIn: Cents;
  carriedForwardOut: Cents;
}

export interface ApplyCarryResult {
  members: CarryResult[];
  /** Total leaving the SPV this period. */
  totalPayable: Cents;
  /** Total held back for a future period. */
  totalCarried: Cents;
}

/**
 * Apply the minimum-distribution rule.
 *
 * The comparison is against `gross + carried_forward_in`, which is the whole
 * point of carrying: three sub-minimum periods accumulate into one payable
 * amount rather than three amounts that each individually round to nothing.
 */
export function applyMinimumDistribution(
  members: CarryInput[],
  minPerMemberCents: Cents,
): ApplyCarryResult {
  if (minPerMemberCents < 0) {
    throw new Error(`minimum distribution cannot be negative: ${minPerMemberCents}`);
  }

  const results: CarryResult[] = members.map((member) => {
    const available = member.gross + member.carriedForwardIn;

    if (available > 0 && available < minPerMemberCents) {
      return {
        memberId: member.memberId,
        memberClass: member.memberClass,
        payable: 0,
        carriedForwardIn: member.carriedForwardIn,
        carriedForwardOut: available,
      };
    }

    return {
      memberId: member.memberId,
      memberClass: member.memberClass,
      payable: available,
      carriedForwardIn: member.carriedForwardIn,
      carriedForwardOut: 0,
    };
  });

  const totalPayable = sumCents(results.map((r) => r.payable));
  const totalCarried = sumCents(results.map((r) => r.carriedForwardOut));

  // Nothing may be created or destroyed by the carry rule itself.
  assertSumEquals(
    [totalPayable, totalCarried],
    sumCents(members.map((m) => m.gross + m.carriedForwardIn)),
    "applyMinimumDistribution",
  );

  return { members: results, totalPayable, totalCarried };
}

export interface ResidualResult {
  /** Amounts added to specific members, if swept to the sponsor. */
  sweptToMembers: Map<string, Cents>;
  /** Amount held on the run for the next period. */
  carriedForward: Cents;
  note: string | null;
}

/**
 * Dispose of cash the tiers did not claim.
 *
 * `carry_forward` holds it on the run and it enters the next period's
 * distributable cash. `to_sponsor` sweeps it to the sponsor class, split by
 * that class's weighted units.
 */
export function applyResidualTreatment(args: {
  residual: Cents;
  treatment: string;
  sponsorMembers: { memberId: string; weightedMicroUnits: bigint }[];
}): ResidualResult {
  const swept = new Map<string, Cents>();

  if (args.residual <= 0) {
    return { sweptToMembers: swept, carriedForward: 0, note: null };
  }

  if (args.treatment !== RoundingResidualTreatment.TO_SPONSOR) {
    return {
      sweptToMembers: swept,
      carriedForward: args.residual,
      note: `${formatCents(args.residual)} undistributed, carried into the next period`,
    };
  }

  const eligible = args.sponsorMembers.filter((m) => m.weightedMicroUnits > 0n);
  if (eligible.length === 0) {
    // No sponsor to sweep to; carrying forward is the only outcome that does
    // not destroy the money.
    return {
      sweptToMembers: swept,
      carriedForward: args.residual,
      note:
        `${formatCents(args.residual)} residual could not be swept to a sponsor class ` +
        `(no sponsor holds units) and was carried into the next period instead`,
    };
  }

  // Reuse the same allocation primitive so the sweep rounds like everything else.
  for (const [memberId, amount] of allocateByWeights(
    args.residual,
    eligible.map((m) => ({ id: m.memberId, weight: m.weightedMicroUnits })),
  )) {
    swept.set(memberId, amount);
  }

  return {
    sweptToMembers: swept,
    carriedForward: 0,
    note: `${formatCents(args.residual)} residual swept to the sponsor class`,
  };
}

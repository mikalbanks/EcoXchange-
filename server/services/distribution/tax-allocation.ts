/**
 * Spec 17 § 9 — tax allocations. **[CPA] gated.**
 *
 * A separate annual pass. It never runs inside the cash waterfall — cash and
 * tax are separate books and any function that touches both is a bug (§ 2.4).
 *
 * **Default method: targeted allocations.** Allocate income and loss so that
 * ending capital accounts equal what each member would receive on a
 * hypothetical liquidation at book value. This is the modern standard and is
 * substantially simpler to implement correctly than layer-cake.
 *
 * **What this module deliberately does not do.** § 9 names several mechanics as
 * out of scope for MVP and says to flag rather than guess:
 *   · §704(c) built-in gain layers on contributed property
 *   · qualified income offset, minimum gain chargeback, deficit restoration
 *   · state apportionment and composite filings
 * `detectEscalations` looks for the *conditions* that trigger them and raises
 * them for a human. It does not implement the mechanics, and it is not a
 * substitute for a CPA reading the return.
 */
import { type Cents, formatCents, largestRemainder } from "./money";
import { GateNotSatisfied } from "./errors";
import { TaxAllocationStatus } from "@shared/schema";
import { TaxAllocationMethod } from "@shared/spec17-terms";

export interface MemberTaxInput {
  memberId: string;
  memberClass: string;
  /** Current § 704(b) book capital account balance. */
  bookCapital: Cents;
  /** What this member would receive on a hypothetical liquidation at book value. */
  hypotheticalLiquidationProceeds: Cents;
  /** Non-cash property contributed this year, if any — a §704(c) trigger. */
  contributedNonCashValue: Cents;
}

export interface TaxAllocationInput {
  spvId: string;
  taxYear: number;
  method: string;
  totalTaxableIncome: Cents;
  members: MemberTaxInput[];
  /** States the SPV's projects operate in — more than one triggers apportionment. */
  operatingStates: string[];
}

export interface MemberTaxAllocation {
  memberId: string;
  /** Positive for income, negative for loss. */
  allocatedAmount: Cents;
  /** `hypothetical − current`, before normalising to the income actually available. */
  targetDelta: Cents;
  bookCapitalAfter: Cents;
}

export interface TaxAllocationResult {
  spvId: string;
  taxYear: number;
  method: string;
  allocations: MemberTaxAllocation[];
  escalations: string[];
  /** Always `draft`. Only a human may advance it. */
  status: string;
}

/**
 * The targeted allocation pass.
 *
 * `required_i = target_i − current_i`; the year's actual taxable income is then
 * spread in proportion to those requirements. When income is positive it goes
 * to members who need their capital account raised; when the year is a loss it
 * goes to members who need theirs lowered.
 */
export function allocateTaxableIncome(input: TaxAllocationInput): TaxAllocationResult {
  if (input.method !== TaxAllocationMethod.TARGETED) {
    throw new GateNotSatisfied(
      "tax_allocation_method",
      `only the targeted method is implemented; "${input.method}" requires CPA-specified mechanics ` +
        `and must not be approximated`,
    );
  }

  const deltas = input.members.map((m) => ({
    memberId: m.memberId,
    delta: m.hypotheticalLiquidationProceeds - m.bookCapital,
  }));

  const total = input.totalTaxableIncome;
  const allocated = normalizeToTotal(deltas, total);

  const allocations: MemberTaxAllocation[] = input.members
    .map((member) => {
      const amount = allocated.get(member.memberId) ?? 0;
      const delta = deltas.find((d) => d.memberId === member.memberId)!.delta;
      return {
        memberId: member.memberId,
        allocatedAmount: amount,
        targetDelta: delta,
        bookCapitalAfter: member.bookCapital + amount,
      };
    })
    .sort((a, b) => (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0));

  const sum = allocations.reduce((acc, a) => acc + a.allocatedAmount, 0);
  if (sum !== total) {
    throw new Error(
      `tax allocations sum to ${formatCents(sum)} but total taxable income is ${formatCents(total)}`,
    );
  }

  return {
    spvId: input.spvId,
    taxYear: input.taxYear,
    method: input.method,
    allocations,
    escalations: detectEscalations(input, allocations),
    status: TaxAllocationStatus.DRAFT,
  };
}

/**
 * Spread `total` across members in proportion to how much each needs.
 *
 * Positive income goes only to members whose capital account must rise; a loss
 * goes only to those whose must fall. When no member needs movement in the
 * required direction — an unusual but real case — the amount falls back to
 * book-capital proportions so the year still allocates in full rather than
 * failing to balance.
 */
function normalizeToTotal(
  deltas: { memberId: string; delta: Cents }[],
  total: Cents,
): Map<string, Cents> {
  if (total === 0) {
    return new Map(deltas.map((d) => [d.memberId, 0]));
  }

  const wantIncome = total > 0;
  const weights = deltas.map((d) => ({
    id: d.memberId,
    weight: BigInt(Math.max(0, wantIncome ? d.delta : -d.delta)),
  }));

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0n);

  const effectiveWeights =
    totalWeight > 0n
      ? weights
      : // Fallback: even split, deterministic and total-preserving.
        deltas.map((d) => ({ id: d.memberId, weight: 1n }));

  const magnitude = largestRemainder(BigInt(Math.abs(total)), effectiveWeights);

  const result = new Map<string, Cents>();
  for (const [memberId, value] of magnitude) {
    const amount = Number(value);
    result.set(memberId, wantIncome ? amount : -amount);
  }
  return result;
}

/**
 * Detect — and only detect — the conditions § 9 says to escalate rather than
 * compute. Each string here is a prompt for a human, not a finding.
 */
export function detectEscalations(
  input: TaxAllocationInput,
  allocations: MemberTaxAllocation[],
): string[] {
  const escalations: string[] = [];

  for (const member of input.members) {
    if (member.contributedNonCashValue > 0) {
      escalations.push(
        `member ${member.memberId} contributed non-cash property valued at ` +
          `${formatCents(member.contributedNonCashValue)} — §704(c) built-in gain layers may apply; ` +
          `escalate to the CPA rather than allocating`,
      );
    }
  }

  for (const allocation of allocations) {
    if (allocation.bookCapitalAfter < 0) {
      escalations.push(
        `member ${allocation.memberId} ends the year with a deficit capital account of ` +
          `${formatCents(allocation.bookCapitalAfter)} — qualified income offset, minimum gain ` +
          `chargeback or a deficit restoration obligation may be triggered; escalate to the CPA`,
      );
    }
  }

  const states = Array.from(new Set(input.operatingStates)).sort();
  if (states.length > 1) {
    escalations.push(
      `the SPV operates in ${states.length} states (${states.join(", ")}) — state apportionment and ` +
        `composite filings are out of scope for this engine; escalate to the CPA`,
    );
  }

  return escalations;
}

/**
 * The § 9 gate. `status` must reach `final` with `cpaReviewedAt` populated
 * before any K-1 issues. No exceptions, and no automation of this gate — which
 * is why this function only ever *checks*, and nothing in this module can set
 * `final`.
 */
export function assertCanIssueK1(allocation: {
  memberId: string;
  taxYear: number;
  status: string;
  cpaReviewedAt: Date | null;
}): void {
  if (allocation.status !== TaxAllocationStatus.FINAL) {
    throw new GateNotSatisfied(
      "cpa_review",
      `tax allocation for member ${allocation.memberId} (${allocation.taxYear}) is ` +
        `"${allocation.status}", not "final" — a K-1 may not issue`,
    );
  }
  if (allocation.cpaReviewedAt === null) {
    throw new GateNotSatisfied(
      "cpa_review",
      `tax allocation for member ${allocation.memberId} (${allocation.taxYear}) is marked final ` +
        `but has no recorded CPA review — a K-1 may not issue`,
    );
  }
}

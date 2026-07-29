import { describe, it, expect } from "vitest";
import { applyMinimumDistribution, applyResidualTreatment, type CarryInput } from "./de-minimis";
import { sumCents, type Cents } from "./money";

/**
 * Spec 17 AC 3 — sub-minimum allocations carry forward; a member accumulating
 * three sub-minimum periods receives the full accumulated amount in period four.
 */

const MIN = 100; // $1.00, the schema default

describe("applyMinimumDistribution", () => {
  it("pays amounts at or above the minimum", () => {
    const result = applyMinimumDistribution(
      [{ memberId: "a", memberClass: "B", gross: 500, carriedForwardIn: 0 }],
      MIN,
    );
    expect(result.members[0].payable).toBe(500);
    expect(result.members[0].carriedForwardOut).toBe(0);
    expect(result.totalCarried).toBe(0);
  });

  it("carries a sub-minimum amount instead of dropping it", () => {
    const result = applyMinimumDistribution(
      [{ memberId: "a", memberClass: "B", gross: 37, carriedForwardIn: 0 }],
      MIN,
    );
    expect(result.members[0].payable).toBe(0);
    expect(result.members[0].carriedForwardOut).toBe(37);
    expect(result.totalPayable).toBe(0);
    expect(result.totalCarried).toBe(37);
  });

  it("pays exactly at the threshold", () => {
    const result = applyMinimumDistribution(
      [{ memberId: "a", memberClass: "B", gross: MIN, carriedForwardIn: 0 }],
      MIN,
    );
    expect(result.members[0].payable).toBe(MIN);
  });

  it("AC 3 — three sub-minimum periods then a full payout in the fourth", () => {
    // $0.30 a period against a $1.00 minimum: three periods accumulate to
    // $0.90, still short, and the fourth crosses the threshold.
    const perPeriod = 30;
    let carried: Cents = 0;
    const payouts: Cents[] = [];

    for (let period = 1; period <= 4; period++) {
      const input: CarryInput[] = [
        { memberId: "a", memberClass: "B", gross: perPeriod, carriedForwardIn: carried },
      ];
      const result = applyMinimumDistribution(input, MIN);
      payouts.push(result.members[0].payable);
      carried = result.members[0].carriedForwardOut;
    }

    // Nothing in periods 1-3; the accumulated $1.20 in period 4.
    expect(payouts).toEqual([0, 0, 0, 120]);
    expect(carried).toBe(0);
    // Nothing was lost along the way.
    expect(sumCents(payouts)).toBe(perPeriod * 4);
  });

  it("never creates or destroys money", () => {
    const input: CarryInput[] = [
      { memberId: "a", memberClass: "B", gross: 37, carriedForwardIn: 50 },
      { memberId: "b", memberClass: "B", gross: 900, carriedForwardIn: 0 },
      { memberId: "c", memberClass: "B", gross: 0, carriedForwardIn: 99 },
    ];
    const result = applyMinimumDistribution(input, MIN);
    const inputTotal = sumCents(input.map((i) => i.gross + i.carriedForwardIn));
    expect(result.totalPayable + result.totalCarried).toBe(inputTotal);
  });

  it("treats a zero balance as nothing to carry", () => {
    const result = applyMinimumDistribution(
      [{ memberId: "a", memberClass: "B", gross: 0, carriedForwardIn: 0 }],
      MIN,
    );
    expect(result.members[0].payable).toBe(0);
    expect(result.members[0].carriedForwardOut).toBe(0);
  });

  it("pays everything when the minimum is zero", () => {
    const result = applyMinimumDistribution(
      [{ memberId: "a", memberClass: "B", gross: 1, carriedForwardIn: 0 }],
      0,
    );
    expect(result.members[0].payable).toBe(1);
  });

  it("rejects a negative minimum", () => {
    expect(() => applyMinimumDistribution([], -1)).toThrow(/cannot be negative/);
  });
});

describe("applyResidualTreatment", () => {
  const sponsors = [{ memberId: "sponsor", weightedMicroUnits: 100_000_000n }];

  it("carries the residual forward by default", () => {
    const result = applyResidualTreatment({
      residual: 1_234,
      treatment: "carry_forward",
      sponsorMembers: sponsors,
    });
    expect(result.carriedForward).toBe(1_234);
    expect(result.sweptToMembers.size).toBe(0);
    expect(result.note).toMatch(/carried into the next period/);
  });

  it("sweeps to the sponsor when configured", () => {
    const result = applyResidualTreatment({
      residual: 1_234,
      treatment: "to_sponsor",
      sponsorMembers: sponsors,
    });
    expect(result.carriedForward).toBe(0);
    expect(result.sweptToMembers.get("sponsor")).toBe(1_234);
  });

  it("splits a sweep across multiple sponsor holders exactly", () => {
    const result = applyResidualTreatment({
      residual: 100,
      treatment: "to_sponsor",
      sponsorMembers: [
        { memberId: "s1", weightedMicroUnits: 1n },
        { memberId: "s2", weightedMicroUnits: 1n },
        { memberId: "s3", weightedMicroUnits: 1n },
      ],
    });
    expect(sumCents(result.sweptToMembers.values())).toBe(100);
  });

  it("falls back to carrying forward rather than destroying an unsweepable residual", () => {
    const result = applyResidualTreatment({
      residual: 500,
      treatment: "to_sponsor",
      sponsorMembers: [],
    });
    expect(result.carriedForward).toBe(500);
    expect(result.note).toMatch(/no sponsor holds units/);
  });

  it("is a no-op when there is no residual", () => {
    const result = applyResidualTreatment({
      residual: 0,
      treatment: "to_sponsor",
      sponsorMembers: sponsors,
    });
    expect(result.carriedForward).toBe(0);
    expect(result.note).toBeNull();
  });
});

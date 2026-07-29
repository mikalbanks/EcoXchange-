import { describe, it, expect } from "vitest";
import {
  allocateTaxableIncome,
  assertCanIssueK1,
  detectEscalations,
  type MemberTaxInput,
  type TaxAllocationInput,
} from "./tax-allocation";
import { GateNotSatisfied } from "./errors";
import { sumCents } from "./money";

/** Spec 17 § 9 — targeted allocations, and the [CPA] gate that guards them. */

function member(overrides: Partial<MemberTaxInput> = {}): MemberTaxInput {
  return {
    memberId: "m1",
    memberClass: "B",
    bookCapital: 1_000_000,
    hypotheticalLiquidationProceeds: 1_000_000,
    contributedNonCashValue: 0,
    ...overrides,
  };
}

function input(overrides: Partial<TaxAllocationInput> = {}): TaxAllocationInput {
  return {
    spvId: "spv-1",
    taxYear: 2026,
    method: "targeted",
    totalTaxableIncome: 0,
    members: [],
    operatingStates: ["CA"],
    ...overrides,
  };
}

describe("targeted allocation", () => {
  it("moves capital accounts toward their hypothetical liquidation targets", () => {
    const result = allocateTaxableIncome(
      input({
        totalTaxableIncome: 300_000,
        members: [
          member({ memberId: "m1", bookCapital: 1_000_000, hypotheticalLiquidationProceeds: 1_200_000 }),
          member({ memberId: "m2", bookCapital: 1_000_000, hypotheticalLiquidationProceeds: 1_100_000 }),
        ],
      }),
    );

    // Deltas of $2,000 and $1,000 — a 2:1 split of the $3,000 of income.
    expect(result.allocations[0].allocatedAmount).toBe(200_000);
    expect(result.allocations[1].allocatedAmount).toBe(100_000);
    expect(result.allocations[0].bookCapitalAfter).toBe(1_200_000);
  });

  it("allocates less than the full target when income falls short", () => {
    const result = allocateTaxableIncome(
      input({
        totalTaxableIncome: 150_000,
        members: [
          member({ memberId: "m1", bookCapital: 1_000_000, hypotheticalLiquidationProceeds: 1_200_000 }),
          member({ memberId: "m2", bookCapital: 1_000_000, hypotheticalLiquidationProceeds: 1_100_000 }),
        ],
      }),
    );

    expect(sumCents(result.allocations.map((a) => a.allocatedAmount))).toBe(150_000);
    // Still 2:1, just smaller.
    expect(result.allocations[0].allocatedAmount).toBe(100_000);
    expect(result.allocations[1].allocatedAmount).toBe(50_000);
  });

  it("allocates a loss to members whose capital must fall", () => {
    const result = allocateTaxableIncome(
      input({
        totalTaxableIncome: -200_000,
        members: [
          member({ memberId: "m1", bookCapital: 1_000_000, hypotheticalLiquidationProceeds: 900_000 }),
          member({ memberId: "m2", bookCapital: 1_000_000, hypotheticalLiquidationProceeds: 900_000 }),
        ],
      }),
    );

    expect(result.allocations[0].allocatedAmount).toBe(-100_000);
    expect(result.allocations[1].allocatedAmount).toBe(-100_000);
    expect(sumCents(result.allocations.map((a) => a.allocatedAmount))).toBe(-200_000);
  });

  it("allocates the full amount exactly even when it does not divide evenly", () => {
    const result = allocateTaxableIncome(
      input({
        totalTaxableIncome: 100,
        members: [
          member({ memberId: "m1", hypotheticalLiquidationProceeds: 1_000_001 }),
          member({ memberId: "m2", hypotheticalLiquidationProceeds: 1_000_001 }),
          member({ memberId: "m3", hypotheticalLiquidationProceeds: 1_000_001 }),
        ],
      }),
    );
    expect(sumCents(result.allocations.map((a) => a.allocatedAmount))).toBe(100);
  });

  it("still allocates in full when no member needs movement in that direction", () => {
    // Everyone is already at target, but the year produced income.
    const result = allocateTaxableIncome(
      input({
        totalTaxableIncome: 90_000,
        members: [member({ memberId: "m1" }), member({ memberId: "m2" }), member({ memberId: "m3" })],
      }),
    );
    expect(sumCents(result.allocations.map((a) => a.allocatedAmount))).toBe(90_000);
    expect(result.allocations.every((a) => a.allocatedAmount === 30_000)).toBe(true);
  });

  it("is a no-op for a zero-income year", () => {
    const result = allocateTaxableIncome(input({ members: [member()] }));
    expect(result.allocations[0].allocatedAmount).toBe(0);
  });

  it("always comes back as a draft", () => {
    const result = allocateTaxableIncome(input({ members: [member()] }));
    expect(result.status).toBe("draft");
  });

  it("refuses methods whose mechanics a CPA has not specified", () => {
    expect(() => allocateTaxableIncome(input({ method: "layer_cake", members: [member()] }))).toThrow(
      GateNotSatisfied,
    );
    expect(() => allocateTaxableIncome(input({ method: "pro_rata", members: [member()] }))).toThrow(
      /must not be approximated/,
    );
  });
});

describe("detectEscalations — flag, do not guess", () => {
  it("flags contributed non-cash property as a §704(c) trigger", () => {
    const escalations = detectEscalations(
      input({ members: [member({ contributedNonCashValue: 5_000_000 })] }),
      [],
    );
    expect(escalations[0]).toMatch(/§704\(c\) built-in gain layers may apply/);
    expect(escalations[0]).toMatch(/escalate to the CPA/);
  });

  it("flags a deficit capital account", () => {
    const escalations = detectEscalations(input({ members: [member()] }), [
      { memberId: "m1", allocatedAmount: -2_000_000, targetDelta: 0, bookCapitalAfter: -1_000_000 },
    ]);
    expect(escalations[0]).toMatch(/deficit capital account/);
    expect(escalations[0]).toMatch(/qualified income offset, minimum gain chargeback/);
  });

  it("flags multi-state operations as an apportionment question", () => {
    const escalations = detectEscalations(input({ operatingStates: ["CA", "TX", "CA"] }), []);
    expect(escalations[0]).toMatch(/operates in 2 states \(CA, TX\)/);
  });

  it("stays quiet on a plain single-state cash-funded SPV", () => {
    const escalations = detectEscalations(input({ members: [member()], operatingStates: ["CA"] }), [
      { memberId: "m1", allocatedAmount: 100, targetDelta: 100, bookCapitalAfter: 1_000_100 },
    ]);
    expect(escalations).toEqual([]);
  });

  it("surfaces escalations on the allocation result itself", () => {
    const result = allocateTaxableIncome(
      input({
        totalTaxableIncome: 100,
        members: [member({ contributedNonCashValue: 1 })],
        operatingStates: ["CA", "NV"],
      }),
    );
    expect(result.escalations).toHaveLength(2);
  });
});

describe("the [CPA] gate on K-1 issuance", () => {
  it("allows a final, reviewed allocation", () => {
    expect(() =>
      assertCanIssueK1({
        memberId: "m1",
        taxYear: 2026,
        status: "final",
        cpaReviewedAt: new Date(),
      }),
    ).not.toThrow();
  });

  it("refuses a draft", () => {
    expect(() =>
      assertCanIssueK1({ memberId: "m1", taxYear: 2026, status: "draft", cpaReviewedAt: null }),
    ).toThrow(/is "draft", not "final"/);
  });

  it("refuses one still in review", () => {
    expect(() =>
      assertCanIssueK1({ memberId: "m1", taxYear: 2026, status: "cpa_review", cpaReviewedAt: null }),
    ).toThrow(GateNotSatisfied);
  });

  it("refuses one marked final with no recorded review", () => {
    expect(() =>
      assertCanIssueK1({ memberId: "m1", taxYear: 2026, status: "final", cpaReviewedAt: null }),
    ).toThrow(/no recorded CPA review/);
  });
});

import { describe, it, expect } from "vitest";
import {
  drawFromReserve,
  reserveTarget,
  runPreWaterfall,
  ReserveDrawReason,
  type PreWaterfallInput,
  type ReserveState,
} from "./pre-waterfall";
import { DebtServiceHalt, ReserveDrawNotPermitted } from "./errors";
import type { FeeSchedule } from "@shared/spec17-terms";

/** Spec 17 AC 18, 19, 20 — reserves fund before distributions, always. */

const PLATFORM_FEE: FeeSchedule = [
  {
    code: "platform",
    name: "EcoXchange platform fee",
    basis: "assets_under_administration",
    rate_pct: "0.5",
    priority: 10,
  },
];

function reserve(overrides: Partial<ReserveState> = {}): ReserveState {
  return {
    id: "r1",
    code: "om",
    targetBasis: "fixed",
    targetValue: "10000.00",
    fundingPriority: 1,
    fundingCapPerPeriod: null,
    drawPermittedFor: [ReserveDrawReason.OPERATING_SHORTFALL],
    currentBalance: 0,
    ...overrides,
  };
}

function input(overrides: Partial<PreWaterfallInput> = {}): PreWaterfallInput {
  return {
    daysInPeriod: 31,
    energyRevenue: 5_000_000, // $50,000
    recRevenue: 0,
    itcTransferProceeds: 0,
    otherRevenue: 0,
    totalOpex: 1_000_000, // $10,000
    debtServiceDue: 0,
    reserves: [],
    feeSchedule: [],
    assetsUnderAdministration: 0,
    ...overrides,
  };
}

describe("the stack runs in a fixed order", () => {
  it("computes each intermediate and persists the trace", () => {
    const result = runPreWaterfall(
      input({
        recRevenue: 500_000,
        debtServiceDue: 1_500_000,
        reserves: [reserve({ targetValue: "5000.00" })],
        feeSchedule: PLATFORM_FEE,
        assetsUnderAdministration: 100_000_000, // $1,000,000 AUA
      }),
    );

    expect(result.cashRevenue).toBe(5_500_000);
    expect(result.lessOpex).toBe(1_000_000);
    expect(result.netOperatingIncome).toBe(4_500_000);
    expect(result.lessDebtService).toBe(1_500_000);
    expect(result.cashFlowAfterDebtService).toBe(3_000_000);
    expect(result.lessReserveFunding).toBe(500_000);

    // 0.5% of $1,000,000 a year is $5,000; for 31 of 365 days, $424.6575 → $424.66.
    expect(result.lessFees).toBe(42_466);
    expect(result.distributableCash).toBe(3_000_000 - 500_000 - 42_466);
  });
});

describe("AC 20 — revenue below opex", () => {
  it("produces zero distributable cash and a funding shortfall, never a negative", () => {
    const result = runPreWaterfall(input({ energyRevenue: 500_000, totalOpex: 1_000_000 }));

    expect(result.distributableCash).toBe(0);
    expect(result.notes.some((n) => n.code === "funding_shortfall")).toBe(true);
    const note = result.notes.find((n) => n.code === "funding_shortfall")!;
    expect(note.amount).toBe("5000.00");
  });

  it("draws from a reserve that permits it before declaring a shortfall", () => {
    const result = runPreWaterfall(
      input({
        energyRevenue: 500_000,
        totalOpex: 1_000_000,
        reserves: [
          reserve({
            currentBalance: 800_000,
            drawPermittedFor: [ReserveDrawReason.OPERATING_SHORTFALL],
          }),
        ],
      }),
    );

    // $5,000 short, $8,000 available: the draw covers operating expenses in
    // full, so no shortfall is raised *for opex*. The period still ends with
    // nothing to distribute — the reserve it just drew from now wants topping
    // back up — and that is a separate, correctly-stated outcome.
    expect(result.plusReserveDraws).toBe(500_000);
    expect(result.reserveMovements.some((m) => m.direction === "draw")).toBe(true);
    expect(result.notes.some((n) => /exceed cash revenue/.test(n.detail))).toBe(false);
    expect(result.notes.some((n) => n.code === "reserve_underfunded")).toBe(true);
  });

  it("will not raid a reserve that does not permit the purpose", () => {
    const result = runPreWaterfall(
      input({
        energyRevenue: 500_000,
        totalOpex: 1_000_000,
        reserves: [reserve({ currentBalance: 800_000, drawPermittedFor: ["decommissioning"] })],
      }),
    );

    expect(result.plusReserveDraws).toBe(0);
    expect(result.distributableCash).toBe(0);
    expect(result.notes.some((n) => n.code === "funding_shortfall")).toBe(true);
  });
});

describe("AC 19 — reserve draws", () => {
  it("permits a draw for a listed purpose", () => {
    const account = reserve({ currentBalance: 100_000, drawPermittedFor: ["operating_shortfall"] });
    expect(drawFromReserve(account, 40_000, "operating_shortfall")).toBe(40_000);
  });

  it("caps a draw at the available balance", () => {
    const account = reserve({ currentBalance: 30_000, drawPermittedFor: ["operating_shortfall"] });
    expect(drawFromReserve(account, 40_000, "operating_shortfall")).toBe(30_000);
  });

  it("refuses a draw for an unlisted purpose", () => {
    const account = reserve({ currentBalance: 100_000, drawPermittedFor: ["decommissioning"] });
    expect(() => drawFromReserve(account, 1, "operating_shortfall")).toThrow(ReserveDrawNotPermitted);
  });

  it("refuses every draw on a reserve that permits none", () => {
    const account = reserve({ currentBalance: 100_000, drawPermittedFor: [] });
    expect(() => drawFromReserve(account, 1, "anything")).toThrow(/permitted: none/);
  });
});

describe("AC 18 — insufficient cash funds reserves by priority and records underfunding", () => {
  it("funds high priority first and records what was missed", () => {
    const result = runPreWaterfall(
      input({
        energyRevenue: 1_300_000,
        totalOpex: 1_000_000, // $3,000 available for reserves
        reserves: [
          reserve({ id: "r1", code: "dsra", fundingPriority: 1, targetValue: "2000.00" }),
          reserve({ id: "r2", code: "om", fundingPriority: 2, targetValue: "5000.00" }),
          reserve({ id: "r3", code: "decom", fundingPriority: 3, targetValue: "1000.00" }),
        ],
      }),
    );

    const funded = result.reserveMovements.filter((m) => m.direction === "fund");
    expect(funded.map((m) => m.reserveCode)).toEqual(["dsra", "om"]);
    expect(funded[0].amount).toBe(200_000); // fully funded
    expect(funded[1].amount).toBe(100_000); // partially funded, cash exhausted

    const underfunded = result.notes.filter((n) => n.code === "reserve_underfunded");
    expect(underfunded).toHaveLength(2);
    expect(underfunded[0].detail).toMatch(/"om"/);
    expect(underfunded[0].amount).toBe("4000.00");
    expect(underfunded[1].detail).toMatch(/"decom"/);
    expect(underfunded[1].amount).toBe("1000.00");

    expect(result.lessReserveFunding).toBe(300_000);
    expect(result.distributableCash).toBe(0);
  });

  it("honours a per-period funding cap", () => {
    const result = runPreWaterfall(
      input({
        reserves: [reserve({ targetValue: "10000.00", fundingCapPerPeriod: "1500.00" })],
      }),
    );
    expect(result.lessReserveFunding).toBe(150_000);
    expect(result.notes.some((n) => n.code === "reserve_underfunded")).toBe(true);
  });

  it("does not fund a reserve already at target", () => {
    const result = runPreWaterfall(
      input({ reserves: [reserve({ targetValue: "1000.00", currentBalance: 100_000 })] }),
    );
    expect(result.lessReserveFunding).toBe(0);
    expect(result.notes.some((n) => n.code === "reserve_underfunded")).toBe(false);
  });
});

describe("reserveTarget", () => {
  const context = { cashRevenue: 5_000_000, totalOpex: 1_000_000, daysInPeriod: 31 };

  it("reads a fixed target as money", () => {
    expect(reserveTarget(reserve({ targetBasis: "fixed", targetValue: "2500.00" }), context)).toBe(
      250_000,
    );
  });

  it("reads pct_revenue as a percentage of cash revenue", () => {
    expect(reserveTarget(reserve({ targetBasis: "pct_revenue", targetValue: "10" }), context)).toBe(
      500_000,
    );
  });

  it("reads months_opex against a 30-day-month run rate", () => {
    // $10,000 opex over 31 days is $9,677.42 a month; six months of it.
    const target = reserveTarget(reserve({ targetBasis: "months_opex", targetValue: "6" }), context);
    expect(target).toBe(5_806_452);
  });

  it("rejects an unknown basis rather than funding zero", () => {
    expect(() => reserveTarget(reserve({ targetBasis: "vibes" }), context)).toThrow(
      /unknown target_basis/,
    );
  });
});

describe("debt service", () => {
  it("halts when it cannot be paid, rather than drawing the DSRA", () => {
    expect(() =>
      runPreWaterfall(
        input({
          energyRevenue: 1_500_000,
          totalOpex: 1_000_000, // NOI $5,000
          debtServiceDue: 2_000_000, // needs $20,000
          reserves: [reserve({ code: "dsra", currentBalance: 10_000_000, drawPermittedFor: ["debt_service"] })],
        }),
      ),
    ).toThrow(DebtServiceHalt);
  });

  it("reports the shortfall on the error", () => {
    try {
      runPreWaterfall(
        input({ energyRevenue: 1_500_000, totalOpex: 1_000_000, debtServiceDue: 2_000_000 }),
      );
      expect.unreachable("should have halted");
    } catch (error) {
      expect(error).toBeInstanceOf(DebtServiceHalt);
      expect((error as DebtServiceHalt).shortfallCents).toBe(1_500_000);
    }
  });

  it("pays exactly to the penny without halting", () => {
    const result = runPreWaterfall(
      input({ energyRevenue: 2_000_000, totalOpex: 1_000_000, debtServiceDue: 1_000_000 }),
    );
    expect(result.cashFlowAfterDebtService).toBe(0);
    expect(result.distributableCash).toBe(0);
  });
});

describe("fees", () => {
  it("applies a cap and records it", () => {
    const result = runPreWaterfall(
      input({
        feeSchedule: [
          {
            code: "asset_mgmt",
            name: "Asset management",
            basis: "gross_revenue",
            rate_pct: "2",
            cap: "500.00",
            priority: 1,
          },
        ],
      }),
    );
    // 2% of $50,000 is $1,000, capped at $500.
    expect(result.lessFees).toBe(50_000);
    expect(result.fees[0].capped).toBe(true);
    expect(result.notes.some((n) => n.code === "fee_capped")).toBe(true);
  });

  it("does not let a fee starve a reserve", () => {
    const result = runPreWaterfall(
      input({
        energyRevenue: 1_200_000,
        totalOpex: 1_000_000, // $2,000 available
        reserves: [reserve({ targetValue: "2000.00" })],
        feeSchedule: [
          { code: "flat", name: "Flat fee", basis: "fixed", amount: "500.00", priority: 1 },
        ],
      }),
    );

    // The reserve takes the whole $2,000; the fee goes unpaid this period.
    expect(result.lessReserveFunding).toBe(200_000);
    expect(result.lessFees).toBe(0);
    expect(result.notes.some((n) => n.code === "fee_capped")).toBe(true);
  });

  it("charges a fixed fee regardless of basis flows", () => {
    const result = runPreWaterfall(
      input({
        feeSchedule: [
          { code: "flat", name: "Flat fee", basis: "fixed", amount: "250.00", priority: 1 },
        ],
      }),
    );
    expect(result.lessFees).toBe(25_000);
  });
});

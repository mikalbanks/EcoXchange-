import { describe, it, expect } from "vitest";
import { assertPeriodClosed, checkCloseGates, splitExpenses, totalCashRevenue } from "./period-close";
import { PeriodBlocked } from "./errors";
import {
  StaticProductionVerificationReader,
  StaticRevenueReconciliationReader,
  type ProductionVerificationRecord,
  type RevenueReconciliationRecord,
} from "./ports";
import type { PeriodExpense } from "@shared/schema";

/**
 * Spec 17 AC 9 and AC 10 — a project with non-verified production blocks the
 * close; a `blocked` revenue reconciliation blocks it; a `variance` state
 * does not.
 */

const PERIOD_START = new Date(Date.UTC(2026, 0, 1));
const PERIOD_END = new Date(Date.UTC(2026, 0, 31));

function input(overrides: Partial<Parameters<typeof checkCloseGates>[0]> = {}) {
  return {
    spvId: "spv-1",
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    closedBy: "mikal@ecoxchange.net",
    bankReconciledAt: new Date(Date.UTC(2026, 1, 3)),
    bankReconciledBy: "controller@ecoxchange.net",
    ...overrides,
  };
}

function deps(
  verifications: ProductionVerificationRecord[],
  reconciliations: RevenueReconciliationRecord[] = [],
) {
  return {
    productionVerification: new StaticProductionVerificationReader(verifications),
    revenueReconciliation: new StaticRevenueReconciliationReader(reconciliations),
  };
}

const VERIFIED: ProductionVerificationRecord = {
  projectId: "p1",
  status: "VERIFIED",
  verificationRecordIds: ["vr-1"],
};

describe("AC 9 — production verification gate", () => {
  it("passes when every project is verified", async () => {
    const result = await checkCloseGates(input(), deps([VERIFIED]));
    expect(result.passed).toBe(true);
    expect(result.verificationRecordIds).toEqual(["vr-1"]);
  });

  it("accepts an already-settled interval as verified", async () => {
    const result = await checkCloseGates(
      input(),
      deps([{ projectId: "p1", status: "SETTLED", verificationRecordIds: ["vr-1"] }]),
    );
    expect(result.passed).toBe(true);
  });

  it("blocks on a rejected project", async () => {
    await expect(
      checkCloseGates(
        input(),
        deps([VERIFIED, { projectId: "p2", status: "REJECTED", verificationRecordIds: [] }]),
      ),
    ).rejects.toThrow(/project p2: REJECTED/);
  });

  it("blocks on a flagged project", async () => {
    await expect(
      checkCloseGates(input(), deps([{ projectId: "p2", status: "FLAGGED", verificationRecordIds: [] }])),
    ).rejects.toThrow(/project p2: FLAGGED/);
  });

  it("blocks on a missing verification record", async () => {
    await expect(
      checkCloseGates(input(), deps([{ projectId: "p3", status: null, verificationRecordIds: [] }])),
    ).rejects.toThrow(/no verification record for the period/);
  });

  it("names the gate that failed", async () => {
    try {
      await checkCloseGates(
        input(),
        deps([{ projectId: "p2", status: "PENDING", verificationRecordIds: [] }]),
      );
      expect.unreachable("should have blocked");
    } catch (error) {
      expect(error).toBeInstanceOf(PeriodBlocked);
      expect((error as PeriodBlocked).gate).toBe("verification");
    }
  });
});

describe("AC 10 — revenue reconciliation gate", () => {
  it("blocks on a blocked reconciliation", async () => {
    try {
      await checkCloseGates(
        input(),
        deps([VERIFIED], [{ id: "rr-1", status: "blocked", detail: "invoice missing" }]),
      );
      expect.unreachable("should have blocked");
    } catch (error) {
      expect(error).toBeInstanceOf(PeriodBlocked);
      expect((error as PeriodBlocked).gate).toBe("revenue_reconciliation");
      expect((error as Error).message).toMatch(/rr-1 — invoice missing/);
    }
  });

  it("passes a variance state through, flagged not blocking", async () => {
    const result = await checkCloseGates(
      input(),
      deps([VERIFIED], [{ id: "rr-2", status: "variance", detail: "3.2% under invoice" }]),
    );

    expect(result.passed).toBe(true);
    expect(result.warnings).toEqual(["revenue reconciliation rr-2 in variance: 3.2% under invoice"]);
    expect(result.revenueReconciliationIds).toEqual(["rr-2"]);
  });

  it("passes an ok state silently", async () => {
    const result = await checkCloseGates(
      input(),
      deps([VERIFIED], [{ id: "rr-3", status: "ok", detail: "" }]),
    );
    expect(result.warnings).toEqual([]);
  });
});

describe("bank reconciliation gate", () => {
  it("blocks when the bank has not been reconciled", async () => {
    await expect(
      checkCloseGates(input({ bankReconciledAt: null }), deps([VERIFIED])),
    ).rejects.toThrow(/bank reconciliation incomplete/);
  });

  it("blocks when no one is named as having reconciled it", async () => {
    await expect(
      checkCloseGates(input({ bankReconciledBy: null }), deps([VERIFIED])),
    ).rejects.toThrow(/bank reconciliation incomplete/);
  });
});

describe("assertPeriodClosed", () => {
  it("allows a closed period", () => {
    expect(() => assertPeriodClosed("closed", PERIOD_START)).not.toThrow();
  });

  it("refuses an open period", () => {
    expect(() => assertPeriodClosed("open", PERIOD_START)).toThrow(/is "open", not "closed"/);
  });

  it("refuses a restated period until it closes again", () => {
    expect(() => assertPeriodClosed("restated", PERIOD_START)).toThrow(/2026-01-01/);
  });
});

describe("cash accounting", () => {
  const expenses: PeriodExpense[] = [
    { code: "om", description: "O&M", amount: "5000.00", vendor: "Acme", recognition: "paid" },
    { code: "ins", description: "Insurance", amount: "1200.50", vendor: "Chubb", recognition: "paid" },
    { code: "audit", description: "Audit accrual", amount: "3000.00", vendor: null, recognition: "accrued" },
  ];

  it("distributes only what was actually paid", () => {
    const split = splitExpenses(expenses);
    expect(split.paid).toBe(620_050);
    // The accrual is kept, not discarded — it matters to the tax books.
    expect(split.accrued).toBe(300_000);
  });

  it("sums the cash revenue lines", () => {
    expect(
      totalCashRevenue({
        energyRevenue: 5_000_000,
        recRevenue: 250_000,
        itcTransferProceeds: 30_000_000,
        otherRevenue: 1_000,
        expenses: [],
      }),
    ).toBe(35_251_000);
  });
});

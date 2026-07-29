import { describe, it, expect } from "vitest";
import { assertCapTableReconciled, reconcileCapTable, type LocalHolding } from "./cap-table";
import { CapTableDrift } from "./errors";
import { parseUnits } from "./money";

/**
 * Spec 17 AC 12 — every cap-table drift case in § 11.3 halts. None proceeds
 * with a warning.
 */

const local: LocalHolding[] = [
  { memberId: "m1", investorRef: "INV-1", units: parseUnits("600") },
  { memberId: "m2", investorRef: "INV-2", units: parseUnits("400") },
];

describe("reconcileCapTable", () => {
  it("proceeds when both sides match", () => {
    const result = reconcileCapTable(local, [
      { investorRef: "INV-1", units: "600" },
      { investorRef: "INV-2", units: "400.000000" },
    ]);

    expect(result.reconciled).toBe(true);
    expect(result.discrepancies).toEqual([]);
    expect(result.matchedRefs).toEqual(["INV-1", "INV-2"]);
    expect(result.localTotalUnits).toBe("1000.000000");
    expect(result.remoteTotalUnits).toBe("1000.000000");
    expect(() => assertCapTableReconciled(result)).not.toThrow();
  });

  it("halts when the transfer agent has a holder this ledger lacks", () => {
    const result = reconcileCapTable(local, [
      { investorRef: "INV-1", units: "600" },
      { investorRef: "INV-2", units: "400" },
      { investorRef: "INV-3", units: "150" },
    ]);

    expect(result.reconciled).toBe(false);
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0]).toMatch(/transfer agent holds 150\.000000 units for "INV-3"/);
    expect(() => assertCapTableReconciled(result)).toThrow(CapTableDrift);
  });

  it("halts when unit counts differ", () => {
    const result = reconcileCapTable(local, [
      { investorRef: "INV-1", units: "599.999999" },
      { investorRef: "INV-2", units: "400" },
    ]);

    expect(result.reconciled).toBe(false);
    expect(result.discrepancies[0]).toMatch(/unit count differs for "INV-1"/);
    expect(() => assertCapTableReconciled(result)).toThrow(CapTableDrift);
  });

  it("halts when this ledger has a member the transfer agent lacks", () => {
    const result = reconcileCapTable(local, [{ investorRef: "INV-1", units: "600" }]);

    expect(result.reconciled).toBe(false);
    expect(result.discrepancies[0]).toMatch(
      /this ledger holds 400\.000000 units for "INV-2", which the transfer agent does not list/,
    );
    expect(() => assertCapTableReconciled(result)).toThrow(CapTableDrift);
  });

  it("reports every discrepancy rather than stopping at the first", () => {
    const result = reconcileCapTable(local, [
      { investorRef: "INV-1", units: "1" },
      { investorRef: "INV-9", units: "5" },
    ]);

    expect(result.discrepancies).toHaveLength(3);
    expect(() => assertCapTableReconciled(result)).toThrow(/INV-1.*INV-2.*INV-9|INV-9/s);
  });

  it("does not flag a fully-redeemed member the transfer agent has dropped", () => {
    // The member stays on our books forever — their capital account history
    // does not go away — but they hold nothing, so this is not drift.
    const withRedeemed: LocalHolding[] = [
      ...local,
      { memberId: "m3", investorRef: "INV-3", units: 0n },
    ];
    const result = reconcileCapTable(withRedeemed, [
      { investorRef: "INV-1", units: "600" },
      { investorRef: "INV-2", units: "400" },
    ]);

    expect(result.reconciled).toBe(true);
  });

  it("sums multiple positions for the same investor ref", () => {
    const split: LocalHolding[] = [
      { memberId: "m1", investorRef: "INV-1", units: parseUnits("250") },
      { memberId: "m1b", investorRef: "INV-1", units: parseUnits("350") },
    ];
    const result = reconcileCapTable(split, [{ investorRef: "INV-1", units: "600" }]);
    expect(result.reconciled).toBe(true);
  });

  it("reconciles two empty sides", () => {
    const result = reconcileCapTable([], []);
    expect(result.reconciled).toBe(true);
    expect(result.localTotalUnits).toBe("0.000000");
  });

  it("orders discrepancies deterministically", () => {
    const first = reconcileCapTable(local, [{ investorRef: "INV-2", units: "1" }]);
    const second = reconcileCapTable([...local].reverse(), [{ investorRef: "INV-2", units: "1" }]);
    expect(first.discrepancies).toEqual(second.discrepancies);
  });
});

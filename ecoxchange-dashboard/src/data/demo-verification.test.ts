import { describe, expect, it } from "vitest";
import {
  FLAGGED_MONTH,
  SAVANNAH_VERIFICATION_HISTORY,
  UTILITY_MISSING_MONTH,
} from "./demo-verification.js";

describe("Savannah operating verification history", () => {
  it("covers 12 consecutive months ending June 2026", () => {
    expect(SAVANNAH_VERIFICATION_HISTORY).toHaveLength(12);
    expect(SAVANNAH_VERIFICATION_HISTORY[0].period_start).toBe("2025-07-01");
    expect(
      SAVANNAH_VERIFICATION_HISTORY[SAVANNAH_VERIFICATION_HISTORY.length - 1]
        .period_start,
    ).toBe("2026-06-01");
    const sorted = [...SAVANNAH_VERIFICATION_HISTORY].sort((a, b) =>
      a.period_start.localeCompare(b.period_start),
    );
    expect(sorted).toEqual(SAVANNAH_VERIFICATION_HISTORY);
  });

  it("flags exactly one month: June 2026 at −19.7%", () => {
    const flagged = SAVANNAH_VERIFICATION_HISTORY.filter(
      (r) => r.status === "flagged",
    );
    expect(flagged).toHaveLength(1);
    expect(flagged[0].period_start).toBe(FLAGGED_MONTH);
    expect(flagged[0].inv_vs_expected_pct).toBe(-19.7);
    expect(flagged[0].flag_reasons.length).toBeGreaterThan(0);
    expect(flagged[0].classification?.category).toBe("soiling");
    expect(flagged[0].classification?.confidence).toBe("medium");
  });

  it("keeps every verified month inside the ±15% tolerance band", () => {
    for (const r of SAVANNAH_VERIFICATION_HISTORY) {
      if (r.status !== "verified") continue;
      expect(Math.abs(r.inv_vs_expected_pct)).toBeLessThan(15);
      expect(r.classification).toBeUndefined();
      // A verified month carries no flag reasons — except the two-way note,
      // which records an absent utility reading without blocking the verdict.
      if (r.utility_kwh !== null) expect(r.flag_reasons).toHaveLength(0);
    }
  });

  it("has arithmetically consistent deviation percentages", () => {
    for (const r of SAVANNAH_VERIFICATION_HISTORY) {
      const ive = ((r.inverter_kwh - r.expected_kwh) / r.expected_kwh) * 100;
      expect(r.inv_vs_expected_pct).toBeCloseTo(ive, 1);
      if (r.utility_kwh !== null) {
        // Divisor matches reconcile.ts:71 — INV→UTL is expressed against the
        // INVERTER reading, not the utility reading.
        const ivu =
          ((r.inverter_kwh - r.utility_kwh) / r.inverter_kwh) * 100;
        const ute =
          ((r.utility_kwh - r.expected_kwh) / r.expected_kwh) * 100;
        expect(r.inv_vs_utility_pct).toBeCloseTo(ivu, 1);
        expect(r.util_vs_expected_pct).toBeCloseTo(ute, 1);
      }
    }
  });

  it("Spec 19 §3.2: exactly one month exercises the two-way degrade path", () => {
    const twoWay = SAVANNAH_VERIFICATION_HISTORY.filter(
      (r) => r.utility_kwh === null,
    );
    expect(twoWay).toHaveLength(1);
    expect(twoWay[0].period_start).toBe(UTILITY_MISSING_MONTH);
    // Absent utility data degrades the check; it does not fail the month.
    expect(twoWay[0].status).toBe("verified");
    expect(twoWay[0].inv_vs_utility_pct).toBeNull();
    expect(twoWay[0].util_vs_expected_pct).toBeNull();
    expect(twoWay[0].flag_reasons).toContain(
      "Utility meter data not available — verification based on inverter vs. satellite only (two-way check).",
    );
  });

  it("Spec 19: every record declares its provenance, and none claims live telemetry", () => {
    for (const r of SAVANNAH_VERIFICATION_HISTORY) {
      expect(r.data_provenance).toBe("simulated");
    }
  });

  it("Spec 19 G1: no run of identically-zero deviations", () => {
    let run = 0;
    for (const r of SAVANNAH_VERIFICATION_HISTORY) {
      run = Math.abs(r.inv_vs_expected_pct) < 0.001 ? run + 1 : 0;
      expect(run).toBeLessThan(3);
    }
  });

  it("sets up the soiling story: May 2026 declines before the June flag", () => {
    const may = SAVANNAH_VERIFICATION_HISTORY.find(
      (r) => r.period_start === "2026-05-01",
    )!;
    expect(may.status).toBe("verified");
    expect(may.inv_vs_expected_pct).toBeLessThan(-5);
    // inverter and utility agree in June (rules out monitoring error)
    const june = SAVANNAH_VERIFICATION_HISTORY.find(
      (r) => r.period_start === FLAGGED_MONTH,
    )!;
    expect(Math.abs(june.inv_vs_utility_pct ?? 99)).toBeLessThan(8);
  });
});

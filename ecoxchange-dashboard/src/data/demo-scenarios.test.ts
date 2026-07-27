import { describe, expect, it } from "vitest";
import {
  DEMO_SCENARIOS,
  DEMO_SCENARIO_LIST,
  buildScenarioSummary,
} from "./demo-scenarios.js";
import { runningCapacityFactorPct } from "../hooks/useBacktestProgress.js";

describe("demo scenarios", () => {
  it("exposes exactly three scenarios, each with 12 months", () => {
    expect(DEMO_SCENARIO_LIST).toHaveLength(3);
    for (const scenario of DEMO_SCENARIO_LIST) {
      expect(scenario.months).toHaveLength(12);
      expect(scenario.intake.project_name.length).toBeGreaterThan(0);
      expect(scenario.intake.latitude).toBeGreaterThan(24);
      expect(scenario.intake.longitude).toBeLessThan(-60);
    }
  });

  it("keeps every seed month verified and inside the ±15% tolerance band", () => {
    for (const scenario of DEMO_SCENARIO_LIST) {
      for (const m of scenario.months) {
        expect(m.status).toBe("verified");
        expect(Math.abs(m.deviation_pct)).toBeLessThan(15);
        // inverter must be arithmetically consistent with the deviation
        const implied =
          ((m.inverter_kwh - m.expected_kwh) / m.expected_kwh) * 100;
        expect(implied).toBeCloseTo(m.deviation_pct, 0);
      }
    }
  });

  it("computes capacity factors in the expected band per site", () => {
    expect(
      DEMO_SCENARIOS.savannah_5mw.summary.capacity_factor_pct,
    ).toBeCloseTo(18.5, 0);
    const billerica = DEMO_SCENARIOS.billerica_2mw.summary;
    expect(billerica.capacity_factor_pct).toBeGreaterThan(14);
    expect(billerica.capacity_factor_pct).toBeLessThan(18);
    const phoenix = DEMO_SCENARIOS.phoenix_1mw.summary;
    expect(phoenix.capacity_factor_pct).toBeGreaterThan(20);
    expect(phoenix.capacity_factor_pct).toBeLessThan(24);
  });

  it("summary annual MWh matches the sum of monthly expected kWh", () => {
    for (const scenario of DEMO_SCENARIO_LIST) {
      const totalMwh =
        scenario.months.reduce((s, m) => s + m.expected_kwh, 0) / 1000;
      expect(scenario.summary.annual_mwh).toBeCloseTo(totalMwh, 0);
    }
  });

  it("identifies best and worst months consistently", () => {
    for (const scenario of DEMO_SCENARIO_LIST) {
      const sorted = [...scenario.months].sort(
        (a, b) => b.expected_kwh - a.expected_kwh,
      );
      expect(scenario.summary.best_month.month).toBe(sorted[0].month);
      expect(scenario.summary.worst_month.month).toBe(
        sorted[sorted.length - 1].month,
      );
      expect(scenario.summary.seasonal_ratio).toBeGreaterThanOrEqual(1);
    }
  });

  it("running capacity factor over all 12 months matches the summary", () => {
    for (const scenario of DEMO_SCENARIO_LIST) {
      const cf = runningCapacityFactorPct(
        scenario.months,
        scenario.intake.capacity_kw_dc,
      );
      // 8760h year vs per-month day counts — allow 1pt of rounding drift
      expect(
        Math.abs(cf - scenario.summary.capacity_factor_pct),
      ).toBeLessThan(1);
    }
  });

  it("buildScenarioSummary handles an empty capacity gracefully", () => {
    const summary = buildScenarioSummary(
      DEMO_SCENARIOS.phoenix_1mw.months,
      0,
    );
    expect(summary.capacity_factor_pct).toBe(0);
  });
});

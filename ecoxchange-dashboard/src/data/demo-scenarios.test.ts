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

  it("keeps deviations arithmetically consistent, and the verdict matched to the band", () => {
    for (const scenario of DEMO_SCENARIO_LIST) {
      for (const m of scenario.months) {
        // inverter must be arithmetically consistent with the deviation
        const implied =
          ((m.inverter_kwh - m.expected_kwh) / m.expected_kwh) * 100;
        expect(implied).toBeCloseTo(m.deviation_pct, 0);

        // Spec 19 §3.2: the seed series is no longer uniformly verified — it
        // deliberately carries a flagged month, because a demo where every
        // month passes only proves the engine can say yes. So assert the
        // relationship between verdict and band rather than a blanket "pass".
        if (m.status === "verified") {
          expect(Math.abs(m.deviation_pct)).toBeLessThan(15);
        } else {
          expect(m.status).toBe("flagged");
          expect(Math.abs(m.deviation_pct)).toBeGreaterThanOrEqual(15);
        }
      }
    }
  });

  it("Spec 19 §3.2: the Savannah seed proves the engine can say no", () => {
    const months = DEMO_SCENARIOS.savannah_5mw.months;
    const flagged = months.filter((m) => m.status === "flagged");
    expect(flagged).toHaveLength(1);
    expect(flagged[0].deviation_pct).toBeLessThan(-15);
  });

  it("Spec 19: no seed month reads a 0.0% deviation", () => {
    for (const scenario of DEMO_SCENARIO_LIST) {
      for (const m of scenario.months) {
        expect(Math.abs(m.deviation_pct)).toBeGreaterThan(0.001);
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

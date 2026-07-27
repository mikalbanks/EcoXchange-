import { describe, expect, it } from "vitest";
import benchmark from "../../data/benchmark-results.json";
import { DEMO_SCENARIOS } from "../../data/demo-scenarios.js";
import type { StoredBacktestResult } from "../../utils/backtest-store.js";
import { SPEC_COST } from "../../utils/cost-comparison.js";
import { buildVerificationReportModel } from "./report-model.js";

function storedResult(
  scenarioId: keyof typeof DEMO_SCENARIOS,
): StoredBacktestResult {
  const s = DEMO_SCENARIOS[scenarioId];
  return {
    scenario_id: s.id,
    project_name: s.intake.project_name,
    intake: s.intake,
    months: s.months,
    summary: s.summary,
    source: "seed",
    engine_version: "v2.0.0",
    generated_at: "2026-07-27T00:00:00.000Z",
    report_id: "BT-20260727-TEST-AAAA",
  };
}

describe("buildVerificationReportModel", () => {
  it("computes Savannah's revenue from annual MWh × PPA rate", () => {
    const m = buildVerificationReportModel(storedResult("savannah_5mw"));
    // 8,102.8 MWh × $0.085/kWh ≈ $688,738
    expect(m.annualRevenueUsd).toBeCloseTo(
      m.annualMwh * 1000 * 0.085,
      -2,
    );
    expect(m.annualRevenueUsd).toBeGreaterThan(650_000);
    expect(m.annualRevenueUsd).toBeLessThan(730_000);
  });

  it("enriches location and program from the demo scenario", () => {
    const m = buildVerificationReportModel(storedResult("savannah_5mw"));
    expect(m.locationLabel).toContain("Savannah, GA");
    expect(m.locationLabel).toContain("32.08°N");
    expect(m.stateProgram).toBe("Georgia Power Community Solar");
    expect(m.sourceBadge).toBe("Satellite Backtest");
  });

  it("falls back to coordinates when the scenario is unknown (live path)", () => {
    const result = storedResult("phoenix_1mw");
    const m = buildVerificationReportModel({
      ...result,
      scenario_id: "someday_live_project" as never,
    });
    expect(m.locationLabel).toBe("33.45°N, 112.07°W");
    expect(m.stateProgram).toBeNull();
  });

  it("builds 12 monthly bars with a correct max", () => {
    const m = buildVerificationReportModel(storedResult("savannah_5mw"));
    expect(m.monthlyBars).toHaveLength(12);
    expect(m.maxMonthKwh).toBe(
      Math.max(...m.monthlyBars.map((b) => b.kwh)),
    );
    // best month bar equals the max
    expect(m.bestMonth.kwh).toBe(m.maxMonthKwh);
  });

  it("puts the project first in the CF comparison, values descending sanity", () => {
    const m = buildVerificationReportModel(storedResult("savannah_5mw"));
    expect(m.cfComparison[0].emphasis).toBe(true);
    expect(m.cfComparison[0].pct).toBeCloseTo(18.5, 0);
    expect(m.cfComparison[1].pct).toBe(17.8);
    expect(m.cfComparison[2].pct).toBe(16.2);
  });

  it("benchmark stats match the committed artifact exactly", () => {
    const m = buildVerificationReportModel(storedResult("savannah_5mw"));
    expect(m.fleetSize).toBe(benchmark.plants_succeeded);
    expect(m.publicationMadPct).toBe(
      benchmark.publication.mean_absolute_deviation_pct,
    );
    expect(m.publicationWithin10Pct).toBe(
      benchmark.publication.within_10_pct_rate,
    );
    expect(m.targetSegmentMadLow).toBe(9.2);
    expect(m.targetSegmentMadHigh).toBe(9.7);
  });

  it("computes EcoXchange fees dynamically from the project's raise", () => {
    const savannah = buildVerificationReportModel(
      storedResult("savannah_5mw"),
    ); // $2.5M raise
    expect(savannah.equityRaiseUsd).toBe(2_500_000);
    expect(savannah.cost.ecoxchangeTotal).toBe(
      SPEC_COST.ecoxchangeUpfrontUsd,
    ); // 3% + $15K = $90K at $2.5M
    expect(savannah.allInYear1Usd).toBe(
      90_000 + SPEC_COST.ecoxchangeAnnualUsd,
    );

    const billerica = buildVerificationReportModel(
      storedResult("billerica_2mw"),
    ); // $1.5M raise → 45K + 15K = 60K
    expect(billerica.equityRaiseUsd).toBe(1_500_000);
    expect(billerica.cost.ecoxchangeTotal).toBe(60_000);
    expect(billerica.cost.ecoxchangeTotal).not.toBe(
      SPEC_COST.ecoxchangeUpfrontUsd,
    );
  });

  it("follows the filename convention", () => {
    const m = buildVerificationReportModel(storedResult("savannah_5mw"));
    expect(m.filename).toMatch(
      /^EcoXchange_Verification_Report_Savannah_Community_Solar_5MW_\d{4}-\d{2}-\d{2}\.pdf$/,
    );
  });

  it("labels the backtest window from the months array", () => {
    const m = buildVerificationReportModel(storedResult("savannah_5mw"));
    expect(m.backtestWindowLabel).toBe("January 2024 – December 2024");
  });

  it("works for all three demo scenarios", () => {
    for (const id of ["savannah_5mw", "billerica_2mw", "phoenix_1mw"] as const) {
      const m = buildVerificationReportModel(storedResult(id));
      expect(m.annualMwh).toBeGreaterThan(0);
      expect(m.capacityFactorPct).toBeGreaterThan(10);
      expect(m.monthlyBars).toHaveLength(12);
      expect(m.annualRevenueUsd).toBeGreaterThan(0);
    }
  });
});

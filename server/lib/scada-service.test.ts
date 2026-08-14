import { describe, expect, it } from "vitest";

import {
  getDistributions,
  getForecast,
  getMonthlyHistory,
  getProjectSummary,
} from "./scada-service";

describe("SCADA monthly rollups", () => {
  it("aggregates hourly seed records before reporting monthly metrics", async () => {
    const [summary, history, forecast, distributions] = await Promise.all([
      getProjectSummary("proj1"),
      getMonthlyHistory("proj1"),
      getForecast("proj1"),
      getDistributions("proj1"),
    ]);

    expect(summary).not.toBeNull();
    expect(history).not.toBeNull();
    expect(forecast).not.toBeNull();
    expect(distributions).not.toBeNull();

    expect(summary!.periodsReported).toBe(12);
    expect(history!.records).toHaveLength(12);
    expect(new Set(history!.records.map((record) => record.period)).size).toBe(12);

    const monthlyProduction = history!.records.reduce(
      (total, record) => total + record.productionMwh,
      0,
    );
    expect(monthlyProduction).toBeCloseTo(summary!.totalProductionMwh, 1);
    expect(summary!.trailing12MonthRevenue).toBeCloseTo(summary!.totalNetRevenue, 1);

    expect(forecast!.totalForecastMwh).toBeGreaterThan(20_000);
    expect(forecast!.totalForecastRevenue).toBeGreaterThan(1_000_000);

    expect(distributions!.totals.grossRevenue).toBeCloseTo(
      summary!.totalGrossRevenue,
      1,
    );
    expect(distributions!.totals.netRevenue).toBeCloseTo(summary!.totalNetRevenue, 1);
    expect(Math.abs(
      distributions!.totals.investorShare
      + distributions!.totals.platformFee
      - distributions!.totals.netRevenue,
    )).toBeLessThan(1);
  });
});

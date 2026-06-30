import { describe, expect, it } from "vitest";
import { inferOutlierCause } from "../src/backtest/outlier-analysis.js";
import type { PlantBacktestResult } from "../src/utils/types.js";

function res(overrides: Partial<PlantBacktestResult>): PlantBacktestResult {
  const base: PlantBacktestResult = {
    plant: {
      eia_plant_id: "1",
      uspvdb_id: null,
      name: "P",
      latitude: 32,
      longitude: -81,
      state: "GA",
      county: null,
      capacity_dc_mw: 5,
      capacity_ac_mw: 4,
      panel_technology: "Crystalline Silicon",
      axis_type: "Fixed",
      commissioning_year: 2020,
      tilt_deg: 25,
      azimuth_deg: 180,
      tilt_source: "eia860",
      azimuth_source: "eia860",
      pvdaq_system_id: null,
      pvdaq_distance_km: null,
      actual_annual_mwh: 8500,
      actual_monthly_mwh: [],
      production_year: 2023,
      actual_capacity_factor_pct: 19,
    },
    monthlyExpected: [],
    annualExpectedMwh: 8500,
    annualActualMwh: 8500,
    deviationPct: 0,
    expectedCapacityFactor: 19,
    actualCapacityFactor: 19,
    irradianceSource: "nasa_power",
    trackingBoostApplied: 1.0,
    withinTenPercent: true,
    withinFifteenPercent: true,
  };
  return { ...base, ...overrides };
}

describe("inferOutlierCause", () => {
  it("flags partial-year operation for plants commissioned in the production year", () => {
    const r = res({
      deviationPct: 25,
      plant: { ...res({}).plant, commissioning_year: 2023 },
    });
    expect(inferOutlierCause(r)).toMatch(/partial-year/);
  });
  it("flags tracking misclassification on big underestimates", () => {
    const r = res({
      deviationPct: -20,
      plant: { ...res({}).plant, axis_type: "Single Axis Tracking" },
      trackingBoostApplied: 1.0,
    });
    expect(inferOutlierCause(r)).toMatch(/tracking/);
  });
  it("returns 'within tolerance' for ±15%", () => {
    expect(inferOutlierCause(res({ deviationPct: 5 }))).toMatch(/within/i);
    expect(inferOutlierCause(res({ deviationPct: -10 }))).toMatch(/within/i);
  });
});

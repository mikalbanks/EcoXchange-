import { describe, it, expect } from "vitest";
import { calculateExpectedGeneration } from "../physics/expected-generation.js";
import type { DailyIrradiance } from "../utils/types.js";

const SAVANNAH = {
  name: "Test",
  latitude: 32.08,
  longitude: -81.09,
  capacity_kw_dc: 5000,
  tilt_deg: 20,
  azimuth_deg: 180,
  module_efficiency: 0.2,
  system_losses: 0.14,
  degradation_rate: 0.0075,
  commissioning_date: "2023-01-01",
};

function mkDay(date: string, ghi: number, dni: number, dhi: number): DailyIrradiance {
  return { date, ghi_kwh_m2: ghi, dni_kwh_m2: dni, dhi_kwh_m2: dhi };
}

describe("expected generation pipeline", () => {
  it("scales linearly with capacity", () => {
    const days = [mkDay("2024-06-15", 6.5, 7.0, 1.5)];
    const small = calculateExpectedGeneration({
      ...SAVANNAH,
      capacity_kw_dc: 1000,
      period_start: "2024-06-01",
      period_end: "2024-06-30",
      daily_irradiance: days,
    });
    const big = calculateExpectedGeneration({
      ...SAVANNAH,
      capacity_kw_dc: 5000,
      period_start: "2024-06-01",
      period_end: "2024-06-30",
      daily_irradiance: days,
    });
    expect(big.expected_kwh / small.expected_kwh).toBeCloseTo(5, 3);
  });

  it("applies system_losses correctly", () => {
    const days = [mkDay("2024-06-15", 6.5, 7.0, 1.5)];
    const a = calculateExpectedGeneration({
      ...SAVANNAH,
      system_losses: 0.0,
      period_start: "2024-06-01",
      period_end: "2024-06-30",
      daily_irradiance: days,
    });
    const b = calculateExpectedGeneration({
      ...SAVANNAH,
      system_losses: 0.2,
      period_start: "2024-06-01",
      period_end: "2024-06-30",
      daily_irradiance: days,
    });
    expect(b.expected_kwh / a.expected_kwh).toBeCloseTo(0.8, 3);
  });

  it("degradation factor matches NREL linear model: 1.5% after 2 years at 0.75%/yr", () => {
    const days = [mkDay("2025-01-15", 4.0, 5.0, 1.0)];
    const out = calculateExpectedGeneration({
      ...SAVANNAH,
      commissioning_date: "2023-01-15",
      period_start: "2025-01-01",
      period_end: "2025-01-31",
      daily_irradiance: days,
    });
    expect(out.assumptions.degradation_factor).toBeCloseTo(0.985, 2);
  });

  it("degradation factor = 1 for brand-new system", () => {
    const days = [mkDay("2025-01-15", 4.0, 5.0, 1.0)];
    const out = calculateExpectedGeneration({
      ...SAVANNAH,
      commissioning_date: "2025-01-01",
      period_start: "2025-01-01",
      period_end: "2025-01-31",
      daily_irradiance: days,
    });
    expect(out.assumptions.degradation_factor).toBeGreaterThan(0.999);
  });

  it("monthly sum equals sum of daily breakdown", () => {
    const days = [
      mkDay("2024-06-01", 6.0, 7.0, 1.4),
      mkDay("2024-06-02", 6.2, 7.1, 1.3),
      mkDay("2024-06-03", 5.8, 6.5, 1.5),
    ];
    const out = calculateExpectedGeneration({
      ...SAVANNAH,
      period_start: "2024-06-01",
      period_end: "2024-06-30",
      daily_irradiance: days,
    });
    const sum = out.daily_breakdown.reduce((s, d) => s + d.expected_kwh, 0);
    expect(out.expected_kwh).toBeCloseTo(sum, 5);
  });

  it("plausible daily output: 5 MW system in Savannah summer ~25-40 MWh/day", () => {
    const days = [mkDay("2024-06-15", 6.5, 7.0, 1.5)];
    const out = calculateExpectedGeneration({
      ...SAVANNAH,
      period_start: "2024-06-01",
      period_end: "2024-06-30",
      daily_irradiance: days,
    });
    // ~25–40 MWh per day is plausible for a 5 MW system in summer
    expect(out.expected_kwh).toBeGreaterThan(20_000);
    expect(out.expected_kwh).toBeLessThan(45_000);
  });
});

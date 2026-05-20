import { describe, it, expect } from "vitest";
import { reconcile } from "../reconciliation/reconcile.js";
import {
  widenTolerancesForNewSystem,
  extremeWeatherNote,
} from "../reconciliation/edge-cases.js";
import { DEFAULT_TOLERANCES } from "../config/tolerances.js";
import type {
  ExpectedGenerationOutput,
  ProjectConfig,
  ReconciliationInput,
} from "../utils/types.js";

const project: ProjectConfig = {
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

const expected: ExpectedGenerationOutput = {
  period_start: "2024-06-01",
  period_end: "2024-06-30",
  expected_kwh: 700_000,
  daily_breakdown: [],
  assumptions: {
    degradation_factor: 0.99,
    system_losses: 0.14,
    albedo: 0.2,
    transposition_model: "hay_davies",
  },
};

function input(
  inverter: number | null,
  utility: number | null,
  invQuality: "complete" | "partial" | "missing" | "error" = "complete",
): ReconciliationInput {
  return {
    project,
    period_start: "2024-06-01",
    period_end: "2024-06-30",
    inverter_reading:
      inverter === null
        ? null
        : { kwh_gross: inverter, data_quality: invQuality },
    utility_reading: utility === null ? null : { kwh_net: utility, data_quality: "complete" },
    expected_generation: expected,
    tolerances: DEFAULT_TOLERANCES,
  };
}

describe("reconcile — decision matrix", () => {
  it("VERIFIED when all three sources agree within tolerance (three-way)", () => {
    const out = reconcile(input(700_000, 679_000));
    expect(out.status).toBe("verified");
    expect(out.flag_reasons).toEqual([]);
  });

  it("FLAGGED when inverter exceeds +15% vs expected", () => {
    const out = reconcile(input(820_000, 795_400));
    expect(out.status).toBe("flagged");
    expect(out.flag_reasons.some((r) => r.includes("ABOVE expected"))).toBe(true);
  });

  it("FLAGGED when inverter falls below -15% vs expected", () => {
    const out = reconcile(input(580_000, 562_600));
    expect(out.status).toBe("flagged");
    expect(out.flag_reasons.some((r) => r.includes("BELOW expected"))).toBe(true);
  });

  it("FLAGGED when inverter and utility diverge by more than 10%", () => {
    // inverter within ±15% of expected, but utility much lower than inverter
    const out = reconcile(input(700_000, 600_000));
    expect(out.status).toBe("flagged");
    expect(
      out.flag_reasons.some((r) => r.includes("Inverter and utility meter diverge")),
    ).toBe(true);
  });

  it("VERIFIED two-way when utility data is missing", () => {
    const out = reconcile(input(710_000, null));
    expect(out.status).toBe("verified");
    expect(
      out.flag_reasons.some((r) =>
        r.includes("Utility meter data not available"),
      ),
    ).toBe(true);
    expect(out.util_vs_expected_pct).toBeNull();
  });

  it("FLAGGED two-way when utility missing and inverter exceeds ±15%", () => {
    const out = reconcile(input(820_000, null));
    expect(out.status).toBe("flagged");
  });

  it("PENDING when inverter data is missing", () => {
    const out = reconcile(input(null, 670_000));
    expect(out.status).toBe("pending");
    expect(out.util_vs_expected_pct).not.toBeNull();
  });

  it("PENDING when inverter data quality is error", () => {
    const out = reconcile(input(500_000, 480_000, "error"));
    expect(out.status).toBe("pending");
  });

  it("PENDING when inverter data quality is missing", () => {
    const out = reconcile(input(500_000, 480_000, "missing"));
    expect(out.status).toBe("pending");
  });

  it("partial inverter data attaches note but does not block verification", () => {
    const out = reconcile(input(700_000, 679_000, "partial"));
    expect(out.status).toBe("verified");
    expect(out.flag_reasons.some((r) => r.includes("partial"))).toBe(true);
  });

  it("computes deviation percentages correctly", () => {
    const out = reconcile(input(770_000, 750_000));
    expect(out.inv_vs_expected_pct).toBeCloseTo(10, 3);
    expect(out.inv_vs_utility_pct).toBeCloseTo(((770000 - 750000) / 770000) * 100, 3);
    expect(out.util_vs_expected_pct).toBeCloseTo(((750000 - 700000) / 700000) * 100, 3);
  });
});

describe("edge cases", () => {
  it("widens inv_vs_expected by ±5% for systems under 90 days old", () => {
    const widened = widenTolerancesForNewSystem(
      "2024-04-15",
      "2024-06-01",
      DEFAULT_TOLERANCES,
    );
    expect(widened.inv_vs_expected_upper_pct).toBe(20);
    expect(widened.inv_vs_expected_lower_pct).toBe(-20);
  });

  it("does not widen tolerances after 90 days", () => {
    const same = widenTolerancesForNewSystem(
      "2023-01-01",
      "2024-06-01",
      DEFAULT_TOLERANCES,
    );
    expect(same).toEqual(DEFAULT_TOLERANCES);
  });

  it("emits extreme weather note when irradiance is >2σ below historical mean", () => {
    const note = extremeWeatherNote({
      period_ghi_kwh_m2: 80,
      historical_mean_ghi_kwh_m2: 150,
      historical_std_ghi_kwh_m2: 20,
    });
    expect(note).not.toBeNull();
    expect(note).toContain("unusually low");
  });

  it("no extreme weather note when irradiance is within 2σ", () => {
    const note = extremeWeatherNote({
      period_ghi_kwh_m2: 140,
      historical_mean_ghi_kwh_m2: 150,
      historical_std_ghi_kwh_m2: 20,
    });
    expect(note).toBeNull();
  });
});

describe("reconcile — acceptance criteria validation", () => {
  it("zero flags when inverter perfectly matches expected", () => {
    const out = reconcile(input(700_000, 700_000 * 0.97));
    expect(out.status).toBe("verified");
  });

  it("flags every month with -20% deviation injected", () => {
    const inv = 700_000 * 0.8;
    const out = reconcile(input(inv, inv * 0.97));
    expect(out.status).toBe("flagged");
    expect(
      out.flag_reasons.some((r) => r.includes("BELOW expected")),
    ).toBe(true);
  });
});

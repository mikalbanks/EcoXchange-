import { describe, it, expect } from "vitest";
import { computeRiskMetrics } from "../src/scoring/risk.js";
import type { DbProject, DbVerificationRecord } from "../src/db/types.js";
import {
  consecutiveUnderperformanceMax,
  monthsBelowFraction,
  observedDegradationTrendPctPerYear,
  stdDevPct,
} from "../src/utils/calculations.js";

const project: DbProject = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Test",
  latitude: 32.08,
  longitude: -81.09,
  timezone: "America/New_York",
  capacity_kw_dc: 5000,
  tilt_deg: 20,
  azimuth_deg: 180,
  module_efficiency: 0.2,
  system_losses: 0.14,
  degradation_rate: 0.0075,
  commissioning_date: "2023-01-01",
  inverter_brand: "solaredge",
  offtake_type: "ppa",
  ppa_rate_per_kwh: 0.085,
  ppa_escalator: 0.02,
  status: "active",
  created_at: "2023-01-01T00:00:00Z",
};

function r(period: string, inv: number, exp: number, status: "verified" | "flagged" | "pending" = "verified"): DbVerificationRecord {
  return {
    project_id: project.id,
    period_start: period,
    period_end: period,
    inverter_kwh: inv,
    utility_kwh: inv * 0.97,
    expected_kwh: exp,
    inv_vs_expected_pct: ((inv - exp) / exp) * 100,
    inv_vs_utility_pct: 3,
    util_vs_expected_pct: -3,
    status,
    flag_reasons: [],
    tolerance_config: {},
    estimated_revenue: exp * 0.085,
    engine_version: "0.1.0",
  };
}

describe("risk metric primitives", () => {
  it("monthsBelowFraction counts months strictly under the threshold", () => {
    // 90/100 = 0.9 (not < 0.9, excluded); 70/100 = 0.7 (counted); 100/100 = 1 (excluded).
    const recs = [r("2024-01-01", 90, 100), r("2024-02-01", 70, 100), r("2024-03-01", 100, 100)];
    expect(monthsBelowFraction(recs, 0.9)).toBe(1);
    expect(monthsBelowFraction(recs, 0.95)).toBe(2);
  });

  it("consecutive underperformance finds the longest streak", () => {
    const recs = [
      r("2024-01-01", 90, 100),
      r("2024-02-01", 95, 100),
      r("2024-03-01", 110, 100),
      r("2024-04-01", 85, 100),
      r("2024-05-01", 80, 100),
      r("2024-06-01", 75, 100),
    ];
    expect(consecutiveUnderperformanceMax(recs)).toBe(3);
  });

  it("stdDev of perfect tracking is ~0", () => {
    const recs = Array.from({ length: 12 }, (_, i) =>
      r(`2024-${String(i + 1).padStart(2, "0")}-01`, 100, 100),
    );
    expect(stdDevPct(recs)).toBeLessThan(0.001);
  });

  it("observed degradation trend is null for fewer than 3 points", () => {
    const recs = [r("2024-01-01", 100, 100), r("2024-02-01", 100, 100)];
    expect(observedDegradationTrendPctPerYear(project, recs)).toBeNull();
  });

  it("observed degradation trend ≈ 0 when ratio is constant", () => {
    const recs = Array.from({ length: 12 }, (_, i) =>
      r(`2024-${String(i + 1).padStart(2, "0")}-01`, 100, 100),
    );
    const slope = observedDegradationTrendPctPerYear(project, recs);
    expect(slope).not.toBeNull();
    expect(Math.abs(slope!)).toBeLessThan(0.1);
  });
});

describe("computeRiskMetrics", () => {
  it("returns all-zero deviations for a perfectly-tracking system", () => {
    const recs = Array.from({ length: 12 }, (_, i) =>
      r(`2024-${String(i + 1).padStart(2, "0")}-01`, 500_000, 500_000),
    );
    const m = computeRiskMetrics(project, recs);
    expect(m.worst_month_deviation_pct).toBe(0);
    expect(m.flag_rate_pct).toBe(0);
    expect(m.data_completeness_pct).toBe(100);
    expect(m.degradation_divergence).toBe("within_model");
    expect(m.annual_revenue_estimate_usd).toBeCloseTo(500_000 * 0.085 * 12, 0);
  });

  it("detects flagged months and reduced data completeness", () => {
    const recs = [
      r("2024-01-01", 400_000, 500_000, "flagged"),
      r("2024-02-01", 400_000, 500_000, "flagged"),
      ...Array.from({ length: 10 }, (_, i) =>
        r(`2024-${String(i + 3).padStart(2, "0")}-01`, 500_000, 500_000),
      ),
    ];
    const m = computeRiskMetrics(project, recs);
    expect(m.flag_rate_pct).toBeCloseTo((2 / 12) * 100, 5);
    expect(m.consecutive_underperformance_max).toBe(2);
  });
});

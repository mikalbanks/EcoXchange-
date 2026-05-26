import { describe, it, expect } from "vitest";
import { scoreCashFlowDurability } from "../src/scoring/cash_flow.js";
import { scorePhysicalDurability } from "../src/scoring/physical.js";
import { scoreStructuralDurability } from "../src/scoring/structural.js";
import type { DbProject, DbVerificationRecord } from "../src/db/types.js";

const baseProject: DbProject = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Test Project",
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
  offtake_type: "community_solar",
  ppa_rate_per_kwh: 0.085,
  ppa_escalator: 0.02,
  status: "active",
  created_at: "2023-01-01T00:00:00Z",
};

function rec(
  status: "verified" | "flagged" | "pending",
  inverter: number,
  expected: number,
  period = "2024-01-01",
): DbVerificationRecord {
  return {
    project_id: baseProject.id,
    period_start: period,
    period_end: period,
    inverter_kwh: inverter,
    utility_kwh: inverter * 0.97,
    expected_kwh: expected,
    inv_vs_expected_pct: ((inverter - expected) / expected) * 100,
    inv_vs_utility_pct: 3,
    util_vs_expected_pct: -3,
    status,
    flag_reasons: [],
    tolerance_config: {
      inv_vs_expected_upper_pct: 15,
      inv_vs_utility_pct: 10,
      util_vs_expected_upper_pct: 20,
    },
    estimated_revenue: expected * 0.085,
    engine_version: "0.1.0",
  };
}

describe("cash flow durability", () => {
  it("scores a fresh PPA with escalator at the high end", () => {
    const out = scoreCashFlowDurability({
      ...baseProject,
      offtake_type: "ppa",
      commissioning_date: "2024-01-01",
      ppa_escalator: 0.02,
    });
    expect(out.score).toBeGreaterThanOrEqual(8);
    expect(out.factors.escalator_present).toBe(true);
    expect(out.factors.contract_length_years).toBeGreaterThan(20);
  });

  it("penalizes merchant offtake", () => {
    const out = scoreCashFlowDurability({
      ...baseProject,
      offtake_type: "merchant",
    });
    expect(out.score).toBeLessThan(7);
    expect(out.factors.revenue_concentration).toBe("spot_market");
  });

  it("clamps to [0, 10]", () => {
    const veryOld = scoreCashFlowDurability({
      ...baseProject,
      commissioning_date: "1990-01-01",
      offtake_type: "merchant",
      ppa_escalator: null,
    });
    expect(veryOld.score).toBeGreaterThanOrEqual(0);
    expect(veryOld.score).toBeLessThanOrEqual(10);
  });
});

describe("physical durability", () => {
  it("scores a perfectly-tracking system high", () => {
    const records: DbVerificationRecord[] = Array.from({ length: 12 }, (_, i) =>
      rec("verified", 500000, 500000, `2024-${String(i + 1).padStart(2, "0")}-01`),
    );
    const out = scorePhysicalDurability(baseProject, records);
    // 5 base + 2 (≥95% pass) + 1 (tight tracking) = 8; cf vs benchmark adds/subtracts
    expect(out.score).toBeGreaterThanOrEqual(6);
    expect(out.factors.verification_pass_rate_pct).toBe(100);
  });

  it("penalizes high flag rate", () => {
    const records: DbVerificationRecord[] = Array.from({ length: 12 }, (_, i) =>
      rec(i < 4 ? "verified" : "flagged", 400000, 500000, `2024-${String(i + 1).padStart(2, "0")}-01`),
    );
    const out = scorePhysicalDurability(baseProject, records);
    expect(out.score).toBeLessThan(5);
  });
});

describe("structural durability", () => {
  it("returns a fixed high score reflecting EcoXchange's issuance constants", () => {
    const out = scoreStructuralDurability();
    expect(out.score).toBe(10);
    expect(out.factors.regulatory_wrapper).toBe("reg_d_506c");
  });
});

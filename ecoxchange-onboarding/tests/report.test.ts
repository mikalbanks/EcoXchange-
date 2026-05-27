import { describe, expect, it } from "vitest";
import { buildReport } from "../src/report/generator.js";
import { renderMarkdown } from "../src/report/markdown.js";
import type {
  MonthlyResult,
  ReconciledMonthly,
  SubmissionRow,
} from "../src/utils/types.js";

const submission: SubmissionRow = {
  id: "test-id",
  developer_name: "Mikal Banks",
  developer_email: "mikal@ecoxchange.net",
  developer_company: "EcoXchange",
  project_name: "Savannah Community Solar 5MW",
  latitude: 32.08,
  longitude: -81.09,
  state_code: "GA",
  capacity_kw_dc: 5000,
  tilt_deg: 20,
  azimuth_deg: 180,
  module_efficiency: 0.2,
  system_losses: 0.14,
  degradation_rate: 0.0075,
  commissioning_date: "2023-01-01",
  inverter_brand: "solaredge",
  has_inverter_creds: false,
  offtake_type: "community_solar",
  ppa_rate_per_kwh: 0.085,
  ppa_escalator: 0.02,
  ppa_tenor_years: 20,
  equity_raise_target: 2_500_000,
  equity_raise_min: 1_000_000,
  status: "report_ready",
  status_history: [],
  backtest_report_id: null,
  backtest_report_path: null,
  project_id: null,
  submitted_at: "2026-05-26T00:00:00Z",
  updated_at: "2026-05-26T00:00:00Z",
  expires_at: "2026-06-25T00:00:00Z",
  notes: null,
};

const months: MonthlyResult[] = [
  { month: "2024-01", ghi_kwh_m2: 93.7, expected_kwh: 516016, poa_kwh_m2: 100 },
  { month: "2024-02", ghi_kwh_m2: 106.7, expected_kwh: 546624, poa_kwh_m2: 110 },
  { month: "2024-03", ghi_kwh_m2: 140.5, expected_kwh: 667163, poa_kwh_m2: 145 },
  { month: "2024-04", ghi_kwh_m2: 185.5, expected_kwh: 836859, poa_kwh_m2: 190 },
  { month: "2024-05", ghi_kwh_m2: 184.9, expected_kwh: 796045, poa_kwh_m2: 185 },
  { month: "2024-06", ghi_kwh_m2: 203.1, expected_kwh: 858953, poa_kwh_m2: 200 },
  { month: "2024-07", ghi_kwh_m2: 186.8, expected_kwh: 795158, poa_kwh_m2: 185 },
  { month: "2024-08", ghi_kwh_m2: 174.6, expected_kwh: 776243, poa_kwh_m2: 180 },
  { month: "2024-09", ghi_kwh_m2: 131.3, expected_kwh: 611196, poa_kwh_m2: 135 },
  { month: "2024-10", ghi_kwh_m2: 140.2, expected_kwh: 721974, poa_kwh_m2: 145 },
  { month: "2024-11", ghi_kwh_m2: 90.0, expected_kwh: 486701, poa_kwh_m2: 95 },
  { month: "2024-12", ghi_kwh_m2: 87.0, expected_kwh: 489823, poa_kwh_m2: 90 },
];

describe("buildReport", () => {
  it("produces a satellite-only report with summary in the Savannah ballpark", () => {
    const r = buildReport({
      submission,
      monthly: months,
      reconciled: null,
      irradianceSource: "nasa_power",
    });
    expect(r.summary.months_tested).toBe(12);
    expect(r.summary.has_real_inverter_data).toBe(false);
    expect(r.summary.annual_expected_mwh).toBeGreaterThan(7000);
    expect(r.summary.annual_expected_mwh).toBeLessThan(9000);
    expect(r.summary.capacity_factor_pct).toBeGreaterThan(15);
    expect(r.summary.capacity_factor_pct).toBeLessThan(22);
    expect(r.financials.estimated_annual_revenue_usd).toBeGreaterThan(600_000);
    expect(r.summary.best_month.month).toBe("2024-06");
    expect(r.summary.worst_month.month).toBe("2024-11");
    expect(r.summary.months_verified).toBeNull();
  });

  it("renders complete markdown with the cost comparison table", () => {
    const r = buildReport({
      submission,
      monthly: months,
      reconciled: null,
      irradianceSource: "nasa_power",
    });
    const md = renderMarkdown(r);
    expect(md).toContain("# EcoXchange Production Backtest Report");
    expect(md).toContain("## Monthly Production");
    expect(md).toContain("EcoXchange Cost Advantage");
    expect(md).toContain("$325,000–$500,000");
    expect(md).toContain("55–65%");
    // No "{placeholder}" left
    expect(md).not.toMatch(/\{[a-z_.]+\}/);
  });

  it("includes verification stats when reconciled data is supplied", () => {
    const reconciled: ReconciledMonthly[] = months.map((m) => ({
      ...m,
      inverter_kwh: m.expected_kwh,
      inv_vs_expected_pct: 0,
      status: "verified",
      flag_reasons: [],
      estimated_revenue_usd: m.expected_kwh * 0.085,
    }));
    const r = buildReport({
      submission,
      monthly: months,
      reconciled,
      irradianceSource: "nasa_power",
    });
    expect(r.summary.has_real_inverter_data).toBe(true);
    expect(r.summary.months_verified).toBe(12);
    expect(r.summary.months_flagged).toBe(0);
    expect(r.summary.verification_pass_rate_pct).toBe(100);
  });
});

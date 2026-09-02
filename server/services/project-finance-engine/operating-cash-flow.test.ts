import { describe, expect, it } from "vitest";

import { REFERENCE_SOLAR_5MW_INPUT } from "./fixtures/reference-solar-5mw-input";
import {
  HOURS_PER_YEAR,
  OPERATING_FORMULA_IDS,
  calculateGenerationProfile,
  calculateOperatingCashFlows,
} from "./operating-cash-flow";
import type { ProjectFinanceInput } from "./domain-contracts";

function cloneInput(input: ProjectFinanceInput): ProjectFinanceInput {
  return structuredClone(input);
}

describe("Ticket 03 generation, revenue, Opex and CFADS", () => {
  it("reproduces the approved 5 MW Year-1 benchmark without presentation rounding", () => {
    const result = calculateOperatingCashFlows(REFERENCE_SOLAR_5MW_INPUT);
    const yearOne = result.annual_project_cash_flows[0];

    expect(HOURS_PER_YEAR).toBe(8_760);
    expect(yearOne.generation_mwh).toBeCloseTo(10_512, 10);
    expect(yearOne.ppa_price_per_mwh).toBeCloseTo(55, 10);
    expect(yearOne.revenue).toBeCloseTo(578_160, 8);
    expect(yearOne.opex).toBeCloseTo(150_000, 8);
    expect(yearOne.cfads).toBeCloseTo(428_160, 8);
  });

  it("compounds annual degradation from Year 1 production across the full project life", () => {
    const generation = calculateGenerationProfile(REFERENCE_SOLAR_5MW_INPUT);

    expect(generation).toHaveLength(25);
    expect(generation[0]).toBeCloseTo(10_512, 10);
    expect(generation[1]).toBeCloseTo(10_459.44, 8);
    expect(generation[2]).toBeCloseTo(10_407.1428, 8);
    expect(generation[24]).toBeCloseTo(10_512 * Math.pow(0.995, 24), 8);
  });

  it("compounds PPA escalation and operating-cost escalation without intermediate rounding", () => {
    const rows = calculateOperatingCashFlows(REFERENCE_SOLAR_5MW_INPUT).annual_project_cash_flows;

    expect(rows[1].ppa_price_per_mwh).toBeCloseTo(55.55, 10);
    expect(rows[2].ppa_price_per_mwh).toBeCloseTo(56.1055, 10);
    expect(rows[24].ppa_price_per_mwh).toBeCloseTo(55 * Math.pow(1.01, 24), 8);

    expect(rows[1].opex).toBeCloseTo(153_750, 8);
    expect(rows[2].opex).toBeCloseTo(157_593.75, 8);
    expect(rows[24].opex).toBeCloseTo(150_000 * Math.pow(1.025, 24), 8);
  });

  it("preserves the revenue and CFADS identities for every modeled year", () => {
    const rows = calculateOperatingCashFlows(REFERENCE_SOLAR_5MW_INPUT).annual_project_cash_flows;

    for (const row of rows) {
      expect(row.revenue).toBeCloseTo(row.generation_mwh * row.ppa_price_per_mwh, 8);
      expect(row.cfads).toBeCloseTo(row.revenue - row.opex, 8);
    }
  });

  it("keeps generation, PPA, Opex and CFADS constant when all escalation/degradation rates are zero", () => {
    const input = cloneInput(REFERENCE_SOLAR_5MW_INPUT);
    input.generation.annual_degradation_rate = 0;
    input.revenue.ppa_escalation_rate = 0;
    input.operating_costs.opex_escalation_rate = 0;

    const rows = calculateOperatingCashFlows(input).annual_project_cash_flows;
    for (const row of rows) {
      expect(row.generation_mwh).toBe(rows[0].generation_mwh);
      expect(row.ppa_price_per_mwh).toBe(rows[0].ppa_price_per_mwh);
      expect(row.revenue).toBe(rows[0].revenue);
      expect(row.opex).toBe(rows[0].opex);
      expect(row.cfads).toBe(rows[0].cfads);
    }
  });

  it("supports mathematically valid negative PPA and Opex escalation", () => {
    const input = cloneInput(REFERENCE_SOLAR_5MW_INPUT);
    input.revenue.ppa_price_year_1_per_mwh = 100;
    input.revenue.ppa_escalation_rate = -0.01;
    input.operating_costs.opex_escalation_rate = -0.01;

    const rows = calculateOperatingCashFlows(input).annual_project_cash_flows;
    expect(rows[1].ppa_price_per_mwh).toBeCloseTo(99, 10);
    expect(rows[1].opex).toBeCloseTo(148_500, 8);
  });

  it("uses a complete explicit generation series exactly and applies no additional degradation", () => {
    const input = cloneInput(REFERENCE_SOLAR_5MW_INPUT);
    input.project.project_life_years = 3;
    input.financing.amortization_years = 3;
    input.financing.debt_maturity_years = 3;
    input.revenue.ppa_term_years = 3;
    input.generation.annual_degradation_rate = 0.50;
    input.generation.annual_generation_override_mwh = [10_000, 9_900, 9_800];
    input.generation.generation_source_type = "INDEPENDENT_ENGINEER";

    expect(calculateGenerationProfile(input)).toEqual([10_000, 9_900, 9_800]);
    const rows = calculateOperatingCashFlows(input).annual_project_cash_flows;
    expect(rows.map((row) => row.generation_mwh)).toEqual([10_000, 9_900, 9_800]);
  });

  it("sets contracted revenue and PPA price to zero after PPA expiration while Opex continues", () => {
    const input = cloneInput(REFERENCE_SOLAR_5MW_INPUT);
    input.project.project_life_years = 5;
    input.financing.amortization_years = 5;
    input.financing.debt_maturity_years = 5;
    input.revenue.ppa_term_years = 3;

    const result = calculateOperatingCashFlows(input);
    const rows = result.annual_project_cash_flows;

    expect(rows).toHaveLength(5);
    expect(rows[2].revenue).toBeGreaterThan(0);
    expect(rows[3].ppa_price_per_mwh).toBe(0);
    expect(rows[3].revenue).toBe(0);
    expect(rows[3].opex).toBeGreaterThan(0);
    expect(rows[3].cfads).toBe(-rows[3].opex);
    expect(rows[4].revenue).toBe(0);
    expect(result.warnings.some((warning) => warning.code === "UNCONTRACTED_TAIL")).toBe(true);
  });

  it("preserves negative CFADS and emits an operating warning instead of flooring it", () => {
    const input = cloneInput(REFERENCE_SOLAR_5MW_INPUT);
    input.revenue.ppa_price_year_1_per_mwh = 0;
    input.operating_costs.opex_year_1 = 200;

    const result = calculateOperatingCashFlows(input);
    const yearOne = result.annual_project_cash_flows[0];

    expect(yearOne.revenue).toBe(0);
    expect(yearOne.cfads).toBe(-200);
    expect(yearOne.cfads).not.toBe(0);
    expect(result.warnings.some((warning) => warning.code === "NEGATIVE_CFADS" && warning.year === 1)).toBe(true);
  });

  it("records stable formula traces with the supplied dependency values", () => {
    const result = calculateOperatingCashFlows(REFERENCE_SOLAR_5MW_INPUT);

    const generation = result.metric_traces.find((item) => item.metric_key === "generation_mwh.year_1");
    const revenue = result.metric_traces.find((item) => item.metric_key === "revenue.year_1");
    const cfads = result.metric_traces.find((item) => item.metric_key === "cfads.year_1");

    expect(generation?.formula_id).toBe(OPERATING_FORMULA_IDS.generationYear1);
    expect(generation?.value).toBeCloseTo(10_512, 10);
    expect(generation?.metadata?.inputs).toEqual({
      capacity_mw_ac: 5,
      hours_per_year: 8_760,
      capacity_factor_p50: 0.24,
    });

    expect(revenue?.formula_id).toBe(OPERATING_FORMULA_IDS.revenueContracted);
    expect(revenue?.value).toBeCloseTo(578_160, 8);
    expect(revenue?.metadata?.inputs).toEqual({
      generation_mwh: 10_512,
      ppa_price_per_mwh: 55,
      ppa_term_years: 25,
      year: 1,
    });

    expect(cfads?.formula_id).toBe(OPERATING_FORMULA_IDS.cfads);
    expect(cfads?.value).toBeCloseTo(428_160, 8);
    expect(cfads?.metadata?.inputs).toEqual({ revenue: 578_160, opex: 150_000 });
  });

  it("does not mutate the supplied finance-domain input", () => {
    const input = cloneInput(REFERENCE_SOLAR_5MW_INPUT);
    const before = structuredClone(input);

    calculateOperatingCashFlows(input);
    expect(input).toEqual(before);
  });

  it("is deterministic across 100 repeated operating calculations", () => {
    const first = calculateOperatingCashFlows(REFERENCE_SOLAR_5MW_INPUT);
    for (let iteration = 0; iteration < 100; iteration += 1) {
      expect(calculateOperatingCashFlows(REFERENCE_SOLAR_5MW_INPUT)).toEqual(first);
    }
  });
});

import { describe, expect, it } from "vitest";

import { REFERENCE_SOLAR_5MW_INPUT } from "./fixtures/reference-solar-5mw-input";
import { calculateOperatingCashFlows } from "./operating-cash-flow";
import {
  DEBT_FORMULA_IDS,
  buildDebtSchedule,
  calculateAllowableDebtService,
  calculateDebtEngine,
  calculateDebtSizing,
  presentValueDebtCapacity,
  solveMaximumFeasibleDebt,
} from "./debt-engine";
import type { AnnualProjectCashFlow, ProjectFinanceInput } from "./domain-contracts";

function cashFlows(cfads: number[]): AnnualProjectCashFlow[] {
  return cfads.map((value, index) => ({
    year: index + 1,
    generation_mwh: 0,
    ppa_price_per_mwh: 0,
    revenue: value,
    opex: 0,
    cfads: value,
  }));
}

function withDebtTerms(
  base: ProjectFinanceInput,
  overrides: Partial<ProjectFinanceInput["financing"]>,
  projectCapex = base.transaction_costs.project_capex,
): ProjectFinanceInput {
  return {
    ...base,
    financing: { ...base.financing, ...overrides },
    transaction_costs: { ...base.transaction_costs, project_capex: projectCapex },
  };
}

describe("Ticket 04 debt sizing, sculpting and amortization", () => {
  it("uses Ticket 03 CFADS and reproduces the 5 MW debt-sizing benchmark", () => {
    const operating = calculateOperatingCashFlows(REFERENCE_SOLAR_5MW_INPUT);
    const result = calculateDebtEngine(REFERENCE_SOLAR_5MW_INPUT, operating.annual_project_cash_flows);

    expect(operating.annual_project_cash_flows[0].cfads).toBeCloseTo(428_160, 8);
    expect(result.debt_sizing.raw_allowable_debt_service[0]).toBeCloseTo(329_353.8461538461, 8);
    expect(result.financing_summary.ltc_debt_limit).toBe(5_600_000);
    expect(result.financing_summary.binding_constraint).toBe("DSCR");
    expect(result.financing_summary.permanent_debt).toBeCloseTo(3_364_160.1747, 1);
    expect(result.financing_summary.debt_to_capex).toBeCloseTo(0.4205200218, 8);
    expect(result.financing_summary.minimum_dscr).toBeCloseTo(1.30, 6);
    expect(result.annual_debt_schedule.at(-1)?.ending_balance).toBeLessThanOrEqual(1);
    expect(Math.abs(result.reconciliation.debt_reconciliation_difference)).toBeLessThanOrEqual(1);
    expect(result.reconciliation.debt_reconciled).toBe(true);
  });

  it("computes allowable debt service as CFADS divided by target DSCR", () => {
    const result = calculateAllowableDebtService(cashFlows([428_160]), 1.30, 1);
    expect(result.raw[0]).toBeCloseTo(329_353.8461538461, 8);
    expect(result.usable[0]).toBeCloseTo(329_353.8461538461, 8);
  });

  it("uses annual end-of-period discounting and supports a zero interest rate", () => {
    expect(presentValueDebtCapacity([100, 100, 100], 0)).toBe(300);
    expect(presentValueDebtCapacity([100, 100, 100], 0.10)).toBeCloseTo(
      100 / 1.1 + 100 / 1.1 ** 2 + 100 / 1.1 ** 3,
      10,
    );
  });

  it("builds a hand-checkable zero-rate schedule that fully repays", () => {
    const input = withDebtTerms(REFERENCE_SOLAR_5MW_INPUT, {
      annual_interest_rate: 0,
      target_dscr: 1.30,
      max_ltc: 1,
      amortization_years: 3,
      debt_maturity_years: 3,
    }, 1_000_000);
    const flows = cashFlows([130, 130, 130]);
    const result = calculateDebtEngine(input, flows);

    expect(result.debt_sizing.dscr_sized_debt).toBeCloseTo(300, 10);
    expect(result.financing_summary.permanent_debt).toBeCloseTo(300, 10);
    expect(result.annual_debt_schedule.map((row) => row.principal)).toEqual([100, 100, 100]);
    expect(result.annual_debt_schedule.at(-1)?.ending_balance).toBe(0);
  });

  it("scales the full cash-flow-shaped debt-service profile when LTC binds", () => {
    const input = withDebtTerms(REFERENCE_SOLAR_5MW_INPUT, {
      annual_interest_rate: 0,
      target_dscr: 1,
      max_ltc: 0.5,
      amortization_years: 2,
      debt_maturity_years: 2,
    }, 1_000);
    const flows = cashFlows([500, 500]);
    const sizing = calculateDebtSizing(input, flows);
    const schedule = buildDebtSchedule(input, flows, sizing);

    expect(sizing.dscr_sized_debt).toBe(1_000);
    expect(sizing.ltc_debt_limit).toBe(500);
    expect(sizing.permanent_debt).toBe(500);
    expect(sizing.binding_constraint).toBe("LTC");
    expect(sizing.schedule_scale).toBe(0.5);
    expect(schedule.map((row) => row.debt_service)).toEqual([250, 250]);
    expect(schedule.map((row) => row.dscr)).toEqual([2, 2]);
  });

  it("returns zero debt and null DSCR when no positive CFADS supports debt", () => {
    const input = withDebtTerms(REFERENCE_SOLAR_5MW_INPUT, {
      amortization_years: 3,
      debt_maturity_years: 3,
    });
    const result = calculateDebtEngine(input, cashFlows([0, -10, 0]));

    expect(result.debt_sizing.dscr_sized_debt).toBe(0);
    expect(result.financing_summary.permanent_debt).toBe(0);
    expect(result.financing_summary.binding_constraint).toBe("ZERO_CFADS");
    expect(result.financing_summary.minimum_dscr).toBeNull();
    expect(result.annual_debt_schedule.every((row) => row.debt_service === 0)).toBe(true);
  });

  it("floors only usable debt service while preserving raw negative CFADS support", () => {
    const result = calculateAllowableDebtService(cashFlows([130, -65, 260]), 1.30, 3);
    expect(result.raw).toEqual([100, -50, 200]);
    expect(result.usable).toEqual([100, 0, 200]);
  });

  it("reduces opening debt when the PV candidate would require negative amortization", () => {
    const service = [10, 10, 500];
    const rawPv = presentValueDebtCapacity(service, 0.10);
    const feasible = solveMaximumFeasibleDebt(rawPv, 0.10, service);

    expect(rawPv).toBeGreaterThan(100);
    expect(feasible).toBeLessThanOrEqual(100 + 0.01);

    const input = withDebtTerms(REFERENCE_SOLAR_5MW_INPUT, {
      annual_interest_rate: 0.10,
      target_dscr: 1,
      max_ltc: 1,
      amortization_years: 3,
      debt_maturity_years: 3,
    }, 1_000_000);
    const flows = cashFlows(service);
    const result = calculateDebtEngine(input, flows);

    expect(result.debt_sizing.negative_amortization_limited).toBe(true);
    expect(result.financing_summary.binding_constraint).toBe("NEGATIVE_AMORTIZATION");
    expect(result.annual_debt_schedule.every((row) => row.principal >= -1e-9)).toBe(true);
    expect(result.reconciliation.debt_reconciled).toBe(true);
  });

  it("reports a balloon when maturity is shorter than amortization", () => {
    const operating = calculateOperatingCashFlows(REFERENCE_SOLAR_5MW_INPUT);
    const input = withDebtTerms(REFERENCE_SOLAR_5MW_INPUT, { debt_maturity_years: 5 });
    const result = calculateDebtEngine(input, operating.annual_project_cash_flows);

    expect(result.annual_debt_schedule).toHaveLength(18);
    expect(result.financing_summary.balloon_balance).toBeCloseTo(
      result.annual_debt_schedule[4].ending_balance,
      8,
    );
    expect(result.financing_summary.balloon_balance).toBeGreaterThan(0);
  });

  it("returns an approximately zero balloon for a fully amortizing maturity", () => {
    const operating = calculateOperatingCashFlows(REFERENCE_SOLAR_5MW_INPUT);
    const result = calculateDebtEngine(REFERENCE_SOLAR_5MW_INPUT, operating.annual_project_cash_flows);
    expect(result.financing_summary.balloon_balance).toBeLessThanOrEqual(1);
  });

  it("emits debt formula traces with the approved dependencies", () => {
    const operating = calculateOperatingCashFlows(REFERENCE_SOLAR_5MW_INPUT);
    const result = calculateDebtEngine(REFERENCE_SOLAR_5MW_INPUT, operating.annual_project_cash_flows);

    const allowable = result.metric_traces.find((item) => item.formula_id === DEBT_FORMULA_IDS.allowableDebtService);
    const capacity = result.metric_traces.find((item) => item.formula_id === DEBT_FORMULA_IDS.dscrDebtCapacity);
    const ltc = result.metric_traces.find((item) => item.formula_id === DEBT_FORMULA_IDS.ltcLimit);
    const permanent = result.metric_traces.find((item) => item.formula_id === DEBT_FORMULA_IDS.permanentDebt);

    expect(allowable?.dependencies).toContain("financing.target_dscr");
    expect(capacity?.dependencies).toContain("financing.annual_interest_rate");
    expect(ltc?.dependencies).toContain("financing.max_ltc");
    expect(permanent?.dependencies).toEqual(["dscr_sized_debt", "ltc_debt_limit"]);
  });

  it("does not mutate the finance input or Ticket 03 operating rows", () => {
    const inputSnapshot = structuredClone(REFERENCE_SOLAR_5MW_INPUT);
    const operating = calculateOperatingCashFlows(REFERENCE_SOLAR_5MW_INPUT);
    const rowsSnapshot = structuredClone(operating.annual_project_cash_flows);

    calculateDebtEngine(REFERENCE_SOLAR_5MW_INPUT, operating.annual_project_cash_flows);

    expect(REFERENCE_SOLAR_5MW_INPUT).toEqual(inputSnapshot);
    expect(operating.annual_project_cash_flows).toEqual(rowsSnapshot);
  });

  it("is deterministic across repeated debt calculations", () => {
    const operating = calculateOperatingCashFlows(REFERENCE_SOLAR_5MW_INPUT);
    const first = calculateDebtEngine(REFERENCE_SOLAR_5MW_INPUT, operating.annual_project_cash_flows);
    for (let iteration = 0; iteration < 100; iteration += 1) {
      expect(calculateDebtEngine(REFERENCE_SOLAR_5MW_INPUT, operating.annual_project_cash_flows)).toEqual(first);
    }
  });
});

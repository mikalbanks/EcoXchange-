import { describe, expect, it } from "vitest";

import { REFERENCE_SOLAR_5MW_INPUT } from "./fixtures/reference-solar-5mw-input";
import { calculateOperatingCashFlows } from "./operating-cash-flow";
import { calculateDebtEngine } from "./debt-engine";
import {
  CAPITAL_STACK_FORMULA_IDS,
  CapitalStackCalculationError,
  calculateCapitalStack,
  calculateDsra,
  calculateLenderFee,
  calculateTaxCredit,
} from "./capital-stack";
import type { ProjectFinanceInput } from "./domain-contracts";

function runFiveMw(input: ProjectFinanceInput = REFERENCE_SOLAR_5MW_INPUT) {
  const operating = calculateOperatingCashFlows(input);
  const debt = calculateDebtEngine(input, operating.annual_project_cash_flows);
  const capital = calculateCapitalStack(input, debt);
  return { operating, debt, capital };
}

describe("Ticket 05 ITC and capital stack", () => {
  it("matches the precise 5 MW ITC benchmark", () => {
    const { capital } = runFiveMw();
    expect(capital.tax_credit_result.eligible_basis).toBeCloseTo(7_600_000, 6);
    expect(capital.tax_credit_result.itc_face_value).toBeCloseTo(2_280_000, 6);
    expect(capital.tax_credit_result.gross_transfer_proceeds).toBeCloseTo(2_097_600, 6);
    expect(capital.tax_credit_result.net_transfer_proceeds).toBeCloseTo(2_097_600, 6);
  });

  it.each([0, 0.06, 0.30, 0.40, 0.50])("supports an explicit %s ITC rate without legal-eligibility logic", (itcRate) => {
    const input: ProjectFinanceInput = {
      ...REFERENCE_SOLAR_5MW_INPUT,
      tax_credit: { ...REFERENCE_SOLAR_5MW_INPUT.tax_credit, itc_rate: itcRate },
    };
    const { result } = calculateTaxCredit(input);
    expect(result.itc_face_value).toBeCloseTo(7_600_000 * itcRate, 6);
  });

  it("uses explicit transfer price and transaction costs", () => {
    const input: ProjectFinanceInput = {
      ...REFERENCE_SOLAR_5MW_INPUT,
      transaction_costs: { ...REFERENCE_SOLAR_5MW_INPUT.transaction_costs, project_capex: 1_000_000 },
      tax_credit: {
        ...REFERENCE_SOLAR_5MW_INPUT.tax_credit,
        itc_eligible_basis_pct: 1,
        itc_rate: 1,
        itc_transfer_price: 0.92,
        itc_transaction_costs: 20_000,
      },
    };
    const { result } = calculateTaxCredit(input);
    expect(result.gross_transfer_proceeds).toBe(920_000);
    expect(result.net_transfer_proceeds).toBe(900_000);
  });

  it("floors negative net ITC proceeds at zero and exposes a warning", () => {
    const input: ProjectFinanceInput = {
      ...REFERENCE_SOLAR_5MW_INPUT,
      tax_credit: {
        ...REFERENCE_SOLAR_5MW_INPUT.tax_credit,
        itc_rate: 0.01,
        itc_transfer_price: 0.5,
        itc_transaction_costs: 100_000,
      },
    };
    const { result, warnings } = calculateTaxCredit(input);
    expect(result.net_transfer_proceeds).toBe(0);
    expect(warnings.some((warning) => warning.code === "ITC_TRANSACTION_COSTS_EXCEED_PROCEEDS")).toBe(true);
  });

  it("calculates DSRA from actual Year-1 scheduled debt service", () => {
    const { debt, capital } = runFiveMw();
    const yearOneDebtService = debt.annual_debt_schedule[0].debt_service;
    expect(capital.dsra).toBeCloseTo(yearOneDebtService * 0.5, 6);
    expect(capital.dsra).toBeGreaterThan(164_000);
    expect(capital.dsra).toBeLessThan(165_500);
  });

  it("calculates lender fee from final permanent debt only", () => {
    const { debt, capital } = runFiveMw();
    expect(capital.lender_fee).toBeCloseTo(debt.financing_summary.permanent_debt * 0.0125, 6);
    expect(capital.lender_fee).toBeGreaterThan(41_500);
    expect(capital.lender_fee).toBeLessThan(42_500);
  });

  it("uses explicit closing costs and shows the known 5 MW reference-equity delta transparently", () => {
    const { capital } = runFiveMw();
    expect(REFERENCE_SOLAR_5MW_INPUT.transaction_costs.closing_costs).toBe(400_000);
    expect(capital.capital_stack_result.total_closing_uses).toBeGreaterThan(8_000_000);
    // The source's ~$2.995M sponsor-equity result is consistent with roughly $250K closing costs,
    // while the formal Ticket 02 fixture explicitly supplies $400K. Ticket 05 must not alter formulas
    // or introduce a hidden closing-cost assumption to force the reference value.
    expect(capital.capital_stack_result.sponsor_equity).toBeGreaterThan(3_100_000);
    expect(capital.capital_stack_result.sponsor_equity).toBeLessThan(3_200_000);
  });

  it("reconciles ordinary sources and uses and capital-stack percentages", () => {
    const { capital, debt } = runFiveMw();
    expect(capital.reconciliation.debt_reconciled).toBe(true);
    expect(Math.abs(capital.reconciliation.debt_reconciliation_difference)).toBeLessThanOrEqual(1);
    expect(capital.reconciliation.sources_uses_reconciled).toBe(true);
    expect(Math.abs(capital.reconciliation.sources_uses_difference)).toBeLessThanOrEqual(1);

    const stack = capital.capital_stack_result;
    const sum = stack.permanent_debt_pct_total_uses
      + stack.itc_proceeds_pct_total_uses
      + stack.sponsor_equity_pct_total_uses
      + (stack.other_sources_pct_total_uses ?? 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(stack.debt_to_capex).toBe(debt.financing_summary.debt_to_capex);
  });

  it("keeps ITC basis tied to project capex rather than total closing uses", () => {
    const { capital } = runFiveMw();
    expect(capital.tax_credit_result.eligible_basis).toBe(8_000_000 * 0.95);
    expect(capital.tax_credit_result.eligible_basis).not.toBe(
      capital.capital_stack_result.total_closing_uses * 0.95,
    );
  });

  it("does not resize debt when the ITC rate changes", () => {
    const thirty = runFiveMw();
    const fortyInput: ProjectFinanceInput = {
      ...REFERENCE_SOLAR_5MW_INPUT,
      tax_credit: { ...REFERENCE_SOLAR_5MW_INPUT.tax_credit, itc_rate: 0.40 },
    };
    const forty = runFiveMw(fortyInput);
    expect(forty.debt.financing_summary.permanent_debt).toBeCloseTo(thirty.debt.financing_summary.permanent_debt, 8);
    expect(forty.capital.capital_stack_result.sponsor_equity)
      .toBeLessThan(thirty.capital.capital_stack_result.sponsor_equity);
  });

  it("handles a zero-debt project with zero lender fee and zero DSRA", () => {
    const input: ProjectFinanceInput = {
      ...REFERENCE_SOLAR_5MW_INPUT,
      financing: { ...REFERENCE_SOLAR_5MW_INPUT.financing, max_ltc: 0 },
    };
    const { debt, capital } = runFiveMw(input);
    expect(debt.financing_summary.permanent_debt).toBe(0);
    expect(calculateLenderFee(input, 0)).toBe(0);
    expect(calculateDsra(input, debt.annual_debt_schedule, 0)).toBe(0);
    expect(capital.lender_fee).toBe(0);
    expect(capital.dsra).toBe(0);
  });

  it("handles zero ITC without changing debt", () => {
    const input: ProjectFinanceInput = {
      ...REFERENCE_SOLAR_5MW_INPUT,
      tax_credit: { ...REFERENCE_SOLAR_5MW_INPUT.tax_credit, itc_rate: 0 },
    };
    const base = runFiveMw();
    const zeroItc = runFiveMw(input);
    expect(zeroItc.capital.tax_credit_result.itc_face_value).toBe(0);
    expect(zeroItc.capital.tax_credit_result.net_transfer_proceeds).toBe(0);
    expect(zeroItc.debt.financing_summary.permanent_debt).toBeCloseTo(base.debt.financing_summary.permanent_debt, 8);
    expect(zeroItc.capital.capital_stack_result.sponsor_equity)
      .toBeGreaterThan(base.capital.capital_stack_result.sponsor_equity);
  });

  it("identifies excess permanent sources instead of returning negative sponsor equity", () => {
    const input: ProjectFinanceInput = {
      ...REFERENCE_SOLAR_5MW_INPUT,
      transaction_costs: {
        ...REFERENCE_SOLAR_5MW_INPUT.transaction_costs,
        other_permanent_sources: 10_000_000,
      },
    };
    const { capital } = runFiveMw(input);
    expect(capital.capital_stack_result.sponsor_equity).toBe(0);
    expect(capital.capital_stack_result.excess_sources).toBeGreaterThan(0);
    expect(capital.warnings.some((warning) => warning.code === "SOURCES_EXCEED_USES")).toBe(true);
  });

  it("rejects unsupported DSRA reference methods rather than silently inventing behavior", () => {
    const input: ProjectFinanceInput = {
      ...REFERENCE_SOLAR_5MW_INPUT,
      reserves: { ...REFERENCE_SOLAR_5MW_INPUT.reserves, dsra_reference_method: "MAX_ANNUAL_DEBT_SERVICE" },
    };
    const operating = calculateOperatingCashFlows(input);
    const debt = calculateDebtEngine(input, operating.annual_project_cash_flows);
    expect(() => calculateCapitalStack(input, debt)).toThrowError(CapitalStackCalculationError);
  });

  it("provides the required formula traces", () => {
    const { capital } = runFiveMw();
    const ids = new Set(capital.metric_traces.map((item) => item.formula_id));
    for (const id of Object.values(CAPITAL_STACK_FORMULA_IDS)) {
      if (id === CAPITAL_STACK_FORMULA_IDS.capitalStackPercentages) continue;
      expect(ids.has(id)).toBe(true);
    }
    const sponsorTrace = capital.metric_traces.find((item) => item.metric_key === "sponsor_equity");
    expect(sponsorTrace?.dependencies).toContain("total_closing_uses");
    expect(sponsorTrace?.dependencies).toContain("permanent_debt");
    expect(sponsorTrace?.dependencies).toContain("net_itc_transfer_proceeds");
  });

  it("does not mutate inputs or prior module outputs and is deterministic", () => {
    const input = structuredClone(REFERENCE_SOLAR_5MW_INPUT);
    const snapshot = structuredClone(input);
    const operating = calculateOperatingCashFlows(input);
    const operatingSnapshot = structuredClone(operating);
    const debt = calculateDebtEngine(input, operating.annual_project_cash_flows);
    const debtSnapshot = structuredClone(debt);
    const first = calculateCapitalStack(input, debt);

    expect(input).toEqual(snapshot);
    expect(operating).toEqual(operatingSnapshot);
    expect(debt).toEqual(debtSnapshot);

    for (let i = 0; i < 100; i += 1) {
      expect(calculateCapitalStack(input, debt)).toEqual(first);
    }
  });
});

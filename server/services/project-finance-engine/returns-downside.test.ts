import { describe, expect, it } from "vitest";
import { REFERENCE_SOLAR_5MW_INPUT } from "./fixtures/reference-solar-5mw-input";
import { calculateDownsideCashSweep } from "./downside-cash-sweep";
import { calculateIrr, calculateNpv, calculateProjectFinanceCore, runSensitivity } from "./returns-downside";

describe("Ticket 06 IRR and NPV primitives", () => {
  it("solves hand-checkable positive, zero and negative one-period IRRs", () => {
    expect(calculateIrr([-100, 110]).irr).toBeCloseTo(0.10, 10);
    expect(calculateIrr([-100, 100]).irr).toBeCloseTo(0, 10);
    expect(calculateIrr([-100, 90]).irr).toBeCloseTo(-0.10, 10);
  });

  it("returns NO_SIGN_CHANGE rather than inventing an IRR", () => {
    expect(calculateIrr([100, 50, 10])).toEqual({ irr: null, status: "NO_SIGN_CHANGE" });
  });

  it("flags multiple-root risk for multiple cash-flow sign changes", () => {
    expect(calculateIrr([-100, 230, -132]).status).toBe("MULTIPLE_ROOT_RISK");
  });

  it("calculates hand-checkable NPV", () => {
    expect(calculateNpv([-100, 110], 0.10)).toBeCloseTo(0, 10);
  });
});

describe("Ticket 06 downside cash sweep", () => {
  it("repays a zero-rate loan using 100 percent downside CFADS", () => {
    const result = calculateDownsideCashSweep(300, 0, [100, 100, 100]);
    expect(result.full_repayment).toBe(true);
    expect(result.repayment_year).toBe(3);
    expect(result.unrepaid_balance).toBe(0);
    expect(result.rows.map((row) => row.ending_balance)).toEqual([200, 100, 0]);
  });

  it("pays interest first and principal second", () => {
    const result = calculateDownsideCashSweep(100, 0.10, [30]);
    expect(result.rows[0].interest_due).toBeCloseTo(10, 10);
    expect(result.rows[0].principal_paid).toBeCloseTo(20, 10);
    expect(result.rows[0].ending_balance).toBeCloseTo(80, 10);
  });

  it("detects interest shortfall without capitalizing unpaid interest", () => {
    const result = calculateDownsideCashSweep(100, 0.10, [5]);
    expect(result.interest_shortfall).toBe(true);
    expect(result.rows[0].interest_due).toBeCloseTo(10, 10);
    expect(result.rows[0].principal_paid).toBe(0);
    expect(result.rows[0].ending_balance).toBe(100);
  });
});

describe("Ticket 06 5 MW integrated finance core", () => {
  it("constructs sponsor cash flows from residual equity and CFADS after scheduled debt service", () => {
    const result = calculateProjectFinanceCore(REFERENCE_SOLAR_5MW_INPUT);
    expect(result.returns.sponsor_cash_flows_with_year0[0]).toBeCloseTo(-result.capital_stack.capital_stack.sponsor_equity, 8);
    expect(result.returns.sponsor_operating_cash_flows[0]).toBeCloseTo(
      result.operating.annual_project_cash_flows[0].cfads - result.debt.annual_debt_schedule[0].debt_service,
      8,
    );
    expect(result.debt.reconciliation.debt_reconciled).toBe(true);
    expect(result.capital_stack.reconciliation.sources_uses_reconciled).toBe(true);
  });

  it("keeps illustrative 90 percent downside separate from lender-grade P90 and never resizes base debt", () => {
    const result = calculateProjectFinanceCore(REFERENCE_SOLAR_5MW_INPUT);
    expect(result.downside?.downside_type).toBe("ILLUSTRATIVE_MULTIPLIER");
    expect(result.downside?.generation_source_type).toBe("ILLUSTRATIVE_PERCENT_OF_P50");
    expect(result.downside?.generation_mwh[0]).toBeCloseTo(10_512 * 0.90, 8);
    expect(result.warnings.some((warning) => warning.code === "ILLUSTRATIVE_DOWNSIDE_NOT_P90")).toBe(true);
    expect(result.downside?.cash_sweep_schedule[0].opening_balance).toBeCloseTo(result.debt.financing_summary.permanent_debt, 6);
  });

  it("keeps downside Opex equal to base Opex", () => {
    const result = calculateProjectFinanceCore(REFERENCE_SOLAR_5MW_INPUT);
    const downsideRevenueYear1 = result.downside?.revenue[0] ?? 0;
    expect(result.downside?.cfads[0]).toBeCloseTo(downsideRevenueYear1 - result.operating.annual_project_cash_flows[0].opex, 8);
  });

  it("keeps the base scenario immutable", () => {
    const before = structuredClone(REFERENCE_SOLAR_5MW_INPUT);
    calculateProjectFinanceCore(REFERENCE_SOLAR_5MW_INPUT);
    expect(REFERENCE_SOLAR_5MW_INPUT).toEqual(before);
  });
});

describe("Ticket 06 simplified tax value", () => {
  it("calculates the explicit 21 percent immediate tax shield and preserves cash-only IRR separately", () => {
    const input = structuredClone(REFERENCE_SOLAR_5MW_INPUT);
    input.calculation_options.tax_module_enabled = true;
    input.tax_credit.bonus_depreciation_pct = 1;
    input.tax_credit.federal_tax_rate = 0.21;
    input.tax_credit.sponsor_tax_appetite_pct = 1;
    const result = calculateProjectFinanceCore(input);
    expect(result.returns.depreciable_basis).toBeCloseTo(7_600_000 - 0.5 * 2_280_000, 6);
    expect(result.returns.immediate_tax_shield).toBeCloseTo((7_600_000 - 0.5 * 2_280_000) * 0.21, 6);
    expect(result.returns.levered_sponsor_cash_irr).not.toBe(result.returns.simplified_sponsor_after_tax_irr);
  });

  it("halves the immediate shield at 50 percent tax appetite", () => {
    const full = structuredClone(REFERENCE_SOLAR_5MW_INPUT);
    full.calculation_options.tax_module_enabled = true;
    full.tax_credit.bonus_depreciation_pct = 1;
    full.tax_credit.federal_tax_rate = 0.21;
    full.tax_credit.sponsor_tax_appetite_pct = 1;
    const half = structuredClone(full);
    half.tax_credit.sponsor_tax_appetite_pct = 0.5;
    const fullResult = calculateProjectFinanceCore(full);
    const halfResult = calculateProjectFinanceCore(half);
    expect(halfResult.returns.immediate_tax_shield).toBeCloseTo((fullResult.returns.immediate_tax_shield ?? 0) / 2, 6);
  });
});

describe("Ticket 06 sensitivity reruns", () => {
  it("reruns PPA sensitivity through operating cash flow, debt and capital stack", () => {
    const base = structuredClone(REFERENCE_SOLAR_5MW_INPUT);
    const sensitivity = runSensitivity(base, "PPA_PRICE", [55, 60]);
    expect(sensitivity.points[1].permanent_debt).not.toBeCloseTo(sensitivity.points[0].permanent_debt, 2);
    expect(sensitivity.points[1].sponsor_equity).not.toBeCloseTo(sensitivity.points[0].sponsor_equity, 2);
    expect(base).toEqual(REFERENCE_SOLAR_5MW_INPUT);
  });

  it("reruns interest-rate sensitivity and changes debt capacity", () => {
    const sensitivity = runSensitivity(REFERENCE_SOLAR_5MW_INPUT, "INTEREST_RATE", [0.045, 0.065, 0.085]);
    expect(sensitivity.points[0].permanent_debt).toBeGreaterThan(sensitivity.points[1].permanent_debt);
    expect(sensitivity.points[1].permanent_debt).toBeGreaterThan(sensitivity.points[2].permanent_debt);
  });

  it("changes capex-driven LTC/ITC/equity relationships through a full rerun", () => {
    const sensitivity = runSensitivity(REFERENCE_SOLAR_5MW_INPUT, "PROJECT_CAPEX", [7_500_000, 8_000_000, 8_500_000]);
    expect(sensitivity.points[0].sponsor_equity).not.toBeCloseTo(sensitivity.points[2].sponsor_equity, 2);
  });

  it("changes capacity-factor-driven generation and debt through a full rerun", () => {
    const sensitivity = runSensitivity(REFERENCE_SOLAR_5MW_INPUT, "CAPACITY_FACTOR", [0.22, 0.24, 0.26]);
    expect(sensitivity.points[0].permanent_debt).toBeLessThan(sensitivity.points[2].permanent_debt);
  });

  it("keeps debt invariant across ITC-rate sensitivity while sponsor equity changes", () => {
    const sensitivity = runSensitivity(REFERENCE_SOLAR_5MW_INPUT, "ITC_RATE", [0.30, 0.40]);
    expect(sensitivity.points[0].permanent_debt).toBeCloseTo(sensitivity.points[1].permanent_debt, 8);
    expect(sensitivity.points[1].sponsor_equity).toBeLessThan(sensitivity.points[0].sponsor_equity);
  });

  it("rejects capacity-factor sensitivity when generation is explicitly supplied", () => {
    const input = structuredClone(REFERENCE_SOLAR_5MW_INPUT);
    input.generation.annual_generation_override_mwh = Array(25).fill(10_000);
    input.generation.generation_source_type = "USER_SUPPLIED";
    expect(() => runSensitivity(input, "CAPACITY_FACTOR", [0.2, 0.3])).toThrow(/SENSITIVITY_NOT_APPLICABLE/);
  });
});

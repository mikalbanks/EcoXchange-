import { describe, expect, it } from "vitest";
import oneMwFixture from "./fixtures/test_case_1mw.json";
import fiveMwFixture from "./fixtures/test_case_5mw.json";
import twentyMwFixture from "./fixtures/test_case_20mw.json";
import type { ProjectFinanceInputs } from "./core";
import type { UnderwritingFacts } from "./policy";
import { runProductBankabilityAnalysis } from "./product-analysis";

const completeFacts: UnderwritingFacts = {
  technology: "SOLAR_PV",
  country: "US",
  projectStage: "READY_TO_BUILD",
  projectCoStructure: true,
  revenueContractStatus: "FULLY_CONTRACTED",
  p90Source: "ILLUSTRATIVE_PERCENT_OF_P50",
  itcEligibilityStatus: "VERIFIED",
  taxCreditBuyerStatus: "COMMITTED",
  offtakerName: "Benchmark Utility",
  offtakerCreditStatus: "INVESTMENT_GRADE",
  ppaDocumentationStatus: "EXECUTED",
  epcStatus: "EXECUTED_FIXED_PRICE",
  interconnectionStatus: "FULLY_EXECUTED",
  permitStatus: "COMPLETE",
  siteControlStatus: "LONG_TERM_LEASE_EXECUTED",
  omStatus: "EXECUTED",
  ieStatus: "FINAL_REPORT",
  insuranceStatus: "CONFIRMED",
  sponsorExperience: "EXPERIENCED",
  sponsorTaxAppetiteStatus: "CONFIRMED",
  technologyProven: true,
  materialInputSources: {
    ppa: "EXECUTED_DOCUMENT",
    p50: "INDEPENDENT_THIRD_PARTY_REPORT",
    capex: "SPONSOR_DOCUMENT",
    debtRate: "ECOXCHANGE_ASSUMPTION",
    itc: "EXECUTED_DOCUMENT",
  },
};

function analyze(input: ProjectFinanceInputs, facts = completeFacts) {
  return runProductBankabilityAnalysis({ input, facts, scenarioId: "test" });
}

function within(actual: number, expected: number, pct: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.max(0.01, Math.abs(expected) * pct));
}

describe("Bankability & Sponsor Equity product analysis", () => {
  it.each([
    ["1 MW", oneMwFixture],
    ["5 MW", fiveMwFixture],
    ["20 MW", twentyMwFixture],
  ])("reproduces the %s backend benchmark through the product service", (_name, fixture) => {
    const input = fixture.inputs as ProjectFinanceInputs;
    const result = analyze(input);
    within(result.finance.financingSummary.permanentDebtUsd, fixture.expected.permanentDebtUsd, fixture.tolerance.debtPct);
    within(result.finance.taxCreditResult.netTransferProceedsUsd, fixture.expected.itcNetTransferProceedsUsd, fixture.tolerance.simplePct);
    within(result.finance.capitalStack.sponsorEquityUsd, fixture.expected.sponsorEquityUsd, fixture.tolerance.sponsorEquityPct);
    expect(result.finance.financingSummary.bindingConstraint).toBe(fixture.expected.bindingConstraint);
  });

  it("returns the expected 5 MW lender-style classification", () => {
    const result = analyze(fiveMwFixture.inputs as ProjectFinanceInputs);
    expect(result.assessment.financialBankability).toBe("ACCEPTABLE");
    expect(result.assessment.bindingDebtConstraint).toBe("DSCR");
    expect(result.assessment.lenderFit.find((x) => x.category === "REGIONAL_SPECIALTY_ENERGY_BANK")?.fit).toBe("HIGH");
  });

  it("resizes debt downward when PPA falls or the borrowing rate rises", () => {
    const base = fiveMwFixture.inputs as ProjectFinanceInputs;
    const baseResult = analyze(base);
    const lowPpa = analyze({ ...base, yearOnePpaPricePerMwh: 45 });
    const highRate = analyze({ ...base, debtInterestRate: base.debtInterestRate + 0.02 });
    expect(lowPpa.finance.yearOneCfadsUsd).toBeLessThan(baseResult.finance.yearOneCfadsUsd);
    expect(lowPpa.finance.financingSummary.permanentDebtUsd).toBeLessThan(baseResult.finance.financingSummary.permanentDebtUsd);
    expect(highRate.finance.financingSummary.permanentDebtUsd).toBeLessThan(baseResult.finance.financingSummary.permanentDebtUsd);
  });

  it("increases sponsor equity when capex rises or ITC falls", () => {
    const base = fiveMwFixture.inputs as ProjectFinanceInputs;
    const baseResult = analyze(base);
    const highCapex = analyze({ ...base, totalProjectCapexUsd: base.totalProjectCapexUsd * 1.10 });
    const lowItc = analyze({ ...base, itcRate: 0.20 });
    expect(highCapex.finance.capitalStack.sponsorEquityUsd).toBeGreaterThan(baseResult.finance.capitalStack.sponsorEquityUsd);
    expect(lowItc.finance.taxCreditResult.netTransferProceedsUsd).toBeLessThan(baseResult.finance.taxCreditResult.netTransferProceedsUsd);
    expect(lowItc.finance.capitalStack.sponsorEquityUsd).toBeGreaterThan(baseResult.finance.capitalStack.sponsorEquityUsd);
  });

  it("reduces debt when DSCR rises and switches the binding constraint when LTC is lower", () => {
    const base = fiveMwFixture.inputs as ProjectFinanceInputs;
    const highDscr = analyze({ ...base, targetP50Dscr: 1.50 });
    const ltcBound = analyze({ ...base, maximumLtc: 0.20 });
    expect(highDscr.finance.financingSummary.permanentDebtUsd).toBeLessThan((analyze(base)).finance.financingSummary.permanentDebtUsd);
    expect(ltcBound.finance.financingSummary.bindingConstraint).toBe("LTC");
  });

  it("returns insufficient information instead of fabricating credit readiness", () => {
    const facts: UnderwritingFacts = {
      ...completeFacts,
      offtakerCreditStatus: "UNKNOWN",
      interconnectionStatus: "UNKNOWN",
    };
    const result = analyze(fiveMwFixture.inputs as ProjectFinanceInputs, facts);
    expect(result.assessment.status).toBe("INSUFFICIENT_INFORMATION");
    expect(result.assessment.missingInputs.length).toBeGreaterThan(0);
  });

  it("keeps interactive policy changes explicit as registered user overrides", () => {
    const base = fiveMwFixture.inputs as ProjectFinanceInputs;
    const result = analyze({ ...base, targetP50Dscr: 1.35, debtInterestRate: 0.07 });
    expect(result.resolvedPolicy.overrides.map((x) => x.field)).toEqual(expect.arrayContaining(["targetP50Dscr", "debtInterestRate"]));
    expect(result.assessment.rules.some((x) => x.ruleId === "POLICY_CALCULATION_MISMATCH_V1")).toBe(false);
  });
});

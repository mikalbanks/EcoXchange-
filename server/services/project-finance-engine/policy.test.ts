import { describe, expect, it } from "vitest";

import { runProjectFinanceV0, type ProjectFinanceInputs } from "./core";
import {
  BASE_SOLAR_POLICY_ID,
  BASE_SOLAR_POLICY_VERSION,
  basePolicyAssumptions,
  evaluateUnderwritingPolicy,
  resolvePolicyAssumptions,
  type UnderwritingFacts,
} from "./policy";

function fiveMwInput(): ProjectFinanceInputs {
  const policy = basePolicyAssumptions(5);
  return {
    projectName: "EcoXchange 5 MW policy case",
    capacityMwAc: 5,
    p50CapacityFactor: 0.24,
    annualDegradationRate: 0.005,
    projectLifeYears: 25,
    ppaTermYears: 25,
    yearOnePpaPricePerMwh: 55,
    annualPpaEscalationRate: 0.01,
    totalProjectCapexUsd: 8_000_000,
    capexIncludesContingency: true,
    yearOneOpexUsd: 150_000,
    annualOpexEscalationRate: 0.025,
    itcRate: policy.itcRate,
    itcEligibleBasisPercent: 0.95,
    itcTransferPrice: policy.itcTransferPrice,
    itcTransferTransactionCostsUsd: 0,
    debtInterestRate: policy.debtInterestRate,
    debtAmortizationYears: policy.debtAmortizationYears,
    debtMaturityYears: policy.debtMaturityYears,
    targetP50Dscr: policy.targetP50Dscr,
    maximumLtc: policy.maximumLtc,
    upfrontFeePercent: policy.upfrontFeePercent,
    dsraMonths: policy.dsraMonths,
    closingCostsUsd: policy.closingCostsUsd,
    otherFinancingUsesUsd: 0,
    otherPermanentSourcesUsd: 0,
    downsideGenerationMultiplier: 0.90,
    underwritingPolicyId: BASE_SOLAR_POLICY_ID,
    underwritingPolicyVersion: BASE_SOLAR_POLICY_VERSION,
  };
}

function completeFacts(): UnderwritingFacts {
  return {
    technology: "SOLAR_PV",
    country: "US",
    projectStage: "READY_TO_BUILD",
    projectCoStructure: true,
    revenueContractStatus: "FULLY_CONTRACTED",
    p90Source: "ILLUSTRATIVE_PERCENT_OF_P50",
    itcEligibilityStatus: "VERIFIED",
    taxCreditBuyerStatus: "COMMITTED",
    offtakerName: "Example Utility",
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
}

describe("Spec 03 underwriting policy", () => {
  it("resolves the 5 MW size-banded base policy", () => {
    const policy = basePolicyAssumptions(5);
    expect(policy.targetP50Dscr).toBe(1.30);
    expect(policy.maximumLtc).toBe(0.70);
    expect(policy.debtInterestRate).toBe(0.065);
    expect(policy.debtAmortizationYears).toBe(18);
    expect(policy.dsraMonths).toBe(6);
    expect(policy.itcRate).toBe(0.30);
    expect(policy.itcTransferPrice).toBe(0.92);
    expect(policy.closingCostsUsd).toBe(400_000);
  });

  it("interprets the 5 MW case without recomputing project cash flows", () => {
    const input = fiveMwInput();
    const result = runProjectFinanceV0(input);
    const assessment = evaluateUnderwritingPolicy(input, result, completeFacts(), resolvePolicyAssumptions(5));

    expect(result.financingSummary.permanentDebtUsd).toBeCloseTo(3_364_160, -1);
    expect(assessment.projectSize).toBe("MID");
    expect(assessment.bindingDebtConstraint).toBe("DSCR");
    expect(assessment.leverageClass).toBe("MODERATE");
    expect(assessment.financialBankability).toBe("ACCEPTABLE");
    expect(assessment.lenderFit.find((x) => x.category === "REGIONAL_SPECIALTY_ENERGY_BANK")?.fit).toBe("HIGH");
    expect(assessment.status).toBe("PASS_WITH_CONDITIONS");
    expect(assessment.rules.find((x) => x.ruleId === "SOLAR_P50_DSCR_MINIMUM_V1")?.status).toBe("PASS");
    expect(assessment.rules.find((x) => x.ruleId === "MAX_LTC_V1")?.status).toBe("PASS");
    expect(assessment.rules.find((x) => x.ruleId === "P90_REPAYMENT_REQUIRED_V1")?.status).toBe("INDICATIVE_PASS");
  });

  it("never upgrades an illustrative 90% of P50 case to lender-grade P90", () => {
    const input = fiveMwInput();
    const result = runProjectFinanceV0(input);
    const assessment = evaluateUnderwritingPolicy(input, result, completeFacts(), resolvePolicyAssumptions(5));
    expect(assessment.conditionsPrecedent.some((x) => x.includes("independent-engineer"))).toBe(true);
  });

  it("detects policy/calculation mismatch unless a registered override exists", () => {
    const input = { ...fiveMwInput(), targetP50Dscr: 1.25 };
    const result = runProjectFinanceV0(input);
    const assessment = evaluateUnderwritingPolicy(input, result, completeFacts(), resolvePolicyAssumptions(5));
    expect(assessment.status).toBe("FAIL");
    expect(assessment.rules.some((x) => x.ruleId === "POLICY_CALCULATION_MISMATCH_V1" && x.status === "FAIL")).toBe(true);

    const base = basePolicyAssumptions(5);
    const overridden = resolvePolicyAssumptions(5, [{
      field: "targetP50Dscr",
      policyValue: base.targetP50Dscr,
      overrideValue: 1.25,
      reason: "Indicative lender term sheet",
      source: "LENDER_QUOTE",
      createdBy: "test",
      timestamp: "2026-09-02T18:00:00Z",
    }]);
    const withOverride = evaluateUnderwritingPolicy(input, result, completeFacts(), overridden);
    expect(withOverride.rules.some((x) => x.ruleId === "POLICY_CALCULATION_MISMATCH_V1")).toBe(false);
    expect(withOverride.policyOverrides).toHaveLength(1);
  });

  it("returns INSUFFICIENT_INFORMATION when material underwriting facts are unknown", () => {
    const input = fiveMwInput();
    const result = runProjectFinanceV0(input);
    const facts = { ...completeFacts(), offtakerCreditStatus: "UNKNOWN" as const, interconnectionStatus: "UNKNOWN" as const };
    const assessment = evaluateUnderwritingPolicy(input, result, facts, resolvePolicyAssumptions(5));
    expect(assessment.status).toBe("INSUFFICIENT_INFORMATION");
    expect(assessment.missingInputs.map((x) => x.field)).toContain("offtakerCreditStatus");
    expect(assessment.missingInputs.map((x) => x.field)).toContain("interconnectionStatus");
  });

  it("keeps unsupported technologies out of the solar policy", () => {
    const input = fiveMwInput();
    const result = runProjectFinanceV0(input);
    const facts = { ...completeFacts(), technology: "BATTERY_STORAGE" };
    const assessment = evaluateUnderwritingPolicy(input, result, facts, resolvePolicyAssumptions(5));
    expect(assessment.status).toBe("OUT_OF_SCOPE");
  });

  it("flags small-project fixed-cost risk as a recommendation rather than automatic failure", () => {
    const policy = basePolicyAssumptions(1);
    const input: ProjectFinanceInputs = {
      ...fiveMwInput(),
      projectName: "EcoXchange 1 MW policy case",
      capacityMwAc: 1,
      totalProjectCapexUsd: 1_900_000,
      yearOneOpexUsd: 38_000,
      debtInterestRate: policy.debtInterestRate,
      debtAmortizationYears: policy.debtAmortizationYears,
      debtMaturityYears: policy.debtMaturityYears,
      maximumLtc: policy.maximumLtc,
      closingCostsUsd: policy.closingCostsUsd,
    };
    const result = runProjectFinanceV0(input);
    const assessment = evaluateUnderwritingPolicy(input, result, completeFacts(), resolvePolicyAssumptions(1));
    expect(assessment.projectSize).toBe("SMALL");
    expect(assessment.rules.some((x) => x.ruleId === "SMALL_PROJECT_FIXED_COST_RISK_V1")).toBe(true);
    expect(assessment.preferredExecution).toContain("PORTFOLIO_AGGREGATION_RECOMMENDED");
    expect(assessment.status).not.toBe("FAIL");
  });
});

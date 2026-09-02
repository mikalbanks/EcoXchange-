import { describe, expect, it } from "vitest";

import fiveMwFixture from "./fixtures/test_case_5mw.json";
import {
  CALCULATION_ENGINE_VERSION,
  runProjectFinanceV0,
  type ProjectFinanceInputs,
} from "./core";
import {
  basePolicyAssumptions,
  evaluateUnderwritingPolicy,
  resolvePolicyAssumptions,
  type UnderwritingFacts,
} from "./policy";

const fiveMw = fiveMwFixture.inputs as ProjectFinanceInputs;

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
  };
}

describe("Spec 08 implementation-control gates", () => {
  it("produces numerically identical deterministic results across 1,000 runs", () => {
    const reference = runProjectFinanceV0(fiveMw);
    for (let i = 0; i < 1_000; i += 1) {
      expect(runProjectFinanceV0(fiveMw)).toEqual(reference);
    }
    expect(reference.metadata.calculationEngineVersion).toBe(CALCULATION_ENGINE_VERSION);
  });

  it("keeps unsupported battery assets outside the contracted-solar policy", () => {
    const input = { ...fiveMw };
    const result = runProjectFinanceV0(input);
    const facts = { ...completeFacts(), technology: "BATTERY_STORAGE" };
    const assessment = evaluateUnderwritingPolicy(
      input,
      result,
      facts,
      resolvePolicyAssumptions(input.capacityMwAc),
    );
    expect(assessment.status).toBe("OUT_OF_SCOPE");
  });

  it("keeps the 5 MW policy default at 1.30x rather than drifting to a lender-specific threshold", () => {
    expect(basePolicyAssumptions(5).targetP50Dscr).toBe(1.30);
  });

  it("treats all finance reconciliations as release gates", () => {
    const result = runProjectFinanceV0(fiveMw);
    expect(result.reconciliation.debtReconciled).toBe(true);
    expect(result.reconciliation.sourcesUsesReconciled).toBe(true);
    expect(Math.abs(result.reconciliation.debtReconciliationDifferenceUsd)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.reconciliation.sourcesUsesDifferenceUsd)).toBeLessThanOrEqual(1);
  });
});

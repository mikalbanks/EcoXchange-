import { describe, expect, it } from "vitest";
import {
  ECOXCHANGE_SOLAR_BASE_V010,
  classifyBalloon,
  classifyContractTail,
  classifyDscrHeadroom,
  classifyProjectSize,
  classifySponsorEquity,
  evaluateUnderwriting,
  type FinanceResultForUnderwriting,
  type UnderwritingFactsV1,
  type UnderwritingPolicyV1,
} from "./underwriting-engine";

const finance = (overrides: Partial<FinanceResultForUnderwriting> = {}): FinanceResultForUnderwriting => ({
  calculationRunId:"run-5mw", calculationEngineVersion:"0.2.0", permanentDebt:3_364_160.17, debtToCapex:.42052, minimumDscr:1.30,
  bindingConstraint:"DSCR", balloonBalance:0, openingPermanentDebt:3_364_160.17, sponsorEquityPctTotalUses:.354,
  simplifiedAfterTaxIrr:null, taxModuleEnabled:false, itcRate:.30, itcProceeds:2_097_600,
  downside:{generationSourceType:"ILLUSTRATIVE_PERCENT_OF_P50",fullRepayment:true,interestShortfall:false,minimumDownsideDscr:1.096},
  reconciliation:{debtReconciled:true,sourcesUsesReconciled:true},
  calculationAssumptions:{targetP50Dscr:1.30,maxLtc:.70,dsraMonths:6,amortizationYears:18},
  ...overrides,
});

const perfectFacts = (overrides: Partial<UnderwritingFactsV1> = {}): UnderwritingFactsV1 => ({
  technology:"SOLAR_PV", capacityMwAc:5, countryCode:"US", revenueStructure:"FULLY_CONTRACTED", projectStage:"READY_TO_BUILD", ppaTermYears:25,
  ppaStatus:"EXECUTED", offtakerCredit:"INVESTMENT_GRADE", itcEligibility:"VERIFIED", itcBuyerStatus:"COMMITTED", sponsorTaxAppetite:"CONFIRMED",
  epcStatus:"EXECUTED", epcPriceStructure:"FIXED", contractorQuality:"STRONG", performanceGuarantee:true, liquidatedDamages:true,
  interconnectionStatus:"FULLY_EXECUTED", permitsStatus:"COMPLETE", siteControlStatus:"SECURED", omStatus:"EXECUTED", insuranceStatus:"CONFIRMED",
  independentEngineerStatus:"FINAL", sponsorExperience:"STRONG", completionSupport:"CONFIRMED", costOverrunSupport:"CONFIRMED", equityCommitment:"CONFIRMED",
  dsraMonthsActual:6, closingCostsUsd:250_000, capexIncludesContingency:true,
  ...overrides,
});

describe("Ticket 09 deterministic underwriting engine",()=>{
  it("enforces project scope boundaries",()=>{
    expect(evaluateUnderwriting({projectFacts:perfectFacts({capacityMwAc:.99}),financeResult:finance()}).status).toBe("OUT_OF_SCOPE");
    expect(evaluateUnderwriting({projectFacts:perfectFacts({capacityMwAc:1}),financeResult:finance({calculationAssumptions:{targetP50Dscr:1.30,maxLtc:.65,dsraMonths:6,amortizationYears:15}})}).status).not.toBe("OUT_OF_SCOPE");
    expect(evaluateUnderwriting({projectFacts:perfectFacts({capacityMwAc:20}),financeResult:finance()}).status).not.toBe("OUT_OF_SCOPE");
    expect(evaluateUnderwriting({projectFacts:perfectFacts({capacityMwAc:20.01}),financeResult:finance()}).status).toBe("OUT_OF_SCOPE");
    expect(evaluateUnderwriting({projectFacts:perfectFacts({technology:"BATTERY_STORAGE"}),financeResult:finance()}).status).toBe("OUT_OF_SCOPE");
    expect(evaluateUnderwriting({projectFacts:perfectFacts({revenueStructure:"MERCHANT"}),financeResult:finance()}).status).toBe("OUT_OF_SCOPE");
  });

  it("uses exact size and classification boundaries",()=>{
    expect(classifyProjectSize(4.99)).toBe("SMALL"); expect(classifyProjectSize(5)).toBe("MID"); expect(classifyProjectSize(14.99)).toBe("MID"); expect(classifyProjectSize(15)).toBe("UPPER_MIDSCALE");
    expect(classifySponsorEquity(.25)).toBe("CAPITAL_EFFICIENT"); expect(classifySponsorEquity(.251)).toBe("MODERATE"); expect(classifySponsorEquity(.40)).toBe("MODERATE"); expect(classifySponsorEquity(.401)).toBe("HIGH"); expect(classifySponsorEquity(.60)).toBe("HIGH"); expect(classifySponsorEquity(.601)).toBe("VERY_HIGH");
    expect(classifyBalloon(.249)).toBe("LOW"); expect(classifyBalloon(.25)).toBe("MODERATE"); expect(classifyBalloon(.50)).toBe("MODERATE"); expect(classifyBalloon(.501)).toBe("HIGH");
    expect(classifyContractTail(2)).toBe("STRONG"); expect(classifyContractTail(0)).toBe("ACCEPTABLE"); expect(classifyContractTail(-1)).toBe("WEAK");
    expect(classifyDscrHeadroom(1.45,1.30)).toBe("STRONG"); expect(classifyDscrHeadroom(1.35,1.30)).toBe("ADEQUATE"); expect(classifyDscrHeadroom(1.30,1.30)).toBe("THIN"); expect(classifyDscrHeadroom(1.29,1.30)).toBe("FAIL");
  });

  it("is policy driven at the DSCR boundary",()=>{
    const f=finance({minimumDscr:1.30}); const a=evaluateUnderwriting({projectFacts:perfectFacts(),financeResult:f});
    expect(a.rule_results.find(x=>x.rule_id==="FINANCIAL_P50_DSCR_V1")?.status).toBe("PASS");
    const fail=evaluateUnderwriting({projectFacts:perfectFacts(),financeResult:finance({minimumDscr:1.29})});
    expect(fail.status).toBe("FAIL"); expect(fail.financial_profile).toBe("UNFINANCEABLE_UNDER_POLICY");
  });

  it("treats zero debt as no capacity and DSCR as not applicable",()=>{
    const a=evaluateUnderwriting({projectFacts:perfectFacts(),financeResult:finance({permanentDebt:0,openingPermanentDebt:0,minimumDscr:null,debtToCapex:0})});
    expect(a.rule_results.find(x=>x.rule_id==="FINANCIAL_DEBT_CAPACITY_V1")?.status).toBe("FAIL");
    expect(a.rule_results.find(x=>x.rule_id==="FINANCIAL_P50_DSCR_V1")?.status).toBe("NOT_APPLICABLE");
  });

  it("preserves illustrative downside as indicative rather than lender-grade pass",()=>{
    const a=evaluateUnderwriting({projectFacts:perfectFacts(),financeResult:finance()});
    expect(a.rule_results.find(x=>x.rule_id==="PRODUCTION_DOWNSIDE_PROVENANCE_V1")?.status).toBe("INDICATIVE_PASS");
    expect(a.rule_results.find(x=>x.rule_id==="PRODUCTION_DOWNSIDE_REPAYMENT_V1")?.status).toBe("INDICATIVE_PASS");
    expect(a.conditions.some(x=>x.condition_code==="OBTAIN_FINAL_IE_P90")).toBe(true);
  });

  it("hard fails downside repayment or interest shortfall",()=>{
    for (const d of [
      {generationSourceType:"INDEPENDENT_ENGINEER_P90" as const,fullRepayment:false,interestShortfall:false,minimumDownsideDscr:1.2},
      {generationSourceType:"INDEPENDENT_ENGINEER_P90" as const,fullRepayment:true,interestShortfall:true,minimumDownsideDscr:1.2},
    ]) expect(evaluateUnderwriting({projectFacts:perfectFacts(),financeResult:finance({downside:d})}).status).toBe("FAIL");
  });

  it("distinguishes missing data from failure",()=>{
    const a=evaluateUnderwriting({projectFacts:perfectFacts({offtakerCredit:"UNKNOWN",interconnectionStatus:"UNKNOWN"}),financeResult:finance({downside:undefined})});
    expect(a.status).toBe("INSUFFICIENT_INFORMATION");
    expect(a.missing_information.map(x=>x.field_key)).toEqual(expect.arrayContaining(["offtaker_credit_status","interconnection_status","downside_provenance"]));
  });

  it("keeps financial profile separate from readiness",()=>{
    const a=evaluateUnderwriting({projectFacts:perfectFacts({interconnectionStatus:"IN_QUEUE",independentEngineerStatus:"NOT_ENGAGED"}),financeResult:finance()});
    expect(["ACCEPTABLE","THIN"]).toContain(a.financial_profile);
    expect(["EARLY","DEVELOPING"]).toContain(a.financing_readiness);
    expect(a.status).not.toBe("PASS");
  });

  it("achieves plain PASS in a fully resolved lender-ready case",()=>{
    const a=evaluateUnderwriting({projectFacts:perfectFacts(),financeResult:finance({downside:{generationSourceType:"INDEPENDENT_ENGINEER_P90",fullRepayment:true,interestShortfall:false,minimumDownsideDscr:1.20}})});
    expect(a.status).toBe("PASS"); expect(a.financing_readiness).toBe("CLOSING_READY");
  });

  it("detects calculation-policy mismatch unless represented by override",()=>{
    const mismatched=finance({calculationAssumptions:{targetP50Dscr:1.25,maxLtc:.70,dsraMonths:6,amortizationYears:18}});
    expect(evaluateUnderwriting({projectFacts:perfectFacts(),financeResult:mismatched}).status).toBe("FAIL");
    const withOverride=evaluateUnderwriting({projectFacts:perfectFacts(),financeResult:mismatched,overrides:[{fieldKey:"targetP50Dscr",originalValue:1.30,effectiveValue:1.25,reason:"lender quote",source:"LENDER_QUOTE"}]});
    expect(withOverride.rule_results.some(x=>x.rule_id==="POLICY_CALCULATION_MISMATCH_V1")).toBe(false);
    expect(withOverride.summary_metadata.policy_override_count).toBe(1);
  });

  it("proves policy-version behavior can change without changing the finance result",()=>{
    const v1=evaluateUnderwriting({projectFacts:perfectFacts(),financeResult:finance({minimumDscr:1.32})});
    const v2Policy:UnderwritingPolicyV1={...ECOXCHANGE_SOLAR_BASE_V010,policyVersion:"0.2.0",targetP50Dscr:1.35};
    const f2=finance({minimumDscr:1.32,calculationAssumptions:{targetP50Dscr:1.35,maxLtc:.70,dsraMonths:6,amortizationYears:18}});
    const v2=evaluateUnderwriting({projectFacts:perfectFacts(),financeResult:f2,policy:v2Policy});
    expect(v1.rule_results.find(x=>x.rule_id==="FINANCIAL_P50_DSCR_V1")?.status).toBe("PASS");
    expect(v2.rule_results.find(x=>x.rule_id==="FINANCIAL_P50_DSCR_V1")?.status).toBe("FAIL");
    expect(v1.summary_metadata.policy_version).toBe("0.1.0"); expect(v2.summary_metadata.policy_version).toBe("0.2.0");
  });

  it("does not change debt under ITC/readiness facts and produces generic recommendations only",()=>{
    const a=evaluateUnderwriting({projectFacts:perfectFacts({capacityMwAc:1,itcEligibility:"USER_ASSERTED",itcBuyerStatus:"UNIDENTIFIED"}),financeResult:finance({calculationAssumptions:{targetP50Dscr:1.30,maxLtc:.65,dsraMonths:6,amortizationYears:15}})});
    expect(a.recommendations).toContain("PORTFOLIO_AGGREGATION_RECOMMENDED");
    expect(a.lender_fit.find(x=>x.lender_category==="REGIONAL_SPECIALTY_ENERGY_BANK")?.fit).toBe("HIGH");
    expect(JSON.stringify(a)).not.toMatch(/Bank of America|KeyBank|bankability_score/i);
  });

  it("rejects unreconciled finance results instead of underwriting them",()=>{
    expect(()=>evaluateUnderwriting({projectFacts:perfectFacts(),financeResult:finance({reconciliation:{debtReconciled:false,sourcesUsesReconciled:true}})})).toThrow("INVALID_FINANCE_RESULT");
  });

  it("is deterministic and does not mutate inputs",()=>{
    const facts=perfectFacts(); const f=finance(); const factsBefore=structuredClone(facts); const fBefore=structuredClone(f);
    const first=evaluateUnderwriting({projectFacts:facts,financeResult:f});
    for(let i=0;i<1000;i++) expect(evaluateUnderwriting({projectFacts:facts,financeResult:f})).toEqual(first);
    expect(facts).toEqual(factsBefore); expect(f).toEqual(fBefore);
  });
});

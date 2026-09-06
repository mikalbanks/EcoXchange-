import {
  runProjectFinanceV0,
  runSensitivity,
  type ProjectFinanceInputs,
  type ProjectFinanceResult,
  type SensitivityKind,
} from "./core";
import {
  BASE_SOLAR_POLICY_ID,
  BASE_SOLAR_POLICY_VERSION,
  basePolicyAssumptions,
  evaluateUnderwritingPolicy,
  resolvePolicyAssumptions,
  type PolicyAssessment,
  type PolicyOverride,
  type ResolvedPolicyAssumptions,
  type UnderwritingFacts,
} from "./policy";

export interface ProductAnalysisRequest {
  input: ProjectFinanceInputs;
  facts: UnderwritingFacts;
  scenarioId?: string;
}

export interface ImprovementPoint {
  kind: SensitivityKind;
  label: string;
  baseValue: number;
  testedValue: number;
  permanentDebtUsd: number;
  sponsorEquityUsd: number;
  bindingConstraint: ProjectFinanceResult["financingSummary"]["bindingConstraint"];
  permanentDebtChangeUsd: number;
  sponsorEquityChangeUsd: number;
}

export interface ProductAnalysisResult {
  scenarioId: string;
  analyzedAt: string;
  finance: ProjectFinanceResult;
  assessment: PolicyAssessment;
  resolvedPolicy: ResolvedPolicyAssumptions;
  improvements: ImprovementPoint[];
}

const POLICY_FIELDS: ReadonlyArray<{
  field: PolicyOverride["field"];
  inputKey: keyof ProjectFinanceInputs;
}> = [
  { field: "targetP50Dscr", inputKey: "targetP50Dscr" },
  { field: "maximumLtc", inputKey: "maximumLtc" },
  { field: "debtInterestRate", inputKey: "debtInterestRate" },
  { field: "debtAmortizationYears", inputKey: "debtAmortizationYears" },
  { field: "debtMaturityYears", inputKey: "debtMaturityYears" },
  { field: "dsraMonths", inputKey: "dsraMonths" },
  { field: "upfrontFeePercent", inputKey: "upfrontFeePercent" },
  { field: "itcRate", inputKey: "itcRate" },
  { field: "itcTransferPrice", inputKey: "itcTransferPrice" },
  { field: "closingCostsUsd", inputKey: "closingCostsUsd" },
];

function explicitPolicyOverrides(input: ProjectFinanceInputs, timestamp: string): PolicyOverride[] {
  const base = basePolicyAssumptions(input.capacityMwAc);
  return POLICY_FIELDS.flatMap(({ field, inputKey }) => {
    const policyValue = base[field];
    const rawOverride = input[inputKey];
    if (typeof policyValue !== "number" || typeof rawOverride !== "number") return [];
    if (Math.abs(policyValue - rawOverride) < 1e-12) return [];
    return [{
      field,
      policyValue,
      overrideValue: rawOverride,
      reason: "Interactive Bankability & Sponsor Equity scenario assumption",
      source: "USER_ASSUMPTION" as const,
      createdBy: "bankability-workspace",
      timestamp,
    }];
  });
}

function improvement(
  base: ProjectFinanceResult,
  input: ProjectFinanceInputs,
  kind: SensitivityKind,
  label: string,
  testedValue: number,
): ImprovementPoint | null {
  if (!Number.isFinite(testedValue) || testedValue < 0) return null;
  const [point] = runSensitivity(input, kind, [testedValue]);
  if (!point) return null;
  return {
    kind,
    label,
    baseValue:
      kind === "PPA_PRICE" ? input.yearOnePpaPricePerMwh :
      kind === "INTEREST_RATE" ? input.debtInterestRate :
      kind === "CAPEX" ? input.totalProjectCapexUsd :
      kind === "CAPACITY_FACTOR" ? input.p50CapacityFactor : input.itcRate,
    testedValue,
    permanentDebtUsd: point.permanentDebtUsd,
    sponsorEquityUsd: point.sponsorEquityUsd,
    bindingConstraint: point.bindingConstraint,
    permanentDebtChangeUsd: point.permanentDebtUsd - base.financingSummary.permanentDebtUsd,
    sponsorEquityChangeUsd: point.sponsorEquityUsd - base.capitalStack.sponsorEquityUsd,
  };
}

function buildImprovements(input: ProjectFinanceInputs, base: ProjectFinanceResult): ImprovementPoint[] {
  const candidates: Array<ImprovementPoint | null> = [
    improvement(base, input, "PPA_PRICE", "Higher contracted PPA price", input.yearOnePpaPricePerMwh * 1.10),
    improvement(base, input, "INTEREST_RATE", "Lower borrowing rate", Math.max(0, input.debtInterestRate - 0.01)),
    improvement(base, input, "CAPEX", "Lower project capex", input.totalProjectCapexUsd * 0.90),
    improvement(base, input, "ITC_RATE", "Higher qualifying ITC", Math.min(1, input.itcRate + 0.10)),
    improvement(base, input, "CAPACITY_FACTOR", "Higher P50 production", Math.min(1, input.p50CapacityFactor * 1.05)),
  ];

  return candidates
    .filter((candidate): candidate is ImprovementPoint => candidate !== null)
    .filter((candidate) => candidate.permanentDebtChangeUsd > 1 || candidate.sponsorEquityChangeUsd < -1)
    .sort((a, b) => {
      const aImpact = a.permanentDebtChangeUsd - a.sponsorEquityChangeUsd;
      const bImpact = b.permanentDebtChangeUsd - b.sponsorEquityChangeUsd;
      return bImpact - aImpact;
    });
}

export function runProductBankabilityAnalysis(request: ProductAnalysisRequest): ProductAnalysisResult {
  const analyzedAt = new Date().toISOString();
  const input: ProjectFinanceInputs = {
    ...request.input,
    underwritingPolicyId: request.input.underwritingPolicyId ?? BASE_SOLAR_POLICY_ID,
    underwritingPolicyVersion: request.input.underwritingPolicyVersion ?? BASE_SOLAR_POLICY_VERSION,
  };
  const overrides = explicitPolicyOverrides(input, analyzedAt);
  const resolvedPolicy = resolvePolicyAssumptions(input.capacityMwAc, overrides);
  const finance = runProjectFinanceV0(input);
  const assessment = evaluateUnderwritingPolicy(input, finance, request.facts, resolvedPolicy);

  return {
    scenarioId: request.scenarioId?.trim() || `scenario-${Date.now()}`,
    analyzedAt,
    finance,
    assessment,
    resolvedPolicy,
    improvements: buildImprovements(input, finance),
  };
}

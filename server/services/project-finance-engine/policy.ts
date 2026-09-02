import type {
  ProjectFinanceInputs,
  ProjectFinanceResult,
} from "./core";

export const BASE_SOLAR_POLICY_ID = "ECOXCHANGE_SOLAR_BASE";
export const BASE_SOLAR_POLICY_VERSION = "0.1.0";

export type AssessmentStatus =
  | "PASS"
  | "PASS_WITH_CONDITIONS"
  | "REVIEW_REQUIRED"
  | "FAIL"
  | "INSUFFICIENT_INFORMATION"
  | "OUT_OF_SCOPE";

export type RuleStatus = "PASS" | "INDICATIVE_PASS" | "CONDITION" | "REVIEW" | "FAIL" | "MISSING" | "NOT_APPLICABLE";
export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RiskCategory =
  | "REVENUE"
  | "PRODUCTION"
  | "CONSTRUCTION"
  | "INTERCONNECTION"
  | "PERMITTING"
  | "COUNTERPARTY"
  | "SPONSOR"
  | "TAX_CREDIT"
  | "FINANCIAL"
  | "REFINANCING"
  | "DOCUMENTATION";

export type RevenueContractStatus = "FULLY_CONTRACTED" | "PARTIALLY_CONTRACTED" | "MERCHANT" | "UNKNOWN";
export type P90Source = "INDEPENDENT_ENGINEER_P90" | "USER_SUPPLIED_P90" | "ILLUSTRATIVE_PERCENT_OF_P50" | "NONE";
export type ItcEligibilityStatus = "VERIFIED" | "USER_ASSERTED" | "PENDING_REVIEW" | "UNKNOWN";
export type TaxCreditBuyerStatus = "COMMITTED" | "IDENTIFIED_NOT_COMMITTED" | "UNIDENTIFIED" | "NOT_APPLICABLE";
export type OfftakerCreditStatus = "INVESTMENT_GRADE" | "STRONG_NON_RATED" | "NON_INVESTMENT_GRADE" | "UNKNOWN";
export type PpaDocumentationStatus = "EXECUTED" | "AWARDED_NOT_EXECUTED" | "TERM_SHEET" | "NEGOTIATION" | "NONE" | "UNKNOWN";
export type EpcStatus = "EXECUTED_FIXED_PRICE" | "EXECUTED_CAPPED_PRICE" | "EXECUTED_OTHER" | "NEGOTIATION" | "NONE" | "UNKNOWN";
export type InterconnectionStatus = "FULLY_EXECUTED" | "APPROVED_PENDING_EXECUTION" | "STUDY_COMPLETE" | "IN_QUEUE" | "EARLY_STAGE" | "UNKNOWN";
export type PermitStatus = "COMPLETE" | "SUBSTANTIALLY_COMPLETE" | "IN_PROCESS" | "EARLY_STAGE" | "UNKNOWN";
export type SiteControlStatus = "OWNED" | "LONG_TERM_LEASE_EXECUTED" | "OPTION_EXECUTED" | "OPTION_ONLY" | "NONE" | "UNKNOWN";
export type OmStatus = "EXECUTED" | "IDENTIFIED" | "NOT_IDENTIFIED" | "UNKNOWN";
export type IeStatus = "FINAL_REPORT" | "DRAFT_REPORT" | "ENERGY_REPORT_ONLY" | "NONE" | "UNKNOWN";
export type InsuranceStatus = "CONFIRMED" | "PRELIMINARY" | "NONE" | "UNKNOWN";
export type SponsorExperience = "EXPERIENCED" | "MODERATE" | "FIRST_TIME" | "UNKNOWN";
export type SponsorTaxAppetiteStatus = "CONFIRMED" | "PARTIAL" | "NONE" | "UNKNOWN";
export type ProjectStage = "DEVELOPMENT" | "READY_TO_BUILD" | "CONSTRUCTION" | "OPERATING";
export type SupportStatus = "CONFIRMED" | "PENDING" | "NONE" | "UNKNOWN";
export type InputSourceStrength =
  | "EXECUTED_DOCUMENT"
  | "INDEPENDENT_THIRD_PARTY_REPORT"
  | "LENDER_QUOTE"
  | "SPONSOR_DOCUMENT"
  | "USER_ASSERTION"
  | "ECOXCHANGE_ASSUMPTION"
  | "UNKNOWN";

export type ProjectSizeClass = "SMALL" | "MID" | "UPPER_MIDSCALE";
export type FinancialBankability = "STRONG" | "ACCEPTABLE" | "THIN" | "WEAK" | "UNFINANCEABLE_UNDER_POLICY";
export type FinancingReadiness = "EARLY" | "DEVELOPING" | "FINANCING_READY" | "CLOSING_READY" | "OPERATING";
export type CounterpartyRisk = "STRONG" | "MODERATE" | "MATERIAL_RISK" | "UNKNOWN";
export type TaxCreditCertainty = "HIGH" | "MODERATE" | "LOW" | "UNKNOWN" | "NOT_APPLICABLE";
export type LenderFit = "HIGH" | "MEDIUM" | "LOW" | "POTENTIAL" | "NOT_APPLICABLE";
export type LenderCategory =
  | "MONEY_CENTER_PROJECT_FINANCE_BANK"
  | "REGIONAL_SPECIALTY_ENERGY_BANK"
  | "PRIVATE_CREDIT"
  | "INSTITUTIONAL_PRIVATE_PLACEMENT"
  | "TAX_CREDIT_BRIDGE_LENDER"
  | "GREEN_BANK_CDFI";

export interface UnderwritingPolicy {
  policyId: string;
  policyVersion: string;
  description: string;
  targetP50Dscr: number;
  merchantDscr: number;
  merchantExposureWarning: number;
  merchantExposureSevere: number;
  dsraMonths: number;
  lenderFeeRate: number;
  defaultItcRate: number;
  defaultItcTransferPrice: number;
  constructionContingencyRate: number;
  committedItcBridgeAdvance: number;
  uncommittedItcBridgeAdvance: number;
}

export interface PolicyOverride {
  field: "targetP50Dscr" | "maximumLtc" | "debtInterestRate" | "debtAmortizationYears" | "debtMaturityYears" | "dsraMonths" | "upfrontFeePercent" | "itcRate" | "itcTransferPrice" | "closingCostsUsd";
  policyValue: number;
  overrideValue: number;
  reason: string;
  source: "LENDER_QUOTE" | "USER_ASSUMPTION" | "OTHER";
  createdBy: string;
  timestamp: string;
}

export interface ResolvedPolicyAssumptions {
  targetP50Dscr: number;
  maximumLtc: number;
  debtInterestRate: number;
  debtAmortizationYears: number;
  debtMaturityYears: number;
  dsraMonths: number;
  upfrontFeePercent: number;
  itcRate: number;
  itcTransferPrice: number;
  closingCostsUsd: number;
  overrides: PolicyOverride[];
}

export interface UnderwritingFacts {
  technology: "SOLAR_PV" | string;
  country: string;
  projectStage: ProjectStage;
  projectCoStructure: boolean;
  revenueContractStatus: RevenueContractStatus;
  p90Source: P90Source;
  itcEligibilityStatus: ItcEligibilityStatus;
  taxCreditBuyerStatus: TaxCreditBuyerStatus;
  offtakerName?: string;
  offtakerCreditStatus: OfftakerCreditStatus;
  ppaDocumentationStatus: PpaDocumentationStatus;
  epcStatus: EpcStatus;
  interconnectionStatus: InterconnectionStatus;
  permitStatus: PermitStatus;
  siteControlStatus: SiteControlStatus;
  omStatus: OmStatus;
  ieStatus: IeStatus;
  insuranceStatus: InsuranceStatus;
  sponsorExperience: SponsorExperience;
  sponsorTaxAppetiteStatus: SponsorTaxAppetiteStatus;
  completionSupportStatus?: SupportStatus;
  costOverrunSupportStatus?: SupportStatus;
  equityCommitmentStatus?: SupportStatus;
  technologyProven: boolean;
  merchantExposurePct?: number;
  materialInputSources?: Partial<Record<"ppa" | "p50" | "capex" | "debtRate" | "itc", InputSourceStrength>>;
}

export interface RuleResult {
  ruleId: string;
  ruleVersion: "V1";
  status: RuleStatus;
  severity: Severity;
  actualValue: string | number | boolean | null;
  requiredValue: string | number | boolean | null;
  message: string;
  conditionToClear?: string;
  source: "ECOXCHANGE_POLICY" | "PROJECT_FACT" | "SPEC_02_RESULT";
  category: RiskCategory;
  hardFail?: boolean;
}

export interface RiskResult {
  riskId: string;
  category: RiskCategory;
  severity: Severity;
  description: string;
  evidence: string;
  mitigation: string;
  status: "OPEN" | "CONDITION" | "ACCEPTED";
}

export interface MissingInputResult {
  field: string;
  importance: "CALCULATION_REQUIRED" | "UNDERWRITING_REQUIRED";
  reason: string;
  blocksCalculation: boolean;
  blocksCreditAssessment: boolean;
}

export interface LenderFitResult {
  category: LenderCategory;
  fit: LenderFit;
  rationale: string;
}

export interface PolicyAssessment {
  analysisType: "INDICATIVE_CREDIT_ASSESSMENT";
  policyId: string;
  policyVersion: string;
  status: AssessmentStatus;
  projectSize: ProjectSizeClass;
  financialBankability: FinancialBankability;
  financingReadiness: FinancingReadiness;
  counterpartyRisk: CounterpartyRisk;
  taxCreditCertainty: TaxCreditCertainty;
  bindingDebtConstraint: ProjectFinanceResult["financingSummary"]["bindingConstraint"];
  dscrHeadroom: number | null;
  dscrHeadroomClass: "STRONG" | "ADEQUATE" | "THIN" | "FAIL" | "NOT_APPLICABLE";
  contractTailYears: number;
  contractTailClass: "STRONG" | "ACCEPTABLE" | "WEAK";
  leverageClass: "LOW_LEVERAGE" | "MODERATE" | "HIGHER_BUT_POTENTIALLY_NORMAL" | "FAIL";
  sponsorEquityClass: "CAPITAL_EFFICIENT" | "MODERATE_EQUITY_REQUIREMENT" | "HIGH_EQUITY_REQUIREMENT" | "VERY_HIGH_EQUITY_REQUIREMENT";
  preferredExecution: string[];
  lenderFit: LenderFitResult[];
  rules: RuleResult[];
  risks: RiskResult[];
  conditionsPrecedent: string[];
  missingInputs: MissingInputResult[];
  policyOverrides: PolicyOverride[];
}

export const ECOXCHANGE_SOLAR_BASE_POLICY: UnderwritingPolicy = Object.freeze({
  policyId: BASE_SOLAR_POLICY_ID,
  policyVersion: BASE_SOLAR_POLICY_VERSION,
  description: "EcoXchange preliminary underwriting policy for fully contracted U.S. solar projects in the 1–20 MW range.",
  targetP50Dscr: 1.30,
  merchantDscr: 1.75,
  merchantExposureWarning: 0.25,
  merchantExposureSevere: 0.30,
  dsraMonths: 6,
  lenderFeeRate: 0.0125,
  defaultItcRate: 0.30,
  defaultItcTransferPrice: 0.92,
  constructionContingencyRate: 0.075,
  committedItcBridgeAdvance: 0.98,
  uncommittedItcBridgeAdvance: 0.725,
});

function sizeBand(capacityMwAc: number): "SMALLER" | "MID" | "LARGER" {
  if (capacityMwAc < 3) return "SMALLER";
  if (capacityMwAc < 10) return "MID";
  return "LARGER";
}

export function classifyProjectSize(capacityMwAc: number): ProjectSizeClass {
  if (capacityMwAc < 5) return "SMALL";
  if (capacityMwAc < 15) return "MID";
  return "UPPER_MIDSCALE";
}

export function basePolicyAssumptions(capacityMwAc: number, policy = ECOXCHANGE_SOLAR_BASE_POLICY): ResolvedPolicyAssumptions {
  const band = sizeBand(capacityMwAc);
  const maximumLtc = band === "SMALLER" ? 0.65 : 0.70;
  const debtInterestRate = band === "SMALLER" ? 0.0725 : band === "MID" ? 0.065 : 0.058;
  const debtAmortizationYears = band === "SMALLER" ? 15 : band === "MID" ? 18 : 20;
  const closingCostsUsd = band === "SMALLER" ? 200_000 : band === "MID" ? 400_000 : 750_000;

  return {
    targetP50Dscr: policy.targetP50Dscr,
    maximumLtc,
    debtInterestRate,
    debtAmortizationYears,
    debtMaturityYears: debtAmortizationYears,
    dsraMonths: policy.dsraMonths,
    upfrontFeePercent: policy.lenderFeeRate,
    itcRate: policy.defaultItcRate,
    itcTransferPrice: policy.defaultItcTransferPrice,
    closingCostsUsd,
    overrides: [],
  };
}

export function resolvePolicyAssumptions(
  capacityMwAc: number,
  overrides: PolicyOverride[] = [],
  policy = ECOXCHANGE_SOLAR_BASE_POLICY,
): ResolvedPolicyAssumptions {
  const resolved = basePolicyAssumptions(capacityMwAc, policy);
  for (const override of overrides) {
    if (!(override.field in resolved)) continue;
    (resolved as unknown as Record<string, unknown>)[override.field] = override.overrideValue;
  }
  resolved.overrides = [...overrides];
  return resolved;
}

function rule(
  ruleId: string,
  status: RuleStatus,
  severity: Severity,
  actualValue: RuleResult["actualValue"],
  requiredValue: RuleResult["requiredValue"],
  message: string,
  source: RuleResult["source"],
  category: RiskCategory,
  options: { conditionToClear?: string; hardFail?: boolean } = {},
): RuleResult {
  return {
    ruleId,
    ruleVersion: "V1",
    status,
    severity,
    actualValue,
    requiredValue,
    message,
    conditionToClear: options.conditionToClear,
    source,
    category,
    hardFail: options.hardFail,
  };
}

function classifyDscrHeadroom(headroom: number | null): PolicyAssessment["dscrHeadroomClass"] {
  if (headroom == null) return "NOT_APPLICABLE";
  if (headroom < 0) return "FAIL";
  if (headroom < 0.05) return "THIN";
  if (headroom < 0.15) return "ADEQUATE";
  return "STRONG";
}

function classifyLeverage(debtToCapex: number, maxLtc: number): PolicyAssessment["leverageClass"] {
  if (debtToCapex > maxLtc + 1e-9) return "FAIL";
  if (debtToCapex < 0.30) return "LOW_LEVERAGE";
  if (debtToCapex < 0.50) return "MODERATE";
  return "HIGHER_BUT_POTENTIALLY_NORMAL";
}

function classifySponsorEquity(equityPct: number): PolicyAssessment["sponsorEquityClass"] {
  if (equityPct <= 0.25) return "CAPITAL_EFFICIENT";
  if (equityPct <= 0.40) return "MODERATE_EQUITY_REQUIREMENT";
  if (equityPct <= 0.60) return "HIGH_EQUITY_REQUIREMENT";
  return "VERY_HIGH_EQUITY_REQUIREMENT";
}

function buildLenderFit(projectSize: ProjectSizeClass, facts: UnderwritingFacts): LenderFitResult[] {
  const documentationStrong =
    facts.ppaDocumentationStatus === "EXECUTED" &&
    facts.interconnectionStatus === "FULLY_EXECUTED" &&
    (facts.epcStatus === "EXECUTED_FIXED_PRICE" || facts.epcStatus === "EXECUTED_CAPPED_PRICE") &&
    (facts.permitStatus === "COMPLETE" || facts.permitStatus === "SUBSTANTIALLY_COMPLETE");

  return [
    {
      category: "MONEY_CENTER_PROJECT_FINANCE_BANK",
      fit: projectSize === "UPPER_MIDSCALE" && documentationStrong ? "HIGH" : projectSize === "UPPER_MIDSCALE" ? "MEDIUM" : "LOW",
      rationale: projectSize === "UPPER_MIDSCALE"
        ? "15–20 MW scale can approach institutional project-finance execution if documentation and counterparties are strong."
        : "Smaller stand-alone projects generally face minimum-ticket and fixed diligence-cost friction.",
    },
    {
      category: "REGIONAL_SPECIALTY_ENERGY_BANK",
      fit: projectSize === "UPPER_MIDSCALE" ? "MEDIUM" : "HIGH",
      rationale: "Regional/specialty lenders are a strong fit for contracted 1–10 MW projects and remain relevant above that range.",
    },
    {
      category: "PRIVATE_CREDIT",
      fit: ["DEVELOPMENT", "CONSTRUCTION"].includes(facts.projectStage) || ["IN_QUEUE", "EARLY_STAGE"].includes(facts.interconnectionStatus) ? "MEDIUM" : "LOW",
      rationale: "Private credit is most useful where flexibility addresses development, bridge, construction, or bank-credit-box constraints rather than as default permanent capital.",
    },
    {
      category: "INSTITUTIONAL_PRIVATE_PLACEMENT",
      fit: projectSize === "UPPER_MIDSCALE" && facts.projectStage === "OPERATING" ? "MEDIUM" : "LOW",
      rationale: "Institutional private placement is generally better suited to larger operating assets or portfolios with long fixed-tenor needs.",
    },
    {
      category: "TAX_CREDIT_BRIDGE_LENDER",
      fit: facts.itcEligibilityStatus !== "UNKNOWN" && facts.taxCreditBuyerStatus === "COMMITTED" ? "HIGH" : facts.itcEligibilityStatus !== "UNKNOWN" ? "POTENTIAL" : "LOW",
      rationale: "Transferable-credit bridge financing is most attractive when tax eligibility is supportable and the buyer is committed.",
    },
    {
      category: "GREEN_BANK_CDFI",
      fit: projectSize === "SMALL" ? "POTENTIAL" : "LOW",
      rationale: "Green-bank/CDFI availability can be useful for smaller community-oriented assets but is jurisdiction- and program-specific.",
    },
  ];
}

function buildPreferredExecution(size: ProjectSizeClass, facts: UnderwritingFacts): string[] {
  if (size === "SMALL") {
    return ["REGIONAL_OR_PORTFOLIO_FINANCING", "TRANSFERRED_ITC", "SPONSOR_EQUITY", "PORTFOLIO_AGGREGATION_RECOMMENDED"];
  }
  if (size === "MID") {
    const result = ["REGIONAL_BANK_OR_SPECIALTY_ENERGY_BANK", "TRANSFERRED_ITC", "SPONSOR_EQUITY"];
    if (facts.sponsorTaxAppetiteStatus === "NONE" || facts.sponsorTaxAppetiteStatus === "PARTIAL") {
      result.push("TAX_EQUITY_ANALYSIS_RECOMMENDED");
    }
    return result;
  }
  return ["COMPETITIVE_PROJECT_FINANCE_PROCESS", "TRANSFERRED_ITC", "TERM_OR_MINI_PERM_EVALUATION", "SPONSOR_EQUITY"];
}

function readinessFromFacts(facts: UnderwritingFacts): FinancingReadiness {
  if (facts.projectStage === "OPERATING") return "OPERATING";
  const closingReady =
    facts.ppaDocumentationStatus === "EXECUTED" &&
    facts.interconnectionStatus === "FULLY_EXECUTED" &&
    (facts.permitStatus === "COMPLETE" || facts.permitStatus === "SUBSTANTIALLY_COMPLETE") &&
    (facts.epcStatus === "EXECUTED_FIXED_PRICE" || facts.epcStatus === "EXECUTED_CAPPED_PRICE") &&
    (facts.siteControlStatus === "OWNED" || facts.siteControlStatus === "LONG_TERM_LEASE_EXECUTED") &&
    facts.omStatus === "EXECUTED";
  if (closingReady) return "CLOSING_READY";
  if (facts.projectStage === "READY_TO_BUILD") return "FINANCING_READY";
  if (facts.ppaDocumentationStatus !== "NONE" && !["EARLY_STAGE", "UNKNOWN"].includes(facts.interconnectionStatus)) return "DEVELOPING";
  return "EARLY";
}

function financialBankabilityFromRules(rules: RuleResult[], dscrClass: PolicyAssessment["dscrHeadroomClass"], leverageClass: PolicyAssessment["leverageClass"]): FinancialBankability {
  if (rules.some((r) => r.hardFail && r.status === "FAIL")) return "UNFINANCEABLE_UNDER_POLICY";
  if (dscrClass === "FAIL" || leverageClass === "FAIL") return "UNFINANCEABLE_UNDER_POLICY";
  if (dscrClass === "THIN") return "THIN";
  if (dscrClass === "ADEQUATE" || leverageClass === "MODERATE") return "ACCEPTABLE";
  if (dscrClass === "STRONG") return "STRONG";
  return "WEAK";
}

function counterpartyRisk(status: OfftakerCreditStatus): CounterpartyRisk {
  if (status === "INVESTMENT_GRADE") return "STRONG";
  if (status === "STRONG_NON_RATED") return "MODERATE";
  if (status === "NON_INVESTMENT_GRADE") return "MATERIAL_RISK";
  return "UNKNOWN";
}

function taxCreditCertainty(status: ItcEligibilityStatus, itcRate: number): TaxCreditCertainty {
  if (itcRate <= 0) return "NOT_APPLICABLE";
  if (status === "VERIFIED") return "HIGH";
  if (status === "USER_ASSERTED") return "MODERATE";
  if (status === "PENDING_REVIEW") return "LOW";
  return "UNKNOWN";
}

function addRiskFromRule(r: RuleResult): RiskResult | null {
  if (["PASS", "INDICATIVE_PASS", "NOT_APPLICABLE"].includes(r.status)) return null;
  return {
    riskId: r.ruleId.replace(/_V1$/, ""),
    category: r.category,
    severity: r.severity,
    description: r.message,
    evidence: `Actual: ${String(r.actualValue)}; required/reference: ${String(r.requiredValue)}`,
    mitigation: r.conditionToClear ?? "Review and resolve before relying on the indicative underwriting conclusion.",
    status: r.status === "CONDITION" || r.status === "MISSING" ? "CONDITION" : "OPEN",
  };
}

export function evaluateUnderwritingPolicy(
  financeInput: ProjectFinanceInputs,
  financeResult: ProjectFinanceResult,
  facts: UnderwritingFacts,
  resolvedPolicy: ResolvedPolicyAssumptions,
  policy = ECOXCHANGE_SOLAR_BASE_POLICY,
): PolicyAssessment {
  const projectSize = classifyProjectSize(financeInput.capacityMwAc);
  const rules: RuleResult[] = [];
  const missingInputs: MissingInputResult[] = [];
  const conditions = new Set<string>();

  const inScope =
    facts.technology === "SOLAR_PV" &&
    facts.country.trim().toUpperCase() === "US" || facts.country.trim().toUpperCase() === "USA" || facts.country.trim().toUpperCase() === "UNITED STATES";

  if (!inScope || !facts.technologyProven || financeInput.capacityMwAc < 1 || financeInput.capacityMwAc > 20 || facts.revenueContractStatus !== "FULLY_CONTRACTED") {
    rules.push(rule(
      "SOLAR_POLICY_SCOPE_V1",
      "FAIL",
      "CRITICAL",
      `${facts.technology}/${facts.country}/${financeInput.capacityMwAc}MW/${facts.revenueContractStatus}`,
      "U.S. proven solar PV, 1–20 MW, fully contracted",
      "Project is outside the active EcoXchange Solar Base V0 policy scope.",
      "PROJECT_FACT",
      "DOCUMENTATION",
      { hardFail: true },
    ));
  } else {
    rules.push(rule("SOLAR_POLICY_SCOPE_V1", "PASS", "INFO", true, true, "Project is within the active V0 contracted-solar policy scope.", "PROJECT_FACT", "DOCUMENTATION"));
  }

  const registeredOverrideFields = new Set(resolvedPolicy.overrides.map((o) => o.field));
  const policyCalcPairs: Array<[PolicyOverride["field"], number, number]> = [
    ["targetP50Dscr", resolvedPolicy.targetP50Dscr, financeInput.targetP50Dscr],
    ["maximumLtc", resolvedPolicy.maximumLtc, financeInput.maximumLtc],
    ["debtInterestRate", resolvedPolicy.debtInterestRate, financeInput.debtInterestRate],
    ["debtAmortizationYears", resolvedPolicy.debtAmortizationYears, financeInput.debtAmortizationYears],
    ["dsraMonths", resolvedPolicy.dsraMonths, financeInput.dsraMonths],
    ["upfrontFeePercent", resolvedPolicy.upfrontFeePercent, financeInput.upfrontFeePercent],
    ["itcRate", resolvedPolicy.itcRate, financeInput.itcRate],
    ["itcTransferPrice", resolvedPolicy.itcTransferPrice, financeInput.itcTransferPrice],
  ];

  for (const [field, policyValue, calcValue] of policyCalcPairs) {
    if (Math.abs(policyValue - calcValue) > 1e-9 && !registeredOverrideFields.has(field)) {
      rules.push(rule(
        "POLICY_CALCULATION_MISMATCH_V1",
        "FAIL",
        "CRITICAL",
        `${field}=${calcValue}`,
        `${field}=${policyValue}`,
        `Calculation input ${field} does not match the underwriting policy and no registered override explains the difference.`,
        "SPEC_02_RESULT",
        "FINANCIAL",
        { hardFail: true },
      ));
    }
  }

  const minDscr = financeResult.financingSummary.minimumDscr;
  const dscrHeadroom = minDscr == null ? null : minDscr - resolvedPolicy.targetP50Dscr;
  rules.push(rule(
    "SOLAR_P50_DSCR_MINIMUM_V1",
    minDscr != null && minDscr + 1e-9 >= resolvedPolicy.targetP50Dscr ? "PASS" : "FAIL",
    minDscr != null && minDscr + 1e-9 >= resolvedPolicy.targetP50Dscr ? "INFO" : "CRITICAL",
    minDscr,
    resolvedPolicy.targetP50Dscr,
    minDscr != null && minDscr >= resolvedPolicy.targetP50Dscr
      ? "Modeled minimum DSCR meets the EcoXchange contracted-solar policy requirement."
      : "Modeled minimum DSCR is below the EcoXchange contracted-solar policy requirement.",
    "SPEC_02_RESULT",
    "FINANCIAL",
    { hardFail: minDscr == null || minDscr < resolvedPolicy.targetP50Dscr },
  ));

  const debtToCapex = financeResult.financingSummary.debtToCapex;
  rules.push(rule(
    "MAX_LTC_V1",
    debtToCapex <= resolvedPolicy.maximumLtc + 1e-9 ? "PASS" : "FAIL",
    debtToCapex <= resolvedPolicy.maximumLtc + 1e-9 ? "INFO" : "CRITICAL",
    debtToCapex,
    resolvedPolicy.maximumLtc,
    debtToCapex <= resolvedPolicy.maximumLtc + 1e-9 ? "Permanent debt is within the policy LTC ceiling." : "Permanent debt exceeds the policy LTC ceiling.",
    "SPEC_02_RESULT",
    "FINANCIAL",
    { hardFail: debtToCapex > resolvedPolicy.maximumLtc + 1e-9 },
  ));

  const contractTailYears = financeInput.ppaTermYears - financeInput.debtAmortizationYears;
  rules.push(rule(
    "PPA_COVERS_AMORTIZATION_V1",
    contractTailYears >= 0 ? "PASS" : "FAIL",
    contractTailYears >= 0 ? "INFO" : contractTailYears >= -2 ? "HIGH" : "CRITICAL",
    contractTailYears,
    0,
    contractTailYears >= 0 ? "PPA term covers the modeled debt amortization period." : "Debt amortization extends beyond the contracted PPA term.",
    "PROJECT_FACT",
    "REVENUE",
    { conditionToClear: "Align debt amortization with contracted revenue or provide lender-underwritten contracted tail/refinancing support.", hardFail: contractTailYears < -2 },
  ));

  rules.push(rule(
    "DSRA_MINIMUM_V1",
    financeInput.dsraMonths >= policy.dsraMonths ? "PASS" : "CONDITION",
    financeInput.dsraMonths >= policy.dsraMonths ? "INFO" : "MEDIUM",
    financeInput.dsraMonths,
    policy.dsraMonths,
    financeInput.dsraMonths >= policy.dsraMonths ? "DSRA assumption meets the base policy convention." : "DSRA assumption is below the base policy convention.",
    "PROJECT_FACT",
    "FINANCIAL",
    { conditionToClear: `Fund or otherwise support ${policy.dsraMonths} months of scheduled debt service, unless lender terms specify otherwise.` },
  ));

  if (facts.p90Source === "NONE") {
    rules.push(rule("P90_REPAYMENT_REQUIRED_V1", "MISSING", "HIGH", facts.p90Source, "Accepted downside/P90 case", "No downside/P90 production case is available.", "PROJECT_FACT", "PRODUCTION", { conditionToClear: "Provide an accepted downside case; lender-grade evidence requires an independent-engineer P90." }));
    conditions.add("Provide an accepted downside production case; lender-grade P90 evidence requires an independent-engineer report.");
  } else if (!financeResult.downsideResults) {
    rules.push(rule("P90_REPAYMENT_REQUIRED_V1", "MISSING", "HIGH", null, "Downside repayment result", "A downside source is identified but SPEC 02 did not return downside repayment results.", "SPEC_02_RESULT", "PRODUCTION", { conditionToClear: "Run the downside case through the financial engine." }));
  } else if (!financeResult.downsideResults.downsideFullRepayment) {
    rules.push(rule("P90_REPAYMENT_REQUIRED_V1", "FAIL", "CRITICAL", false, true, "The modeled downside cash-sweep case does not fully repay the loan.", "SPEC_02_RESULT", "PRODUCTION", { hardFail: true }));
  } else {
    const lenderGrade = facts.p90Source === "INDEPENDENT_ENGINEER_P90";
    rules.push(rule("P90_REPAYMENT_REQUIRED_V1", lenderGrade ? "PASS" : "INDICATIVE_PASS", lenderGrade ? "INFO" : "MEDIUM", true, true, lenderGrade ? "Independent-engineer P90 cash-sweep repayment test passes." : "Illustrative/user-supplied downside cash-sweep repayment test passes, but this is not lender-grade P90 evidence.", "SPEC_02_RESULT", "PRODUCTION", lenderGrade ? {} : { conditionToClear: "Obtain independent-engineer P50/P90 analysis." }));
    if (!lenderGrade) conditions.add("Obtain final independent-engineer P50/P90 analysis before describing the downside case as lender-grade.");
  }

  const itcMaterial = financeInput.itcRate > 0 && financeResult.taxCreditResult.netTransferProceedsUsd > 0;
  if (itcMaterial) {
    const itcPass = facts.itcEligibilityStatus === "VERIFIED";
    rules.push(rule(
      "ITC_ELIGIBILITY_STATUS_V1",
      itcPass ? "PASS" : facts.itcEligibilityStatus === "UNKNOWN" ? "MISSING" : "CONDITION",
      itcPass ? "INFO" : "HIGH",
      facts.itcEligibilityStatus,
      "VERIFIED",
      itcPass ? "Tax-credit eligibility is represented as verified." : "Tax-credit proceeds are material to sources and uses but eligibility is not verified.",
      "PROJECT_FACT",
      "TAX_CREDIT",
      { conditionToClear: "Confirm applicable 48E eligibility, basis, timing, and compliance through qualified tax diligence/counsel." },
    ));
    if (!itcPass) conditions.add("Confirm 48E eligibility and eligible basis through qualified tax diligence/counsel.");
  }

  rules.push(rule(
    "OFFTAKER_CREDIT_STATUS_V1",
    facts.offtakerCreditStatus === "INVESTMENT_GRADE" ? "PASS" : facts.offtakerCreditStatus === "UNKNOWN" ? "MISSING" : "REVIEW",
    facts.offtakerCreditStatus === "INVESTMENT_GRADE" ? "INFO" : facts.offtakerCreditStatus === "NON_INVESTMENT_GRADE" ? "HIGH" : "MEDIUM",
    facts.offtakerCreditStatus,
    "INVESTMENT_GRADE or lender-accepted equivalent",
    facts.offtakerCreditStatus === "UNKNOWN" ? "Offtaker credit quality is unknown." : "Offtaker credit quality requires lender-style review unless clearly investment grade.",
    "PROJECT_FACT",
    "COUNTERPARTY",
    { conditionToClear: "Document offtaker credit quality and any credit support acceptable to the proposed lender." },
  ));

  rules.push(rule(
    "PPA_EXECUTION_STATUS_V1",
    facts.ppaDocumentationStatus === "EXECUTED" ? "PASS" : facts.ppaDocumentationStatus === "UNKNOWN" ? "MISSING" : "CONDITION",
    facts.ppaDocumentationStatus === "EXECUTED" ? "INFO" : "HIGH",
    facts.ppaDocumentationStatus,
    "EXECUTED",
    facts.ppaDocumentationStatus === "EXECUTED" ? "PPA is represented as executed." : "PPA is not yet represented as fully executed.",
    "PROJECT_FACT",
    "REVENUE",
    { conditionToClear: "Execute the final PPA and complete lender review of assignment, termination, cure, and step-in provisions." },
  ));
  if (facts.ppaDocumentationStatus !== "EXECUTED") conditions.add("Execute the final PPA and complete lender review of material terms.");

  const interconnectionStatusMap: Record<InterconnectionStatus, RuleStatus> = {
    FULLY_EXECUTED: "PASS",
    APPROVED_PENDING_EXECUTION: "CONDITION",
    STUDY_COMPLETE: "REVIEW",
    IN_QUEUE: "REVIEW",
    EARLY_STAGE: "REVIEW",
    UNKNOWN: "MISSING",
  };
  rules.push(rule(
    "INTERCONNECTION_STATUS_V1",
    interconnectionStatusMap[facts.interconnectionStatus],
    facts.interconnectionStatus === "FULLY_EXECUTED" ? "INFO" : ["IN_QUEUE", "EARLY_STAGE"].includes(facts.interconnectionStatus) ? "HIGH" : "MEDIUM",
    facts.interconnectionStatus,
    "FULLY_EXECUTED",
    facts.interconnectionStatus === "FULLY_EXECUTED" ? "Interconnection is represented as fully executed." : "Interconnection remains a financing-readiness item.",
    "PROJECT_FACT",
    "INTERCONNECTION",
    { conditionToClear: "Obtain final interconnection rights and documentation acceptable to the lender." },
  ));
  if (facts.interconnectionStatus !== "FULLY_EXECUTED") conditions.add("Resolve interconnection to lender-acceptable final documentation.");

  const epcStrong = facts.epcStatus === "EXECUTED_FIXED_PRICE" || facts.epcStatus === "EXECUTED_CAPPED_PRICE";
  rules.push(rule("EPC_STATUS_V1", epcStrong ? "PASS" : facts.epcStatus === "UNKNOWN" ? "MISSING" : "CONDITION", epcStrong ? "INFO" : "HIGH", facts.epcStatus, "EXECUTED_FIXED_PRICE or EXECUTED_CAPPED_PRICE", epcStrong ? "EPC cost structure is represented as fixed or capped." : "EPC cost certainty is incomplete for lender-style construction underwriting.", "PROJECT_FACT", "CONSTRUCTION", { conditionToClear: "Execute lender-acceptable fixed/capped EPC terms with appropriate performance and delay protections." }));
  if (!epcStrong) conditions.add("Finalize lender-acceptable EPC pricing and performance/delay protections.");

  const permitsStrong = facts.permitStatus === "COMPLETE" || facts.permitStatus === "SUBSTANTIALLY_COMPLETE";
  rules.push(rule("PERMIT_STATUS_V1", permitsStrong ? "PASS" : facts.permitStatus === "UNKNOWN" ? "MISSING" : "CONDITION", permitsStrong ? "INFO" : "HIGH", facts.permitStatus, "COMPLETE or SUBSTANTIALLY_COMPLETE", permitsStrong ? "Permitting is represented as complete or substantially complete." : "Material permitting remains unresolved.", "PROJECT_FACT", "PERMITTING", { conditionToClear: "Complete or substantially complete all material permits required for financing/construction." }));

  const siteStrong = facts.siteControlStatus === "OWNED" || facts.siteControlStatus === "LONG_TERM_LEASE_EXECUTED";
  rules.push(rule("SITE_CONTROL_STATUS_V1", siteStrong ? "PASS" : facts.siteControlStatus === "UNKNOWN" ? "MISSING" : "CONDITION", siteStrong ? "INFO" : "HIGH", facts.siteControlStatus, "OWNED or LONG_TERM_LEASE_EXECUTED", siteStrong ? "Durable site control is represented as in place." : "Durable lender-style site control is incomplete.", "PROJECT_FACT", "DOCUMENTATION", { conditionToClear: "Establish durable site control through ownership or an executed lender-acceptable long-term lease." }));

  rules.push(rule("IE_REPORT_STATUS_V1", facts.ieStatus === "FINAL_REPORT" ? "PASS" : facts.ieStatus === "UNKNOWN" || facts.ieStatus === "NONE" ? "MISSING" : "CONDITION", facts.ieStatus === "FINAL_REPORT" ? "INFO" : "HIGH", facts.ieStatus, "FINAL_REPORT", facts.ieStatus === "FINAL_REPORT" ? "Final independent-engineer evidence is represented as available." : "Final independent-engineer evidence is incomplete.", "PROJECT_FACT", "PRODUCTION", { conditionToClear: "Obtain final independent-engineer report covering production and other lender-required technical diligence." }));

  rules.push(rule("SPONSOR_EXPERIENCE_V1", facts.sponsorExperience === "EXPERIENCED" ? "PASS" : facts.sponsorExperience === "UNKNOWN" ? "MISSING" : "REVIEW", facts.sponsorExperience === "FIRST_TIME" ? "MEDIUM" : "LOW", facts.sponsorExperience, "EXPERIENCED or lender-accepted support", "Sponsor experience is a lender consideration but first-time status is not an automatic rejection.", "PROJECT_FACT", "SPONSOR"));

  if (facts.omStatus !== "EXECUTED") conditions.add("Confirm a credible long-term O&M plan acceptable to the lender.");
  if (facts.insuranceStatus !== "CONFIRMED") conditions.add("Complete lender-required insurance review and confirmations.");

  if (projectSize === "SMALL") {
    rules.push(rule("SMALL_PROJECT_FIXED_COST_RISK_V1", "REVIEW", "MEDIUM", financeInput.capacityMwAc, ">=5 MW or portfolio aggregation", "Small stand-alone projects face disproportionate fixed diligence and closing costs; aggregation should be evaluated.", "ECOXCHANGE_POLICY", "FINANCIAL", { conditionToClear: "Compare stand-alone execution against portfolio/regional financing on total transaction cost." }));
  }

  const materialSources = facts.materialInputSources ?? {};
  for (const [name, sourceStrength] of Object.entries(materialSources)) {
    if (sourceStrength === "ECOXCHANGE_ASSUMPTION" || sourceStrength === "UNKNOWN") {
      rules.push(rule("MATERIAL_ASSUMPTION_DEPENDENCY_V1", "REVIEW", "MEDIUM", `${name}:${sourceStrength}`, "Documented fact / third-party evidence / lender quote", `A material underwriting input (${name}) depends on a policy assumption or unknown source.`, "PROJECT_FACT", "DOCUMENTATION", { conditionToClear: `Replace the ${name} assumption with stronger source evidence before lender reliance.` }));
    }
  }

  const underwritingFields: Array<[string, string, boolean]> = [
    ["offtakerCreditStatus", "Offtaker credit quality is required for lender-style assessment.", facts.offtakerCreditStatus === "UNKNOWN"],
    ["ppaDocumentationStatus", "PPA documentation status is required for lender-style assessment.", facts.ppaDocumentationStatus === "UNKNOWN"],
    ["interconnectionStatus", "Interconnection status is required for lender-style assessment.", facts.interconnectionStatus === "UNKNOWN"],
    ["permitStatus", "Permitting status is required for lender-style assessment.", facts.permitStatus === "UNKNOWN"],
    ["siteControlStatus", "Site-control status is required for lender-style assessment.", facts.siteControlStatus === "UNKNOWN"],
    ["ieStatus", "Independent-engineer status is required to assess production evidence quality.", facts.ieStatus === "UNKNOWN"],
  ];
  for (const [field, reason, isMissing] of underwritingFields) {
    if (isMissing) missingInputs.push({ field, importance: "UNDERWRITING_REQUIRED", reason, blocksCalculation: false, blocksCreditAssessment: true });
  }

  const risks = rules.map(addRiskFromRule).filter((r): r is RiskResult => r != null);
  const dscrClass = classifyDscrHeadroom(dscrHeadroom);
  const leverageClass = classifyLeverage(debtToCapex, resolvedPolicy.maximumLtc);
  const equityPct = financeResult.capitalStack.sponsorEquityPctTotalUses;
  const sponsorEquityClass = classifySponsorEquity(equityPct);
  const contractTailClass: PolicyAssessment["contractTailClass"] = contractTailYears >= 2 ? "STRONG" : contractTailYears >= 0 ? "ACCEPTABLE" : "WEAK";
  const financialBankability = financialBankabilityFromRules(rules, dscrClass, leverageClass);

  let status: AssessmentStatus;
  if (rules.some((r) => r.ruleId === "SOLAR_POLICY_SCOPE_V1" && r.status === "FAIL")) status = "OUT_OF_SCOPE";
  else if (rules.some((r) => r.hardFail && r.status === "FAIL")) status = "FAIL";
  else if (missingInputs.length > 0) status = "INSUFFICIENT_INFORMATION";
  else if (rules.some((r) => ["CONDITION", "MISSING", "INDICATIVE_PASS"].includes(r.status)) || conditions.size > 0) status = "PASS_WITH_CONDITIONS";
  else if (rules.some((r) => r.status === "REVIEW")) status = "REVIEW_REQUIRED";
  else status = "PASS";

  return {
    analysisType: "INDICATIVE_CREDIT_ASSESSMENT",
    policyId: policy.policyId,
    policyVersion: policy.policyVersion,
    status,
    projectSize,
    financialBankability,
    financingReadiness: readinessFromFacts(facts),
    counterpartyRisk: counterpartyRisk(facts.offtakerCreditStatus),
    taxCreditCertainty: taxCreditCertainty(facts.itcEligibilityStatus, financeInput.itcRate),
    bindingDebtConstraint: financeResult.financingSummary.bindingConstraint,
    dscrHeadroom,
    dscrHeadroomClass: dscrClass,
    contractTailYears,
    contractTailClass,
    leverageClass,
    sponsorEquityClass,
    preferredExecution: buildPreferredExecution(projectSize, facts),
    lenderFit: buildLenderFit(projectSize, facts),
    rules,
    risks,
    conditionsPrecedent: [...conditions],
    missingInputs,
    policyOverrides: [...resolvedPolicy.overrides],
  };
}

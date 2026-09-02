import type { ProjectFinanceInputs, ProjectFinanceResult } from "./core";

export const BASE_SOLAR_POLICY_ID = "ECOXCHANGE_SOLAR_BASE";
export const BASE_SOLAR_POLICY_VERSION = "0.1.0";

export type AssessmentStatus = "PASS" | "PASS_WITH_CONDITIONS" | "REVIEW_REQUIRED" | "FAIL" | "INSUFFICIENT_INFORMATION" | "OUT_OF_SCOPE";
export type RuleStatus = "PASS" | "INDICATIVE_PASS" | "CONDITION" | "REVIEW" | "FAIL" | "MISSING" | "NOT_APPLICABLE";
export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RiskCategory = "REVENUE" | "PRODUCTION" | "CONSTRUCTION" | "INTERCONNECTION" | "PERMITTING" | "COUNTERPARTY" | "SPONSOR" | "TAX_CREDIT" | "FINANCIAL" | "REFINANCING" | "DOCUMENTATION";
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
export type InputSourceStrength = "EXECUTED_DOCUMENT" | "INDEPENDENT_THIRD_PARTY_REPORT" | "LENDER_QUOTE" | "SPONSOR_DOCUMENT" | "USER_ASSERTION" | "ECOXCHANGE_ASSUMPTION" | "UNKNOWN";
export type ProjectSizeClass = "SMALL" | "MID" | "UPPER_MIDSCALE";
export type FinancialBankability = "STRONG" | "ACCEPTABLE" | "THIN" | "WEAK" | "UNFINANCEABLE_UNDER_POLICY";
export type FinancingReadiness = "EARLY" | "DEVELOPING" | "FINANCING_READY" | "CLOSING_READY" | "OPERATING";
export type CounterpartyRisk = "STRONG" | "MODERATE" | "MATERIAL_RISK" | "UNKNOWN";
export type TaxCreditCertainty = "HIGH" | "MODERATE" | "LOW" | "UNKNOWN" | "NOT_APPLICABLE";
export type LenderFit = "HIGH" | "MEDIUM" | "LOW" | "POTENTIAL";
export type LenderCategory = "MONEY_CENTER_PROJECT_FINANCE_BANK" | "REGIONAL_SPECIALTY_ENERGY_BANK" | "PRIVATE_CREDIT" | "INSTITUTIONAL_PRIVATE_PLACEMENT" | "TAX_CREDIT_BRIDGE_LENDER" | "GREEN_BANK_CDFI";

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
  technology: string;
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
  status: "OPEN" | "CONDITION";
}

export interface MissingInputResult {
  field: string;
  importance: "UNDERWRITING_REQUIRED";
  reason: string;
  blocksCalculation: false;
  blocksCreditAssessment: true;
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

export function resolvePolicyAssumptions(capacityMwAc: number, overrides: PolicyOverride[] = [], policy = ECOXCHANGE_SOLAR_BASE_POLICY): ResolvedPolicyAssumptions {
  const resolved = basePolicyAssumptions(capacityMwAc, policy);
  for (const override of overrides) {
    if (override.field === "targetP50Dscr") resolved.targetP50Dscr = override.overrideValue;
    else if (override.field === "maximumLtc") resolved.maximumLtc = override.overrideValue;
    else if (override.field === "debtInterestRate") resolved.debtInterestRate = override.overrideValue;
    else if (override.field === "debtAmortizationYears") resolved.debtAmortizationYears = override.overrideValue;
    else if (override.field === "debtMaturityYears") resolved.debtMaturityYears = override.overrideValue;
    else if (override.field === "dsraMonths") resolved.dsraMonths = override.overrideValue;
    else if (override.field === "upfrontFeePercent") resolved.upfrontFeePercent = override.overrideValue;
    else if (override.field === "itcRate") resolved.itcRate = override.overrideValue;
    else if (override.field === "itcTransferPrice") resolved.itcTransferPrice = override.overrideValue;
    else if (override.field === "closingCostsUsd") resolved.closingCostsUsd = override.overrideValue;
  }
  resolved.overrides = [...overrides];
  return resolved;
}

function makeRule(ruleId: string, status: RuleStatus, severity: Severity, actualValue: RuleResult["actualValue"], requiredValue: RuleResult["requiredValue"], message: string, source: RuleResult["source"], category: RiskCategory, conditionToClear?: string, hardFail = false): RuleResult {
  return { ruleId, ruleVersion: "V1", status, severity, actualValue, requiredValue, message, source, category, conditionToClear, hardFail };
}

function dscrHeadroomClass(value: number | null): PolicyAssessment["dscrHeadroomClass"] {
  if (value == null) return "NOT_APPLICABLE";
  if (value < 0) return "FAIL";
  if (value < 0.05) return "THIN";
  if (value < 0.15) return "ADEQUATE";
  return "STRONG";
}

function leverageClass(debtToCapex: number, maxLtc: number): PolicyAssessment["leverageClass"] {
  if (debtToCapex > maxLtc + 1e-9) return "FAIL";
  if (debtToCapex < 0.30) return "LOW_LEVERAGE";
  if (debtToCapex < 0.50) return "MODERATE";
  return "HIGHER_BUT_POTENTIALLY_NORMAL";
}

function sponsorEquityClass(value: number): PolicyAssessment["sponsorEquityClass"] {
  if (value <= 0.25) return "CAPITAL_EFFICIENT";
  if (value <= 0.40) return "MODERATE_EQUITY_REQUIREMENT";
  if (value <= 0.60) return "HIGH_EQUITY_REQUIREMENT";
  return "VERY_HIGH_EQUITY_REQUIREMENT";
}

function readiness(facts: UnderwritingFacts): FinancingReadiness {
  if (facts.projectStage === "OPERATING") return "OPERATING";
  const closingReady = facts.ppaDocumentationStatus === "EXECUTED" && facts.interconnectionStatus === "FULLY_EXECUTED" && ["COMPLETE", "SUBSTANTIALLY_COMPLETE"].includes(facts.permitStatus) && ["EXECUTED_FIXED_PRICE", "EXECUTED_CAPPED_PRICE"].includes(facts.epcStatus) && ["OWNED", "LONG_TERM_LEASE_EXECUTED"].includes(facts.siteControlStatus) && facts.omStatus === "EXECUTED";
  if (closingReady) return "CLOSING_READY";
  if (facts.projectStage === "READY_TO_BUILD") return "FINANCING_READY";
  if (facts.ppaDocumentationStatus !== "NONE" && !["EARLY_STAGE", "UNKNOWN"].includes(facts.interconnectionStatus)) return "DEVELOPING";
  return "EARLY";
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

function financialBankability(rules: RuleResult[], dscrClass: PolicyAssessment["dscrHeadroomClass"], levClass: PolicyAssessment["leverageClass"]): FinancialBankability {
  if (rules.some((r) => r.hardFail && r.status === "FAIL") || dscrClass === "FAIL" || levClass === "FAIL") return "UNFINANCEABLE_UNDER_POLICY";
  if (dscrClass === "THIN") return "THIN";
  if (dscrClass === "ADEQUATE" || levClass === "MODERATE") return "ACCEPTABLE";
  if (dscrClass === "STRONG") return "STRONG";
  return "WEAK";
}

function lenderFit(size: ProjectSizeClass, facts: UnderwritingFacts): LenderFitResult[] {
  const docsStrong = facts.ppaDocumentationStatus === "EXECUTED" && facts.interconnectionStatus === "FULLY_EXECUTED" && ["EXECUTED_FIXED_PRICE", "EXECUTED_CAPPED_PRICE"].includes(facts.epcStatus) && ["COMPLETE", "SUBSTANTIALLY_COMPLETE"].includes(facts.permitStatus);
  return [
    { category: "MONEY_CENTER_PROJECT_FINANCE_BANK", fit: size === "UPPER_MIDSCALE" && docsStrong ? "HIGH" : size === "UPPER_MIDSCALE" ? "MEDIUM" : "LOW", rationale: size === "UPPER_MIDSCALE" ? "15–20 MW scale can approach institutional project-finance execution if documentation and counterparties are strong." : "Smaller stand-alone projects face minimum-ticket and fixed diligence-cost friction." },
    { category: "REGIONAL_SPECIALTY_ENERGY_BANK", fit: size === "UPPER_MIDSCALE" ? "MEDIUM" : "HIGH", rationale: "Regional/specialty lenders are a strong fit for contracted small and midsize solar projects." },
    { category: "PRIVATE_CREDIT", fit: facts.projectStage === "DEVELOPMENT" || facts.projectStage === "CONSTRUCTION" || ["IN_QUEUE", "EARLY_STAGE"].includes(facts.interconnectionStatus) ? "MEDIUM" : "LOW", rationale: "Private credit is most useful where flexibility solves a development, bridge, construction, or bank-credit-box problem." },
    { category: "INSTITUTIONAL_PRIVATE_PLACEMENT", fit: size === "UPPER_MIDSCALE" && facts.projectStage === "OPERATING" ? "MEDIUM" : "LOW", rationale: "Institutional private placement is generally better suited to larger operating assets or portfolios." },
    { category: "TAX_CREDIT_BRIDGE_LENDER", fit: facts.itcEligibilityStatus !== "UNKNOWN" && facts.taxCreditBuyerStatus === "COMMITTED" ? "HIGH" : facts.itcEligibilityStatus !== "UNKNOWN" ? "POTENTIAL" : "LOW", rationale: "Tax-credit bridge execution is strongest when tax eligibility is supportable and the buyer is committed." },
    { category: "GREEN_BANK_CDFI", fit: size === "SMALL" ? "POTENTIAL" : "LOW", rationale: "Green-bank/CDFI relevance is strongest for smaller community-oriented assets and remains program-specific." },
  ];
}

function preferredExecution(size: ProjectSizeClass, facts: UnderwritingFacts): string[] {
  if (size === "SMALL") return ["REGIONAL_OR_PORTFOLIO_FINANCING", "TRANSFERRED_ITC", "SPONSOR_EQUITY", "PORTFOLIO_AGGREGATION_RECOMMENDED"];
  if (size === "MID") {
    const items = ["REGIONAL_BANK_OR_SPECIALTY_ENERGY_BANK", "TRANSFERRED_ITC", "SPONSOR_EQUITY"];
    if (["NONE", "PARTIAL"].includes(facts.sponsorTaxAppetiteStatus)) items.push("TAX_EQUITY_ANALYSIS_RECOMMENDED");
    return items;
  }
  return ["COMPETITIVE_PROJECT_FINANCE_PROCESS", "TRANSFERRED_ITC", "TERM_OR_MINI_PERM_EVALUATION", "SPONSOR_EQUITY"];
}

function riskFromRule(rule: RuleResult): RiskResult | null {
  if (["PASS", "INDICATIVE_PASS", "NOT_APPLICABLE"].includes(rule.status)) return null;
  return {
    riskId: rule.ruleId.replace(/_V1$/, ""),
    category: rule.category,
    severity: rule.severity,
    description: rule.message,
    evidence: `Actual=${String(rule.actualValue)}; required/reference=${String(rule.requiredValue)}`,
    mitigation: rule.conditionToClear ?? "Review and resolve before relying on the indicative underwriting conclusion.",
    status: ["CONDITION", "MISSING"].includes(rule.status) ? "CONDITION" : "OPEN",
  };
}

export function evaluateUnderwritingPolicy(financeInput: ProjectFinanceInputs, financeResult: ProjectFinanceResult, facts: UnderwritingFacts, resolvedPolicy: ResolvedPolicyAssumptions, policy = ECOXCHANGE_SOLAR_BASE_POLICY): PolicyAssessment {
  const rules: RuleResult[] = [];
  const missingInputs: MissingInputResult[] = [];
  const conditions = new Set<string>();
  const size = classifyProjectSize(financeInput.capacityMwAc);
  const country = facts.country.trim().toUpperCase();
  const countrySupported = country === "US" || country === "USA" || country === "UNITED STATES";
  const scopePass = facts.technology === "SOLAR_PV" && countrySupported && facts.technologyProven && financeInput.capacityMwAc >= 1 && financeInput.capacityMwAc <= 20 && facts.revenueContractStatus === "FULLY_CONTRACTED" && facts.projectCoStructure;

  rules.push(makeRule("SOLAR_POLICY_SCOPE_V1", scopePass ? "PASS" : "FAIL", scopePass ? "INFO" : "CRITICAL", `${facts.technology}/${facts.country}/${financeInput.capacityMwAc}/${facts.revenueContractStatus}`, "U.S. proven solar PV, 1–20 MW, fully contracted, ProjectCo", scopePass ? "Project is within the active V0 policy scope." : "Project is outside the active V0 contracted-solar policy scope.", "PROJECT_FACT", "DOCUMENTATION", undefined, !scopePass));

  const overrideFields = new Set(resolvedPolicy.overrides.map((o) => o.field));
  const comparisons: Array<[PolicyOverride["field"], number, number]> = [
    ["targetP50Dscr", resolvedPolicy.targetP50Dscr, financeInput.targetP50Dscr],
    ["maximumLtc", resolvedPolicy.maximumLtc, financeInput.maximumLtc],
    ["debtInterestRate", resolvedPolicy.debtInterestRate, financeInput.debtInterestRate],
    ["debtAmortizationYears", resolvedPolicy.debtAmortizationYears, financeInput.debtAmortizationYears],
    ["debtMaturityYears", resolvedPolicy.debtMaturityYears, financeInput.debtMaturityYears ?? financeInput.debtAmortizationYears],
    ["dsraMonths", resolvedPolicy.dsraMonths, financeInput.dsraMonths],
    ["upfrontFeePercent", resolvedPolicy.upfrontFeePercent, financeInput.upfrontFeePercent],
    ["itcRate", resolvedPolicy.itcRate, financeInput.itcRate],
    ["itcTransferPrice", resolvedPolicy.itcTransferPrice, financeInput.itcTransferPrice],
    ["closingCostsUsd", resolvedPolicy.closingCostsUsd, financeInput.closingCostsUsd ?? 0],
  ];
  for (const [field, expected, actual] of comparisons) {
    if (Math.abs(expected - actual) > 1e-9 && !overrideFields.has(field)) {
      rules.push(makeRule("POLICY_CALCULATION_MISMATCH_V1", "FAIL", "CRITICAL", `${field}=${actual}`, `${field}=${expected}`, `Calculation input ${field} does not match policy and no registered override explains the difference.`, "SPEC_02_RESULT", "FINANCIAL", undefined, true));
    }
  }

  const minDscr = financeResult.financingSummary.minimumDscr;
  const headroom = minDscr == null ? null : minDscr - resolvedPolicy.targetP50Dscr;
  const dscrPass = minDscr != null && minDscr + 1e-9 >= resolvedPolicy.targetP50Dscr;
  rules.push(makeRule("SOLAR_P50_DSCR_MINIMUM_V1", dscrPass ? "PASS" : "FAIL", dscrPass ? "INFO" : "CRITICAL", minDscr, resolvedPolicy.targetP50Dscr, dscrPass ? "Modeled minimum DSCR meets the contracted-solar policy requirement." : "Modeled minimum DSCR is below policy requirement.", "SPEC_02_RESULT", "FINANCIAL", undefined, !dscrPass));

  const debtToCapex = financeResult.financingSummary.debtToCapex;
  const ltcPass = debtToCapex <= resolvedPolicy.maximumLtc + 1e-9;
  rules.push(makeRule("MAX_LTC_V1", ltcPass ? "PASS" : "FAIL", ltcPass ? "INFO" : "CRITICAL", debtToCapex, resolvedPolicy.maximumLtc, ltcPass ? "Permanent debt is within the policy LTC ceiling." : "Permanent debt exceeds the policy LTC ceiling.", "SPEC_02_RESULT", "FINANCIAL", undefined, !ltcPass));

  const contractTailYears = financeInput.ppaTermYears - financeInput.debtAmortizationYears;
  const ppaCovers = contractTailYears >= 0;
  rules.push(makeRule("PPA_COVERS_AMORTIZATION_V1", ppaCovers ? "PASS" : "CONDITION", ppaCovers ? "INFO" : contractTailYears < -2 ? "CRITICAL" : "HIGH", contractTailYears, 0, ppaCovers ? "PPA term covers modeled debt amortization." : "Debt amortization extends beyond contracted PPA revenue.", "PROJECT_FACT", "REVENUE", "Align amortization with contracted revenue or provide lender-underwritten tail/refinancing support.", contractTailYears < -2));
  if (!ppaCovers) conditions.add("Align debt amortization with contracted revenue or provide lender-underwritten tail/refinancing support.");

  const dsraPass = financeInput.dsraMonths >= policy.dsraMonths;
  rules.push(makeRule("DSRA_MINIMUM_V1", dsraPass ? "PASS" : "CONDITION", dsraPass ? "INFO" : "MEDIUM", financeInput.dsraMonths, policy.dsraMonths, dsraPass ? "DSRA assumption meets the base policy convention." : "DSRA assumption is below the base policy convention.", "PROJECT_FACT", "FINANCIAL", `Support ${policy.dsraMonths} months of scheduled debt service unless lender terms specify otherwise.`));

  if (facts.p90Source === "NONE") {
    rules.push(makeRule("P90_REPAYMENT_REQUIRED_V1", "MISSING", "HIGH", "NONE", "Accepted downside/P90 case", "No downside/P90 production case is available.", "PROJECT_FACT", "PRODUCTION", "Provide an accepted downside case; lender-grade evidence requires an independent-engineer P90."));
    conditions.add("Provide an accepted downside production case; lender-grade evidence requires an independent-engineer report.");
  } else if (financeResult.downsideResults == null) {
    rules.push(makeRule("P90_REPAYMENT_REQUIRED_V1", "MISSING", "HIGH", null, "SPEC 02 downside result", "A downside source is identified but the financial engine returned no downside result.", "SPEC_02_RESULT", "PRODUCTION", "Run the downside case through SPEC 02."));
  } else if (!financeResult.downsideResults.cashSweep.downsideFullRepayment) {
    rules.push(makeRule("P90_REPAYMENT_REQUIRED_V1", "FAIL", "CRITICAL", false, true, "The modeled downside cash-sweep case does not fully repay the loan.", "SPEC_02_RESULT", "PRODUCTION", undefined, true));
  } else {
    const lenderGrade = facts.p90Source === "INDEPENDENT_ENGINEER_P90";
    rules.push(makeRule("P90_REPAYMENT_REQUIRED_V1", lenderGrade ? "PASS" : "INDICATIVE_PASS", lenderGrade ? "INFO" : "MEDIUM", true, true, lenderGrade ? "Independent-engineer P90 cash-sweep repayment test passes." : "Illustrative/user-supplied downside repayment test passes but is not lender-grade P90 evidence.", "SPEC_02_RESULT", "PRODUCTION", lenderGrade ? undefined : "Obtain final independent-engineer P50/P90 analysis."));
    if (!lenderGrade) conditions.add("Obtain final independent-engineer P50/P90 analysis before describing the downside case as lender-grade.");
  }

  const itcMaterial = financeInput.itcRate > 0 && financeResult.taxCreditResult.netTransferProceedsUsd > 0;
  if (itcMaterial) {
    const verified = facts.itcEligibilityStatus === "VERIFIED";
    rules.push(makeRule("ITC_ELIGIBILITY_STATUS_V1", verified ? "PASS" : facts.itcEligibilityStatus === "UNKNOWN" ? "MISSING" : "CONDITION", verified ? "INFO" : "HIGH", facts.itcEligibilityStatus, "VERIFIED", verified ? "Tax-credit eligibility is represented as verified." : "Tax-credit proceeds are material to sources and uses but eligibility is not verified.", "PROJECT_FACT", "TAX_CREDIT", "Confirm applicable 48E eligibility, basis, timing, and compliance through qualified tax diligence/counsel."));
    if (!verified) conditions.add("Confirm 48E eligibility and eligible basis through qualified tax diligence/counsel.");
  }

  const offtakerStatus: RuleStatus = facts.offtakerCreditStatus === "INVESTMENT_GRADE" ? "PASS" : facts.offtakerCreditStatus === "UNKNOWN" ? "MISSING" : "REVIEW";
  rules.push(makeRule("OFFTAKER_CREDIT_STATUS_V1", offtakerStatus, facts.offtakerCreditStatus === "NON_INVESTMENT_GRADE" ? "HIGH" : offtakerStatus === "PASS" ? "INFO" : "MEDIUM", facts.offtakerCreditStatus, "INVESTMENT_GRADE or lender-accepted equivalent", facts.offtakerCreditStatus === "UNKNOWN" ? "Offtaker credit quality is unknown." : "Offtaker quality requires lender review unless clearly investment grade.", "PROJECT_FACT", "COUNTERPARTY", "Document offtaker credit quality and any credit support acceptable to the proposed lender."));

  const ppaExecuted = facts.ppaDocumentationStatus === "EXECUTED";
  rules.push(makeRule("PPA_EXECUTION_STATUS_V1", ppaExecuted ? "PASS" : facts.ppaDocumentationStatus === "UNKNOWN" ? "MISSING" : "CONDITION", ppaExecuted ? "INFO" : "HIGH", facts.ppaDocumentationStatus, "EXECUTED", ppaExecuted ? "PPA is represented as executed." : "PPA is not yet represented as fully executed.", "PROJECT_FACT", "REVENUE", "Execute the final PPA and complete lender review of assignment, termination, cure, and step-in provisions."));
  if (!ppaExecuted) conditions.add("Execute the final PPA and complete lender review of material terms.");

  const interconnectionPass = facts.interconnectionStatus === "FULLY_EXECUTED";
  const interconnectionRuleStatus: RuleStatus = interconnectionPass ? "PASS" : facts.interconnectionStatus === "UNKNOWN" ? "MISSING" : facts.interconnectionStatus === "APPROVED_PENDING_EXECUTION" ? "CONDITION" : "REVIEW";
  rules.push(makeRule("INTERCONNECTION_STATUS_V1", interconnectionRuleStatus, interconnectionPass ? "INFO" : ["IN_QUEUE", "EARLY_STAGE"].includes(facts.interconnectionStatus) ? "HIGH" : "MEDIUM", facts.interconnectionStatus, "FULLY_EXECUTED", interconnectionPass ? "Interconnection is represented as fully executed." : "Interconnection remains a financing-readiness item.", "PROJECT_FACT", "INTERCONNECTION", "Obtain final interconnection rights and documentation acceptable to the lender."));
  if (!interconnectionPass) conditions.add("Resolve interconnection to lender-acceptable final documentation.");

  const epcStrong = ["EXECUTED_FIXED_PRICE", "EXECUTED_CAPPED_PRICE"].includes(facts.epcStatus);
  rules.push(makeRule("EPC_STATUS_V1", epcStrong ? "PASS" : facts.epcStatus === "UNKNOWN" ? "MISSING" : "CONDITION", epcStrong ? "INFO" : "HIGH", facts.epcStatus, "EXECUTED_FIXED_PRICE or EXECUTED_CAPPED_PRICE", epcStrong ? "EPC cost structure is represented as fixed or capped." : "EPC cost certainty is incomplete.", "PROJECT_FACT", "CONSTRUCTION", "Execute lender-acceptable fixed/capped EPC terms with appropriate performance and delay protections."));
  if (!epcStrong) conditions.add("Finalize lender-acceptable EPC pricing and performance/delay protections.");

  const permitsStrong = ["COMPLETE", "SUBSTANTIALLY_COMPLETE"].includes(facts.permitStatus);
  rules.push(makeRule("PERMIT_STATUS_V1", permitsStrong ? "PASS" : facts.permitStatus === "UNKNOWN" ? "MISSING" : "CONDITION", permitsStrong ? "INFO" : "HIGH", facts.permitStatus, "COMPLETE or SUBSTANTIALLY_COMPLETE", permitsStrong ? "Permitting is represented as complete or substantially complete." : "Material permitting remains unresolved.", "PROJECT_FACT", "PERMITTING", "Complete or substantially complete all material permits required for financing/construction."));

  const siteStrong = ["OWNED", "LONG_TERM_LEASE_EXECUTED"].includes(facts.siteControlStatus);
  rules.push(makeRule("SITE_CONTROL_STATUS_V1", siteStrong ? "PASS" : facts.siteControlStatus === "UNKNOWN" ? "MISSING" : "CONDITION", siteStrong ? "INFO" : "HIGH", facts.siteControlStatus, "OWNED or LONG_TERM_LEASE_EXECUTED", siteStrong ? "Durable site control is represented as in place." : "Durable lender-style site control is incomplete.", "PROJECT_FACT", "DOCUMENTATION", "Establish durable site control through ownership or an executed lender-acceptable long-term lease."));

  const ieFinal = facts.ieStatus === "FINAL_REPORT";
  rules.push(makeRule("IE_REPORT_STATUS_V1", ieFinal ? "PASS" : facts.ieStatus === "UNKNOWN" || facts.ieStatus === "NONE" ? "MISSING" : "CONDITION", ieFinal ? "INFO" : "HIGH", facts.ieStatus, "FINAL_REPORT", ieFinal ? "Final independent-engineer evidence is represented as available." : "Final independent-engineer evidence is incomplete.", "PROJECT_FACT", "PRODUCTION", "Obtain final independent-engineer report covering production and lender-required technical diligence."));

  rules.push(makeRule("SPONSOR_EXPERIENCE_V1", facts.sponsorExperience === "EXPERIENCED" ? "PASS" : facts.sponsorExperience === "UNKNOWN" ? "MISSING" : "REVIEW", facts.sponsorExperience === "FIRST_TIME" ? "MEDIUM" : "LOW", facts.sponsorExperience, "EXPERIENCED or lender-accepted support", "Sponsor experience is a lender consideration but first-time status is not an automatic rejection.", "PROJECT_FACT", "SPONSOR"));

  if (facts.omStatus !== "EXECUTED") conditions.add("Confirm a credible long-term O&M plan acceptable to the lender.");
  if (facts.insuranceStatus !== "CONFIRMED") conditions.add("Complete lender-required insurance review and confirmations.");

  if (size === "SMALL") rules.push(makeRule("SMALL_PROJECT_FIXED_COST_RISK_V1", "REVIEW", "MEDIUM", financeInput.capacityMwAc, ">=5 MW or portfolio aggregation", "Small stand-alone projects face disproportionate fixed diligence and closing costs; aggregation should be evaluated.", "ECOXCHANGE_POLICY", "FINANCIAL", "Compare stand-alone execution against portfolio/regional financing on total transaction cost."));

  for (const [field, sourceStrength] of Object.entries(facts.materialInputSources ?? {})) {
    if (sourceStrength === "ECOXCHANGE_ASSUMPTION" || sourceStrength === "UNKNOWN") {
      rules.push(makeRule("MATERIAL_ASSUMPTION_DEPENDENCY_V1", "REVIEW", "MEDIUM", `${field}:${sourceStrength}`, "Documented fact / third-party evidence / lender quote", `A material underwriting input (${field}) depends on a policy assumption or unknown source.`, "PROJECT_FACT", "DOCUMENTATION", `Replace the ${field} assumption with stronger source evidence before lender reliance.`));
    }
  }

  const missingCandidates: Array<[string, boolean, string]> = [
    ["offtakerCreditStatus", facts.offtakerCreditStatus === "UNKNOWN", "Offtaker credit quality is required for lender-style assessment."],
    ["ppaDocumentationStatus", facts.ppaDocumentationStatus === "UNKNOWN", "PPA documentation status is required for lender-style assessment."],
    ["interconnectionStatus", facts.interconnectionStatus === "UNKNOWN", "Interconnection status is required for lender-style assessment."],
    ["permitStatus", facts.permitStatus === "UNKNOWN", "Permitting status is required for lender-style assessment."],
    ["siteControlStatus", facts.siteControlStatus === "UNKNOWN", "Site-control status is required for lender-style assessment."],
    ["ieStatus", facts.ieStatus === "UNKNOWN", "Independent-engineer status is required to assess production evidence quality."],
  ];
  for (const [field, missing, reason] of missingCandidates) {
    if (missing) missingInputs.push({ field, importance: "UNDERWRITING_REQUIRED", reason, blocksCalculation: false, blocksCreditAssessment: true });
  }

  const dscrClass = dscrHeadroomClass(headroom);
  const levClass = leverageClass(debtToCapex, resolvedPolicy.maximumLtc);
  const equityClass = sponsorEquityClass(financeResult.capitalStack.sponsorEquityPctTotalUses);
  const contractTailClass: PolicyAssessment["contractTailClass"] = contractTailYears >= 2 ? "STRONG" : contractTailYears >= 0 ? "ACCEPTABLE" : "WEAK";
  const risks = rules.map(riskFromRule).filter((r): r is RiskResult => r !== null);

  let status: AssessmentStatus;
  if (!scopePass) status = "OUT_OF_SCOPE";
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
    projectSize: size,
    financialBankability: financialBankability(rules, dscrClass, levClass),
    financingReadiness: readiness(facts),
    counterpartyRisk: counterpartyRisk(facts.offtakerCreditStatus),
    taxCreditCertainty: taxCreditCertainty(facts.itcEligibilityStatus, financeInput.itcRate),
    bindingDebtConstraint: financeResult.financingSummary.bindingConstraint,
    dscrHeadroom: headroom,
    dscrHeadroomClass: dscrClass,
    contractTailYears,
    contractTailClass,
    leverageClass: levClass,
    sponsorEquityClass: equityClass,
    preferredExecution: preferredExecution(size, facts),
    lenderFit: lenderFit(size, facts),
    rules,
    risks,
    conditionsPrecedent: [...conditions],
    missingInputs,
    policyOverrides: [...resolvedPolicy.overrides],
  };
}

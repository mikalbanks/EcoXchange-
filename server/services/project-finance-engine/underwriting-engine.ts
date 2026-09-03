export type OverallStatus = "PASS" | "PASS_WITH_CONDITIONS" | "REVIEW_REQUIRED" | "FAIL" | "INSUFFICIENT_INFORMATION" | "OUT_OF_SCOPE";
export type RuleStatus = "PASS" | "PASS_WITH_CONDITION" | "FAIL" | "REVIEW" | "INSUFFICIENT_INFORMATION" | "NOT_APPLICABLE" | "INDICATIVE_PASS";
export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FinancialProfile = "STRONG" | "ACCEPTABLE" | "THIN" | "WEAK" | "UNFINANCEABLE_UNDER_POLICY";
export type FinancingReadiness = "EARLY" | "DEVELOPING" | "FINANCING_READY" | "CLOSING_READY" | "OPERATING";
export type ProjectSizeClass = "SMALL" | "MID" | "UPPER_MIDSCALE";
export type LenderCategory = "MONEY_CENTER_PROJECT_FINANCE" | "REGIONAL_SPECIALTY_ENERGY_BANK" | "PRIVATE_CREDIT" | "INSTITUTIONAL_PLACEMENT" | "ITC_BRIDGE" | "GREEN_BANK_CDFI";
export type LenderFit = "HIGH" | "MODERATE" | "LOW" | "NOT_APPLICABLE";
export type RiskCategory = "REVENUE" | "PRODUCTION" | "CONSTRUCTION" | "INTERCONNECTION" | "PERMITTING" | "COUNTERPARTY" | "SPONSOR" | "TAX_CREDIT" | "FINANCIAL" | "REFINANCING" | "DOCUMENTATION";
export type SourceStrength = "EXECUTED_DOCUMENT" | "INDEPENDENT_THIRD_PARTY_REPORT" | "LENDER_QUOTE" | "SPONSOR_DOCUMENT" | "USER_ASSERTION" | "ECOXCHANGE_ASSUMPTION" | "UNKNOWN";

export interface UnderwritingPolicyV1 {
  policyCode: string;
  policyVersion: string;
  status: "ACTIVE" | "RETIRED" | "DRAFT";
  targetP50Dscr: number;
  ltcBands: Array<{ minMw: number; maxMwExclusive: number | null; maxLtc: number }>;
  dsraMonths: number;
  merchantWarningPct: number;
  merchantSeverePct: number;
  closingCostRanges: Array<{ minMw: number; maxMwExclusive: number | null; minUsd: number; maxUsd: number }>;
  contingencyPct: number;
  committedItcBridgeAdvance: number;
  uncommittedItcBridgeAdvance: number;
}

export interface FinanceResultForUnderwriting {
  calculationRunId: string;
  calculationEngineVersion: string;
  permanentDebt: number;
  debtToCapex: number;
  minimumDscr: number | null;
  bindingConstraint: string;
  balloonBalance: number;
  openingPermanentDebt: number;
  sponsorEquityPctTotalUses: number;
  simplifiedAfterTaxIrr: number | null;
  taxModuleEnabled: boolean;
  itcRate: number;
  itcProceeds: number;
  downside?: {
    generationSourceType: "INDEPENDENT_ENGINEER_P90" | "USER_SUPPLIED_P90" | "ILLUSTRATIVE_PERCENT_OF_P50" | "NONE";
    fullRepayment: boolean | null;
    interestShortfall: boolean;
    minimumDownsideDscr: number | null;
  };
  reconciliation: { debtReconciled: boolean; sourcesUsesReconciled: boolean };
  calculationAssumptions: {
    targetP50Dscr: number;
    maxLtc: number;
    dsraMonths: number;
    amortizationYears: number;
  };
}

export interface UnderwritingFactsV1 {
  technology: string;
  capacityMwAc: number;
  countryCode: string;
  revenueStructure: "FULLY_CONTRACTED" | "PARTIALLY_CONTRACTED" | "MERCHANT" | "UNKNOWN";
  projectStage: "DEVELOPMENT" | "READY_TO_BUILD" | "CONSTRUCTION" | "OPERATING";
  ppaTermYears: number;
  ppaStatus: "EXECUTED" | "AWARDED_NOT_EXECUTED" | "TERM_SHEET" | "NEGOTIATION" | "NONE" | "UNKNOWN";
  offtakerCredit: "INVESTMENT_GRADE" | "STRONG_NON_RATED" | "NON_INVESTMENT_GRADE" | "UNKNOWN";
  itcEligibility: "VERIFIED" | "USER_ASSERTED" | "PENDING_REVIEW" | "UNKNOWN";
  itcBuyerStatus: "COMMITTED" | "IDENTIFIED_NOT_COMMITTED" | "UNIDENTIFIED" | "NOT_APPLICABLE";
  sponsorTaxAppetite: "CONFIRMED" | "PARTIAL" | "NONE" | "UNKNOWN";
  epcStatus: "EXECUTED" | "NEGOTIATING" | "TERM_SHEET" | "NONE" | "UNKNOWN";
  epcPriceStructure?: "FIXED" | "CAPPED" | "OTHER" | "UNKNOWN";
  contractorQuality?: "STRONG" | "ADEQUATE" | "LIMITED" | "UNKNOWN";
  performanceGuarantee?: boolean | null;
  liquidatedDamages?: boolean | null;
  interconnectionStatus: "FULLY_EXECUTED" | "APPROVED_PENDING_EXECUTION" | "STUDY_COMPLETE" | "IN_QUEUE" | "EARLY_STAGE" | "UNKNOWN";
  permitsStatus: "COMPLETE" | "MATERIAL_PERMITS_PENDING" | "EARLY" | "UNKNOWN";
  siteControlStatus: "SECURED" | "CONDITIONAL" | "NEGOTIATING" | "NONE" | "UNKNOWN";
  omStatus: "EXECUTED" | "IDENTIFIED" | "NOT_ESTABLISHED" | "UNKNOWN";
  insuranceStatus: "CONFIRMED" | "QUOTE_RECEIVED" | "PENDING" | "UNKNOWN";
  independentEngineerStatus: "FINAL" | "DRAFT" | "NOT_ENGAGED" | "UNKNOWN";
  sponsorExperience: "STRONG" | "ADEQUATE" | "LIMITED" | "UNKNOWN";
  completionSupport?: "CONFIRMED" | "PARTIAL" | "NONE" | "UNKNOWN";
  costOverrunSupport?: "CONFIRMED" | "PARTIAL" | "NONE" | "UNKNOWN";
  equityCommitment?: "CONFIRMED" | "PARTIAL" | "NONE" | "UNKNOWN";
  dsraMonthsActual: number;
  closingCostsUsd?: number | null;
  capexIncludesContingency?: boolean | null;
  contingencyPctActual?: number | null;
  sourceStrength?: Partial<Record<string, SourceStrength>>;
}

export interface PolicyOverrideV1 { fieldKey: "targetP50Dscr" | "maxLtc" | "dsraMonths"; originalValue: number; effectiveValue: number; reason: string; source: "LENDER_QUOTE" | "USER_ASSERTION" | "OTHER"; }
export interface RuleResultV1 { rule_id: string; rule_version: "1.0.0"; category: RiskCategory; status: RuleStatus; severity: Severity; actual_value: unknown; required_value: unknown; message: string; condition?: string; source_reference: string; metadata?: Record<string, unknown>; }
export interface RiskV1 { risk_code: string; category: RiskCategory; severity: Severity; title: string; description: string; source_rule_id: string; }
export interface ConditionV1 { condition_code: string; severity: Severity; title: string; description: string; source_rule_id: string; status: "OPEN"; }
export interface MissingInformationV1 { field_key: string; reason: string; required_for: "UNDERWRITING" | "LENDER_READINESS"; severity: Severity; }
export interface LenderFitV1 { lender_category: LenderCategory; fit: LenderFit; reason_codes: string[]; }
export interface UnderwritingResultV1 { analysis_type: "INDICATIVE_UNDERWRITING"; status: OverallStatus; financial_profile: FinancialProfile; financing_readiness: FinancingReadiness; project_size: ProjectSizeClass; rule_results: RuleResultV1[]; risks: RiskV1[]; conditions: ConditionV1[]; missing_information: MissingInformationV1[]; lender_fit: LenderFitV1[]; recommendations: string[]; summary_metadata: { policy_code: string; policy_version: string; calculation_run_id: string; calculation_engine_version: string; policy_override_count: number; hard_fail_count: number; high_risk_count: number; condition_count: number; missing_information_count: number; }; }

export const ECOXCHANGE_SOLAR_BASE_V010: UnderwritingPolicyV1 = Object.freeze({
  policyCode: "ECOXCHANGE_SOLAR_BASE", policyVersion: "0.1.0", status: "ACTIVE", targetP50Dscr: 1.30,
  ltcBands: [{ minMw: 1, maxMwExclusive: 3, maxLtc: 0.65 }, { minMw: 3, maxMwExclusive: null, maxLtc: 0.70 }],
  dsraMonths: 6, merchantWarningPct: 0.25, merchantSeverePct: 0.30,
  closingCostRanges: [{ minMw: 1, maxMwExclusive: 3, minUsd: 125000, maxUsd: 300000 }, { minMw: 3, maxMwExclusive: 10, minUsd: 250000, maxUsd: 600000 }, { minMw: 10, maxMwExclusive: null, minUsd: 500000, maxUsd: 1000000 }],
  contingencyPct: 0.075, committedItcBridgeAdvance: 0.98, uncommittedItcBridgeAdvance: 0.725,
});

const r = (id: string, category: RiskCategory, status: RuleStatus, severity: Severity, actual: unknown, required: unknown, message: string, condition?: string, metadata?: Record<string, unknown>): RuleResultV1 => ({ rule_id: id, rule_version: "1.0.0", category, status, severity, actual_value: actual, required_value: required, message, condition, source_reference: "ECOXCHANGE_SOLAR_BASE v0.1.0 / SPEC 03", metadata });

export function classifyProjectSize(mw: number): ProjectSizeClass { return mw < 5 ? "SMALL" : mw < 15 ? "MID" : "UPPER_MIDSCALE"; }
export function classifyDscrHeadroom(actual: number, target: number): "STRONG" | "ADEQUATE" | "THIN" | "FAIL" { const h = actual-target; return h < 0 ? "FAIL" : h < .05 ? "THIN" : h < .15 ? "ADEQUATE" : "STRONG"; }
export function classifySponsorEquity(pct: number): "CAPITAL_EFFICIENT" | "MODERATE" | "HIGH" | "VERY_HIGH" { return pct <= .25 ? "CAPITAL_EFFICIENT" : pct <= .40 ? "MODERATE" : pct <= .60 ? "HIGH" : "VERY_HIGH"; }
export function classifyBalloon(pct: number): "LOW" | "MODERATE" | "HIGH" { return pct < .25 ? "LOW" : pct <= .50 ? "MODERATE" : "HIGH"; }
export function classifyContractTail(years: number): "STRONG" | "ACCEPTABLE" | "WEAK" { return years >= 2 ? "STRONG" : years >= 0 ? "ACCEPTABLE" : "WEAK"; }

function applicableMaxLtc(policy: UnderwritingPolicyV1, mw: number): number {
  const found = policy.ltcBands.filter(x => mw >= x.minMw && (x.maxMwExclusive == null || mw < x.maxMwExclusive));
  if (found.length !== 1) throw new Error("POLICY_CONFIGURATION_ERROR:max_ltc");
  return found[0].maxLtc;
}

function validateInputs(finance: FinanceResultForUnderwriting, policy: UnderwritingPolicyV1): void {
  if (!policy.policyCode || !policy.policyVersion || !Number.isFinite(policy.targetP50Dscr)) throw new Error("POLICY_CONFIGURATION_ERROR");
  if (!finance.reconciliation.debtReconciled || !finance.reconciliation.sourcesUsesReconciled) throw new Error("INVALID_FINANCE_RESULT");
}

function addRiskFromRule(rule: RuleResultV1, risks: Map<string,RiskV1>): void {
  if (["PASS","NOT_APPLICABLE","INDICATIVE_PASS"].includes(rule.status)) return;
  const key = rule.rule_id.replace(/_V1$/, "");
  if (!risks.has(key)) risks.set(key, { risk_code: key, category: rule.category, severity: rule.severity, title: rule.message.split(".")[0], description: rule.message, source_rule_id: rule.rule_id });
}
function addCondition(rule: RuleResultV1, conditions: Map<string,ConditionV1>, code: string): void { if (!rule.condition) return; if (!conditions.has(code)) conditions.set(code,{condition_code:code,severity:rule.severity,title:rule.condition,description:rule.condition,source_rule_id:rule.rule_id,status:"OPEN"}); }
function addMissing(m: Map<string,MissingInformationV1>, field: string, reason: string, severity: Severity, required_for: "UNDERWRITING"|"LENDER_READINESS"="UNDERWRITING"): void { if (!m.has(field)) m.set(field,{field_key:field,reason,required_for,severity}); }

export function evaluateUnderwriting(args: { projectFacts: UnderwritingFactsV1; financeResult: FinanceResultForUnderwriting; policy?: UnderwritingPolicyV1; overrides?: PolicyOverrideV1[]; }): UnderwritingResultV1 {
  const facts = structuredClone(args.projectFacts); const finance = structuredClone(args.financeResult); const policy = structuredClone(args.policy ?? ECOXCHANGE_SOLAR_BASE_V010); const overrides = structuredClone(args.overrides ?? []);
  validateInputs(finance, policy);
  const rules: RuleResultV1[]=[]; const risks=new Map<string,RiskV1>(); const conditions=new Map<string,ConditionV1>(); const missing=new Map<string,MissingInformationV1>();
  const size=classifyProjectSize(facts.capacityMwAc);
  const effectiveDscr = overrides.find(x=>x.fieldKey==="targetP50Dscr")?.effectiveValue ?? policy.targetP50Dscr;
  const policyLtc=applicableMaxLtc(policy,facts.capacityMwAc); const effectiveLtc=overrides.find(x=>x.fieldKey==="maxLtc")?.effectiveValue ?? policyLtc;
  const effectiveDsra=overrides.find(x=>x.fieldKey==="dsraMonths")?.effectiveValue ?? policy.dsraMonths;

  const scope = facts.technology==="SOLAR_PV" && facts.countryCode==="US" && facts.capacityMwAc>=1 && facts.capacityMwAc<=20 && facts.revenueStructure==="FULLY_CONTRACTED";
  rules.push(r("SCOPE_ASSET_REVENUE_V1","DOCUMENTATION",scope?"PASS":"FAIL",scope?"INFO":"CRITICAL",`${facts.technology}/${facts.capacityMwAc}/${facts.revenueStructure}`,"US SOLAR_PV 1-20MW FULLY_CONTRACTED",scope?"Project is within V0 scope.":"Project is outside the V0 contracted-solar scope."));
  if (!scope) return finish("OUT_OF_SCOPE");

  const mismatch = Math.abs(finance.calculationAssumptions.targetP50Dscr-effectiveDscr)>1e-9 || Math.abs(finance.calculationAssumptions.maxLtc-effectiveLtc)>1e-9 || Math.abs(finance.calculationAssumptions.dsraMonths-effectiveDsra)>1e-9;
  if (mismatch) rules.push(r("POLICY_CALCULATION_MISMATCH_V1","FINANCIAL","FAIL","CRITICAL",finance.calculationAssumptions,{targetP50Dscr:effectiveDscr,maxLtc:effectiveLtc,dsraMonths:effectiveDsra},"Calculation assumptions do not match effective policy values or registered overrides."));

  const noDebt=finance.permanentDebt<=0;
  rules.push(r("FINANCIAL_DEBT_CAPACITY_V1","FINANCIAL",noDebt?"FAIL":"PASS",noDebt?"CRITICAL":"INFO",finance.permanentDebt,"> 0","Project supports positive permanent senior debt under selected assumptions."));
  if (noDebt) rules[rules.length-1].message="Project does not support positive permanent senior debt under selected assumptions.";
  rules.push(r("FINANCIAL_P50_DSCR_V1","FINANCIAL",noDebt?"NOT_APPLICABLE":(finance.minimumDscr!=null&&finance.minimumDscr>=effectiveDscr-1e-9?"PASS":"FAIL"),noDebt?"INFO":"HIGH",finance.minimumDscr,effectiveDscr,noDebt?"DSCR is not meaningful with zero permanent debt.":"Minimum P50 DSCR is evaluated against the effective policy target.",undefined,{headroom_class:finance.minimumDscr==null?null:classifyDscrHeadroom(finance.minimumDscr,effectiveDscr)}));
  rules.push(r("FINANCIAL_LTC_V1","FINANCIAL",finance.debtToCapex<=effectiveLtc+1e-9?"PASS":"FAIL","HIGH",finance.debtToCapex,effectiveLtc,"Maximum LTC is a ceiling; DSCR may support less debt."));
  rules.push(r("FINANCIAL_BINDING_CONSTRAINT_V1","FINANCIAL","PASS","INFO",finance.bindingConstraint,null,`Senior debt binding constraint: ${finance.bindingConstraint}.`));
  const eqClass=classifySponsorEquity(finance.sponsorEquityPctTotalUses); rules.push(r("FINANCIAL_SPONSOR_EQUITY_BURDEN_V1","FINANCIAL","PASS","INFO",finance.sponsorEquityPctTotalUses,null,`Sponsor equity burden classified ${eqClass}.`,undefined,{classification:eqClass}));
  const balloonPct=finance.openingPermanentDebt>0?finance.balloonBalance/finance.openingPermanentDebt:0; rules.push(r("FINANCIAL_BALLOON_RISK_V1","REFINANCING",balloonPct===0?"PASS":balloonPct>.5?"REVIEW":"PASS_WITH_CONDITION",balloonPct>.5?"HIGH":balloonPct>=.25?"MEDIUM":"LOW",balloonPct,null,`Balloon/refinancing exposure classified ${classifyBalloon(balloonPct)}.`,balloonPct>0?"Review refinancing risk and repayment plan.":undefined));
  rules.push(r("RESERVE_DSRA_V1","FINANCIAL",facts.dsraMonthsActual>=effectiveDsra?"PASS":facts.dsraMonthsActual>0?"PASS_WITH_CONDITION":"REVIEW",facts.dsraMonthsActual>=effectiveDsra?"INFO":"MEDIUM",facts.dsraMonthsActual,effectiveDsra,"DSRA compared with policy reserve convention.",facts.dsraMonthsActual<effectiveDsra?`Support ${effectiveDsra} months DSRA or documented lender exception.`:undefined));

  const ppaMap: Record<UnderwritingFactsV1["ppaStatus"],RuleStatus>={EXECUTED:"PASS",AWARDED_NOT_EXECUTED:"PASS_WITH_CONDITION",TERM_SHEET:"REVIEW",NEGOTIATION:"REVIEW",NONE:"FAIL",UNKNOWN:"INSUFFICIENT_INFORMATION"}; rules.push(r("REVENUE_PPA_STATUS_V1","REVENUE",ppaMap[facts.ppaStatus],facts.ppaStatus==="NONE"?"CRITICAL":facts.ppaStatus==="EXECUTED"?"INFO":"HIGH",facts.ppaStatus,"EXECUTED","PPA documentation status evaluated without affecting finance calculation.",facts.ppaStatus!=="EXECUTED"?"Advance PPA documentation toward executed status.":undefined));
  if(facts.ppaStatus==="UNKNOWN") addMissing(missing,"ppa_status","PPA execution status is unknown.","HIGH");
  const tail=facts.ppaTermYears-finance.calculationAssumptions.amortizationYears; const tailClass=classifyContractTail(tail); rules.push(r("REVENUE_PPA_TERM_COVERAGE_V1","REVENUE",tail<0?"PASS_WITH_CONDITION":"PASS",tail<0?"HIGH":"INFO",tail,">= 0 years","Contract tail classified "+tailClass+".",tail<0?"Align debt amortization with contracted PPA revenue or document refinancing/tail support.":undefined,{classification:tailClass}));
  const offMap: Record<UnderwritingFactsV1["offtakerCredit"],RuleStatus>={INVESTMENT_GRADE:"PASS",STRONG_NON_RATED:"REVIEW",NON_INVESTMENT_GRADE:"REVIEW",UNKNOWN:"INSUFFICIENT_INFORMATION"}; rules.push(r("REVENUE_OFFTAKER_CREDIT_V1","COUNTERPARTY",offMap[facts.offtakerCredit],facts.offtakerCredit==="INVESTMENT_GRADE"?"INFO":"HIGH",facts.offtakerCredit,"Supportable offtaker credit","Offtaker credit is evaluated only from explicit facts.")); if(facts.offtakerCredit==="UNKNOWN") addMissing(missing,"offtaker_credit_status","Offtaker credit is unknown.","HIGH");
  if(facts.revenueStructure!=="FULLY_CONTRACTED") rules.push(r("REVENUE_MERCHANT_EXPOSURE_V1","REVENUE","FAIL","CRITICAL",facts.revenueStructure,"FULLY_CONTRACTED","Merchant/partially contracted revenue is outside V0 underwriting scope."));

  const d=finance.downside; if(!d||d.generationSourceType==="NONE"){rules.push(r("PRODUCTION_DOWNSIDE_PROVENANCE_V1","PRODUCTION","INSUFFICIENT_INFORMATION","HIGH",d?.generationSourceType??"NONE","Accepted downside evidence","No downside evidence is available.","Obtain downside production evidence."));addMissing(missing,"downside_provenance","Downside production evidence is missing.","HIGH","LENDER_READINESS");} else {const ps:RuleStatus=d.generationSourceType==="INDEPENDENT_ENGINEER_P90"?"PASS":d.generationSourceType==="ILLUSTRATIVE_PERCENT_OF_P50"?"INDICATIVE_PASS":"PASS_WITH_CONDITION"; rules.push(r("PRODUCTION_DOWNSIDE_PROVENANCE_V1","PRODUCTION",ps,d.generationSourceType==="INDEPENDENT_ENGINEER_P90"?"INFO":"HIGH",d.generationSourceType,"INDEPENDENT_ENGINEER_P90","Downside provenance preserved explicitly.",ps!=="PASS"?"Obtain final independent-engineer P90 for lender-grade evidence.":undefined)); const repayStatus=d.interestShortfall||d.fullRepayment===false?"FAIL":d.fullRepayment===true?(d.generationSourceType==="ILLUSTRATIVE_PERCENT_OF_P50"?"INDICATIVE_PASS":d.generationSourceType==="INDEPENDENT_ENGINEER_P90"?"PASS":"PASS_WITH_CONDITION"):"INSUFFICIENT_INFORMATION"; rules.push(r("PRODUCTION_DOWNSIDE_REPAYMENT_V1","PRODUCTION",repayStatus,repayStatus==="FAIL"?"CRITICAL":"HIGH",{fullRepayment:d.fullRepayment,interestShortfall:d.interestShortfall,minimumDownsideDscr:d.minimumDownsideDscr},"Full repayment; no interest shortfall","Downside repayment uses the existing finance result; no debt is recalculated."));}

  const itcMap:Record<UnderwritingFactsV1["itcEligibility"],RuleStatus>={VERIFIED:"PASS",USER_ASSERTED:"PASS_WITH_CONDITION",PENDING_REVIEW:"PASS_WITH_CONDITION",UNKNOWN:"INSUFFICIENT_INFORMATION"}; rules.push(r("TAX_ITC_ELIGIBILITY_V1","TAX_CREDIT",finance.itcProceeds<=0?"NOT_APPLICABLE":itcMap[facts.itcEligibility],facts.itcEligibility==="VERIFIED"?"INFO":"HIGH",facts.itcEligibility,"VERIFIED","ITC eligibility is not independently determined by the policy engine.",facts.itcEligibility!=="VERIFIED"&&finance.itcProceeds>0?"Verify ITC eligibility before relying on tax-credit proceeds.":undefined)); if(facts.itcEligibility==="UNKNOWN"&&finance.itcProceeds>0)addMissing(missing,"itc_eligibility","ITC eligibility is unknown.","HIGH");
  const buyerMap:Record<UnderwritingFactsV1["itcBuyerStatus"],RuleStatus>={COMMITTED:"PASS",IDENTIFIED_NOT_COMMITTED:"PASS_WITH_CONDITION",UNIDENTIFIED:"PASS_WITH_CONDITION",NOT_APPLICABLE:"NOT_APPLICABLE"}; rules.push(r("TAX_ITC_BUYER_STATUS_V1","TAX_CREDIT",buyerMap[facts.itcBuyerStatus],facts.itcBuyerStatus==="COMMITTED"?"INFO":"MEDIUM",facts.itcBuyerStatus,"COMMITTED","ITC buyer commitment evaluated as a readiness fact.",facts.itcBuyerStatus==="COMMITTED"?undefined:"Commit or document the ITC buyer plan."));
  const taxApp=finance.taxModuleEnabled&&finance.simplifiedAfterTaxIrr!=null; const taxStatus:RuleStatus=!taxApp?"NOT_APPLICABLE":facts.sponsorTaxAppetite==="CONFIRMED"?"PASS":facts.sponsorTaxAppetite==="UNKNOWN"?"INSUFFICIENT_INFORMATION":"PASS_WITH_CONDITION"; rules.push(r("TAX_SPONSOR_TAX_APPETITE_V1","TAX_CREDIT",taxStatus,taxStatus==="PASS"?"INFO":"MEDIUM",facts.sponsorTaxAppetite,"CONFIRMED when after-tax result is used","Cash-only return remains primary unless sponsor tax appetite is supported."));

  const epcStatus:RuleStatus=facts.epcStatus==="EXECUTED"&&["FIXED","CAPPED"].includes(facts.epcPriceStructure??"")?"PASS":facts.epcStatus==="UNKNOWN"?"INSUFFICIENT_INFORMATION":facts.epcStatus==="NONE"?"REVIEW":"PASS_WITH_CONDITION"; rules.push(r("CONSTRUCTION_EPC_V1","CONSTRUCTION",epcStatus,epcStatus==="PASS"?"INFO":"HIGH",{status:facts.epcStatus,price:facts.epcPriceStructure,contractor:facts.contractorQuality,performanceGuarantee:facts.performanceGuarantee,liquidatedDamages:facts.liquidatedDamages},"Executed fixed/capped price EPC with credible protections","EPC readiness is evaluated from explicit structured facts.",epcStatus!=="PASS"?"Advance EPC package and construction protections.":undefined)); if(facts.epcStatus==="UNKNOWN")addMissing(missing,"epc_status","EPC status is unknown.","HIGH","LENDER_READINESS");
  const interMap:Record<UnderwritingFactsV1["interconnectionStatus"],RuleStatus>={FULLY_EXECUTED:"PASS",APPROVED_PENDING_EXECUTION:"PASS_WITH_CONDITION",STUDY_COMPLETE:"PASS_WITH_CONDITION",IN_QUEUE:"REVIEW",EARLY_STAGE:"REVIEW",UNKNOWN:"INSUFFICIENT_INFORMATION"}; rules.push(r("DEVELOPMENT_INTERCONNECTION_V1","INTERCONNECTION",interMap[facts.interconnectionStatus],facts.interconnectionStatus==="FULLY_EXECUTED"?"INFO":"HIGH",facts.interconnectionStatus,"FULLY_EXECUTED","Interconnection readiness evaluated deterministically.",facts.interconnectionStatus!=="FULLY_EXECUTED"?"Advance interconnection to executed/financeable status.":undefined)); if(facts.interconnectionStatus==="UNKNOWN")addMissing(missing,"interconnection_status","Interconnection status is unknown.","HIGH","LENDER_READINESS");
  const permitsStatus:RuleStatus=facts.permitsStatus==="COMPLETE"?"PASS":facts.permitsStatus==="UNKNOWN"?"INSUFFICIENT_INFORMATION":"PASS_WITH_CONDITION"; rules.push(r("DEVELOPMENT_PERMITS_V1","PERMITTING",permitsStatus,permitsStatus==="PASS"?"INFO":"MEDIUM",facts.permitsStatus,"COMPLETE","Permit readiness evaluated.",permitsStatus!=="PASS"?"Complete material permits.":undefined));
  const siteStatus:RuleStatus=facts.siteControlStatus==="SECURED"?"PASS":facts.siteControlStatus==="NONE"?"FAIL":facts.siteControlStatus==="UNKNOWN"?"INSUFFICIENT_INFORMATION":"PASS_WITH_CONDITION"; rules.push(r("DEVELOPMENT_SITE_CONTROL_V1","DOCUMENTATION",siteStatus,siteStatus==="FAIL"?"CRITICAL":siteStatus==="PASS"?"INFO":"HIGH",facts.siteControlStatus,"SECURED","Site control evaluated.",siteStatus!=="PASS"?"Secure durable site control.":undefined));
  const omStatus:RuleStatus=facts.omStatus==="EXECUTED"?"PASS":facts.omStatus==="UNKNOWN"?"INSUFFICIENT_INFORMATION":"PASS_WITH_CONDITION"; rules.push(r("OPERATIONS_O_AND_M_V1","DOCUMENTATION",omStatus,omStatus==="PASS"?"INFO":"MEDIUM",facts.omStatus,"EXECUTED","O&M readiness evaluated.",omStatus!=="PASS"?"Establish an O&M plan/contract.":undefined));
  const insStatus:RuleStatus=facts.insuranceStatus==="CONFIRMED"?"PASS":facts.insuranceStatus==="UNKNOWN"?"INSUFFICIENT_INFORMATION":"PASS_WITH_CONDITION"; rules.push(r("OPERATIONS_INSURANCE_V1","DOCUMENTATION",insStatus,insStatus==="PASS"?"INFO":"MEDIUM",facts.insuranceStatus,"CONFIRMED","Insurance readiness evaluated.",insStatus!=="PASS"?"Confirm lender-acceptable insurance coverage.":undefined));
  const ieStatus:RuleStatus=facts.independentEngineerStatus==="FINAL"?"PASS":facts.independentEngineerStatus==="UNKNOWN"?"INSUFFICIENT_INFORMATION":"PASS_WITH_CONDITION"; rules.push(r("DILIGENCE_INDEPENDENT_ENGINEER_V1","PRODUCTION",ieStatus,ieStatus==="PASS"?"INFO":"HIGH",facts.independentEngineerStatus,"FINAL","Independent engineer readiness evaluated.",ieStatus!=="PASS"?"Obtain final independent-engineer report/P50/P90 package.":undefined));
  const spStatus:RuleStatus=facts.sponsorExperience==="STRONG"?"PASS":facts.sponsorExperience==="UNKNOWN"?"INSUFFICIENT_INFORMATION":facts.sponsorExperience==="LIMITED"?"REVIEW":"PASS"; rules.push(r("SPONSOR_EXPERIENCE_V1","SPONSOR",spStatus,spStatus==="PASS"?"INFO":"MEDIUM",facts.sponsorExperience,"ADEQUATE or STRONG","Sponsor experience evaluated only from explicit fact."));

  if(facts.capacityMwAc<5) rules.push(r("STRUCTURE_SMALL_PROJECT_FIXED_COST_V1","FINANCIAL","PASS","INFO",facts.capacityMwAc,"< 5 MW informational finding","Small-project diligence and legal costs can be disproportionate; aggregation may improve execution efficiency."));
  if(facts.closingCostsUsd!=null){const ranges=policy.closingCostRanges.filter(x=>facts.capacityMwAc>=x.minMw&&(x.maxMwExclusive==null||facts.capacityMwAc<x.maxMwExclusive)); if(ranges.length===1){const c=ranges[0]; const ok=facts.closingCostsUsd>=c.minUsd&&facts.closingCostsUsd<=c.maxUsd; rules.push(r("COST_CLOSING_COST_REASONABLENESS_V1","FINANCIAL",ok?"PASS":"REVIEW",ok?"INFO":"LOW",facts.closingCostsUsd,{min:c.minUsd,max:c.maxUsd},"Closing costs compared with policy planning range."));}}
  if(facts.capexIncludesContingency===false){const pct=facts.contingencyPctActual??0; rules.push(r("COST_CONTINGENCY_V1","CONSTRUCTION",pct>=.05&&pct<=.10?"PASS":pct>0?"REVIEW":"PASS_WITH_CONDITION",pct,{base:policy.contingencyPct,typical:[.05,.10]},"Contingency is evaluated only when capex excludes contingency.",pct===0?"Include or document an appropriate construction contingency.":undefined));}

  for(const rule of rules){addRiskFromRule(rule,risks); if(rule.status==="PASS_WITH_CONDITION"||rule.status==="INDICATIVE_PASS") addCondition(rule,conditions,conditionCode(rule));}
  const financialProfile=aggregateFinancialProfile(rules,finance,effectiveDscr,effectiveLtc);
  const financingReadiness=aggregateReadiness(facts,rules);
  const hardFail=rules.some(x=>x.status==="FAIL"&&["FINANCIAL_DEBT_CAPACITY_V1","FINANCIAL_P50_DSCR_V1","FINANCIAL_LTC_V1","PRODUCTION_DOWNSIDE_REPAYMENT_V1","POLICY_CALCULATION_MISMATCH_V1","DEVELOPMENT_SITE_CONTROL_V1"].includes(x.rule_id));
  const review=rules.some(x=>x.status==="REVIEW"); const insufficient=rules.some(x=>x.status==="INSUFFICIENT_INFORMATION")||missing.size>0; const hasConditions=conditions.size>0||rules.some(x=>x.status==="PASS_WITH_CONDITION"||x.status==="INDICATIVE_PASS");
  const status:OverallStatus=hardFail?"FAIL":review?"REVIEW_REQUIRED":insufficient?"INSUFFICIENT_INFORMATION":hasConditions?"PASS_WITH_CONDITIONS":"PASS";
  return finish(status,financialProfile,financingReadiness);

  function finish(status:OverallStatus, financialProfile:FinancialProfile="WEAK", financingReadiness:FinancingReadiness="EARLY"):UnderwritingResultV1{
    for(const rule of rules){addRiskFromRule(rule,risks); if(rule.status==="PASS_WITH_CONDITION"||rule.status==="INDICATIVE_PASS") addCondition(rule,conditions,conditionCode(rule));}
    const lender_fit=buildLenderFit(size,financingReadiness); const recommendations=buildRecommendations(size,facts,finance,financialProfile);
    return {analysis_type:"INDICATIVE_UNDERWRITING",status,financial_profile:financialProfile,financing_readiness:financingReadiness,project_size:size,rule_results:rules,risks:[...risks.values()],conditions:[...conditions.values()],missing_information:[...missing.values()],lender_fit,recommendations,summary_metadata:{policy_code:policy.policyCode,policy_version:policy.policyVersion,calculation_run_id:finance.calculationRunId,calculation_engine_version:finance.calculationEngineVersion,policy_override_count:overrides.length,hard_fail_count:rules.filter(x=>x.status==="FAIL").length,high_risk_count:[...risks.values()].filter(x=>x.severity==="HIGH"||x.severity==="CRITICAL").length,condition_count:conditions.size,missing_information_count:missing.size}};
  }
}

function conditionCode(rule:RuleResultV1):string { const m:Record<string,string>={PRODUCTION_DOWNSIDE_PROVENANCE_V1:"OBTAIN_FINAL_IE_P90",DEVELOPMENT_INTERCONNECTION_V1:"EXECUTE_INTERCONNECTION_AGREEMENT",TAX_ITC_ELIGIBILITY_V1:"VERIFY_ITC_ELIGIBILITY",TAX_ITC_BUYER_STATUS_V1:"COMMIT_ITC_BUYER",REVENUE_PPA_STATUS_V1:"EXECUTE_PPA"}; return m[rule.rule_id]??`CLEAR_${rule.rule_id.replace(/_V1$/,"")}`; }
function aggregateFinancialProfile(rules:RuleResultV1[],f:FinanceResultForUnderwriting,target:number,maxLtc:number):FinancialProfile { if(rules.some(x=>x.status==="FAIL"&&["FINANCIAL_DEBT_CAPACITY_V1","FINANCIAL_P50_DSCR_V1","FINANCIAL_LTC_V1","PRODUCTION_DOWNSIDE_REPAYMENT_V1"].includes(x.rule_id))) return "UNFINANCEABLE_UNDER_POLICY"; if(f.minimumDscr==null)return "WEAK"; const h=classifyDscrHeadroom(f.minimumDscr,target); if(h==="FAIL")return "UNFINANCEABLE_UNDER_POLICY"; if(h==="THIN"||f.sponsorEquityPctTotalUses>.60)return "THIN"; if(h==="STRONG"&&f.debtToCapex<=Math.min(maxLtc,.50))return "STRONG"; return "ACCEPTABLE"; }
function aggregateReadiness(f:UnderwritingFactsV1,rules:RuleResultV1[]):FinancingReadiness { if(f.projectStage==="OPERATING")return "OPERATING"; const strong=f.ppaStatus==="EXECUTED"&&f.interconnectionStatus==="FULLY_EXECUTED"&&f.epcStatus==="EXECUTED"&&f.permitsStatus==="COMPLETE"&&f.siteControlStatus==="SECURED"&&f.independentEngineerStatus==="FINAL"&&f.insuranceStatus==="CONFIRMED"; if(strong&&f.omStatus==="EXECUTED")return "CLOSING_READY"; if(strong)return "FINANCING_READY"; const foundational=[f.ppaStatus==="NONE",f.siteControlStatus==="NONE",f.interconnectionStatus==="EARLY_STAGE",f.independentEngineerStatus==="NOT_ENGAGED"].filter(Boolean).length; return foundational>=2?"EARLY":"DEVELOPING"; }
function buildLenderFit(size:ProjectSizeClass,ready:FinancingReadiness):LenderFitV1[]{const closing=["FINANCING_READY","CLOSING_READY","OPERATING"].includes(ready);return [{lender_category:"MONEY_CENTER_PROJECT_FINANCE",fit:size==="UPPER_MIDSCALE"?(closing?"HIGH":"MODERATE"):"LOW",reason_codes:[size,ready]},{lender_category:"REGIONAL_SPECIALTY_ENERGY_BANK",fit:"HIGH",reason_codes:[size,ready]},{lender_category:"PRIVATE_CREDIT",fit:size==="SMALL"||ready==="EARLY"?"MODERATE":"LOW",reason_codes:[size,ready]},{lender_category:"INSTITUTIONAL_PLACEMENT",fit:size==="UPPER_MIDSCALE"&&closing?"MODERATE":"LOW",reason_codes:[size,ready]},{lender_category:"ITC_BRIDGE",fit:"MODERATE",reason_codes:["TAX_CREDIT_STRUCTURE"]},{lender_category:"GREEN_BANK_CDFI",fit:size==="SMALL"?"HIGH":"LOW",reason_codes:[size]}];}
function buildRecommendations(size:ProjectSizeClass,f:UnderwritingFactsV1,fin:FinanceResultForUnderwriting,profile:FinancialProfile):string[]{const out:string[]=[]; if(size==="SMALL"||fin.sponsorEquityPctTotalUses>.40)out.push("PORTFOLIO_AGGREGATION_RECOMMENDED"); if(fin.itcRate>0&&(f.itcBuyerStatus!=="COMMITTED"||f.itcEligibility!=="VERIFIED"))out.push("TRANSFER_ITC_RECOMMENDED","ITC_BUYER_COMMITMENT_RECOMMENDED"); if(f.sponsorTaxAppetite==="NONE"||f.sponsorTaxAppetite==="PARTIAL")out.push("TAX_EQUITY_ANALYSIS_RECOMMENDED"); if(size==="SMALL"||size==="MID")out.push("REGIONAL_BANK_EXECUTION_RECOMMENDED"); if(size==="UPPER_MIDSCALE"&&["ACCEPTABLE","STRONG"].includes(profile))out.push("INSTITUTIONAL_PF_POTENTIAL"); if(fin.balloonBalance>0)out.push("REFINANCING_RISK_REVIEW"); return [...new Set(out)];}

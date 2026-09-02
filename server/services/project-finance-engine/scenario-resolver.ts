import type { ProjectFinanceInputs } from "./core";
import type { ResolvedPolicyAssumptions } from "./policy";

export type ResolvedSource = "SCENARIO_OVERRIDE" | "VERIFIED_PROJECT_FACT" | "PROJECT_FACT" | "ECOXCHANGE_POLICY";

export interface Candidate {
  value: unknown;
  sourceType: ResolvedSource;
  referenceId?: string;
}

export interface ResolutionRequest {
  projectName: string;
  projectValues: Record<string, Candidate | undefined>;
  scenarioValues: Record<string, Candidate | undefined>;
  policy: ResolvedPolicyAssumptions;
  policyCode: string;
  policyVersion: string;
}

export interface ResolvedScenario {
  values: ProjectFinanceInputs;
  provenance: Record<string, Candidate>;
  missingFields: string[];
}

function selected(req: ResolutionRequest, key: string): Candidate | undefined {
  return req.scenarioValues[key] ?? req.projectValues[key];
}

function numberValue(req: ResolutionRequest, key: string, provenance: Record<string, Candidate>): number | null {
  const item = selected(req, key);
  if (!item || typeof item.value !== "number" || !Number.isFinite(item.value)) return null;
  provenance[key] = item;
  return item.value;
}

function policyValue(req: ResolutionRequest, key: string, value: number, provenance: Record<string, Candidate>): number {
  const item = req.scenarioValues[key];
  if (item && typeof item.value === "number" && Number.isFinite(item.value)) {
    provenance[key] = item;
    return item.value;
  }
  provenance[key] = { value, sourceType: "ECOXCHANGE_POLICY", referenceId: `${req.policyCode}@${req.policyVersion}` };
  return value;
}

export function resolveScenario(req: ResolutionRequest): ResolvedScenario {
  const provenance: Record<string, Candidate> = {};
  const missingFields: string[] = [];
  const required = (key: string): number => {
    const value = numberValue(req, key, provenance);
    if (value === null) {
      missingFields.push(key);
      return Number.NaN;
    }
    return value;
  };

  const values: ProjectFinanceInputs = {
    projectName: req.projectName,
    capacityMwAc: required("capacity_mw_ac"),
    p50CapacityFactor: required("capacity_factor_p50"),
    annualDegradationRate: required("annual_degradation_rate"),
    projectLifeYears: required("project_life_years"),
    ppaTermYears: required("ppa_term_years"),
    yearOnePpaPricePerMwh: required("ppa_price_year_1_per_mwh"),
    annualPpaEscalationRate: required("ppa_escalation_rate"),
    totalProjectCapexUsd: required("project_capex"),
    yearOneOpexUsd: required("opex_year_1"),
    annualOpexEscalationRate: required("opex_escalation_rate"),
    itcEligibleBasisPercent: required("itc_eligible_basis_pct"),
    itcRate: policyValue(req, "itc_rate", req.policy.itcRate, provenance),
    itcTransferPrice: policyValue(req, "itc_transfer_price", req.policy.itcTransferPrice, provenance),
    debtInterestRate: policyValue(req, "debt_interest_rate", req.policy.debtInterestRate, provenance),
    debtAmortizationYears: policyValue(req, "amortization_years", req.policy.debtAmortizationYears, provenance),
    debtMaturityYears: policyValue(req, "debt_maturity_years", req.policy.debtMaturityYears, provenance),
    targetP50Dscr: policyValue(req, "target_dscr", req.policy.targetP50Dscr, provenance),
    maximumLtc: policyValue(req, "max_ltc", req.policy.maximumLtc, provenance),
    upfrontFeePercent: policyValue(req, "lender_fee_rate", req.policy.upfrontFeePercent, provenance),
    dsraMonths: policyValue(req, "dsra_months", req.policy.dsraMonths, provenance),
    closingCostsUsd: policyValue(req, "closing_costs", req.policy.closingCostsUsd, provenance),
    underwritingPolicyId: req.policyCode,
    underwritingPolicyVersion: req.policyVersion,
  };

  const transactionCosts = numberValue(req, "itc_transaction_costs", provenance);
  if (transactionCosts !== null) values.itcTransferTransactionCostsUsd = transactionCosts;
  const downside = numberValue(req, "downside_generation_multiplier", provenance);
  if (downside !== null) values.downsideGenerationMultiplier = downside;

  return { values, provenance, missingFields };
}

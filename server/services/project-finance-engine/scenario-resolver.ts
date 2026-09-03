import { createHash } from "node:crypto";
import { validateProjectFinanceInput, type ProjectFinanceInput } from "./domain-contracts";

export const SCENARIO_RESOLVER_VERSION = "0.1.0";

export type ResolutionSource =
  | "POLICY_OVERRIDE"
  | "SCENARIO_ASSUMPTION"
  | "VERIFIED_PROJECT_FACT"
  | "PROJECT_FACT"
  | "DOCUMENT_FACT"
  | "USER_ASSERTION"
  | "POLICY_DEFAULT"
  | "MISSING";

export type ResolverErrorCode =
  | "POLICY_CONFIGURATION_ERROR"
  | "POLICY_RESOLUTION_CYCLE"
  | "DUPLICATE_CURRENT_FACT"
  | "DUPLICATE_SCENARIO_ASSUMPTION"
  | "INVALID_POLICY_OVERRIDE"
  | "STALE_POLICY_OVERRIDE"
  | "UNREGISTERED_POLICY_OVERRIDE"
  | "UNKNOWN_SCENARIO_FIELD"
  | "UNIT_MISMATCH"
  | "OUT_OF_SCOPE_FOR_CALCULATION"
  | "INVALID_RESOLVED_INPUT";

export interface ResolverProject {
  id: string;
  technology: string;
  capacity_mw_ac?: number;
  country_code?: string;
  state_code?: string;
  revenue_structure: "FULLY_CONTRACTED" | "PARTIALLY_CONTRACTED" | "MERCHANT" | "UNKNOWN";
}

export interface ResolverFact {
  id: string;
  field_key: string;
  value: unknown;
  unit?: string | null;
  source_type: string;
  confidence_status: "VERIFIED" | "REPORTED" | "UNVERIFIED" | "DISPUTED" | "SUPERSEDED" | "UNKNOWN";
  is_current: boolean;
}

export interface ResolverScenarioAssumption {
  id: string;
  field_key: string;
  value: unknown;
  unit?: string | null;
  source_type?: string;
}

export interface ResolverPolicyValue {
  id: string;
  field_key: string;
  value: unknown;
  unit?: string | null;
  value_classification: "CALCULATION_DEFAULT" | "UNDERWRITING_THRESHOLD" | "READINESS_THRESHOLD" | "REFERENCE_ONLY";
  applicability?: { capacity_mw_ac?: { gte?: number; gt?: number; lte?: number; lt?: number } } | null;
}

export interface ResolverPolicy {
  id: string;
  policy_code: string;
  policy_version: string;
  status: "DRAFT" | "ACTIVE" | "RETIRED";
}

export interface ResolverPolicyOverride {
  id: string;
  field_key: string;
  policy_id: string;
  policy_version: string;
  policy_value: unknown;
  override_value: unknown;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface ResolvedField {
  field_key: string;
  value: unknown;
  unit?: string;
  resolution_source: ResolutionSource;
  source_record_id?: string;
  source_record_type?: string;
  source_strength?: string;
  verification_status?: string;
  policy_default_used: boolean;
  policy_value?: unknown;
  override_used: boolean;
  override_reason?: string;
}

export interface ResolverIssue {
  code: ResolverErrorCode | "MISSING_REQUIRED_INPUT" | "POLICY_DEFAULT_USED" | "UNVERIFIED_FACT_USED" | "USER_ASSERTION_USED" | "SCENARIO_ASSUMPTION_OVERRIDES_VERIFIED_FACT" | "POLICY_OVERRIDE_USED";
  field_key?: string;
  message: string;
  blocking: boolean;
}

export interface ResolvedScenario {
  project_id: string;
  scenario_id: string;
  finance_input: ProjectFinanceInput | null;
  resolved_fields: Record<string, ResolvedField>;
  missing_fields: Array<{ field_key: string; required_for: "CALCULATION"; reason: string }>;
  warnings: ResolverIssue[];
  errors: ResolverIssue[];
  calculation_ready: boolean;
  policy_code: string;
  policy_version: string;
  resolver_version: string;
  input_hash: string | null;
  input_snapshot: Record<string, unknown>;
}

type FieldDefinition = {
  path: string;
  unit?: string;
  required: boolean;
  policy_default_key?: string;
  policy_controlled?: boolean;
  allowFact?: boolean;
  allowScenario?: boolean;
};

export const FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  { path: "project.capacity_mw_ac", unit: "MW_AC", required: true, allowFact: true, allowScenario: true },
  { path: "project.project_life_years", unit: "YEARS", required: true, allowFact: true, allowScenario: true },
  { path: "project.technology", required: false, allowFact: true, allowScenario: false },
  { path: "project.country_code", required: false, allowFact: true, allowScenario: false },
  { path: "project.state_code", required: false, allowFact: true, allowScenario: false },
  { path: "generation.capacity_factor_p50", unit: "PERCENT_DECIMAL", required: true, allowFact: true, allowScenario: true },
  { path: "generation.annual_degradation_rate", unit: "PERCENT_DECIMAL", required: true, allowFact: true, allowScenario: true },
  { path: "generation.annual_generation_override_mwh", unit: "MWH", required: false, allowFact: true, allowScenario: true },
  { path: "generation.generation_source_type", required: false, allowFact: true, allowScenario: true },
  { path: "revenue.ppa_price_year_1_per_mwh", unit: "USD_PER_MWH", required: true, allowFact: true, allowScenario: true },
  { path: "revenue.ppa_escalation_rate", unit: "PERCENT_DECIMAL", required: true, allowFact: true, allowScenario: true },
  { path: "revenue.ppa_term_years", unit: "YEARS", required: true, allowFact: true, allowScenario: true },
  { path: "operating_costs.opex_year_1", unit: "USD", required: true, allowFact: true, allowScenario: true },
  { path: "operating_costs.opex_escalation_rate", unit: "PERCENT_DECIMAL", required: true, allowFact: true, allowScenario: true },
  { path: "tax_credit.itc_rate", unit: "PERCENT_DECIMAL", required: true, policy_default_key: "itc_rate", policy_controlled: true, allowFact: true, allowScenario: true },
  { path: "tax_credit.itc_eligible_basis_pct", unit: "PERCENT_DECIMAL", required: true, allowFact: true, allowScenario: true },
  { path: "tax_credit.itc_transfer_price", unit: "RATIO", required: true, policy_default_key: "itc_transfer_price", policy_controlled: true, allowFact: true, allowScenario: true },
  { path: "tax_credit.itc_transaction_costs", unit: "USD", required: true, allowFact: true, allowScenario: true },
  { path: "tax_credit.bonus_depreciation_pct", unit: "PERCENT_DECIMAL", required: false, allowFact: true, allowScenario: true },
  { path: "tax_credit.federal_tax_rate", unit: "PERCENT_DECIMAL", required: false, allowFact: true, allowScenario: true },
  { path: "tax_credit.sponsor_tax_appetite_pct", unit: "PERCENT_DECIMAL", required: false, allowFact: true, allowScenario: true },
  { path: "financing.annual_interest_rate", unit: "PERCENT_DECIMAL", required: true, policy_default_key: "debt_interest_rate_default", policy_controlled: true, allowFact: true, allowScenario: true },
  { path: "financing.target_dscr", unit: "RATIO", required: true, policy_default_key: "target_p50_dscr", policy_controlled: true, allowFact: false, allowScenario: true },
  { path: "financing.max_ltc", unit: "PERCENT_DECIMAL", required: true, policy_default_key: "max_ltc", policy_controlled: true, allowFact: false, allowScenario: true },
  { path: "financing.amortization_years", unit: "YEARS", required: true, policy_default_key: "amortization_years_default", policy_controlled: true, allowFact: true, allowScenario: true },
  { path: "financing.debt_maturity_years", unit: "YEARS", required: true, policy_default_key: "debt_maturity_years_default", policy_controlled: true, allowFact: true, allowScenario: true },
  { path: "financing.lender_fee_rate", unit: "PERCENT_DECIMAL", required: true, policy_default_key: "lender_fee_rate", policy_controlled: true, allowFact: true, allowScenario: true },
  { path: "reserves.dsra_months", unit: "MONTHS", required: true, policy_default_key: "dsra_months", policy_controlled: true, allowFact: true, allowScenario: true },
  { path: "reserves.dsra_reference_method", required: false, policy_default_key: "dsra_reference_method", allowFact: true, allowScenario: true },
  { path: "transaction_costs.project_capex", unit: "USD", required: true, allowFact: true, allowScenario: true },
  { path: "transaction_costs.closing_costs", unit: "USD", required: true, allowFact: true, allowScenario: true },
  { path: "transaction_costs.other_financing_uses", unit: "USD", required: true, allowFact: true, allowScenario: true },
  { path: "transaction_costs.other_permanent_sources", unit: "USD", required: false, allowFact: true, allowScenario: true },
  { path: "transaction_costs.capex_includes_contingency", required: false, allowFact: true, allowScenario: true },
  { path: "transaction_costs.contingency_rate", unit: "PERCENT_DECIMAL", required: false, policy_default_key: "construction_contingency_pct", allowFact: true, allowScenario: true },
  { path: "downside.downside_type", required: true, allowFact: true, allowScenario: true },
  { path: "downside.downside_generation_multiplier", unit: "PERCENT_DECIMAL", required: false, allowFact: true, allowScenario: true },
  { path: "downside.annual_downside_generation_mwh", unit: "MWH", required: false, allowFact: true, allowScenario: true },
  { path: "downside.generation_source_type", required: false, allowFact: true, allowScenario: true },
  { path: "calculation_options.tax_module_enabled", required: true, allowFact: true, allowScenario: true },
  { path: "calculation_options.discount_rate", unit: "PERCENT_DECIMAL", required: false, allowFact: true, allowScenario: true },
] as const;

const definitionMap = new Map(FIELD_DEFINITIONS.map((d) => [d.path, d]));

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stableNormalize(v)]));
  return value;
}

export function canonicalJson(value: unknown): string { return JSON.stringify(stableNormalize(value)); }
export function hashFinanceInput(input: ProjectFinanceInput): string { return createHash("sha256").update(canonicalJson(input)).digest("hex"); }

function applies(value: ResolverPolicyValue, capacity: number): boolean {
  const r = value.applicability?.capacity_mw_ac;
  if (!r) return true;
  if (r.gte !== undefined && capacity < r.gte) return false;
  if (r.gt !== undefined && capacity <= r.gt) return false;
  if (r.lte !== undefined && capacity > r.lte) return false;
  if (r.lt !== undefined && capacity >= r.lt) return false;
  return true;
}

function setPath(root: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let cursor = root;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cursor[keys[i]] || typeof cursor[keys[i]] !== "object") cursor[keys[i]] = {};
    cursor = cursor[keys[i]] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
}

function currentFacts(facts: readonly ResolverFact[], field: string): ResolverFact[] {
  return facts.filter((f) => f.field_key === field && f.is_current && f.confidence_status !== "SUPERSEDED");
}

export function resolveScenarioInput(args: {
  project: ResolverProject;
  scenario_id: string;
  projectFacts: readonly ResolverFact[];
  scenarioAssumptions: readonly ResolverScenarioAssumption[];
  policy: ResolverPolicy;
  policyValues: readonly ResolverPolicyValue[];
  policyOverrides: readonly ResolverPolicyOverride[];
}): ResolvedScenario {
  const { project, scenario_id, projectFacts, scenarioAssumptions, policy, policyValues, policyOverrides } = args;
  const warnings: ResolverIssue[] = [], errors: ResolverIssue[] = [];
  const missing_fields: ResolvedScenario["missing_fields"] = [];
  const resolved_fields: Record<string, ResolvedField> = {};
  const draft: Record<string, unknown> = {};

  if (project.technology !== "SOLAR_PV" || project.revenue_structure !== "FULLY_CONTRACTED") errors.push({ code: "OUT_OF_SCOPE_FOR_CALCULATION", message: "V0 finance resolution supports only fully contracted SOLAR_PV.", blocking: true });

  const assumptionsByField = new Map<string, ResolverScenarioAssumption>();
  for (const a of [...scenarioAssumptions].sort((x, y) => x.field_key.localeCompare(y.field_key))) {
    if (!definitionMap.has(a.field_key)) { errors.push({ code: "UNKNOWN_SCENARIO_FIELD", field_key: a.field_key, message: `Unknown scenario field ${a.field_key}.`, blocking: true }); continue; }
    if (assumptionsByField.has(a.field_key)) errors.push({ code: "DUPLICATE_SCENARIO_ASSUMPTION", field_key: a.field_key, message: `Duplicate scenario assumption for ${a.field_key}.`, blocking: true });
    assumptionsByField.set(a.field_key, a);
  }

  const overridesByField = new Map<string, ResolverPolicyOverride>();
  for (const o of [...policyOverrides].sort((x, y) => x.field_key.localeCompare(y.field_key))) {
    if (!o.reason?.trim() || !o.created_by || !o.created_at || !o.policy_id || !o.policy_version) { errors.push({ code: "INVALID_POLICY_OVERRIDE", field_key: o.field_key, message: `Override ${o.id} is incomplete.`, blocking: true }); continue; }
    if (o.policy_id !== policy.id || o.policy_version !== policy.policy_version) { errors.push({ code: "STALE_POLICY_OVERRIDE", field_key: o.field_key, message: `Override ${o.id} is not bound to ${policy.policy_code} ${policy.policy_version}.`, blocking: true }); continue; }
    overridesByField.set(o.field_key, o);
  }

  const foundational = assumptionsByField.get("project.capacity_mw_ac")?.value ?? currentFacts(projectFacts, "project.capacity_mw_ac")[0]?.value ?? project.capacity_mw_ac;
  const capacity = typeof foundational === "number" ? foundational : NaN;

  for (const def of FIELD_DEFINITIONS) {
    const facts = currentFacts(projectFacts, def.path);
    if (facts.length > 1) { errors.push({ code: "DUPLICATE_CURRENT_FACT", field_key: def.path, message: `Multiple current facts exist for ${def.path}.`, blocking: true }); continue; }
    const fact = facts[0], scenario = assumptionsByField.get(def.path), override = overridesByField.get(def.path);
    const policyCandidates = def.policy_default_key && Number.isFinite(capacity) ? policyValues.filter((p) => p.field_key === def.policy_default_key && p.value_classification === "CALCULATION_DEFAULT" && applies(p, capacity)) : [];
    if (policyCandidates.length > 1) { errors.push({ code: "POLICY_CONFIGURATION_ERROR", field_key: def.path, message: `Multiple applicable policy defaults exist for ${def.path}.`, blocking: true }); continue; }
    const policyDefault = policyCandidates[0];

    if (override) {
      if (!policyDefault) { errors.push({ code: "POLICY_CONFIGURATION_ERROR", field_key: def.path, message: `Override exists but no applicable calculation policy value exists for ${def.path}.`, blocking: true }); continue; }
      if (canonicalJson(override.policy_value) !== canonicalJson(policyDefault.value)) { errors.push({ code: "STALE_POLICY_OVERRIDE", field_key: def.path, message: `Override original value no longer matches policy value for ${def.path}.`, blocking: true }); continue; }
      setPath(draft, def.path, override.override_value);
      resolved_fields[def.path] = { field_key: def.path, value: override.override_value, unit: def.unit, resolution_source: "POLICY_OVERRIDE", source_record_id: override.id, source_record_type: "POLICY_OVERRIDE", policy_default_used: false, policy_value: policyDefault.value, override_used: true, override_reason: override.reason };
      warnings.push({ code: "POLICY_OVERRIDE_USED", field_key: def.path, message: `Registered policy override used for ${def.path}.`, blocking: false });
      continue;
    }

    if (scenario && def.allowScenario !== false) {
      if (def.policy_controlled && policyDefault && canonicalJson(scenario.value) !== canonicalJson(policyDefault.value)) { errors.push({ code: "UNREGISTERED_POLICY_OVERRIDE", field_key: def.path, message: `${def.path} is policy-controlled and differs from policy without a registered override.`, blocking: true }); continue; }
      if (def.unit && scenario.unit && scenario.unit !== def.unit) { errors.push({ code: "UNIT_MISMATCH", field_key: def.path, message: `${def.path} requires ${def.unit}, received ${scenario.unit}.`, blocking: true }); continue; }
      setPath(draft, def.path, scenario.value);
      resolved_fields[def.path] = { field_key: def.path, value: scenario.value, unit: def.unit, resolution_source: "SCENARIO_ASSUMPTION", source_record_id: scenario.id, source_record_type: scenario.source_type ?? "SCENARIO_ASSUMPTION", policy_default_used: false, override_used: false };
      if (fact?.confidence_status === "VERIFIED") warnings.push({ code: "SCENARIO_ASSUMPTION_OVERRIDES_VERIFIED_FACT", field_key: def.path, message: `Scenario value overrides a verified project fact for ${def.path}.`, blocking: false });
      continue;
    }

    if (fact && def.allowFact !== false && fact.confidence_status !== "DISPUTED") {
      if (def.unit && fact.unit && fact.unit !== def.unit) { errors.push({ code: "UNIT_MISMATCH", field_key: def.path, message: `${def.path} requires ${def.unit}, received ${fact.unit}.`, blocking: true }); continue; }
      const verified = fact.confidence_status === "VERIFIED";
      const source: ResolutionSource = verified ? "VERIFIED_PROJECT_FACT" : fact.source_type.includes("DOCUMENT") ? "DOCUMENT_FACT" : fact.source_type === "USER_ASSERTION" ? "USER_ASSERTION" : "PROJECT_FACT";
      setPath(draft, def.path, fact.value);
      resolved_fields[def.path] = { field_key: def.path, value: fact.value, unit: def.unit, resolution_source: source, source_record_id: fact.id, source_record_type: "PROJECT_FACT", source_strength: fact.source_type, verification_status: fact.confidence_status, policy_default_used: false, override_used: false };
      if (!verified) warnings.push({ code: fact.source_type === "USER_ASSERTION" ? "USER_ASSERTION_USED" : "UNVERIFIED_FACT_USED", field_key: def.path, message: `Non-verified project fact used for ${def.path}.`, blocking: false });
      continue;
    }

    if (policyDefault) {
      setPath(draft, def.path, policyDefault.value);
      resolved_fields[def.path] = { field_key: def.path, value: policyDefault.value, unit: def.unit, resolution_source: "POLICY_DEFAULT", source_record_id: policyDefault.id, source_record_type: "UNDERWRITING_POLICY_VALUE", policy_default_used: true, policy_value: policyDefault.value, override_used: false };
      warnings.push({ code: "POLICY_DEFAULT_USED", field_key: def.path, message: `Policy calculation default used for ${def.path}.`, blocking: false });
      continue;
    }

    if (def.required) missing_fields.push({ field_key: def.path, required_for: "CALCULATION", reason: fact?.confidence_status === "DISPUTED" ? "DISPUTED_FACT_NOT_AUTO_USED" : "NO_SCENARIO_FACT_OR_POLICY_VALUE" });
  }

  if (!resolved_fields["project.technology"] && project.technology) setPath(draft, "project.technology", project.technology);
  if (!resolved_fields["project.country_code"] && project.country_code) setPath(draft, "project.country_code", project.country_code);
  if (!resolved_fields["project.state_code"] && project.state_code) setPath(draft, "project.state_code", project.state_code);
  if (!resolved_fields["project.capacity_mw_ac"] && project.capacity_mw_ac !== undefined) setPath(draft, "project.capacity_mw_ac", project.capacity_mw_ac);

  const options = (draft.calculation_options ?? {}) as Record<string, unknown>;
  if (options.tax_module_enabled === true) for (const path of ["tax_credit.bonus_depreciation_pct", "tax_credit.federal_tax_rate", "tax_credit.sponsor_tax_appetite_pct"]) if (!resolved_fields[path]) missing_fields.push({ field_key: path, required_for: "CALCULATION", reason: "REQUIRED_WHEN_TAX_MODULE_ENABLED" });
  const downside = (draft.downside ?? {}) as Record<string, unknown>;
  if (downside.downside_type === "ILLUSTRATIVE_MULTIPLIER" && !resolved_fields["downside.downside_generation_multiplier"]) missing_fields.push({ field_key: "downside.downside_generation_multiplier", required_for: "CALCULATION", reason: "REQUIRED_FOR_ILLUSTRATIVE_DOWNSIDE" });
  if (downside.downside_type === "EXPLICIT_GENERATION" && !resolved_fields["downside.annual_downside_generation_mwh"]) missing_fields.push({ field_key: "downside.annual_downside_generation_mwh", required_for: "CALCULATION", reason: "REQUIRED_FOR_EXPLICIT_DOWNSIDE" });

  let finance_input: ProjectFinanceInput | null = null;
  if (missing_fields.length === 0 && !errors.some((e) => e.blocking)) {
    const validation = validateProjectFinanceInput(draft);
    if (validation.success) finance_input = validation.data;
    else for (const err of validation.errors) errors.push({ code: "INVALID_RESOLVED_INPUT", field_key: err.field, message: `${err.code}: ${err.message}`, blocking: true });
  }

  const input_hash = finance_input ? hashFinanceInput(finance_input) : null;
  const input_snapshot = { finance_input, provenance: resolved_fields, policy_context: { policy_id: policy.id, policy_code: policy.policy_code, policy_version: policy.policy_version }, resolution: { resolver_version: SCENARIO_RESOLVER_VERSION } };
  const order = new Map(FIELD_DEFINITIONS.map((d, i) => [d.path, i]));

  return { project_id: project.id, scenario_id, finance_input, resolved_fields, missing_fields: [...missing_fields].sort((a, b) => (order.get(a.field_key) ?? 999) - (order.get(b.field_key) ?? 999)), warnings, errors, calculation_ready: finance_input !== null, policy_code: policy.policy_code, policy_version: policy.policy_version, resolver_version: SCENARIO_RESOLVER_VERSION, input_hash, input_snapshot };
}

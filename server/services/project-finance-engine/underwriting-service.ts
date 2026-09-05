import { createHash } from "node:crypto";

import { canonicalJson } from "./scenario-resolver";
import {
  evaluateUnderwriting,
  type FinanceResultForUnderwriting,
  type PolicyOverrideV1,
  type SourceStrength,
  type UnderwritingFactsV1,
  type UnderwritingPolicyV1,
  type UnderwritingResultV1,
} from "./underwriting-engine";
import type { OrganizationContext } from "./calculation-service";

export const UNDERWRITING_ENGINE_VERSION = "0.1.0";

export type UnderwritingServiceErrorCode =
  | "UNDERWRITING_CALCULATION_NOT_FOUND"
  | "CALCULATION_NOT_UNDERWRITABLE"
  | "CALCULATION_CONTEXT_MISMATCH"
  | "CALCULATION_STALE"
  | "CALCULATION_CONTEXT_STALE"
  | "UNDERWRITING_POLICY_NOT_FOUND"
  | "UNDERWRITING_POLICY_CONFIGURATION_ERROR"
  | "POLICY_CALCULATION_MISMATCH"
  | "UNDERWRITING_ENGINE_FAILED"
  | "INVALID_UNDERWRITING_RESULT"
  | "UNDERWRITING_PERSISTENCE_FAILED"
  | "IDEMPOTENCY_KEY_CONFLICT";

export class UnderwritingServiceError extends Error {
  constructor(
    public readonly code: UnderwritingServiceErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "UnderwritingServiceError";
  }
}

export interface UnderwritingProjectRecord {
  id: string;
  organization_id: string;
  technology: string;
  country_code: string;
  capacity_mw_ac: number | null;
  development_status: string | null;
  revenue_structure: string | null;
  archived_at?: string | null;
}

export interface UnderwritingScenarioRecord {
  id: string;
  organization_id: string;
  project_id: string;
  status: "DRAFT" | "READY" | "CALCULATED" | "STALE" | "ARCHIVED";
  archived_at?: string | null;
}

export interface UnderwritingCalculationRecord {
  id: string;
  organization_id: string;
  project_id: string;
  scenario_id: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  calculation_engine_version: string;
  resolver_version: string;
  underwriting_policy_id: string | null;
  underwriting_policy_version: string | null;
  input_hash: string;
  result_hash: string | null;
  input_snapshot_json: Record<string, unknown>;
}

export interface UnderwritingFactRecord {
  id: string;
  field_key: string;
  value: unknown;
  source_type: string;
  confidence_status: string;
  source_document_id?: string | null;
}

export interface UnderwritingResolutionContext {
  project: UnderwritingProjectRecord;
  scenario: UnderwritingScenarioRecord;
  calculation: UnderwritingCalculationRecord;
  financeResult: FinanceResultForUnderwriting;
  policy: UnderwritingPolicyV1 & { id: string };
  policyOverrides: PolicyOverrideV1[];
  underwritingFacts: UnderwritingFactRecord[];
}

export interface UnderwritingRunRecord {
  id: string;
  organization_id: string;
  project_id: string;
  scenario_id: string;
  calculation_run_id: string;
  underwriting_policy_id: string;
  underwriting_policy_version: string;
  execution_status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  underwriting_engine_version: string;
  underwriting_input_snapshot_json: Record<string, unknown>;
  underwriting_input_hash: string;
  underwriting_result_hash: string | null;
  financial_profile: string | null;
  financing_readiness: string | null;
  overall_status: string | null;
  idempotency_key: string | null;
}

export interface PersistedUnderwritingBundle {
  run: UnderwritingRunRecord;
  rule_results: UnderwritingResultV1["rule_results"];
  risks: UnderwritingResultV1["risks"];
  conditions: UnderwritingResultV1["conditions"];
  missing_information: UnderwritingResultV1["missing_information"];
  lender_fit: UnderwritingResultV1["lender_fit"];
  recommendations: UnderwritingResultV1["recommendations"];
}

export interface UnderwritingRepository {
  loadUnderwritingContext(args: {
    context: OrganizationContext;
    projectId: string;
    scenarioId: string;
    calculationRunId: string;
    policySelector: { policyId?: string; policyCode?: string; policyVersion?: string };
  }): Promise<UnderwritingResolutionContext>;
  findByIdempotencyKey(context: OrganizationContext, key: string): Promise<UnderwritingRunRecord | null>;
  createRunningRun(args: {
    context: OrganizationContext;
    projectId: string;
    scenarioId: string;
    calculationRunId: string;
    policy: UnderwritingPolicyV1 & { id: string };
    inputSnapshot: Record<string, unknown>;
    inputHash: string;
    idempotencyKey?: string;
  }): Promise<UnderwritingRunRecord>;
  persistSuccessfulRunAtomic(args: {
    context: OrganizationContext;
    runId: string;
    result: UnderwritingResultV1;
    resultHash: string;
  }): Promise<UnderwritingRunRecord>;
  markRunFailed(args: { context: OrganizationContext; runId: string; failureCode: string; failureDetails?: Record<string, unknown> }): Promise<void>;
  getUnderwritingRun(context: OrganizationContext, runId: string): Promise<PersistedUnderwritingBundle | null>;
  listUnderwritingRuns(context: OrganizationContext, scenarioId: string): Promise<UnderwritingRunRecord[]>;
}

const sourceStrength = (source: string): SourceStrength => {
  if (source === "EXECUTED_DOCUMENT") return "EXECUTED_DOCUMENT";
  if (source === "INDEPENDENT_ENGINEER_REPORT") return "INDEPENDENT_THIRD_PARTY_REPORT";
  if (source === "LENDER_QUOTE") return "LENDER_QUOTE";
  if (source === "SPONSOR_DOCUMENT") return "SPONSOR_DOCUMENT";
  if (source === "USER_ASSERTION") return "USER_ASSERTION";
  if (source === "ECOXCHANGE_ASSUMPTION") return "ECOXCHANGE_ASSUMPTION";
  return "UNKNOWN";
};

function factMap(rows: readonly UnderwritingFactRecord[]): Map<string, UnderwritingFactRecord> {
  const map = new Map<string, UnderwritingFactRecord>();
  [...rows].sort((a, b) => a.field_key.localeCompare(b.field_key)).forEach((row) => {
    if (map.has(row.field_key)) throw new UnderwritingServiceError("INVALID_UNDERWRITING_RESULT", `Duplicate current underwriting fact: ${row.field_key}`);
    map.set(row.field_key, row);
  });
  return map;
}

function financeInput(snapshot: Record<string, unknown>): Record<string, any> {
  const value = snapshot.finance_input;
  if (!value || typeof value !== "object") throw new UnderwritingServiceError("CALCULATION_NOT_UNDERWRITABLE", "Calculation run does not contain an immutable finance input snapshot.");
  return value as Record<string, any>;
}

function enumFact<T extends string>(facts: Map<string, UnderwritingFactRecord>, key: string, fallback: T): T {
  const value = facts.get(key)?.value;
  return typeof value === "string" ? value as T : fallback;
}

function optionalBool(facts: Map<string, UnderwritingFactRecord>, key: string): boolean | null {
  const value = facts.get(key)?.value;
  return typeof value === "boolean" ? value : null;
}

export function assembleUnderwritingFacts(loaded: UnderwritingResolutionContext): { facts: UnderwritingFactsV1; snapshotFacts: Record<string, unknown> } {
  const input = financeInput(loaded.calculation.input_snapshot_json);
  const facts = factMap(loaded.underwritingFacts);
  const sourceStrengthMap: Record<string, SourceStrength> = {};
  const snapshotFacts: Record<string, unknown> = {};
  for (const [key, row] of facts) {
    sourceStrengthMap[key] = sourceStrength(row.source_type);
    snapshotFacts[key] = {
      value: structuredClone(row.value),
      source: row.source_type,
      source_record_id: row.id,
      source_document_id: row.source_document_id ?? null,
      verification_status: row.confidence_status,
    };
  }

  const projectStage = (loaded.project.development_status ?? "UNKNOWN") as UnderwritingFactsV1["projectStage"];
  const resolved: UnderwritingFactsV1 = {
    technology: String(input.project?.technology ?? loaded.project.technology),
    capacityMwAc: Number(input.project?.capacity_mw_ac ?? loaded.project.capacity_mw_ac),
    countryCode: String(input.project?.country_code ?? loaded.project.country_code),
    revenueStructure: (loaded.project.revenue_structure ?? "UNKNOWN") as UnderwritingFactsV1["revenueStructure"],
    projectStage,
    ppaTermYears: Number(input.revenue?.ppa_term_years),
    ppaStatus: enumFact(facts, "underwriting.ppa_status", "UNKNOWN"),
    offtakerCredit: enumFact(facts, "underwriting.offtaker_credit_status", "UNKNOWN"),
    itcEligibility: enumFact(facts, "underwriting.itc_eligibility_status", "UNKNOWN"),
    itcBuyerStatus: enumFact(facts, "underwriting.itc_buyer_status", "UNIDENTIFIED"),
    sponsorTaxAppetite: enumFact(facts, "underwriting.sponsor_tax_appetite", "UNKNOWN"),
    epcStatus: enumFact(facts, "underwriting.epc_status", "UNKNOWN"),
    epcPriceStructure: enumFact(facts, "underwriting.epc_price_structure", "UNKNOWN"),
    contractorQuality: enumFact(facts, "underwriting.contractor_quality", "UNKNOWN"),
    performanceGuarantee: optionalBool(facts, "underwriting.performance_guarantee"),
    liquidatedDamages: optionalBool(facts, "underwriting.liquidated_damages"),
    interconnectionStatus: enumFact(facts, "underwriting.interconnection_status", "UNKNOWN"),
    permitsStatus: enumFact(facts, "underwriting.permits_status", "UNKNOWN"),
    siteControlStatus: enumFact(facts, "underwriting.site_control_status", "UNKNOWN"),
    omStatus: enumFact(facts, "underwriting.om_status", "UNKNOWN"),
    insuranceStatus: enumFact(facts, "underwriting.insurance_status", "UNKNOWN"),
    independentEngineerStatus: enumFact(facts, "underwriting.independent_engineer_status", "UNKNOWN"),
    sponsorExperience: enumFact(facts, "underwriting.sponsor_experience", "UNKNOWN"),
    completionSupport: enumFact(facts, "underwriting.completion_support", "UNKNOWN"),
    costOverrunSupport: enumFact(facts, "underwriting.cost_overrun_support", "UNKNOWN"),
    equityCommitment: enumFact(facts, "underwriting.equity_commitment", "UNKNOWN"),
    dsraMonthsActual: Number(input.reserves?.dsra_months),
    closingCostsUsd: Number.isFinite(Number(input.transaction_costs?.closing_costs)) ? Number(input.transaction_costs.closing_costs) : null,
    capexIncludesContingency: optionalBool(facts, "underwriting.capex_includes_contingency"),
    contingencyPctActual: typeof facts.get("underwriting.contingency_pct_actual")?.value === "number" ? facts.get("underwriting.contingency_pct_actual")!.value as number : null,
    sourceStrength: sourceStrengthMap,
  };
  return { facts: resolved, snapshotFacts };
}

function effectivePolicyValue(policy: UnderwritingPolicyV1, overrides: readonly PolicyOverrideV1[], field: PolicyOverrideV1["fieldKey"]): number {
  const override = overrides.find((item) => item.fieldKey === field);
  if (override) return override.effectiveValue;
  if (field === "targetP50Dscr") return policy.targetP50Dscr;
  if (field === "dsraMonths") return policy.dsraMonths;
  throw new Error("maxLtc requires capacity-aware resolution");
}

function policyMaxLtc(policy: UnderwritingPolicyV1, capacity: number): number {
  const matches = policy.ltcBands.filter((band) => capacity >= band.minMw && (band.maxMwExclusive == null || capacity < band.maxMwExclusive));
  if (matches.length !== 1) throw new UnderwritingServiceError("UNDERWRITING_POLICY_CONFIGURATION_ERROR", "Policy does not resolve exactly one max-LTC value.");
  return matches[0].maxLtc;
}

export function assertPolicyCalculationCompatibility(loaded: UnderwritingResolutionContext, facts: UnderwritingFactsV1): void {
  const assumptions = loaded.financeResult.calculationAssumptions;
  const dscr = effectivePolicyValue(loaded.policy, loaded.policyOverrides, "targetP50Dscr");
  const dsra = effectivePolicyValue(loaded.policy, loaded.policyOverrides, "dsraMonths");
  const maxLtcOverride = loaded.policyOverrides.find((item) => item.fieldKey === "maxLtc");
  const maxLtc = maxLtcOverride?.effectiveValue ?? policyMaxLtc(loaded.policy, facts.capacityMwAc);
  const mismatch = Math.abs(assumptions.targetP50Dscr - dscr) > 1e-9
    || Math.abs(assumptions.maxLtc - maxLtc) > 1e-9
    || Math.abs(assumptions.dsraMonths - dsra) > 1e-9;
  if (mismatch) throw new UnderwritingServiceError("POLICY_CALCULATION_MISMATCH", "Calculation assumptions are incompatible with the selected underwriting policy. A new calculation or valid registered override is required.", { calculation: assumptions, effectivePolicy: { targetP50Dscr: dscr, maxLtc, dsraMonths: dsra } });
}

export function buildUnderwritingInputSnapshot(loaded: UnderwritingResolutionContext, factsSnapshot: Record<string, unknown>): Record<string, unknown> {
  return {
    calculation: {
      calculation_run_id: loaded.calculation.id,
      calculation_engine_version: loaded.calculation.calculation_engine_version,
      resolver_version: loaded.calculation.resolver_version,
      input_hash: loaded.calculation.input_hash,
      result_hash: loaded.calculation.result_hash,
      finance_result: structuredClone(loaded.financeResult),
    },
    facts: structuredClone(factsSnapshot),
    policy: {
      policy_id: loaded.policy.id,
      policy_code: loaded.policy.policyCode,
      policy_version: loaded.policy.policyVersion,
      effective_policy: structuredClone(loaded.policy),
      overrides: structuredClone(loaded.policyOverrides),
    },
    underwriting_engine_version: UNDERWRITING_ENGINE_VERSION,
  };
}

export function hashUnderwritingInput(snapshot: Record<string, unknown>): string {
  return createHash("sha256").update(canonicalJson(snapshot)).digest("hex");
}

function canonicalUnderwritingResult(result: UnderwritingResultV1): Record<string, unknown> {
  const clone = structuredClone(result);
  clone.rule_results.sort((a, b) => a.rule_id.localeCompare(b.rule_id));
  clone.risks.sort((a, b) => `${a.category}:${a.risk_code}`.localeCompare(`${b.category}:${b.risk_code}`));
  clone.conditions.sort((a, b) => a.condition_code.localeCompare(b.condition_code));
  clone.missing_information.sort((a, b) => a.field_key.localeCompare(b.field_key));
  clone.lender_fit.sort((a, b) => a.lender_category.localeCompare(b.lender_category));
  clone.recommendations.sort();
  return clone as unknown as Record<string, unknown>;
}

export function hashUnderwritingResult(result: UnderwritingResultV1): string {
  return createHash("sha256").update(canonicalJson(canonicalUnderwritingResult(result))).digest("hex");
}

function validateResult(result: UnderwritingResultV1): void {
  if (!result.status || !result.financial_profile || !result.financing_readiness) throw new UnderwritingServiceError("INVALID_UNDERWRITING_RESULT", "Underwriting engine omitted a required headline assessment field.");
  const ids = new Set<string>();
  for (const rule of result.rule_results) {
    const key = `${rule.rule_id}:${rule.rule_version}`;
    if (ids.has(key)) throw new UnderwritingServiceError("INVALID_UNDERWRITING_RESULT", `Duplicate underwriting rule result: ${key}`);
    ids.add(key);
  }
  if (result.summary_metadata.condition_count !== result.conditions.length || result.summary_metadata.missing_information_count !== result.missing_information.length) {
    throw new UnderwritingServiceError("INVALID_UNDERWRITING_RESULT", "Underwriting summary counts do not match normalized result children.");
  }
}

function idempotencyMatches(run: UnderwritingRunRecord, args: { calculationRunId: string; policyId: string; policyVersion: string; inputHash: string }): boolean {
  return run.calculation_run_id === args.calculationRunId
    && run.underwriting_policy_id === args.policyId
    && run.underwriting_policy_version === args.policyVersion
    && run.underwriting_input_hash === args.inputHash;
}

export class UnderwritingService {
  constructor(
    private readonly repository: UnderwritingRepository,
    private readonly engine: typeof evaluateUnderwriting = evaluateUnderwriting,
  ) {}

  async underwriteCalculation(args: {
    context: OrganizationContext;
    projectId: string;
    scenarioId: string;
    calculationRunId: string;
    policyId?: string;
    policyCode?: string;
    policyVersion?: string;
    idempotencyKey?: string;
  }): Promise<PersistedUnderwritingBundle> {
    const loaded = await this.repository.loadUnderwritingContext({
      context: args.context,
      projectId: args.projectId,
      scenarioId: args.scenarioId,
      calculationRunId: args.calculationRunId,
      policySelector: { policyId: args.policyId, policyCode: args.policyCode, policyVersion: args.policyVersion },
    });
    if (loaded.project.id !== args.projectId || loaded.scenario.id !== args.scenarioId || loaded.calculation.id !== args.calculationRunId) throw new UnderwritingServiceError("CALCULATION_CONTEXT_MISMATCH", "Calculation/project/scenario context does not match the authorized request.");
    if (loaded.project.organization_id !== args.context.organizationId || loaded.scenario.organization_id !== args.context.organizationId || loaded.calculation.organization_id !== args.context.organizationId) throw new UnderwritingServiceError("CALCULATION_CONTEXT_MISMATCH", "Cross-tenant underwriting context is not permitted.");
    if (loaded.calculation.project_id !== args.projectId || loaded.calculation.scenario_id !== args.scenarioId) throw new UnderwritingServiceError("CALCULATION_CONTEXT_MISMATCH", "Calculation does not belong to the requested project/scenario.");
    if (loaded.calculation.status !== "SUCCESS") throw new UnderwritingServiceError("CALCULATION_NOT_UNDERWRITABLE", "Only successful immutable calculation runs can be underwritten.");
    if (!loaded.financeResult.reconciliation.debtReconciled || !loaded.financeResult.reconciliation.sourcesUsesReconciled) throw new UnderwritingServiceError("CALCULATION_NOT_UNDERWRITABLE", "Persisted calculation reconciliation is invalid.");
    if (loaded.scenario.status === "STALE") throw new UnderwritingServiceError("CALCULATION_STALE", "Scenario is stale because a finance-affecting input changed; recalculate before current underwriting.");
    if (loaded.project.archived_at || loaded.scenario.status === "ARCHIVED" || loaded.scenario.archived_at) throw new UnderwritingServiceError("CALCULATION_CONTEXT_STALE", "Archived project/scenario cannot start a new underwriting assessment.");

    const assembled = assembleUnderwritingFacts(loaded);
    assertPolicyCalculationCompatibility(loaded, assembled.facts);
    const snapshot = buildUnderwritingInputSnapshot(loaded, assembled.snapshotFacts);
    const inputHash = hashUnderwritingInput(snapshot);

    if (args.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(args.context, args.idempotencyKey);
      if (existing) {
        if (!idempotencyMatches(existing, { calculationRunId: args.calculationRunId, policyId: loaded.policy.id, policyVersion: loaded.policy.policyVersion, inputHash })) throw new UnderwritingServiceError("IDEMPOTENCY_KEY_CONFLICT", "Idempotency key was already used for a different underwriting request.");
        const stored = await this.repository.getUnderwritingRun(args.context, existing.id);
        if (stored) return stored;
      }
    }

    const run = await this.repository.createRunningRun({ context: args.context, projectId: args.projectId, scenarioId: args.scenarioId, calculationRunId: args.calculationRunId, policy: loaded.policy, inputSnapshot: snapshot, inputHash, idempotencyKey: args.idempotencyKey });
    let result: UnderwritingResultV1;
    try {
      result = this.engine({ projectFacts: assembled.facts, financeResult: loaded.financeResult, policy: loaded.policy, overrides: loaded.policyOverrides });
      validateResult(result);
    } catch (error) {
      const details = error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) };
      await this.repository.markRunFailed({ context: args.context, runId: run.id, failureCode: "UNDERWRITING_ENGINE_FAILED", failureDetails: details });
      throw error instanceof UnderwritingServiceError ? error : new UnderwritingServiceError("UNDERWRITING_ENGINE_FAILED", "Deterministic underwriting engine failed.", details);
    }

    const resultHash = hashUnderwritingResult(result);
    try {
      const completed = await this.repository.persistSuccessfulRunAtomic({ context: args.context, runId: run.id, result, resultHash });
      const stored = await this.repository.getUnderwritingRun(args.context, completed.id);
      if (!stored) throw new Error("Persisted underwriting run could not be reloaded.");
      return stored;
    } catch (error) {
      try { await this.repository.markRunFailed({ context: args.context, runId: run.id, failureCode: "UNDERWRITING_PERSISTENCE_FAILED", failureDetails: error instanceof Error ? { message: error.message } : undefined }); } catch { /* persistence failure may have rolled back/invalidated connection */ }
      throw new UnderwritingServiceError("UNDERWRITING_PERSISTENCE_FAILED", "Underwriting result could not be persisted atomically.");
    }
  }

  async reproducePersistedRun(context: OrganizationContext, runId: string): Promise<{ expectedHash: string; actualHash: string; matches: boolean }> {
    const stored = await this.repository.getUnderwritingRun(context, runId);
    if (!stored) throw new UnderwritingServiceError("UNDERWRITING_CALCULATION_NOT_FOUND", "Underwriting run was not found in the authorized tenant.");
    const snapshot = stored.run.underwriting_input_snapshot_json as any;
    const factsSnapshot = snapshot?.facts ?? {};
    const factRows: UnderwritingFactRecord[] = Object.entries(factsSnapshot).map(([field_key, value]: [string, any]) => ({ id: value.source_record_id ?? field_key, field_key, value: value.value, source_type: value.source ?? "UNKNOWN", confidence_status: value.verification_status ?? "UNKNOWN", source_document_id: value.source_document_id ?? null }));
    const policy = snapshot?.policy?.effective_policy as UnderwritingPolicyV1 & { id: string };
    const calculation = snapshot?.calculation;
    if (!policy || !calculation?.finance_result) throw new UnderwritingServiceError("INVALID_UNDERWRITING_RESULT", "Historical underwriting snapshot is incomplete.");
    const fakeLoaded: UnderwritingResolutionContext = {
      project: { id: stored.run.project_id, organization_id: stored.run.organization_id, technology: calculation.finance_result?.technology ?? "SOLAR_PV", country_code: "US", capacity_mw_ac: calculation.finance_result?.capacityMwAc ?? null, development_status: null, revenue_structure: "FULLY_CONTRACTED" },
      scenario: { id: stored.run.scenario_id, organization_id: stored.run.organization_id, project_id: stored.run.project_id, status: "CALCULATED" },
      calculation: { id: stored.run.calculation_run_id, organization_id: stored.run.organization_id, project_id: stored.run.project_id, scenario_id: stored.run.scenario_id, status: "SUCCESS", calculation_engine_version: calculation.calculation_engine_version, resolver_version: calculation.resolver_version, underwriting_policy_id: policy.id, underwriting_policy_version: policy.policyVersion, input_hash: calculation.input_hash, result_hash: calculation.result_hash, input_snapshot_json: { finance_input: snapshot?.calculation?.finance_input ?? {} } },
      financeResult: calculation.finance_result,
      policy,
      policyOverrides: snapshot?.policy?.overrides ?? [],
      underwritingFacts: factRows,
    };
    // Reproduction uses the frozen structured facts by rebuilding only the readiness facts; finance result/policy are frozen directly.
    const rebuilt = assembleUnderwritingFacts(fakeLoaded).facts;
    const result = this.engine({ projectFacts: rebuilt, financeResult: calculation.finance_result, policy, overrides: snapshot?.policy?.overrides ?? [] });
    const actualHash = hashUnderwritingResult(result);
    return { expectedHash: stored.run.underwriting_result_hash ?? "", actualHash, matches: stored.run.underwriting_result_hash === actualHash };
  }
}

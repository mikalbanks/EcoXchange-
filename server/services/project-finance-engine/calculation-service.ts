import { createHash } from "node:crypto";

import { CALCULATION_ENGINE_VERSION } from "./core";
import { validateProjectFinanceInput, type CalculationWarning, type MetricTrace, type ProjectFinanceInput } from "./domain-contracts";
import { calculateProjectFinanceCore, type ProjectFinanceCoreResult } from "./returns-downside";
import {
  canonicalJson,
  resolveScenarioInput,
  SCENARIO_RESOLVER_VERSION,
  type ResolvedScenario,
  type ResolverFact,
  type ResolverPolicy,
  type ResolverPolicyOverride,
  type ResolverPolicyValue,
  type ResolverProject,
  type ResolverScenarioAssumption,
} from "./scenario-resolver";

export type CalculationServiceErrorCode =
  | "PROJECT_NOT_FOUND"
  | "SCENARIO_NOT_FOUND"
  | "SCENARIO_PROJECT_MISMATCH"
  | "SCENARIO_ARCHIVED"
  | "PROJECT_ARCHIVED"
  | "POLICY_NOT_FOUND"
  | "POLICY_CONFIGURATION_ERROR"
  | "CALCULATION_INPUT_INCOMPLETE"
  | "INVALID_RESOLVED_INPUT"
  | "OUT_OF_SCOPE_FOR_CALCULATION"
  | "FINANCE_ENGINE_FAILED"
  | "CALCULATION_RECONCILIATION_FAILED"
  | "CALCULATION_PERSISTENCE_FAILED"
  | "IDEMPOTENCY_KEY_CONFLICT";

export class CalculationServiceError extends Error {
  constructor(
    public readonly code: CalculationServiceErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CalculationServiceError";
  }
}

export interface OrganizationContext {
  organizationId: string;
  actorUserId: string;
}

export interface CalculationProjectRecord extends ResolverProject {
  archived_at?: string | null;
}

export interface CalculationScenarioRecord {
  id: string;
  organization_id: string;
  project_id: string;
  status: "DRAFT" | "READY" | "CALCULATED" | "STALE" | "ARCHIVED";
  archived_at?: string | null;
}

export interface CalculationResolutionContext {
  project: CalculationProjectRecord;
  scenario: CalculationScenarioRecord;
  projectFacts: ResolverFact[];
  scenarioAssumptions: ResolverScenarioAssumption[];
  policy: ResolverPolicy;
  policyValues: ResolverPolicyValue[];
  policyOverrides: ResolverPolicyOverride[];
}

export interface CalculationRunRecord {
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
  idempotency_key: string | null;
  failure_code?: string | null;
  failure_details_json?: Record<string, unknown> | null;
}

export interface PersistedCalculationBundle {
  run: CalculationRunRecord;
  annual_project_cashflows: Array<Record<string, unknown>>;
  annual_debt_schedules: Array<Record<string, unknown>>;
  financing_result: Record<string, unknown>;
  tax_credit_result: Record<string, unknown>;
  capital_stack_result: Record<string, unknown>;
  return_result: Record<string, unknown>;
  downside_result: Record<string, unknown> | null;
  downside_cash_sweep_rows: Array<Record<string, unknown>>;
  reconciliation_result: Record<string, unknown>;
  warnings: CalculationWarning[];
  metric_traces: MetricTrace[];
}

export interface CalculationRepository {
  loadResolutionContext(
    context: OrganizationContext,
    projectId: string,
    scenarioId: string,
    policySelector: { policyId?: string; policyCode?: string; policyVersion?: string },
  ): Promise<CalculationResolutionContext>;
  findByIdempotencyKey(context: OrganizationContext, key: string): Promise<CalculationRunRecord | null>;
  createRunningRun(args: {
    context: OrganizationContext;
    projectId: string;
    scenarioId: string;
    policy: ResolverPolicy;
    inputHash: string;
    inputSnapshot: Record<string, unknown>;
    idempotencyKey?: string;
  }): Promise<CalculationRunRecord>;
  persistSuccessfulRunAtomic(args: {
    context: OrganizationContext;
    runId: string;
    resultHash: string;
    bundle: Omit<PersistedCalculationBundle, "run">;
  }): Promise<CalculationRunRecord>;
  markRunFailed(args: {
    context: OrganizationContext;
    runId: string;
    failureCode: string;
    failureDetails?: Record<string, unknown>;
  }): Promise<void>;
  getCalculationRun(context: OrganizationContext, runId: string): Promise<PersistedCalculationBundle | null>;
}

function canonicalResultPayload(result: ProjectFinanceCoreResult): Record<string, unknown> {
  return {
    annual_project_cashflows: result.operating.annual_project_cash_flows,
    annual_debt_schedule: result.debt.annual_debt_schedule,
    financing_summary: result.debt.financing_summary,
    tax_credit_result: result.capital_stack.tax_credit_result,
    capital_stack_result: result.capital_stack.capital_stack_result,
    return_result: result.returns,
    downside_result: result.downside,
    reconciliation: result.capital_stack.reconciliation,
    warnings: result.warnings,
    metric_traces: result.metric_traces,
  };
}

export function hashCalculationResult(result: ProjectFinanceCoreResult): string {
  return createHash("sha256").update(canonicalJson(canonicalResultPayload(result))).digest("hex");
}

function mapPersistenceBundle(result: ProjectFinanceCoreResult): Omit<PersistedCalculationBundle, "run"> {
  const annual_project_cashflows = result.operating.annual_project_cash_flows.map((row, index) => ({
    ...row,
    sponsor_operating_cash_flow: result.returns.sponsor_operating_cash_flows[index] ?? null,
    depreciation: index === 0 ? result.returns.bonus_depreciation : null,
    tax_shield: index === 0 ? result.returns.immediate_tax_shield : null,
  }));
  const financing = result.debt.financing_summary;
  const tax = result.capital_stack.tax_credit_result;
  const stack = result.capital_stack.capital_stack_result;
  const returns = result.returns;
  const downside = result.downside;

  return {
    annual_project_cashflows,
    annual_debt_schedules: result.debt.annual_debt_schedule.map((row) => ({ ...row })),
    financing_result: {
      dscr_sized_debt: financing.dscr_sized_debt,
      ltc_debt_limit: financing.ltc_debt_limit,
      permanent_debt: financing.permanent_debt,
      binding_constraint: financing.binding_constraint,
      debt_to_capex: financing.debt_to_capex,
      minimum_dscr: financing.minimum_dscr,
      minimum_dscr_year: financing.minimum_dscr_year,
      balloon_balance: financing.balloon_balance,
      lender_fee: result.capital_stack.lender_fee,
      dsra: result.capital_stack.dsra,
    },
    tax_credit_result: {
      ...tax,
      depreciable_basis: returns.depreciable_basis,
      bonus_depreciation: returns.bonus_depreciation,
      immediate_tax_shield: returns.immediate_tax_shield,
    },
    capital_stack_result: {
      project_capex: result.input.transaction_costs.project_capex,
      closing_costs: result.input.transaction_costs.closing_costs,
      lender_fee: result.capital_stack.lender_fee,
      dsra: result.capital_stack.dsra,
      other_financing_uses: result.input.transaction_costs.other_financing_uses,
      total_closing_uses: stack.total_closing_uses,
      permanent_debt: stack.permanent_debt,
      net_itc_proceeds: stack.net_itc_proceeds,
      other_permanent_sources: stack.other_sources,
      sponsor_equity: stack.sponsor_equity,
      debt_pct_total_uses: stack.permanent_debt_pct_total_uses,
      itc_pct_total_uses: stack.itc_proceeds_pct_total_uses,
      sponsor_equity_pct_total_uses: stack.sponsor_equity_pct_total_uses,
      other_sources_pct_total_uses: stack.other_sources_pct_total_uses ?? 0,
    },
    return_result: {
      levered_sponsor_cash_irr: returns.levered_sponsor_cash_irr.irr,
      levered_sponsor_cash_irr_status: returns.levered_sponsor_cash_irr.status,
      project_unlevered_cash_irr_before_tax_attributes: returns.project_unlevered_cash_irr_before_tax_attributes.irr,
      unlevered_irr_status: returns.project_unlevered_cash_irr_before_tax_attributes.status,
      sponsor_npv: returns.sponsor_npv,
      project_npv: returns.project_npv,
      simplified_sponsor_after_tax_irr: returns.simplified_sponsor_after_tax_irr?.irr ?? null,
      tax_module_enabled: result.input.calculation_options.tax_module_enabled,
      irr_warning_code: returns.levered_sponsor_cash_irr.warning ?? null,
    },
    downside_result: downside ? {
      downside_type: downside.downside_type,
      generation_source_type: downside.generation_source_type ?? "ILLUSTRATIVE_PERCENT_OF_P50",
      generation_multiplier: downside.generation_multiplier ?? null,
      minimum_downside_dscr: downside.minimum_downside_dscr,
      minimum_downside_dscr_year: downside.minimum_downside_dscr_year,
      full_repayment: downside.full_repayment,
      repayment_year: downside.repayment_year,
      unrepaid_balance: downside.unrepaid_balance,
      interest_shortfall: downside.interest_shortfall,
      is_lender_grade_p90: downside.generation_source_type === "INDEPENDENT_ENGINEER_P90",
    } : null,
    downside_cash_sweep_rows: downside?.cash_sweep_schedule.map((row) => ({ ...row })) ?? [],
    reconciliation_result: {
      debt_reconciliation_difference: result.debt.reconciliation.debt_reconciliation_difference,
      debt_reconciled: result.debt.reconciliation.debt_reconciled,
      sources_uses_difference: result.capital_stack.reconciliation.sources_uses_difference,
      sources_uses_reconciled: result.capital_stack.reconciliation.sources_uses_reconciled,
    },
    warnings: result.warnings.map((warning) => ({ ...warning })),
    metric_traces: result.metric_traces.map((trace) => ({ ...trace, dependencies: [...trace.dependencies] })),
  };
}

function assertResultIntegrity(result: ProjectFinanceCoreResult): void {
  if (!result.debt.reconciliation.debt_reconciled || !result.capital_stack.reconciliation.sources_uses_reconciled) {
    throw new CalculationServiceError("CALCULATION_RECONCILIATION_FAILED", "Calculation reconciliation did not pass.", {
      debt_reconciled: result.debt.reconciliation.debt_reconciled,
      sources_uses_reconciled: result.capital_stack.reconciliation.sources_uses_reconciled,
    });
  }
  const expectedYears = result.input.project.project_life_years;
  if (result.operating.annual_project_cash_flows.length !== expectedYears) {
    throw new CalculationServiceError("FINANCE_ENGINE_FAILED", "Finance engine returned an invalid annual cash-flow row count.", {
      expectedYears,
      actualRows: result.operating.annual_project_cash_flows.length,
    });
  }
  const cashYears = new Set(result.operating.annual_project_cash_flows.map((row) => row.year));
  const debtYears = new Set(result.debt.annual_debt_schedule.map((row) => row.year));
  if (cashYears.size !== result.operating.annual_project_cash_flows.length || debtYears.size !== result.debt.annual_debt_schedule.length) {
    throw new CalculationServiceError("FINANCE_ENGINE_FAILED", "Finance engine returned duplicate annual years.");
  }
}

function idempotencyMatches(existing: CalculationRunRecord, args: { projectId: string; scenarioId: string; policyId: string; policyVersion: string; inputHash: string }): boolean {
  return existing.project_id === args.projectId
    && existing.scenario_id === args.scenarioId
    && existing.underwriting_policy_id === args.policyId
    && existing.underwriting_policy_version === args.policyVersion
    && existing.input_hash === args.inputHash;
}

export class CalculationService {
  constructor(
    private readonly repository: CalculationRepository,
    private readonly financeEngine: (input: ProjectFinanceInput) => ProjectFinanceCoreResult = calculateProjectFinanceCore,
  ) {}

  async calculateScenario(args: {
    context: OrganizationContext;
    projectId: string;
    scenarioId: string;
    policyId?: string;
    policyCode?: string;
    policyVersion?: string;
    idempotencyKey?: string;
  }): Promise<PersistedCalculationBundle> {
    const loaded = await this.repository.loadResolutionContext(args.context, args.projectId, args.scenarioId, {
      policyId: args.policyId,
      policyCode: args.policyCode,
      policyVersion: args.policyVersion,
    });

    if (loaded.project.id !== args.projectId) throw new CalculationServiceError("PROJECT_NOT_FOUND", "Project was not found in the authorized tenant.");
    if (loaded.scenario.id !== args.scenarioId) throw new CalculationServiceError("SCENARIO_NOT_FOUND", "Scenario was not found in the authorized tenant.");
    if (loaded.scenario.project_id !== args.projectId) throw new CalculationServiceError("SCENARIO_PROJECT_MISMATCH", "Scenario does not belong to the requested project.");
    if (loaded.project.archived_at) throw new CalculationServiceError("PROJECT_ARCHIVED", "Archived projects cannot start new calculations.");
    if (loaded.scenario.status === "ARCHIVED" || loaded.scenario.archived_at) throw new CalculationServiceError("SCENARIO_ARCHIVED", "Archived scenarios cannot start new calculations.");

    const resolved: ResolvedScenario = resolveScenarioInput({
      project: loaded.project,
      scenario_id: loaded.scenario.id,
      projectFacts: loaded.projectFacts,
      scenarioAssumptions: loaded.scenarioAssumptions,
      policy: loaded.policy,
      policyValues: loaded.policyValues,
      policyOverrides: loaded.policyOverrides,
    });

    const blockingResolverError = resolved.errors.find((issue) => issue.blocking);
    if (blockingResolverError) {
      if (blockingResolverError.code === "OUT_OF_SCOPE_FOR_CALCULATION") throw new CalculationServiceError("OUT_OF_SCOPE_FOR_CALCULATION", blockingResolverError.message, { resolver: blockingResolverError });
      if (blockingResolverError.code === "POLICY_CONFIGURATION_ERROR") throw new CalculationServiceError("POLICY_CONFIGURATION_ERROR", blockingResolverError.message, { resolver: blockingResolverError });
      throw new CalculationServiceError("INVALID_RESOLVED_INPUT", blockingResolverError.message, { resolver: blockingResolverError });
    }
    if (!resolved.calculation_ready || !resolved.finance_input || resolved.missing_fields.length > 0) {
      throw new CalculationServiceError("CALCULATION_INPUT_INCOMPLETE", "Scenario does not resolve to a complete ProjectFinanceInput.", { missing_fields: resolved.missing_fields });
    }

    const validation = validateProjectFinanceInput(resolved.finance_input);
    if (!validation.success) throw new CalculationServiceError("INVALID_RESOLVED_INPUT", "Resolved ProjectFinanceInput failed Ticket 02 validation.", { errors: validation.errors });

    if (args.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(args.context, args.idempotencyKey);
      if (existing) {
        if (!idempotencyMatches(existing, {
          projectId: args.projectId,
          scenarioId: args.scenarioId,
          policyId: loaded.policy.id,
          policyVersion: loaded.policy.policy_version,
          inputHash: resolved.input_hash!,
        })) throw new CalculationServiceError("IDEMPOTENCY_KEY_CONFLICT", "Idempotency key was already used for a materially different calculation request.");
        const stored = await this.repository.getCalculationRun(args.context, existing.id);
        if (stored) return stored;
      }
    }

    const run = await this.repository.createRunningRun({
      context: args.context,
      projectId: args.projectId,
      scenarioId: args.scenarioId,
      policy: loaded.policy,
      inputHash: resolved.input_hash!,
      inputSnapshot: resolved.input_snapshot,
      idempotencyKey: args.idempotencyKey,
    });

    let result: ProjectFinanceCoreResult;
    try {
      result = this.financeEngine(validation.data);
      assertResultIntegrity(result);
    } catch (error) {
      const code = error instanceof CalculationServiceError ? error.code : "FINANCE_ENGINE_FAILED";
      const details = error instanceof CalculationServiceError ? error.details : { message: error instanceof Error ? error.message : String(error) };
      await this.repository.markRunFailed({ context: args.context, runId: run.id, failureCode: code, failureDetails: details });
      if (error instanceof CalculationServiceError) throw error;
      throw new CalculationServiceError("FINANCE_ENGINE_FAILED", "Finance engine execution failed after a valid immutable input snapshot was created.", details);
    }

    const resultHash = hashCalculationResult(result);
    const mapped = mapPersistenceBundle(result);
    try {
      const successfulRun = await this.repository.persistSuccessfulRunAtomic({ context: args.context, runId: run.id, resultHash, bundle: mapped });
      return { run: successfulRun, ...mapped };
    } catch (error) {
      try {
        await this.repository.markRunFailed({
          context: args.context,
          runId: run.id,
          failureCode: "CALCULATION_PERSISTENCE_FAILED",
          failureDetails: { message: error instanceof Error ? error.message : String(error) },
        });
      } catch {
        // Preserve the original persistence failure. A RUNNING run is still non-authoritative.
      }
      throw new CalculationServiceError("CALCULATION_PERSISTENCE_FAILED", "Calculated result could not be committed atomically; no SUCCESS result may be returned.");
    }
  }

  async getCalculationRun(context: OrganizationContext, runId: string): Promise<PersistedCalculationBundle> {
    const run = await this.repository.getCalculationRun(context, runId);
    if (!run) throw new CalculationServiceError("PROJECT_NOT_FOUND", "Calculation run was not found in the authorized tenant.");
    return run;
  }

  reproduceFromSnapshot(bundle: PersistedCalculationBundle): { result_hash: string; matches: boolean } {
    const snapshot = bundle.run.input_snapshot_json as { finance_input?: unknown; resolution?: { resolver_version?: string } };
    const validation = validateProjectFinanceInput(snapshot.finance_input);
    if (!validation.success) throw new CalculationServiceError("INVALID_RESOLVED_INPUT", "Historical immutable input snapshot no longer validates under the stored contract.", { errors: validation.errors });
    const result = this.financeEngine(validation.data);
    assertResultIntegrity(result);
    const resultHash = hashCalculationResult(result);
    return { result_hash: resultHash, matches: resultHash === bundle.run.result_hash };
  }
}

export const CALCULATION_SERVICE_ENGINE_VERSION = CALCULATION_ENGINE_VERSION;
export const CALCULATION_SERVICE_RESOLVER_VERSION = SCENARIO_RESOLVER_VERSION;

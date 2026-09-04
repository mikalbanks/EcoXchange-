import { describe, expect, it } from "vitest";

import { REFERENCE_SOLAR_5MW_INPUT } from "./fixtures/reference-solar-5mw-input";
import { calculateProjectFinanceCore } from "./returns-downside";
import {
  CalculationService,
  CalculationServiceError,
  hashCalculationResult,
  type CalculationRepository,
  type CalculationResolutionContext,
  type CalculationRunRecord,
  type OrganizationContext,
  type PersistedCalculationBundle,
} from "./calculation-service";
import type { ProjectFinanceInput } from "./domain-contracts";
import type { ResolverPolicyValue, ResolverScenarioAssumption } from "./scenario-resolver";

const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "user-1";
const PROJECT = "22222222-2222-4222-8222-222222222222";
const SCENARIO = "33333333-3333-4333-8333-333333333333";
const POLICY = "44444444-4444-4444-8444-444444444444";
const CONTEXT: OrganizationContext = { organizationId: ORG, actorUserId: USER };

const POLICY_PATHS = new Map<string, { key: string; unit?: string }>([
  ["tax_credit.itc_rate", { key: "itc_rate", unit: "PERCENT_DECIMAL" }],
  ["tax_credit.itc_transfer_price", { key: "itc_transfer_price", unit: "RATIO" }],
  ["financing.annual_interest_rate", { key: "debt_interest_rate_default", unit: "PERCENT_DECIMAL" }],
  ["financing.target_dscr", { key: "target_p50_dscr", unit: "RATIO" }],
  ["financing.max_ltc", { key: "max_ltc", unit: "PERCENT_DECIMAL" }],
  ["financing.amortization_years", { key: "amortization_years_default", unit: "YEARS" }],
  ["financing.debt_maturity_years", { key: "debt_maturity_years_default", unit: "YEARS" }],
  ["financing.lender_fee_rate", { key: "lender_fee_rate", unit: "PERCENT_DECIMAL" }],
  ["reserves.dsra_months", { key: "dsra_months", unit: "MONTHS" }],
  ["reserves.dsra_reference_method", { key: "dsra_reference_method" }],
]);

function flatten(input: ProjectFinanceInput): Array<[string, unknown]> {
  const out: Array<[string, unknown]> = [];
  for (const [group, value] of Object.entries(input)) {
    if (group === "provenance") continue;
    for (const [key, fieldValue] of Object.entries(value as Record<string, unknown>)) out.push([`${group}.${key}`, fieldValue]);
  }
  return out;
}

function resolutionContext(input: ProjectFinanceInput = REFERENCE_SOLAR_5MW_INPUT): CalculationResolutionContext {
  const assumptions: ResolverScenarioAssumption[] = [];
  const policyValues: ResolverPolicyValue[] = [];
  let seq = 0;
  for (const [path, value] of flatten(input)) {
    if (["project.technology", "project.country_code", "project.state_code", "project.capacity_mw_ac"].includes(path)) continue;
    const policy = POLICY_PATHS.get(path);
    if (policy) {
      policyValues.push({ id: `policy-${seq++}`, field_key: policy.key, value, unit: policy.unit, value_classification: "CALCULATION_DEFAULT", applicability: null });
    } else {
      assumptions.push({ id: `assumption-${seq++}`, field_key: path, value, source_type: "USER_ASSUMPTION" });
    }
  }
  return {
    project: { id: PROJECT, technology: "SOLAR_PV", capacity_mw_ac: input.project.capacity_mw_ac, country_code: "US", state_code: "GA", revenue_structure: "FULLY_CONTRACTED", archived_at: null },
    scenario: { id: SCENARIO, organization_id: ORG, project_id: PROJECT, status: "READY", archived_at: null },
    projectFacts: [],
    scenarioAssumptions: assumptions,
    policy: { id: POLICY, policy_code: "ECOXCHANGE_SOLAR_BASE", policy_version: "0.1.0", status: "ACTIVE" },
    policyValues,
    policyOverrides: [],
  };
}

class MemoryRepository implements CalculationRepository {
  runs = new Map<string, CalculationRunRecord>();
  bundles = new Map<string, PersistedCalculationBundle>();
  runNumber = 0;
  failPersistence = false;
  constructor(public resolution = resolutionContext()) {}

  async loadResolutionContext(context: OrganizationContext): Promise<CalculationResolutionContext> {
    if (context.organizationId !== ORG) throw new Error("PROJECT_NOT_FOUND");
    return structuredClone(this.resolution);
  }
  async findByIdempotencyKey(context: OrganizationContext, key: string): Promise<CalculationRunRecord | null> {
    return [...this.runs.values()].find((run) => run.organization_id === context.organizationId && run.idempotency_key === key) ?? null;
  }
  async createRunningRun(args: Parameters<CalculationRepository["createRunningRun"]>[0]): Promise<CalculationRunRecord> {
    const id = `aaaaaaaa-aaaa-4aaa-8aaa-${String(++this.runNumber).padStart(12, "0")}`;
    const run: CalculationRunRecord = {
      id,
      organization_id: args.context.organizationId,
      project_id: args.projectId,
      scenario_id: args.scenarioId,
      status: "RUNNING",
      calculation_engine_version: "0.2.0",
      resolver_version: "0.1.0",
      underwriting_policy_id: args.policy.id,
      underwriting_policy_version: args.policy.policy_version,
      input_hash: args.inputHash,
      result_hash: null,
      input_snapshot_json: structuredClone(args.inputSnapshot),
      idempotency_key: args.idempotencyKey ?? null,
    };
    this.runs.set(id, run);
    return structuredClone(run);
  }
  async persistSuccessfulRunAtomic(args: Parameters<CalculationRepository["persistSuccessfulRunAtomic"]>[0]): Promise<CalculationRunRecord> {
    if (this.failPersistence) throw new Error("forced transaction failure");
    const run = this.runs.get(args.runId)!;
    const successful = { ...run, status: "SUCCESS" as const, result_hash: args.resultHash };
    const bundle: PersistedCalculationBundle = { run: successful, ...structuredClone(args.bundle) };
    this.runs.set(args.runId, successful);
    this.bundles.set(args.runId, bundle);
    return structuredClone(successful);
  }
  async markRunFailed(args: Parameters<CalculationRepository["markRunFailed"]>[0]): Promise<void> {
    const run = this.runs.get(args.runId);
    if (run && run.status !== "SUCCESS") this.runs.set(args.runId, { ...run, status: "FAILED", failure_code: args.failureCode, failure_details_json: args.failureDetails });
  }
  async getCalculationRun(context: OrganizationContext, runId: string): Promise<PersistedCalculationBundle | null> {
    if (context.organizationId !== ORG) return null;
    return structuredClone(this.bundles.get(runId) ?? null);
  }
}

function expectServiceError(code: string) {
  return (error: unknown) => error instanceof CalculationServiceError && error.code === code;
}

describe("Ticket 11 CalculationService", () => {
  it("resolves, calculates once, persists a successful immutable bundle, and reproduces its result hash", async () => {
    const repo = new MemoryRepository();
    let calls = 0;
    const service = new CalculationService(repo, (input) => { calls += 1; return calculateProjectFinanceCore(input); });
    const stored = await service.calculateScenario({ context: CONTEXT, projectId: PROJECT, scenarioId: SCENARIO, policyId: POLICY });
    expect(calls).toBe(1);
    expect(stored.run.status).toBe("SUCCESS");
    expect(stored.run.input_hash).toHaveLength(64);
    expect(stored.run.result_hash).toHaveLength(64);
    expect(stored.annual_project_cashflows).toHaveLength(25);
    expect(stored.financing_result.permanent_debt).toBeCloseTo(3_364_160, -1);
    expect(stored.reconciliation_result.debt_reconciled).toBe(true);
    expect(stored.reconciliation_result.sources_uses_reconciled).toBe(true);
    const reproduced = service.reproduceFromSnapshot(stored);
    expect(reproduced.matches).toBe(true);
    expect(reproduced.result_hash).toBe(stored.run.result_hash);
  });

  it("keeps identical finance results deterministic", () => {
    const result = calculateProjectFinanceCore(REFERENCE_SOLAR_5MW_INPUT);
    const expected = hashCalculationResult(result);
    for (let i = 0; i < 100; i += 1) expect(hashCalculationResult(calculateProjectFinanceCore(structuredClone(REFERENCE_SOLAR_5MW_INPUT)))).toBe(expected);
  });

  it("honors idempotency and returns one logical successful run", async () => {
    const repo = new MemoryRepository();
    const service = new CalculationService(repo);
    const first = await service.calculateScenario({ context: CONTEXT, projectId: PROJECT, scenarioId: SCENARIO, policyId: POLICY, idempotencyKey: "same-request" });
    const second = await service.calculateScenario({ context: CONTEXT, projectId: PROJECT, scenarioId: SCENARIO, policyId: POLICY, idempotencyKey: "same-request" });
    expect(second.run.id).toBe(first.run.id);
    expect(repo.runs.size).toBe(1);
  });

  it("rejects an idempotency key reused after the calculation-affecting input changes", async () => {
    const repo = new MemoryRepository();
    const service = new CalculationService(repo);
    await service.calculateScenario({ context: CONTEXT, projectId: PROJECT, scenarioId: SCENARIO, policyId: POLICY, idempotencyKey: "conflict" });
    const ppa = repo.resolution.scenarioAssumptions.find((x) => x.field_key === "revenue.ppa_price_year_1_per_mwh")!;
    ppa.value = 60;
    await expect(service.calculateScenario({ context: CONTEXT, projectId: PROJECT, scenarioId: SCENARIO, policyId: POLICY, idempotencyKey: "conflict" })).rejects.toSatisfy(expectServiceError("IDEMPOTENCY_KEY_CONFLICT"));
  });

  it("does not create a run when a required resolved input is missing", async () => {
    const repo = new MemoryRepository();
    repo.resolution.scenarioAssumptions = repo.resolution.scenarioAssumptions.filter((x) => x.field_key !== "transaction_costs.project_capex");
    const service = new CalculationService(repo);
    await expect(service.calculateScenario({ context: CONTEXT, projectId: PROJECT, scenarioId: SCENARIO, policyId: POLICY })).rejects.toSatisfy(expectServiceError("CALCULATION_INPUT_INCOMPLETE"));
    expect(repo.runs.size).toBe(0);
  });

  it("retains a FAILED run when the finance engine throws after valid resolution", async () => {
    const repo = new MemoryRepository();
    const service = new CalculationService(repo, () => { throw new Error("boom"); });
    await expect(service.calculateScenario({ context: CONTEXT, projectId: PROJECT, scenarioId: SCENARIO, policyId: POLICY })).rejects.toSatisfy(expectServiceError("FINANCE_ENGINE_FAILED"));
    expect([...repo.runs.values()][0].status).toBe("FAILED");
    expect([...repo.runs.values()][0].failure_code).toBe("FINANCE_ENGINE_FAILED");
  });

  it("never exposes SUCCESS when transactional persistence fails", async () => {
    const repo = new MemoryRepository();
    repo.failPersistence = true;
    const service = new CalculationService(repo);
    await expect(service.calculateScenario({ context: CONTEXT, projectId: PROJECT, scenarioId: SCENARIO, policyId: POLICY })).rejects.toSatisfy(expectServiceError("CALCULATION_PERSISTENCE_FAILED"));
    expect([...repo.runs.values()][0].status).toBe("FAILED");
    expect(repo.bundles.size).toBe(0);
  });

  it("blocks archived scenarios before creating a calculation run", async () => {
    const repo = new MemoryRepository();
    repo.resolution.scenario.status = "ARCHIVED";
    const service = new CalculationService(repo);
    await expect(service.calculateScenario({ context: CONTEXT, projectId: PROJECT, scenarioId: SCENARIO, policyId: POLICY })).rejects.toSatisfy(expectServiceError("SCENARIO_ARCHIVED"));
    expect(repo.runs.size).toBe(0);
  });

  it("keeps tenant context authoritative", async () => {
    const repo = new MemoryRepository();
    const service = new CalculationService(repo);
    await expect(service.calculateScenario({ context: { organizationId: "99999999-9999-4999-8999-999999999999", actorUserId: "other" }, projectId: PROJECT, scenarioId: SCENARIO, policyId: POLICY })).rejects.toThrow();
    expect(repo.runs.size).toBe(0);
  });
});

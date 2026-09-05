import { describe, expect, it } from "vitest";
import {
  ECOXCHANGE_SOLAR_BASE_V010,
  type FinanceResultForUnderwriting,
  type UnderwritingResultV1,
} from "./underwriting-engine";
import {
  UNDERWRITING_ENGINE_VERSION,
  UnderwritingService,
  UnderwritingServiceError,
  hashUnderwritingInput,
  hashUnderwritingResult,
  type PersistedUnderwritingBundle,
  type UnderwritingRepository,
  type UnderwritingResolutionContext,
  type UnderwritingRunRecord,
} from "./underwriting-service";

const ORG = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const context = { organizationId: ORG, actorUserId: "user-1" };

const finance = (overrides: Partial<FinanceResultForUnderwriting> = {}): FinanceResultForUnderwriting => ({
  calculationRunId: "calc-1", calculationEngineVersion: "0.2.0", permanentDebt: 3_364_160.17,
  debtToCapex: .42052, minimumDscr: 1.30, bindingConstraint: "DSCR", balloonBalance: 0,
  openingPermanentDebt: 3_364_160.17, sponsorEquityPctTotalUses: .354,
  simplifiedAfterTaxIrr: null, taxModuleEnabled: false, itcRate: .30, itcProceeds: 2_097_600,
  downside: { generationSourceType: "INDEPENDENT_ENGINEER_P90", fullRepayment: true, interestShortfall: false, minimumDownsideDscr: 1.20 },
  reconciliation: { debtReconciled: true, sourcesUsesReconciled: true },
  calculationAssumptions: { targetP50Dscr: 1.30, maxLtc: .70, dsraMonths: 6, amortizationYears: 18 },
  ...overrides,
});

const facts = [
  ["underwriting.ppa_status", "EXECUTED", "EXECUTED_DOCUMENT", "VERIFIED"],
  ["underwriting.offtaker_credit_status", "INVESTMENT_GRADE", "SPONSOR_DOCUMENT", "REPORTED"],
  ["underwriting.itc_eligibility_status", "VERIFIED", "SPONSOR_DOCUMENT", "VERIFIED"],
  ["underwriting.itc_buyer_status", "COMMITTED", "SPONSOR_DOCUMENT", "VERIFIED"],
  ["underwriting.sponsor_tax_appetite", "CONFIRMED", "USER_ASSERTION", "REPORTED"],
  ["underwriting.epc_status", "EXECUTED", "EXECUTED_DOCUMENT", "VERIFIED"],
  ["underwriting.epc_price_structure", "FIXED", "EXECUTED_DOCUMENT", "VERIFIED"],
  ["underwriting.contractor_quality", "STRONG", "SPONSOR_DOCUMENT", "REPORTED"],
  ["underwriting.performance_guarantee", true, "EXECUTED_DOCUMENT", "VERIFIED"],
  ["underwriting.liquidated_damages", true, "EXECUTED_DOCUMENT", "VERIFIED"],
  ["underwriting.interconnection_status", "FULLY_EXECUTED", "EXECUTED_DOCUMENT", "VERIFIED"],
  ["underwriting.permits_status", "COMPLETE", "SPONSOR_DOCUMENT", "VERIFIED"],
  ["underwriting.site_control_status", "SECURED", "EXECUTED_DOCUMENT", "VERIFIED"],
  ["underwriting.om_status", "EXECUTED", "EXECUTED_DOCUMENT", "VERIFIED"],
  ["underwriting.insurance_status", "CONFIRMED", "SPONSOR_DOCUMENT", "VERIFIED"],
  ["underwriting.independent_engineer_status", "FINAL", "INDEPENDENT_ENGINEER_REPORT", "VERIFIED"],
  ["underwriting.sponsor_experience", "STRONG", "SPONSOR_DOCUMENT", "REPORTED"],
  ["underwriting.completion_support", "CONFIRMED", "SPONSOR_DOCUMENT", "VERIFIED"],
  ["underwriting.cost_overrun_support", "CONFIRMED", "SPONSOR_DOCUMENT", "VERIFIED"],
  ["underwriting.equity_commitment", "CONFIRMED", "SPONSOR_DOCUMENT", "VERIFIED"],
  ["underwriting.capex_includes_contingency", true, "SPONSOR_DOCUMENT", "REPORTED"],
].map(([field_key, value, source_type, confidence_status], index) => ({ id: `fact-${index}`, field_key: String(field_key), value, source_type: String(source_type), confidence_status: String(confidence_status) }));

function loaded(overrides: Partial<UnderwritingResolutionContext> = {}): UnderwritingResolutionContext {
  const inputSnapshot = {
    finance_input: {
      project: { technology: "SOLAR_PV", capacity_mw_ac: 5, country_code: "US" },
      revenue: { ppa_term_years: 25 },
      financing: { target_dscr: 1.30, max_ltc: .70, amortization_years: 18 },
      reserves: { dsra_months: 6 },
      transaction_costs: { closing_costs: 250_000 },
    },
  };
  return {
    project: { id: "project-1", organization_id: ORG, technology: "SOLAR_PV", country_code: "US", capacity_mw_ac: 5, development_status: "READY_TO_BUILD", revenue_structure: "FULLY_CONTRACTED" },
    scenario: { id: "scenario-1", organization_id: ORG, project_id: "project-1", status: "CALCULATED" },
    calculation: { id: "calc-1", organization_id: ORG, project_id: "project-1", scenario_id: "scenario-1", status: "SUCCESS", calculation_engine_version: "0.2.0", resolver_version: "0.1.0", underwriting_policy_id: "policy-1", underwriting_policy_version: "0.1.0", input_hash: "input-hash", result_hash: "result-hash", input_snapshot_json: inputSnapshot },
    financeResult: finance(),
    policy: { ...ECOXCHANGE_SOLAR_BASE_V010, id: "policy-1" },
    policyOverrides: [],
    underwritingFacts: facts,
    ...overrides,
  };
}

class MemoryRepo implements UnderwritingRepository {
  runs = new Map<string, PersistedUnderwritingBundle>();
  idem = new Map<string, string>();
  failed: string[] = [];
  seq = 0;
  constructor(public ctx = loaded()) {}
  async loadUnderwritingContext(args: any) { if (args.context.organizationId !== this.ctx.project.organization_id) throw new UnderwritingServiceError("UNDERWRITING_CALCULATION_NOT_FOUND", "tenant blocked"); return structuredClone(this.ctx); }
  async findByIdempotencyKey(_context: any, key: string) { const id = this.idem.get(key); return id ? this.runs.get(id)?.run ?? null : null; }
  async createRunningRun(args: any): Promise<UnderwritingRunRecord> {
    const id = `uw-${++this.seq}`;
    const run: UnderwritingRunRecord = { id, organization_id: args.context.organizationId, project_id: args.projectId, scenario_id: args.scenarioId, calculation_run_id: args.calculationRunId, underwriting_policy_id: args.policy.id, underwriting_policy_version: args.policy.policyVersion, execution_status: "RUNNING", status: "RUNNING", underwriting_engine_version: UNDERWRITING_ENGINE_VERSION, underwriting_input_snapshot_json: structuredClone(args.inputSnapshot), underwriting_input_hash: args.inputHash, underwriting_result_hash: null, financial_profile: null, financing_readiness: null, overall_status: null, idempotency_key: args.idempotencyKey ?? null };
    if (args.idempotencyKey) this.idem.set(args.idempotencyKey, id);
    this.runs.set(id, { run, rule_results: [], risks: [], conditions: [], missing_information: [], lender_fit: [], recommendations: [] });
    return structuredClone(run);
  }
  async persistSuccessfulRunAtomic(args: any) {
    const bundle = this.runs.get(args.runId)!;
    bundle.run.execution_status = "SUCCESS"; bundle.run.status = "SUCCESS"; bundle.run.overall_status = args.result.status; bundle.run.financial_profile = args.result.financial_profile; bundle.run.financing_readiness = args.result.financing_readiness; bundle.run.underwriting_result_hash = args.resultHash;
    bundle.rule_results = structuredClone(args.result.rule_results); bundle.risks = structuredClone(args.result.risks); bundle.conditions = structuredClone(args.result.conditions); bundle.missing_information = structuredClone(args.result.missing_information); bundle.lender_fit = structuredClone(args.result.lender_fit); bundle.recommendations = structuredClone(args.result.recommendations);
    return structuredClone(bundle.run);
  }
  async markRunFailed(args: any) { const b = this.runs.get(args.runId); if (b) { b.run.execution_status = "FAILED"; b.run.status = "FAILED"; } this.failed.push(args.runId); }
  async getUnderwritingRun(contextArg: any, runId: string) { const b = this.runs.get(runId); if (!b || b.run.organization_id !== contextArg.organizationId) return null; return structuredClone(b); }
  async listUnderwritingRuns(contextArg: any, scenarioId: string) { return [...this.runs.values()].map(x => x.run).filter(x => x.organization_id === contextArg.organizationId && x.scenario_id === scenarioId).map(structuredClone); }
}

const request = { context, projectId: "project-1", scenarioId: "scenario-1", calculationRunId: "calc-1", policyId: "policy-1" };

describe("Ticket 12 UnderwritingService", () => {
  it("persists a lender-ready 5 MW PASS as successful execution", async () => {
    const repo = new MemoryRepo(); const result = await new UnderwritingService(repo).underwriteCalculation(request);
    expect(result.run.execution_status).toBe("SUCCESS"); expect(result.run.overall_status).toBe("PASS");
    expect(result.rule_results.length).toBeGreaterThan(10); expect(result.run.underwriting_engine_version).toBe("0.1.0");
    expect(result.run.underwriting_result_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("persists a credit FAIL as successful execution", async () => {
    const repo = new MemoryRepo(loaded({ financeResult: finance({ minimumDscr: 1.18 }) }));
    const result = await new UnderwritingService(repo).underwriteCalculation(request);
    expect(result.run.execution_status).toBe("SUCCESS"); expect(result.run.overall_status).toBe("FAIL"); expect(result.run.financial_profile).toBe("UNFINANCEABLE_UNDER_POLICY");
  });

  it("persists insufficient-information assessment rather than throwing", async () => {
    const incomplete = facts.filter(x => !["underwriting.offtaker_credit_status","underwriting.interconnection_status","underwriting.independent_engineer_status"].includes(x.field_key));
    const repo = new MemoryRepo(loaded({ underwritingFacts: incomplete, financeResult: finance({ downside: undefined }) }));
    const result = await new UnderwritingService(repo).underwriteCalculation(request);
    expect(result.run.execution_status).toBe("SUCCESS"); expect(result.run.overall_status).toBe("INSUFFICIENT_INFORMATION"); expect(result.missing_information.length).toBeGreaterThan(0);
  });

  it("blocks non-success calculation and stale finance context", async () => {
    await expect(new UnderwritingService(new MemoryRepo(loaded({ calculation: { ...loaded().calculation, status: "FAILED" } }))).underwriteCalculation(request)).rejects.toMatchObject({ code: "CALCULATION_NOT_UNDERWRITABLE" });
    await expect(new UnderwritingService(new MemoryRepo(loaded({ scenario: { ...loaded().scenario, status: "STALE" } }))).underwriteCalculation(request)).rejects.toMatchObject({ code: "CALCULATION_STALE" });
  });

  it("blocks policy/calculation mismatch and accepts registered override", async () => {
    const mismatch = finance({ calculationAssumptions: { targetP50Dscr: 1.25, maxLtc: .70, dsraMonths: 6, amortizationYears: 18 } });
    await expect(new UnderwritingService(new MemoryRepo(loaded({ financeResult: mismatch }))).underwriteCalculation(request)).rejects.toMatchObject({ code: "POLICY_CALCULATION_MISMATCH" });
    const repo = new MemoryRepo(loaded({ financeResult: mismatch, policyOverrides: [{ fieldKey: "targetP50Dscr", originalValue: 1.30, effectiveValue: 1.25, reason: "lender term sheet", source: "LENDER_QUOTE" }] }));
    expect((await new UnderwritingService(repo).underwriteCalculation(request)).run.execution_status).toBe("SUCCESS");
  });

  it("enforces idempotency and conflicts on materially changed requests", async () => {
    const repo = new MemoryRepo(); const service = new UnderwritingService(repo);
    const first = await service.underwriteCalculation({ ...request, idempotencyKey: "same" });
    const second = await service.underwriteCalculation({ ...request, idempotencyKey: "same" });
    expect(second.run.id).toBe(first.run.id); expect(repo.seq).toBe(1);
    repo.ctx = loaded({ calculation: { ...loaded().calculation, id: "calc-2" }, financeResult: { ...finance(), calculationRunId: "calc-2" } });
    await expect(service.underwriteCalculation({ ...request, calculationRunId: "calc-2", idempotencyKey: "same" })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });
  });

  it("blocks cross-tenant execution before persistence", async () => {
    const repo = new MemoryRepo();
    await expect(new UnderwritingService(repo).underwriteCalculation({ ...request, context: { organizationId: OTHER, actorUserId: "user-b" } })).rejects.toBeInstanceOf(UnderwritingServiceError);
    expect(repo.seq).toBe(0);
  });

  it("creates deterministic input/result hashes independent of key ordering", () => {
    expect(hashUnderwritingInput({ b: 2, a: 1 })).toBe(hashUnderwritingInput({ a: 1, b: 2 }));
    const result: UnderwritingResultV1 = {
      analysis_type: "INDICATIVE_UNDERWRITING", status: "PASS", financial_profile: "ACCEPTABLE", financing_readiness: "CLOSING_READY", project_size: "MID",
      rule_results: [], risks: [], conditions: [], missing_information: [], lender_fit: [], recommendations: [],
      summary_metadata: { policy_code: "P", policy_version: "1", calculation_run_id: "c", calculation_engine_version: "e", policy_override_count: 0, hard_fail_count: 0, high_risk_count: 0, condition_count: 0, missing_information_count: 0 },
    };
    expect(hashUnderwritingResult(result)).toHaveLength(64); expect(hashUnderwritingResult(result)).toBe(hashUnderwritingResult(structuredClone(result)));
  });

  it("does not mutate loaded calculation/facts/policy", async () => {
    const source = loaded(); const before = structuredClone(source); const repo = new MemoryRepo(source);
    await new UnderwritingService(repo).underwriteCalculation(request);
    expect(repo.ctx).toEqual(before);
  });
});

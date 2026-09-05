import type { Pool, PoolClient } from "pg";
import pool from "../../db";
import type { OrganizationContext } from "./calculation-service";
import {
  UNDERWRITING_ENGINE_VERSION,
  UnderwritingServiceError,
  type PersistedUnderwritingBundle,
  type UnderwritingCalculationRecord,
  type UnderwritingFactRecord,
  type UnderwritingProjectRecord,
  type UnderwritingRepository,
  type UnderwritingResolutionContext,
  type UnderwritingRunRecord,
  type UnderwritingScenarioRecord,
} from "./underwriting-service";
import type { FinanceResultForUnderwriting, PolicyOverrideV1, UnderwritingPolicyV1, UnderwritingResultV1 } from "./underwriting-engine";

const n = (value: unknown): number => typeof value === "number" ? value : Number(value);
const jsonValue = (value: unknown): any => value;

async function scoped<T>(client: PoolClient, context: OrganizationContext, fn: () => Promise<T>): Promise<T> {
  await client.query("select set_config('app.organization_id', $1, true), set_config('app.user_id', $2, true)", [context.organizationId, context.actorUserId]);
  return fn();
}

function policyFromRows(policy: any, values: any[]): UnderwritingPolicyV1 & { id: string } {
  const single = (key: string, fallback?: number): number => {
    const rows = values.filter((v) => v.field_key === key && v.applicability_json == null);
    if (rows.length === 1) return n(rows[0].value_json);
    if (fallback !== undefined && rows.length === 0) return fallback;
    throw new UnderwritingServiceError("UNDERWRITING_POLICY_CONFIGURATION_ERROR", `Policy value ${key} is missing or ambiguous.`);
  };
  const bands = (key: string) => values.filter((v) => v.field_key === key).map((v) => {
    const a = v.applicability_json?.capacity_mw_ac ?? {};
    return { minMw: n(a.gte ?? 1), maxMwExclusive: a.lt != null ? n(a.lt) : a.lte != null ? n(a.lte) + Number.EPSILON : null, maxLtc: n(v.value_json) };
  });
  const closing = values.filter((v) => v.field_key === "closing_cost_range").map((v) => {
    const a = v.applicability_json?.capacity_mw_ac ?? {};
    return { minMw: n(a.gte ?? 1), maxMwExclusive: a.lt != null ? n(a.lt) : a.lte != null ? n(a.lte) + Number.EPSILON : null, minUsd: n(v.value_json?.min), maxUsd: n(v.value_json?.max) };
  });
  return {
    id: policy.id,
    policyCode: policy.policy_code,
    policyVersion: policy.policy_version,
    status: policy.status,
    targetP50Dscr: single("target_p50_dscr"),
    ltcBands: bands("max_ltc"),
    dsraMonths: single("dsra_months"),
    merchantWarningPct: single("merchant_exposure_warning_pct"),
    merchantSeverePct: single("merchant_exposure_severe_pct"),
    closingCostRanges: closing,
    contingencyPct: single("construction_contingency_pct"),
    committedItcBridgeAdvance: single("committed_itc_bridge_advance"),
    uncommittedItcBridgeAdvance: single("uncommitted_itc_bridge_advance"),
  };
}

function overrideFromRow(row: any): PolicyOverrideV1 | null {
  const map: Record<string, PolicyOverrideV1["fieldKey"]> = {
    "financing.target_dscr": "targetP50Dscr",
    target_p50_dscr: "targetP50Dscr",
    "financing.max_ltc": "maxLtc",
    max_ltc: "maxLtc",
    "reserves.dsra_months": "dsraMonths",
    dsra_months: "dsraMonths",
  };
  const fieldKey = map[row.field_key];
  if (!fieldKey) return null;
  return {
    fieldKey,
    originalValue: n(row.policy_value_json),
    effectiveValue: n(row.override_value_json),
    reason: row.reason,
    source: row.source_type === "LENDER_QUOTE" || row.source_type === "USER_ASSERTION" ? row.source_type : "OTHER",
  };
}

function financeFromRows(calculation: any, financing: any, tax: any, capital: any, returns: any, downside: any, reconciliation: any): FinanceResultForUnderwriting {
  const snapshot: any = calculation.input_snapshot_json ?? {};
  const input = snapshot.finance_input ?? {};
  return {
    calculationRunId: calculation.id,
    calculationEngineVersion: calculation.calculation_engine_version,
    permanentDebt: n(financing.permanent_debt),
    debtToCapex: n(financing.debt_to_capex),
    minimumDscr: financing.minimum_dscr == null ? null : n(financing.minimum_dscr),
    bindingConstraint: financing.binding_constraint,
    balloonBalance: n(financing.balloon_balance),
    openingPermanentDebt: n(financing.permanent_debt),
    sponsorEquityPctTotalUses: n(capital.sponsor_equity_pct_total_uses),
    simplifiedAfterTaxIrr: returns.simplified_sponsor_after_tax_irr == null ? null : n(returns.simplified_sponsor_after_tax_irr),
    taxModuleEnabled: Boolean(returns.tax_module_enabled),
    itcRate: n(tax.itc_rate),
    itcProceeds: n(tax.net_transfer_proceeds),
    downside: downside ? {
      generationSourceType: downside.generation_source_type ?? "NONE",
      fullRepayment: downside.full_repayment,
      interestShortfall: Boolean(downside.interest_shortfall),
      minimumDownsideDscr: downside.minimum_downside_dscr == null ? null : n(downside.minimum_downside_dscr),
    } : undefined,
    reconciliation: { debtReconciled: Boolean(reconciliation.debt_reconciled), sourcesUsesReconciled: Boolean(reconciliation.sources_uses_reconciled) },
    calculationAssumptions: {
      targetP50Dscr: n(input.financing?.target_dscr),
      maxLtc: n(input.financing?.max_ltc),
      dsraMonths: n(input.reserves?.dsra_months),
      amortizationYears: n(input.financing?.amortization_years),
    },
  };
}

function runRecord(row: any): UnderwritingRunRecord {
  return {
    id: row.id, organization_id: row.organization_id, project_id: row.project_id, scenario_id: row.scenario_id,
    calculation_run_id: row.calculation_run_id, underwriting_policy_id: row.underwriting_policy_id,
    underwriting_policy_version: row.underwriting_policy_version, execution_status: row.execution_status ?? row.status,
    status: row.status, underwriting_engine_version: row.underwriting_engine_version,
    underwriting_input_snapshot_json: row.underwriting_input_snapshot_json ?? {}, underwriting_input_hash: row.underwriting_input_hash ?? "",
    underwriting_result_hash: row.underwriting_result_hash, financial_profile: row.financial_profile, financing_readiness: row.financing_readiness,
    overall_status: row.overall_status, idempotency_key: row.idempotency_key,
  };
}

export class PostgresUnderwritingRepository implements UnderwritingRepository {
  constructor(private readonly pgPool: Pool = pool) {}

  async loadUnderwritingContext(args: { context: OrganizationContext; projectId: string; scenarioId: string; calculationRunId: string; policySelector: { policyId?: string; policyCode?: string; policyVersion?: string } }): Promise<UnderwritingResolutionContext> {
    const client = await this.pgPool.connect();
    try {
      return await scoped(client, args.context, async () => {
        const p = await client.query("select * from project_finance.projects where id=$1 and organization_id=$2", [args.projectId, args.context.organizationId]);
        const s = await client.query("select * from project_finance.scenarios where id=$1 and organization_id=$2", [args.scenarioId, args.context.organizationId]);
        const c = await client.query("select * from project_finance.calculation_runs where id=$1 and organization_id=$2", [args.calculationRunId, args.context.organizationId]);
        if (!p.rowCount || !s.rowCount || !c.rowCount) throw new UnderwritingServiceError("UNDERWRITING_CALCULATION_NOT_FOUND", "Authorized project/scenario/calculation context was not found.");

        const selector: string[] = ["(organization_id is null or organization_id=$1)"];
        const params: unknown[] = [args.context.organizationId];
        if (args.policySelector.policyId) { params.push(args.policySelector.policyId); selector.push(`id=$${params.length}`); }
        if (args.policySelector.policyCode) { params.push(args.policySelector.policyCode); selector.push(`policy_code=$${params.length}`); }
        if (args.policySelector.policyVersion) { params.push(args.policySelector.policyVersion); selector.push(`policy_version=$${params.length}`); }
        if (!args.policySelector.policyId && !args.policySelector.policyVersion) selector.push("status='ACTIVE'");
        const policies = await client.query(`select * from project_finance.underwriting_policies where ${selector.join(" and ")} order by created_at asc`, params);
        if (policies.rowCount !== 1) throw new UnderwritingServiceError(policies.rowCount === 0 ? "UNDERWRITING_POLICY_NOT_FOUND" : "UNDERWRITING_POLICY_CONFIGURATION_ERROR", "Policy selection must resolve exactly one immutable policy version.");
        const policyRow = policies.rows[0];
        const pv = await client.query("select * from project_finance.underwriting_policy_values where policy_id=$1 order by field_key,id", [policyRow.id]);
        const policy = policyFromRows(policyRow, pv.rows);

        const [financing, tax, capital, returns, downside, reconciliation, facts, overrides] = await Promise.all([
          client.query("select * from project_finance.financing_results where calculation_run_id=$1 and organization_id=$2", [args.calculationRunId, args.context.organizationId]),
          client.query("select * from project_finance.tax_credit_results where calculation_run_id=$1 and organization_id=$2", [args.calculationRunId, args.context.organizationId]),
          client.query("select * from project_finance.capital_stack_results where calculation_run_id=$1 and organization_id=$2", [args.calculationRunId, args.context.organizationId]),
          client.query("select * from project_finance.return_results where calculation_run_id=$1 and organization_id=$2", [args.calculationRunId, args.context.organizationId]),
          client.query("select * from project_finance.downside_results where calculation_run_id=$1 and organization_id=$2", [args.calculationRunId, args.context.organizationId]),
          client.query("select * from project_finance.reconciliation_results where calculation_run_id=$1 and organization_id=$2", [args.calculationRunId, args.context.organizationId]),
          client.query("select id,field_key,value_json as value,source_type,confidence_status,source_document_id from project_finance.project_facts where project_id=$1 and organization_id=$2 and is_current order by field_key,id", [args.projectId, args.context.organizationId]),
          client.query("select * from project_finance.policy_overrides where scenario_id=$1 and organization_id=$2 and policy_id=$3 order by field_key,created_at", [args.scenarioId, args.context.organizationId, policyRow.id]),
        ]);
        if (![financing, tax, capital, returns, reconciliation].every((q) => q.rowCount === 1)) throw new UnderwritingServiceError("CALCULATION_NOT_UNDERWRITABLE", "Calculation run is missing required normalized finance results.");
        const calc = c.rows[0];
        const finance = financeFromRows(calc, financing.rows[0], tax.rows[0], capital.rows[0], returns.rows[0], downside.rows[0] ?? null, reconciliation.rows[0]);
        return {
          project: p.rows[0] as UnderwritingProjectRecord,
          scenario: s.rows[0] as UnderwritingScenarioRecord,
          calculation: calc as UnderwritingCalculationRecord,
          financeResult: finance,
          policy,
          policyOverrides: overrides.rows.map(overrideFromRow).filter(Boolean) as PolicyOverrideV1[],
          underwritingFacts: facts.rows as UnderwritingFactRecord[],
        };
      });
    } finally { client.release(); }
  }

  async findByIdempotencyKey(context: OrganizationContext, key: string): Promise<UnderwritingRunRecord | null> {
    const q = await this.pgPool.query("select * from project_finance.underwriting_runs where organization_id=$1 and idempotency_key=$2", [context.organizationId, key]);
    return q.rows[0] ? runRecord(q.rows[0]) : null;
  }

  async createRunningRun(args: { context: OrganizationContext; projectId: string; scenarioId: string; calculationRunId: string; policy: UnderwritingPolicyV1 & { id: string }; inputSnapshot: Record<string, unknown>; inputHash: string; idempotencyKey?: string }): Promise<UnderwritingRunRecord> {
    const q = await this.pgPool.query(`insert into project_finance.underwriting_runs
      (organization_id,project_id,scenario_id,calculation_run_id,underwriting_policy_id,underwriting_policy_version,status,execution_status,underwriting_engine_version,underwriting_input_snapshot_json,underwriting_input_hash,idempotency_key,started_at,created_by)
      values($1,$2,$3,$4,$5,$6,'RUNNING','RUNNING',$7,$8::jsonb,$9,$10,now(),$11) returning *`,
      [args.context.organizationId,args.projectId,args.scenarioId,args.calculationRunId,args.policy.id,args.policy.policyVersion,UNDERWRITING_ENGINE_VERSION,JSON.stringify(args.inputSnapshot),args.inputHash,args.idempotencyKey ?? null,args.context.actorUserId]);
    return runRecord(q.rows[0]);
  }

  async persistSuccessfulRunAtomic(args: { context: OrganizationContext; runId: string; result: UnderwritingResultV1; resultHash: string }): Promise<UnderwritingRunRecord> {
    const client = await this.pgPool.connect();
    try {
      await client.query("begin");
      const parent = await client.query("select * from project_finance.underwriting_runs where id=$1 and organization_id=$2 for update", [args.runId,args.context.organizationId]);
      if (parent.rowCount !== 1 || parent.rows[0].status !== "RUNNING") throw new Error("underwriting run is not writable RUNNING state");
      for (const r of args.result.rule_results) await client.query(`insert into project_finance.underwriting_rule_results
        (organization_id,underwriting_run_id,rule_id,rule_version,status,severity,actual_value_json,required_value_json,message,source_reference,metadata_json)
        values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11::jsonb)`, [args.context.organizationId,args.runId,r.rule_id,r.rule_version,r.status,r.severity,JSON.stringify(r.actual_value ?? null),JSON.stringify(r.required_value ?? null),r.message,r.source_reference,JSON.stringify({...(r.metadata ?? {}),condition:r.condition ?? null})]);
      for (const r of args.result.risks) await client.query(`insert into project_finance.underwriting_risks
        (organization_id,underwriting_run_id,risk_code,risk_category,severity,title,description,source_rule_id,metadata_json)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`, [args.context.organizationId,args.runId,r.risk_code,r.category,r.severity,r.title,r.description,r.source_rule_id,JSON.stringify({risk_code:r.risk_code})]);
      for (const c of args.result.conditions) await client.query(`insert into project_finance.underwriting_conditions
        (organization_id,underwriting_run_id,condition_code,severity,title,description,status,source_rule_id)
        values($1,$2,$3,$4,$5,$6,$7,$8)`, [args.context.organizationId,args.runId,c.condition_code,c.severity,c.title,c.description,c.status,c.source_rule_id]);
      for (const m of args.result.missing_information) await client.query(`insert into project_finance.underwriting_missing_information
        (organization_id,underwriting_run_id,field_key,reason,required_for,severity) values($1,$2,$3,$4,$5,$6)`, [args.context.organizationId,args.runId,m.field_key,m.reason,m.required_for,m.severity]);
      for (const f of args.result.lender_fit) await client.query(`insert into project_finance.underwriting_lender_fit
        (organization_id,underwriting_run_id,lender_category,fit,reason_codes_json) values($1,$2,$3,$4,$5::jsonb)`, [args.context.organizationId,args.runId,f.lender_category,f.fit,JSON.stringify(f.reason_codes)]);
      for (const recommendation of args.result.recommendations) await client.query(`insert into project_finance.underwriting_recommendations
        (organization_id,underwriting_run_id,recommendation_code) values($1,$2,$3)`, [args.context.organizationId,args.runId,recommendation]);

      const updated = await client.query(`update project_finance.underwriting_runs set
        status='SUCCESS', execution_status='SUCCESS', overall_status=$3, financial_profile=$4, financing_readiness=$5,
        underwriting_result_hash=$6, completed_at=now() where id=$1 and organization_id=$2 and status='RUNNING' returning *`,
        [args.runId,args.context.organizationId,args.result.status,args.result.financial_profile,args.result.financing_readiness,args.resultHash]);
      if (updated.rowCount !== 1) throw new Error("failed to finalize underwriting run");
      await client.query("update project_finance.scenarios set latest_underwriting_run_id=$1 where id=$2 and organization_id=$3 and status <> 'ARCHIVED'", [args.runId,parent.rows[0].scenario_id,args.context.organizationId]);
      await client.query(`insert into project_finance.audit_events(organization_id,actor_user_id,event_type,entity_type,entity_id,project_id,scenario_id,metadata_json)
        values($1,$2,'UNDERWRITING_COMPLETED','UNDERWRITING_RUN',$3,$4,$5,$6::jsonb)`, [args.context.organizationId,args.context.actorUserId,args.runId,parent.rows[0].project_id,parent.rows[0].scenario_id,JSON.stringify({calculation_run_id:parent.rows[0].calculation_run_id,policy_version:parent.rows[0].underwriting_policy_version,underwriting_engine_version:UNDERWRITING_ENGINE_VERSION,result_hash:args.resultHash,overall_status:args.result.status})]);
      await client.query("commit");
      return runRecord(updated.rows[0]);
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }

  async markRunFailed(args: { context: OrganizationContext; runId: string; failureCode: string; failureDetails?: Record<string, unknown> }): Promise<void> {
    // Ticket 08 underwriting_runs has no dedicated failure-detail columns; execution failure is retained in immutable input snapshot/audit logs later.
    await this.pgPool.query("update project_finance.underwriting_runs set status='FAILED', execution_status='FAILED', completed_at=now(), overall_status=null where id=$1 and organization_id=$2 and status='RUNNING'", [args.runId,args.context.organizationId]);
  }

  async getUnderwritingRun(context: OrganizationContext, runId: string): Promise<PersistedUnderwritingBundle | null> {
    const parent = await this.pgPool.query("select * from project_finance.underwriting_runs where id=$1 and organization_id=$2", [runId,context.organizationId]);
    if (!parent.rowCount) return null;
    const [rules,risks,conditions,missing,lender,recs] = await Promise.all([
      this.pgPool.query("select * from project_finance.underwriting_rule_results where underwriting_run_id=$1 and organization_id=$2 order by rule_id",[runId,context.organizationId]),
      this.pgPool.query("select * from project_finance.underwriting_risks where underwriting_run_id=$1 and organization_id=$2 order by risk_category,risk_code",[runId,context.organizationId]),
      this.pgPool.query("select * from project_finance.underwriting_conditions where underwriting_run_id=$1 and organization_id=$2 order by condition_code",[runId,context.organizationId]),
      this.pgPool.query("select * from project_finance.underwriting_missing_information where underwriting_run_id=$1 and organization_id=$2 order by field_key",[runId,context.organizationId]),
      this.pgPool.query("select * from project_finance.underwriting_lender_fit where underwriting_run_id=$1 and organization_id=$2 order by lender_category",[runId,context.organizationId]),
      this.pgPool.query("select * from project_finance.underwriting_recommendations where underwriting_run_id=$1 and organization_id=$2 order by recommendation_code",[runId,context.organizationId]),
    ]);
    return {
      run: runRecord(parent.rows[0]),
      rule_results: rules.rows.map((r:any)=>({rule_id:r.rule_id,rule_version:r.rule_version,category:r.metadata_json?.category ?? "DOCUMENTATION",status:r.status,severity:r.severity,actual_value:r.actual_value_json,required_value:r.required_value_json,message:r.message,condition:r.metadata_json?.condition ?? undefined,source_reference:r.source_reference,metadata:r.metadata_json})),
      risks: risks.rows.map((r:any)=>({risk_code:r.risk_code ?? r.metadata_json?.risk_code ?? r.source_rule_id,risk_category:r.risk_category,category:r.risk_category,severity:r.severity,title:r.title,description:r.description,source_rule_id:r.source_rule_id})),
      conditions: conditions.rows.map((r:any)=>({condition_code:r.condition_code,severity:r.severity,title:r.title,description:r.description,source_rule_id:r.source_rule_id,status:r.status})),
      missing_information: missing.rows.map((r:any)=>({field_key:r.field_key,reason:r.reason,required_for:r.required_for,severity:r.severity})),
      lender_fit: lender.rows.map((r:any)=>({lender_category:r.lender_category,fit:r.fit,reason_codes:r.reason_codes_json ?? []})),
      recommendations: recs.rows.map((r:any)=>r.recommendation_code),
    } as PersistedUnderwritingBundle;
  }

  async listUnderwritingRuns(context: OrganizationContext, scenarioId: string): Promise<UnderwritingRunRecord[]> {
    const q = await this.pgPool.query("select * from project_finance.underwriting_runs where scenario_id=$1 and organization_id=$2 order by created_at desc", [scenarioId,context.organizationId]);
    return q.rows.map(runRecord);
  }
}

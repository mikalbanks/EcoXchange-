import type { Pool, PoolClient } from "pg";
import { pool as defaultPool } from "../../db";
import { CALCULATION_ENGINE_VERSION } from "./core";
import { SCENARIO_RESOLVER_VERSION } from "./scenario-resolver";
import type {
  CalculationProjectRecord,
  CalculationRepository,
  CalculationResolutionContext,
  CalculationRunRecord,
  CalculationScenarioRecord,
  OrganizationContext,
  PersistedCalculationBundle,
} from "./calculation-service";

function asJsonValue(value: unknown): unknown {
  return value;
}

async function setTenantContext(client: PoolClient, context: OrganizationContext): Promise<void> {
  await client.query("select set_config('app.organization_id', $1, true), set_config('app.user_id', $2, true)", [context.organizationId, context.actorUserId]);
}

function mapRun(row: Record<string, any>): CalculationRunRecord {
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    scenario_id: row.scenario_id,
    status: row.status,
    calculation_engine_version: row.calculation_engine_version,
    resolver_version: row.resolver_version ?? SCENARIO_RESOLVER_VERSION,
    underwriting_policy_id: row.underwriting_policy_id,
    underwriting_policy_version: row.underwriting_policy_version,
    input_hash: row.input_hash,
    result_hash: row.result_hash,
    input_snapshot_json: row.input_snapshot_json,
    idempotency_key: row.idempotency_key,
    failure_code: row.failure_code,
    failure_details_json: row.failure_details_json,
  };
}

export class PostgresCalculationRepository implements CalculationRepository {
  constructor(private readonly pool: Pool = defaultPool) {}

  async loadResolutionContext(
    context: OrganizationContext,
    projectId: string,
    scenarioId: string,
    selector: { policyId?: string; policyCode?: string; policyVersion?: string },
  ): Promise<CalculationResolutionContext> {
    const client = await this.pool.connect();
    try {
      await client.query("begin read only");
      await setTenantContext(client, context);

      const projectResult = await client.query(
        `select id, organization_id, technology, capacity_mw_ac::float8 as capacity_mw_ac,
                country_code, state_code, coalesce(revenue_structure,'UNKNOWN') as revenue_structure,
                archived_at
           from project_finance.projects
          where id=$1 and organization_id=$2`,
        [projectId, context.organizationId],
      );
      if (projectResult.rowCount !== 1) throw new Error("PROJECT_NOT_FOUND");
      const project = projectResult.rows[0] as CalculationProjectRecord;

      const scenarioResult = await client.query(
        `select id, organization_id, project_id, status, archived_at
           from project_finance.scenarios
          where id=$1 and organization_id=$2`,
        [scenarioId, context.organizationId],
      );
      if (scenarioResult.rowCount !== 1) throw new Error("SCENARIO_NOT_FOUND");
      const scenario = scenarioResult.rows[0] as CalculationScenarioRecord;

      const factsResult = await client.query(
        `select id, field_key, value_json as value, unit, source_type, confidence_status, is_current
           from project_finance.project_facts
          where organization_id=$1 and project_id=$2 and is_current=true
          order by field_key, id`,
        [context.organizationId, projectId],
      );
      const assumptionsResult = await client.query(
        `select id, field_key, value_json as value, unit, source_type
           from project_finance.scenario_assumptions
          where organization_id=$1 and scenario_id=$2
          order by field_key, id`,
        [context.organizationId, scenarioId],
      );

      const policyParams: unknown[] = [];
      const conditions: string[] = ["(organization_id is null or organization_id=$1)"];
      policyParams.push(context.organizationId);
      if (selector.policyId) {
        policyParams.push(selector.policyId);
        conditions.push(`id=$${policyParams.length}`);
      } else {
        if (selector.policyCode) {
          policyParams.push(selector.policyCode);
          conditions.push(`policy_code=$${policyParams.length}`);
        }
        if (selector.policyVersion) {
          policyParams.push(selector.policyVersion);
          conditions.push(`policy_version=$${policyParams.length}`);
        } else {
          conditions.push("status='ACTIVE'");
        }
      }
      const policyResult = await client.query(
        `select id, policy_code, policy_version, status
           from project_finance.underwriting_policies
          where ${conditions.join(" and ")}
          order by policy_code, policy_version`,
        policyParams,
      );
      if (policyResult.rowCount === 0) throw new Error("POLICY_NOT_FOUND");
      if (policyResult.rowCount !== 1) throw new Error("POLICY_CONFIGURATION_ERROR");
      const policy = policyResult.rows[0];

      const policyValuesResult = await client.query(
        `select id, field_key, value_json as value, unit, value_classification,
                applicability_json as applicability
           from project_finance.underwriting_policy_values
          where policy_id=$1
          order by field_key, id`,
        [policy.id],
      );
      const overridesResult = await client.query(
        `select id, field_key, policy_id, policy_version,
                policy_value_json as policy_value, override_value_json as override_value,
                reason, created_by, created_at::text
           from project_finance.policy_overrides
          where organization_id=$1 and scenario_id=$2
          order by field_key, id`,
        [context.organizationId, scenarioId],
      );

      await client.query("commit");
      return {
        project,
        scenario,
        projectFacts: factsResult.rows,
        scenarioAssumptions: assumptionsResult.rows,
        policy,
        policyValues: policyValuesResult.rows,
        policyOverrides: overridesResult.rows,
      };
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async findByIdempotencyKey(context: OrganizationContext, key: string): Promise<CalculationRunRecord | null> {
    const result = await this.pool.query(
      `select * from project_finance.calculation_runs where organization_id=$1 and idempotency_key=$2 limit 1`,
      [context.organizationId, key],
    );
    return result.rowCount ? mapRun(result.rows[0]) : null;
  }

  async createRunningRun(args: {
    context: OrganizationContext;
    projectId: string;
    scenarioId: string;
    policy: { id: string; policy_version: string };
    inputHash: string;
    inputSnapshot: Record<string, unknown>;
    idempotencyKey?: string;
  }): Promise<CalculationRunRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await setTenantContext(client, args.context);
      const authorization = await client.query(
        `select p.id project_id, s.id scenario_id
           from project_finance.projects p
           join project_finance.scenarios s on s.project_id=p.id and s.organization_id=p.organization_id
          where p.id=$1 and s.id=$2 and p.organization_id=$3
            and p.archived_at is null and s.archived_at is null and s.status <> 'ARCHIVED'
          for update of s`,
        [args.projectId, args.scenarioId, args.context.organizationId],
      );
      if (authorization.rowCount !== 1) throw new Error("TENANT_OR_SCENARIO_ACCESS_DENIED");

      const inserted = await client.query(
        `insert into project_finance.calculation_runs
          (organization_id, project_id, scenario_id, status, calculation_engine_version,
           resolver_version, underwriting_policy_id, underwriting_policy_version,
           input_hash, input_snapshot_json, idempotency_key, created_by, started_at)
         values ($1,$2,$3,'RUNNING',$4,$5,$6,$7,$8,$9::jsonb,$10,$11,now())
         returning *`,
        [
          args.context.organizationId,
          args.projectId,
          args.scenarioId,
          CALCULATION_ENGINE_VERSION,
          SCENARIO_RESOLVER_VERSION,
          args.policy.id,
          args.policy.policy_version,
          args.inputHash,
          JSON.stringify(args.inputSnapshot),
          args.idempotencyKey ?? null,
          args.context.actorUserId,
        ],
      );
      const run = mapRun(inserted.rows[0]);
      await client.query(
        `insert into project_finance.audit_events
          (organization_id, actor_user_id, event_type, entity_type, entity_id, project_id, scenario_id, metadata_json)
         values ($1,$2,'CALCULATION_STARTED','CALCULATION_RUN',$3,$4,$5,$6::jsonb)`,
        [args.context.organizationId, args.context.actorUserId, run.id, args.projectId, args.scenarioId,
          JSON.stringify({ calculation_engine_version: CALCULATION_ENGINE_VERSION, resolver_version: SCENARIO_RESOLVER_VERSION, policy_version: args.policy.policy_version, input_hash: args.inputHash })],
      );
      await client.query("commit");
      return run;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async persistSuccessfulRunAtomic(args: {
    context: OrganizationContext;
    runId: string;
    resultHash: string;
    bundle: Omit<PersistedCalculationBundle, "run">;
  }): Promise<CalculationRunRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await setTenantContext(client, args.context);
      const runResult = await client.query(
        `select * from project_finance.calculation_runs
          where id=$1 and organization_id=$2 and status='RUNNING' for update`,
        [args.runId, args.context.organizationId],
      );
      if (runResult.rowCount !== 1) throw new Error("RUN_NOT_RUNNING_OR_NOT_AUTHORIZED");
      const run = runResult.rows[0];

      for (const row of args.bundle.annual_project_cashflows) {
        await client.query(
          `insert into project_finance.annual_project_cashflows
           (organization_id,calculation_run_id,year,generation_mwh,ppa_price_per_mwh,revenue,opex,cfads,sponsor_operating_cash_flow,depreciation,tax_shield)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [args.context.organizationId,args.runId,row.year,row.generation_mwh,row.ppa_price_per_mwh,row.revenue,row.opex,row.cfads,row.sponsor_operating_cash_flow,row.depreciation,row.tax_shield],
        );
      }
      for (const row of args.bundle.annual_debt_schedules) {
        await client.query(
          `insert into project_finance.annual_debt_schedules
           (organization_id,calculation_run_id,year,opening_balance,interest,principal,debt_service,ending_balance,dscr)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [args.context.organizationId,args.runId,row.year,row.opening_balance,row.interest,row.principal,row.debt_service,row.ending_balance,row.dscr],
        );
      }

      const f = args.bundle.financing_result;
      await client.query(
        `insert into project_finance.financing_results
         (organization_id,calculation_run_id,dscr_sized_debt,ltc_debt_limit,permanent_debt,binding_constraint,debt_to_capex,minimum_dscr,minimum_dscr_year,balloon_balance,lender_fee,dsra)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [args.context.organizationId,args.runId,f.dscr_sized_debt,f.ltc_debt_limit,f.permanent_debt,f.binding_constraint,f.debt_to_capex,f.minimum_dscr,f.minimum_dscr_year,f.balloon_balance,f.lender_fee,f.dsra],
      );
      const t = args.bundle.tax_credit_result;
      await client.query(
        `insert into project_finance.tax_credit_results
         (organization_id,calculation_run_id,eligible_basis,itc_rate,itc_face_value,transfer_price,gross_transfer_proceeds,transaction_costs,net_transfer_proceeds,depreciable_basis,bonus_depreciation,immediate_tax_shield)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [args.context.organizationId,args.runId,t.eligible_basis,t.itc_rate,t.itc_face_value,t.transfer_price,t.gross_transfer_proceeds,t.transaction_costs,t.net_transfer_proceeds,t.depreciable_basis,t.bonus_depreciation,t.immediate_tax_shield],
      );
      const c = args.bundle.capital_stack_result;
      await client.query(
        `insert into project_finance.capital_stack_results
         (organization_id,calculation_run_id,project_capex,closing_costs,lender_fee,dsra,other_financing_uses,total_closing_uses,permanent_debt,net_itc_proceeds,other_permanent_sources,sponsor_equity,debt_pct_total_uses,itc_pct_total_uses,sponsor_equity_pct_total_uses,other_sources_pct_total_uses)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [args.context.organizationId,args.runId,c.project_capex,c.closing_costs,c.lender_fee,c.dsra,c.other_financing_uses,c.total_closing_uses,c.permanent_debt,c.net_itc_proceeds,c.other_permanent_sources,c.sponsor_equity,c.debt_pct_total_uses,c.itc_pct_total_uses,c.sponsor_equity_pct_total_uses,c.other_sources_pct_total_uses],
      );
      const rr = args.bundle.return_result;
      await client.query(
        `insert into project_finance.return_results
         (organization_id,calculation_run_id,levered_sponsor_cash_irr,levered_sponsor_cash_irr_status,project_unlevered_cash_irr_before_tax_attributes,unlevered_irr_status,sponsor_npv,project_npv,simplified_sponsor_after_tax_irr,tax_module_enabled,irr_warning_code)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [args.context.organizationId,args.runId,rr.levered_sponsor_cash_irr,rr.levered_sponsor_cash_irr_status,rr.project_unlevered_cash_irr_before_tax_attributes,rr.unlevered_irr_status,rr.sponsor_npv,rr.project_npv,rr.simplified_sponsor_after_tax_irr,rr.tax_module_enabled,rr.irr_warning_code],
      );
      if (args.bundle.downside_result) {
        const d = args.bundle.downside_result;
        await client.query(
          `insert into project_finance.downside_results
           (organization_id,calculation_run_id,downside_type,generation_source_type,generation_multiplier,minimum_downside_dscr,minimum_downside_dscr_year,full_repayment,repayment_year,unrepaid_balance,interest_shortfall,is_lender_grade_p90)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [args.context.organizationId,args.runId,d.downside_type,d.generation_source_type,d.generation_multiplier,d.minimum_downside_dscr,d.minimum_downside_dscr_year,d.full_repayment,d.repayment_year,d.unrepaid_balance,d.interest_shortfall,d.is_lender_grade_p90],
        );
      }
      for (const row of args.bundle.downside_cash_sweep_rows) {
        await client.query(
          `insert into project_finance.downside_cash_sweep_rows
           (organization_id,calculation_run_id,year,opening_balance,downside_cfads,interest_due,cash_available,principal_paid,ending_balance,interest_shortfall)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [args.context.organizationId,args.runId,row.year,row.opening_balance,row.downside_cfads,row.interest_due,row.cash_available,row.principal_paid,row.ending_balance,row.interest_shortfall],
        );
      }
      const rec = args.bundle.reconciliation_result;
      await client.query(
        `insert into project_finance.reconciliation_results
         (organization_id,calculation_run_id,debt_reconciliation_difference,debt_reconciled,sources_uses_difference,sources_uses_reconciled)
         values ($1,$2,$3,$4,$5,$6)`,
        [args.context.organizationId,args.runId,rec.debt_reconciliation_difference,rec.debt_reconciled,rec.sources_uses_difference,rec.sources_uses_reconciled],
      );
      for (const warning of args.bundle.warnings) {
        await client.query(
          `insert into project_finance.calculation_warnings
           (organization_id,calculation_run_id,code,severity,message,metric_key,year,metadata_json)
           values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
          [args.context.organizationId,args.runId,warning.code,warning.severity,warning.message,warning.metric_key ?? null,warning.year ?? null,JSON.stringify(warning.metadata ?? null)],
        );
      }
      for (const trace of args.bundle.metric_traces) {
        await client.query(
          `insert into project_finance.formula_registry(formula_id,formula_name,formula_version,effective_from_engine_version)
           values ($1,$1,1,$2) on conflict (formula_id) do nothing`,
          [trace.formula_id, CALCULATION_ENGINE_VERSION],
        );
        await client.query(
          `insert into project_finance.calculation_metric_traces
           (organization_id,calculation_run_id,metric_key,formula_id,value_json,dependencies_json,metadata_json)
           values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb)`,
          [args.context.organizationId,args.runId,trace.metric_key,trace.formula_id,JSON.stringify(asJsonValue(trace.value)),JSON.stringify(trace.dependencies),JSON.stringify(trace.metadata ?? null)],
        );
      }

      const updated = await client.query(
        `update project_finance.calculation_runs
            set status='SUCCESS', result_hash=$3, completed_at=now()
          where id=$1 and organization_id=$2 and status='RUNNING'
          returning *`,
        [args.runId,args.context.organizationId,args.resultHash],
      );
      if (updated.rowCount !== 1) throw new Error("RUN_FINALIZATION_FAILED");
      await client.query(
        `update project_finance.scenarios
            set status='CALCULATED', latest_calculation_run_id=$3, updated_at=now()
          where id=$1 and organization_id=$2 and status <> 'ARCHIVED'`,
        [run.scenario_id,args.context.organizationId,args.runId],
      );
      await client.query(
        `insert into project_finance.audit_events
          (organization_id,actor_user_id,event_type,entity_type,entity_id,project_id,scenario_id,metadata_json)
         values ($1,$2,'CALCULATION_COMPLETED','CALCULATION_RUN',$3,$4,$5,$6::jsonb)`,
        [args.context.organizationId,args.context.actorUserId,args.runId,run.project_id,run.scenario_id,JSON.stringify({ result_hash: args.resultHash, input_hash: run.input_hash, engine_version: run.calculation_engine_version })],
      );
      await client.query("commit");
      return mapRun(updated.rows[0]);
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async markRunFailed(args: { context: OrganizationContext; runId: string; failureCode: string; failureDetails?: Record<string, unknown> }): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await setTenantContext(client, args.context);
      const updated = await client.query(
        `update project_finance.calculation_runs
            set status='FAILED', failure_code=$3, failure_details_json=$4::jsonb, completed_at=now()
          where id=$1 and organization_id=$2 and status in ('PENDING','RUNNING')
          returning project_id,scenario_id,input_hash,calculation_engine_version`,
        [args.runId,args.context.organizationId,args.failureCode,JSON.stringify(args.failureDetails ?? {})],
      );
      if (updated.rowCount === 1) {
        const run = updated.rows[0];
        await client.query(
          `insert into project_finance.audit_events
            (organization_id,actor_user_id,event_type,entity_type,entity_id,project_id,scenario_id,metadata_json)
           values ($1,$2,'CALCULATION_FAILED','CALCULATION_RUN',$3,$4,$5,$6::jsonb)`,
          [args.context.organizationId,args.context.actorUserId,args.runId,run.project_id,run.scenario_id,JSON.stringify({ failure_code: args.failureCode, input_hash: run.input_hash, engine_version: run.calculation_engine_version })],
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async getCalculationRun(context: OrganizationContext, runId: string): Promise<PersistedCalculationBundle | null> {
    const client = await this.pool.connect();
    try {
      await client.query("begin read only");
      await setTenantContext(client, context);
      const runResult = await client.query(`select * from project_finance.calculation_runs where id=$1 and organization_id=$2`, [runId,context.organizationId]);
      if (!runResult.rowCount) { await client.query("commit"); return null; }
      const run = mapRun(runResult.rows[0]);
      const [cash,debt,financing,tax,capital,returns,downside,sweep,reconciliation,warnings,traces] = await Promise.all([
        client.query(`select year,generation_mwh::float8,ppa_price_per_mwh::float8,revenue::float8,opex::float8,cfads::float8,sponsor_operating_cash_flow::float8,depreciation::float8,tax_shield::float8 from project_finance.annual_project_cashflows where calculation_run_id=$1 and organization_id=$2 order by year`,[runId,context.organizationId]),
        client.query(`select year,opening_balance::float8,interest::float8,principal::float8,debt_service::float8,ending_balance::float8,dscr::float8 from project_finance.annual_debt_schedules where calculation_run_id=$1 and organization_id=$2 order by year`,[runId,context.organizationId]),
        client.query(`select * from project_finance.financing_results where calculation_run_id=$1 and organization_id=$2`,[runId,context.organizationId]),
        client.query(`select * from project_finance.tax_credit_results where calculation_run_id=$1 and organization_id=$2`,[runId,context.organizationId]),
        client.query(`select * from project_finance.capital_stack_results where calculation_run_id=$1 and organization_id=$2`,[runId,context.organizationId]),
        client.query(`select * from project_finance.return_results where calculation_run_id=$1 and organization_id=$2`,[runId,context.organizationId]),
        client.query(`select * from project_finance.downside_results where calculation_run_id=$1 and organization_id=$2`,[runId,context.organizationId]),
        client.query(`select year,opening_balance::float8,downside_cfads::float8,interest_due::float8,cash_available::float8,principal_paid::float8,ending_balance::float8,interest_shortfall from project_finance.downside_cash_sweep_rows where calculation_run_id=$1 and organization_id=$2 order by year`,[runId,context.organizationId]),
        client.query(`select * from project_finance.reconciliation_results where calculation_run_id=$1 and organization_id=$2`,[runId,context.organizationId]),
        client.query(`select code,severity,message,metric_key,year,metadata_json as metadata from project_finance.calculation_warnings where calculation_run_id=$1 and organization_id=$2 order by created_at,id`,[runId,context.organizationId]),
        client.query(`select metric_key,formula_id,value_json as value,dependencies_json as dependencies,metadata_json as metadata from project_finance.calculation_metric_traces where calculation_run_id=$1 and organization_id=$2 order by metric_key,formula_id`,[runId,context.organizationId]),
      ]);
      await client.query("commit");
      if (run.status !== "SUCCESS") return { run, annual_project_cashflows: [], annual_debt_schedules: [], financing_result: {}, tax_credit_result: {}, capital_stack_result: {}, return_result: {}, downside_result: null, downside_cash_sweep_rows: [], reconciliation_result: {}, warnings: warnings.rows, metric_traces: traces.rows };
      return {
        run,
        annual_project_cashflows: cash.rows,
        annual_debt_schedules: debt.rows,
        financing_result: financing.rows[0] ?? {},
        tax_credit_result: tax.rows[0] ?? {},
        capital_stack_result: capital.rows[0] ?? {},
        return_result: returns.rows[0] ?? {},
        downside_result: downside.rows[0] ?? null,
        downside_cash_sweep_rows: sweep.rows,
        reconciliation_result: reconciliation.rows[0] ?? {},
        warnings: warnings.rows,
        metric_traces: traces.rows,
      } as PersistedCalculationBundle;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

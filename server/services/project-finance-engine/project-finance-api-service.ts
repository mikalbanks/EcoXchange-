import type { Pool, PoolClient } from "pg";
import { pool as defaultPool } from "../../db";
import { CalculationService, type OrganizationContext } from "./calculation-service";
import { PostgresCalculationRepository } from "./postgres-calculation-repository";
import { UnderwritingService } from "./underwriting-service";
import { PostgresUnderwritingRepository } from "./postgres-underwriting-repository";
import { FIELD_DEFINITIONS, resolveScenarioInput } from "./scenario-resolver";

export class ProjectFinanceApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly details?: Record<string, unknown>) {
    super(message); this.name = "ProjectFinanceApiError";
  }
}

async function setTenant(client: PoolClient, context: OrganizationContext) {
  await client.query("select set_config('app.organization_id',$1,true), set_config('app.user_id',$2,true)", [context.organizationId, context.actorUserId]);
}

const fieldRegistry = new Map(FIELD_DEFINITIONS.map((d) => [d.path, d]));

export class ProjectFinanceApiService {
  readonly calculations: CalculationService;
  readonly underwriting: UnderwritingService;
  constructor(private readonly pool: Pool = defaultPool) {
    this.calculations = new CalculationService(new PostgresCalculationRepository(pool));
    this.underwriting = new UnderwritingService(new PostgresUnderwritingRepository(pool));
  }

  async listProjects(context: OrganizationContext) {
    const result = await this.pool.query(`select id,name,technology,country_code,state_code,capacity_mw_ac::text,development_status,revenue_structure,created_at,updated_at,archived_at from project_finance.projects where organization_id=$1 order by updated_at desc`, [context.organizationId]);
    return result.rows;
  }

  async createProject(context: OrganizationContext, body: any) {
    const result = await this.pool.query(`insert into project_finance.projects(organization_id,name,technology,country_code,state_code,development_status,revenue_structure,created_by) values($1,$2,$3,$4,$5,$6,$7,$8) returning id,name,technology,country_code,state_code,capacity_mw_ac::text,development_status,revenue_structure,created_at,updated_at,archived_at`, [context.organizationId,body.name,body.technology,body.country_code ?? "US",body.state_code ?? null,body.development_status ?? null,body.revenue_structure ?? null,context.actorUserId]);
    return result.rows[0];
  }

  async getProject(context: OrganizationContext, projectId: string) {
    const result = await this.pool.query(`select id,name,technology,country_code,state_code,capacity_mw_ac::text,development_status,revenue_structure,created_at,updated_at,archived_at from project_finance.projects where organization_id=$1 and id=$2`, [context.organizationId,projectId]);
    if (!result.rowCount) throw new ProjectFinanceApiError("PROJECT_NOT_FOUND","Project was not found.");
    return result.rows[0];
  }

  async patchProject(context: OrganizationContext, projectId: string, body: Record<string, unknown>) {
    await this.getProject(context, projectId);
    const allowed = ["name","state_code","development_status","revenue_structure"];
    const entries = Object.entries(body).filter(([key]) => allowed.includes(key));
    const params: unknown[] = [context.organizationId, projectId];
    const setters = entries.map(([key,value]) => { params.push(value); return `${key}=$${params.length}`; });
    const result = await this.pool.query(`update project_finance.projects set ${setters.join(",")},updated_at=now() where organization_id=$1 and id=$2 returning id,name,technology,country_code,state_code,capacity_mw_ac::text,development_status,revenue_structure,created_at,updated_at,archived_at`, params);
    return result.rows[0];
  }

  async archiveProject(context: OrganizationContext, projectId: string) {
    const result = await this.pool.query(`update project_finance.projects set archived_at=coalesce(archived_at,now()),updated_at=now() where organization_id=$1 and id=$2 returning id,archived_at`, [context.organizationId,projectId]);
    if (!result.rowCount) throw new ProjectFinanceApiError("PROJECT_NOT_FOUND","Project was not found.");
    return result.rows[0];
  }

  async listFacts(context: OrganizationContext, projectId: string) {
    await this.getProject(context, projectId);
    const result = await this.pool.query(`select id,field_key,value_json as value,unit,source_type,confidence_status,source_document_id,is_current,created_at,superseded_at from project_finance.project_facts where organization_id=$1 and project_id=$2 order by field_key,created_at desc`, [context.organizationId,projectId]);
    return result.rows;
  }

  async addFact(context: OrganizationContext, projectId: string, body: any) {
    await this.getProject(context, projectId);
    const client = await this.pool.connect();
    try {
      await client.query("begin"); await setTenant(client, context);
      const prior = await client.query(`select id from project_finance.project_facts where organization_id=$1 and project_id=$2 and field_key=$3 and is_current=true for update`, [context.organizationId,projectId,body.field_key]);
      if (prior.rowCount) await client.query(`update project_finance.project_facts set is_current=false,confidence_status='SUPERSEDED',superseded_at=now() where id=$1`, [prior.rows[0].id]);
      const inserted = await client.query(`insert into project_finance.project_facts(organization_id,project_id,field_key,value_json,unit,source_type,confidence_status,source_document_id,supersedes_fact_id,is_current,created_by) values($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,true,$10) returning id,field_key,value_json as value,unit,source_type,confidence_status,is_current,created_at`, [context.organizationId,projectId,body.field_key,JSON.stringify(body.value),body.unit ?? null,body.source_type,body.confidence_status ?? "UNKNOWN",body.source_document_id ?? null,prior.rowCount ? prior.rows[0].id : null,context.actorUserId]);
      await client.query("commit"); return inserted.rows[0];
    } catch (e) { await client.query("rollback").catch(()=>undefined); throw e; } finally { client.release(); }
  }

  async supersedeFact(context: OrganizationContext, projectId: string, factId: string, body: any) {
    const existing = await this.pool.query(`select field_key from project_finance.project_facts where organization_id=$1 and project_id=$2 and id=$3`, [context.organizationId,projectId,factId]);
    if (!existing.rowCount) throw new ProjectFinanceApiError("PROJECT_FACT_NOT_FOUND","Project fact was not found.");
    return this.addFact(context, projectId, { ...body, field_key: existing.rows[0].field_key });
  }

  async listScenarios(context: OrganizationContext, projectId: string) {
    await this.getProject(context, projectId);
    const result = await this.pool.query(`select id,project_id,name,description,scenario_type,status,parent_scenario_id,latest_calculation_run_id,latest_underwriting_run_id,created_at,updated_at,archived_at from project_finance.scenarios where organization_id=$1 and project_id=$2 order by updated_at desc`, [context.organizationId,projectId]);
    return result.rows;
  }

  async createScenario(context: OrganizationContext, projectId: string, body: any) {
    await this.getProject(context, projectId);
    const result = await this.pool.query(`insert into project_finance.scenarios(organization_id,project_id,name,description,scenario_type,parent_scenario_id,created_by) values($1,$2,$3,$4,$5,$6,$7) returning *`, [context.organizationId,projectId,body.name,body.description ?? null,body.scenario_type ?? "CUSTOM",body.parent_scenario_id ?? null,context.actorUserId]);
    return result.rows[0];
  }

  async getScenario(context: OrganizationContext, scenarioId: string) {
    const result = await this.pool.query(`select * from project_finance.scenarios where organization_id=$1 and id=$2`, [context.organizationId,scenarioId]);
    if (!result.rowCount) throw new ProjectFinanceApiError("SCENARIO_NOT_FOUND","Scenario was not found."); return result.rows[0];
  }

  async patchScenario(context: OrganizationContext, scenarioId: string, body: Record<string, unknown>) {
    await this.getScenario(context, scenarioId);
    const params: unknown[]=[context.organizationId,scenarioId]; const setters=Object.entries(body).map(([k,v])=>{params.push(v);return `${k}=$${params.length}`});
    const result=await this.pool.query(`update project_finance.scenarios set ${setters.join(",")},updated_at=now() where organization_id=$1 and id=$2 returning *`,params); return result.rows[0];
  }

  async listAssumptions(context: OrganizationContext, scenarioId: string) {
    await this.getScenario(context, scenarioId);
    return (await this.pool.query(`select id,field_key,value_json as value,unit,source_type,provenance_type,policy_id,policy_version,created_at,updated_at from project_finance.scenario_assumptions where organization_id=$1 and scenario_id=$2 order by field_key`,[context.organizationId,scenarioId])).rows;
  }

  async putAssumptions(context: OrganizationContext, scenarioId: string, assumptions: any[]) {
    await this.getScenario(context, scenarioId);
    for (const a of assumptions) {
      const def = fieldRegistry.get(a.field_key);
      if (!def || def.allowScenario === false) throw new ProjectFinanceApiError("UNKNOWN_SCENARIO_FIELD",`Unknown or non-scenario finance field: ${a.field_key}`,{field_key:a.field_key});
      if (def.policy_controlled) throw new ProjectFinanceApiError("UNREGISTERED_POLICY_OVERRIDE",`Policy-controlled field requires a registered policy override: ${a.field_key}`,{field_key:a.field_key});
    }
    const client=await this.pool.connect(); try { await client.query("begin"); await setTenant(client,context);
      for(const a of assumptions) await client.query(`insert into project_finance.scenario_assumptions(organization_id,scenario_id,field_key,value_json,unit,source_type,provenance_type,created_by) values($1,$2,$3,$4::jsonb,$5,$6,$7,$8) on conflict(scenario_id,field_key) do update set value_json=excluded.value_json,unit=excluded.unit,source_type=excluded.source_type,provenance_type=excluded.provenance_type,updated_at=now()`,[context.organizationId,scenarioId,a.field_key,JSON.stringify(a.value),a.unit ?? null,a.source_type ?? "USER_ASSUMPTION",a.provenance_type ?? null,context.actorUserId]);
      await client.query("commit");
    } catch(e){await client.query("rollback").catch(()=>undefined);throw e;} finally{client.release();}
    return this.listAssumptions(context,scenarioId);
  }

  async addPolicyOverride(context: OrganizationContext, scenarioId: string, body: any) {
    await this.getScenario(context, scenarioId);
    const def=fieldRegistry.get(body.field_key); if(!def?.policy_controlled) throw new ProjectFinanceApiError("INVALID_POLICY_OVERRIDE","Field is not policy-controlled.",{field_key:body.field_key});
    const policy=(await this.pool.query(`select id,policy_code,policy_version from project_finance.underwriting_policies where id=$1 and (organization_id is null or organization_id=$2)`,[body.policy_id,context.organizationId])).rows[0];
    if(!policy) throw new ProjectFinanceApiError("POLICY_NOT_FOUND","Policy was not found.");
    const key=def.policy_default_key!; const values=(await this.pool.query(`select value_json,applicability_json from project_finance.underwriting_policy_values where policy_id=$1 and field_key=$2`,[policy.id,key])).rows;
    const scenario=await this.getScenario(context,scenarioId); const project=await this.getProject(context,scenario.project_id); const mw=Number(project.capacity_mw_ac);
    const matches=values.filter((v:any)=>{const a=v.applicability_json?.capacity_mw_ac;if(!a)return true;return (a.gte==null||mw>=a.gte)&&(a.gt==null||mw>a.gt)&&(a.lte==null||mw<=a.lte)&&(a.lt==null||mw<a.lt)});
    if(matches.length!==1) throw new ProjectFinanceApiError("POLICY_CONFIGURATION_ERROR","Policy does not resolve exactly one original value.",{field_key:body.field_key});
    const result=await this.pool.query(`insert into project_finance.policy_overrides(organization_id,scenario_id,field_key,policy_id,policy_version,policy_value_json,override_value_json,reason,source_type,created_by) values($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10) returning id,field_key,policy_id,policy_version,policy_value_json as original_policy_value,override_value_json as override_value,reason,source_type,created_at`,[context.organizationId,scenarioId,body.field_key,policy.id,policy.policy_version,JSON.stringify(matches[0].value_json),JSON.stringify(body.override_value),body.reason,body.source_type ?? "OTHER",context.actorUserId]); return result.rows[0];
  }

  async resolveScenario(context: OrganizationContext, scenarioId: string, selector: {policyId?:string;policyCode?:string;policyVersion?:string}) {
    const scenario=await this.getScenario(context,scenarioId); const repo=new PostgresCalculationRepository(this.pool); const loaded=await repo.loadResolutionContext(context,scenario.project_id,scenarioId,selector);
    return resolveScenarioInput({project:loaded.project,scenario_id:loaded.scenario.id,projectFacts:loaded.projectFacts,scenarioAssumptions:loaded.scenarioAssumptions,policy:loaded.policy,policyValues:loaded.policyValues,policyOverrides:loaded.policyOverrides});
  }

  async listCalculationRuns(context: OrganizationContext, scenarioId: string) {
    await this.getScenario(context,scenarioId); return (await this.pool.query(`select id,scenario_id,status,calculation_engine_version,resolver_version,underwriting_policy_version,input_hash,result_hash,created_at,completed_at,failure_code from project_finance.calculation_runs where organization_id=$1 and scenario_id=$2 order by created_at desc`,[context.organizationId,scenarioId])).rows;
  }

  async listUnderwritingRuns(context: OrganizationContext, scenarioId: string) { return this.underwriting.listUnderwritingRuns(context,scenarioId); }

  async scenarioComparison(context: OrganizationContext, projectId: string) {
    await this.getProject(context,projectId); return (await this.pool.query(`select * from project_finance.scenario_comparison_summary where organization_id=$1 and project_id=$2 order by scenario_name`,[context.organizationId,projectId])).rows;
  }

  async listPolicies(context: OrganizationContext) { return (await this.pool.query(`select id,policy_code,policy_version,status,effective_date,description,source_reference from project_finance.underwriting_policies where organization_id is null or organization_id=$1 order by policy_code,policy_version desc`,[context.organizationId])).rows; }
}

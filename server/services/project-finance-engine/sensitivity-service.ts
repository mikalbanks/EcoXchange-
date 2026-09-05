import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { pool as defaultPool } from "../../db";
import { CALCULATION_ENGINE_VERSION } from "./core";
import { validateProjectFinanceInput, type ProjectFinanceInput } from "./domain-contracts";
import { CalculationService, hashCalculationResult, type OrganizationContext, type PersistedCalculationBundle } from "./calculation-service";
import { PostgresCalculationRepository } from "./postgres-calculation-repository";
import { calculateProjectFinanceCore, type ProjectFinanceCoreResult, type SensitivityVariable } from "./returns-downside";
import { canonicalJson, hashFinanceInput, SCENARIO_RESOLVER_VERSION } from "./scenario-resolver";

export const SUPPORTED_SENSITIVITY_VARIABLES = ["PPA_PRICE","INTEREST_RATE","PROJECT_CAPEX","CAPACITY_FACTOR","ITC_RATE"] as const satisfies readonly SensitivityVariable[];

export type SensitivityServiceErrorCode =
  | "SENSITIVITY_BASE_NOT_FOUND"
  | "SENSITIVITY_BASE_NOT_SUCCESSFUL"
  | "SENSITIVITY_BASE_STALE"
  | "SENSITIVITY_NOT_APPLICABLE"
  | "UNSUPPORTED_SENSITIVITY_VARIABLE"
  | "INVALID_SENSITIVITY_VALUE"
  | "SENSITIVITY_BASE_MISMATCH"
  | "SENSITIVITY_INVARIANT_FAILED"
  | "SENSITIVITY_PERSISTENCE_FAILED";

export class SensitivityServiceError extends Error {
  constructor(public readonly code:SensitivityServiceErrorCode,message:string,public readonly details?:Record<string,unknown>){super(message);this.name="SensitivityServiceError";}
}

export type SensitivityPointSummary = {
  input_value:number;
  is_base:boolean;
  child_calculation_run_id:string;
  permanent_debt:number;
  debt_to_capex:number;
  sponsor_equity:number;
  minimum_dscr:number|null;
  levered_sponsor_cash_irr:number|null;
  simplified_sponsor_after_tax_irr:number|null;
  binding_constraint:string;
  minimum_downside_dscr:number|null;
  input_hash:string;
  result_hash:string;
};

export type SensitivityRunBundle = {
  id:string;
  project_id:string;
  scenario_id:string;
  base_calculation_run_id:string;
  variable:SensitivityVariable;
  status:"PENDING"|"RUNNING"|"SUCCESS"|"FAILED";
  created_at?:string;
  completed_at?:string|null;
  points:SensitivityPointSummary[];
};

function sensitivityField(variable:SensitivityVariable):string {
  if(variable==="PPA_PRICE") return "revenue.ppa_price_year_1_per_mwh";
  if(variable==="INTEREST_RATE") return "financing.annual_interest_rate";
  if(variable==="PROJECT_CAPEX") return "transaction_costs.project_capex";
  if(variable==="CAPACITY_FACTOR") return "generation.capacity_factor_p50";
  return "tax_credit.itc_rate";
}

function baseValue(input:ProjectFinanceInput,variable:SensitivityVariable):number {
  if(variable==="PPA_PRICE") return input.revenue.ppa_price_year_1_per_mwh;
  if(variable==="INTEREST_RATE") return input.financing.annual_interest_rate;
  if(variable==="PROJECT_CAPEX") return input.transaction_costs.project_capex;
  if(variable==="CAPACITY_FACTOR") return input.generation.capacity_factor_p50;
  return input.tax_credit.itc_rate;
}

function withSensitivity(input:ProjectFinanceInput,variable:SensitivityVariable,value:number):ProjectFinanceInput {
  const cloned=structuredClone(input);
  if(variable==="PPA_PRICE") cloned.revenue.ppa_price_year_1_per_mwh=value;
  else if(variable==="INTEREST_RATE") cloned.financing.annual_interest_rate=value;
  else if(variable==="PROJECT_CAPEX") cloned.transaction_costs.project_capex=value;
  else if(variable==="CAPACITY_FACTOR") cloned.generation.capacity_factor_p50=value;
  else if(variable==="ITC_RATE") cloned.tax_credit.itc_rate=value;
  else throw new SensitivityServiceError("UNSUPPORTED_SENSITIVITY_VARIABLE","Unsupported sensitivity variable.",{variable});
  const validation=validateProjectFinanceInput(cloned);
  if(!validation.success) throw new SensitivityServiceError("INVALID_SENSITIVITY_VALUE","Sensitivity point produces an invalid ProjectFinanceInput.",{variable,value,errors:validation.errors});
  return validation.data;
}

function stableValues(values:readonly number[],base:number):number[] {
  const result:number[]=[];
  for(const v of [base,...values]) if(Number.isFinite(v)&&!result.some(x=>Object.is(x,v)||Math.abs(x-v)<1e-12)) result.push(v);
  return result;
}

function mapped(result:ProjectFinanceCoreResult) {
  const financing=result.debt.financing_summary, tax=result.capital_stack.tax_credit_result, stack=result.capital_stack.capital_stack_result, returns=result.returns, downside=result.downside;
  return {
    annual_project_cashflows:result.operating.annual_project_cash_flows.map((row,index)=>({...row,sponsor_operating_cash_flow:returns.sponsor_operating_cash_flows[index]??null,depreciation:index===0?returns.bonus_depreciation:null,tax_shield:index===0?returns.immediate_tax_shield:null})),
    annual_debt_schedules:result.debt.annual_debt_schedule.map(row=>({...row})),
    financing_result:{dscr_sized_debt:financing.dscr_sized_debt,ltc_debt_limit:financing.ltc_debt_limit,permanent_debt:financing.permanent_debt,binding_constraint:financing.binding_constraint,debt_to_capex:financing.debt_to_capex,minimum_dscr:financing.minimum_dscr,minimum_dscr_year:financing.minimum_dscr_year,balloon_balance:financing.balloon_balance,lender_fee:result.capital_stack.lender_fee,dsra:result.capital_stack.dsra},
    tax_credit_result:{...tax,depreciable_basis:returns.depreciable_basis,bonus_depreciation:returns.bonus_depreciation,immediate_tax_shield:returns.immediate_tax_shield},
    capital_stack_result:{project_capex:result.input.transaction_costs.project_capex,closing_costs:result.input.transaction_costs.closing_costs,lender_fee:result.capital_stack.lender_fee,dsra:result.capital_stack.dsra,other_financing_uses:result.input.transaction_costs.other_financing_uses,total_closing_uses:stack.total_closing_uses,permanent_debt:stack.permanent_debt,net_itc_proceeds:stack.net_itc_proceeds,other_permanent_sources:stack.other_sources,sponsor_equity:stack.sponsor_equity,debt_pct_total_uses:stack.permanent_debt_pct_total_uses,itc_pct_total_uses:stack.itc_proceeds_pct_total_uses,sponsor_equity_pct_total_uses:stack.sponsor_equity_pct_total_uses,other_sources_pct_total_uses:stack.other_sources_pct_total_uses??0},
    return_result:{levered_sponsor_cash_irr:returns.levered_sponsor_cash_irr.irr,levered_sponsor_cash_irr_status:returns.levered_sponsor_cash_irr.status,project_unlevered_cash_irr_before_tax_attributes:returns.project_unlevered_cash_irr_before_tax_attributes.irr,unlevered_irr_status:returns.project_unlevered_cash_irr_before_tax_attributes.status,sponsor_npv:returns.sponsor_npv,project_npv:returns.project_npv,simplified_sponsor_after_tax_irr:returns.simplified_sponsor_after_tax_irr?.irr??null,tax_module_enabled:result.input.calculation_options.tax_module_enabled,irr_warning_code:returns.levered_sponsor_cash_irr.warning??null},
    downside_result:downside?{downside_type:downside.downside_type,generation_source_type:downside.generation_source_type??null,generation_multiplier:downside.generation_multiplier??null,minimum_downside_dscr:downside.minimum_downside_dscr,minimum_downside_dscr_year:downside.minimum_downside_dscr_year,full_repayment:downside.full_repayment,repayment_year:downside.repayment_year,unrepaid_balance:downside.unrepaid_balance,interest_shortfall:downside.interest_shortfall,is_lender_grade_p90:downside.generation_source_type==="INDEPENDENT_ENGINEER_P90"}:null,
    downside_cash_sweep_rows:downside?.cash_sweep_schedule.map(row=>({...row}))??[],
    reconciliation_result:{debt_reconciliation_difference:result.debt.reconciliation.debt_reconciliation_difference,debt_reconciled:result.debt.reconciliation.debt_reconciled,sources_uses_difference:result.capital_stack.reconciliation.sources_uses_difference,sources_uses_reconciled:result.capital_stack.reconciliation.sources_uses_reconciled},
    warnings:result.warnings,
    metric_traces:result.metric_traces,
  };
}

async function setTenant(client:PoolClient,context:OrganizationContext){await client.query("select set_config('app.organization_id',$1,true),set_config('app.user_id',$2,true)",[context.organizationId,context.actorUserId]);}

async function insertChildCalculation(client:PoolClient,args:{context:OrganizationContext;projectId:string;scenarioId:string;base:PersistedCalculationBundle;input:ProjectFinanceInput;snapshot:Record<string,unknown>;result:ProjectFinanceCoreResult;resultHash:string}):Promise<string>{
  const {context,projectId,scenarioId,base,input,snapshot,result,resultHash}=args;
  const inputHash=hashFinanceInput(input), bundle=mapped(result);
  const run=await client.query(`insert into project_finance.calculation_runs(organization_id,project_id,scenario_id,status,calculation_engine_version,resolver_version,underwriting_policy_id,underwriting_policy_version,input_hash,result_hash,input_snapshot_json,created_by,started_at,completed_at) values($1,$2,$3,'SUCCESS',$4,$5,$6,$7,$8,$9,$10::jsonb,$11,now(),now()) returning id`,[context.organizationId,projectId,scenarioId,CALCULATION_ENGINE_VERSION,base.run.resolver_version??SCENARIO_RESOLVER_VERSION,base.run.underwriting_policy_id,base.run.underwriting_policy_version,inputHash,resultHash,JSON.stringify(snapshot),context.actorUserId]);
  const runId=run.rows[0].id as string;
  for(const row of bundle.annual_project_cashflows) await client.query(`insert into project_finance.annual_project_cashflows(organization_id,calculation_run_id,year,generation_mwh,ppa_price_per_mwh,revenue,opex,cfads,sponsor_operating_cash_flow,depreciation,tax_shield) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[context.organizationId,runId,row.year,row.generation_mwh,row.ppa_price_per_mwh,row.revenue,row.opex,row.cfads,row.sponsor_operating_cash_flow,row.depreciation,row.tax_shield]);
  for(const row of bundle.annual_debt_schedules) await client.query(`insert into project_finance.annual_debt_schedules(organization_id,calculation_run_id,year,opening_balance,interest,principal,debt_service,ending_balance,dscr) values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[context.organizationId,runId,row.year,row.opening_balance,row.interest,row.principal,row.debt_service,row.ending_balance,row.dscr]);
  const f=bundle.financing_result; await client.query(`insert into project_finance.financing_results(organization_id,calculation_run_id,dscr_sized_debt,ltc_debt_limit,permanent_debt,binding_constraint,debt_to_capex,minimum_dscr,minimum_dscr_year,balloon_balance,lender_fee,dsra) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[context.organizationId,runId,f.dscr_sized_debt,f.ltc_debt_limit,f.permanent_debt,f.binding_constraint,f.debt_to_capex,f.minimum_dscr,f.minimum_dscr_year,f.balloon_balance,f.lender_fee,f.dsra]);
  const t=bundle.tax_credit_result; await client.query(`insert into project_finance.tax_credit_results(organization_id,calculation_run_id,eligible_basis,itc_rate,itc_face_value,transfer_price,gross_transfer_proceeds,transaction_costs,net_transfer_proceeds,depreciable_basis,bonus_depreciation,immediate_tax_shield) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[context.organizationId,runId,t.eligible_basis,t.itc_rate,t.itc_face_value,t.transfer_price,t.gross_transfer_proceeds,t.transaction_costs,t.net_transfer_proceeds,t.depreciable_basis,t.bonus_depreciation,t.immediate_tax_shield]);
  const c=bundle.capital_stack_result; await client.query(`insert into project_finance.capital_stack_results(organization_id,calculation_run_id,project_capex,closing_costs,lender_fee,dsra,other_financing_uses,total_closing_uses,permanent_debt,net_itc_proceeds,other_permanent_sources,sponsor_equity,debt_pct_total_uses,itc_pct_total_uses,sponsor_equity_pct_total_uses,other_sources_pct_total_uses) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,[context.organizationId,runId,c.project_capex,c.closing_costs,c.lender_fee,c.dsra,c.other_financing_uses,c.total_closing_uses,c.permanent_debt,c.net_itc_proceeds,c.other_permanent_sources,c.sponsor_equity,c.debt_pct_total_uses,c.itc_pct_total_uses,c.sponsor_equity_pct_total_uses,c.other_sources_pct_total_uses]);
  const rr=bundle.return_result; await client.query(`insert into project_finance.return_results(organization_id,calculation_run_id,levered_sponsor_cash_irr,levered_sponsor_cash_irr_status,project_unlevered_cash_irr_before_tax_attributes,unlevered_irr_status,sponsor_npv,project_npv,simplified_sponsor_after_tax_irr,tax_module_enabled,irr_warning_code) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[context.organizationId,runId,rr.levered_sponsor_cash_irr,rr.levered_sponsor_cash_irr_status,rr.project_unlevered_cash_irr_before_tax_attributes,rr.unlevered_irr_status,rr.sponsor_npv,rr.project_npv,rr.simplified_sponsor_after_tax_irr,rr.tax_module_enabled,rr.irr_warning_code]);
  if(bundle.downside_result){const d=bundle.downside_result;await client.query(`insert into project_finance.downside_results(organization_id,calculation_run_id,downside_type,generation_source_type,generation_multiplier,minimum_downside_dscr,minimum_downside_dscr_year,full_repayment,repayment_year,unrepaid_balance,interest_shortfall,is_lender_grade_p90) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[context.organizationId,runId,d.downside_type,d.generation_source_type,d.generation_multiplier,d.minimum_downside_dscr,d.minimum_downside_dscr_year,d.full_repayment,d.repayment_year,d.unrepaid_balance,d.interest_shortfall,d.is_lender_grade_p90]);}
  for(const row of bundle.downside_cash_sweep_rows) await client.query(`insert into project_finance.downside_cash_sweep_rows(organization_id,calculation_run_id,year,opening_balance,downside_cfads,interest_due,cash_available,principal_paid,ending_balance,interest_shortfall) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[context.organizationId,runId,row.year,row.opening_balance,row.downside_cfads,row.interest_due,row.cash_available,row.principal_paid,row.ending_balance,row.interest_shortfall]);
  const rec=bundle.reconciliation_result; await client.query(`insert into project_finance.reconciliation_results(organization_id,calculation_run_id,debt_reconciliation_difference,debt_reconciled,sources_uses_difference,sources_uses_reconciled) values($1,$2,$3,$4,$5,$6)`,[context.organizationId,runId,rec.debt_reconciliation_difference,rec.debt_reconciled,rec.sources_uses_difference,rec.sources_uses_reconciled]);
  for(const warning of bundle.warnings) await client.query(`insert into project_finance.calculation_warnings(organization_id,calculation_run_id,code,severity,message,metric_key,year,metadata_json) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,[context.organizationId,runId,warning.code,warning.severity,warning.message,warning.metric_key??null,warning.year??null,JSON.stringify(warning.metadata??null)]);
  for(const trace of bundle.metric_traces){await client.query(`insert into project_finance.formula_registry(formula_id,formula_name,formula_version,effective_from_engine_version) values($1,$1,1,$2) on conflict(formula_id) do nothing`,[trace.formula_id,CALCULATION_ENGINE_VERSION]);await client.query(`insert into project_finance.calculation_metric_traces(organization_id,calculation_run_id,metric_key,formula_id,value_json,dependencies_json,metadata_json) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb)`,[context.organizationId,runId,trace.metric_key,trace.formula_id,JSON.stringify(trace.value),JSON.stringify(trace.dependencies),JSON.stringify(trace.metadata??null)]);}
  return runId;
}

function summary(result:ProjectFinanceCoreResult,inputValue:number,isBase:boolean,childRunId:string):SensitivityPointSummary {
  return {input_value:inputValue,is_base:isBase,child_calculation_run_id:childRunId,permanent_debt:result.debt.financing_summary.permanent_debt,debt_to_capex:result.debt.financing_summary.debt_to_capex,sponsor_equity:result.capital_stack.capital_stack.sponsor_equity,minimum_dscr:result.debt.financing_summary.minimum_dscr,levered_sponsor_cash_irr:result.returns.levered_sponsor_cash_irr.irr,simplified_sponsor_after_tax_irr:result.returns.simplified_sponsor_after_tax_irr?.irr??null,binding_constraint:result.debt.financing_summary.binding_constraint,minimum_downside_dscr:result.downside?.minimum_downside_dscr??null,input_hash:hashFinanceInput(result.input),result_hash:hashCalculationResult(result)};
}

export class SensitivityService {
  private readonly calculations:CalculationService;
  constructor(private readonly pool:Pool=defaultPool){this.calculations=new CalculationService(new PostgresCalculationRepository(pool));}

  async run(args:{context:OrganizationContext;scenarioId:string;baseCalculationRunId:string;variable:SensitivityVariable;values:number[]}):Promise<SensitivityRunBundle>{
    if(!SUPPORTED_SENSITIVITY_VARIABLES.includes(args.variable)) throw new SensitivityServiceError("UNSUPPORTED_SENSITIVITY_VARIABLE","Only approved deterministic sensitivity variables are supported.");
    const base=await this.calculations.getCalculationRun(args.context,args.baseCalculationRunId).catch(()=>null);
    if(!base) throw new SensitivityServiceError("SENSITIVITY_BASE_NOT_FOUND","Base calculation run was not found in the authorized tenant.");
    if(base.run.status!=="SUCCESS") throw new SensitivityServiceError("SENSITIVITY_BASE_NOT_SUCCESSFUL","Sensitivity requires a successful immutable base calculation.");
    if(base.run.scenario_id!==args.scenarioId) throw new SensitivityServiceError("SENSITIVITY_BASE_NOT_FOUND","Base calculation does not belong to the requested scenario.");
    const scenario=await this.pool.query(`select status,project_id from project_finance.scenarios where id=$1 and organization_id=$2`,[args.scenarioId,args.context.organizationId]);
    if(!scenario.rowCount) throw new SensitivityServiceError("SENSITIVITY_BASE_NOT_FOUND","Scenario was not found in the authorized tenant.");
    if(scenario.rows[0].status==="STALE") throw new SensitivityServiceError("SENSITIVITY_BASE_STALE","Recalculate the scenario before running a new sensitivity.");
    const validation=validateProjectFinanceInput((base.run.input_snapshot_json as any)?.finance_input);
    if(!validation.success) throw new SensitivityServiceError("SENSITIVITY_BASE_NOT_SUCCESSFUL","Base calculation input snapshot is invalid.",{errors:validation.errors});
    const baseInput=validation.data;
    if(args.variable==="CAPACITY_FACTOR"&&baseInput.generation.annual_generation_override_mwh) throw new SensitivityServiceError("SENSITIVITY_NOT_APPLICABLE","Capacity-factor sensitivity is not applicable because the base calculation uses an explicit annual generation profile.");
    const baseVal=baseValue(baseInput,args.variable), values=stableValues(args.values,baseVal);
    const computed=values.map(value=>{const input=withSensitivity(baseInput,args.variable,value);const result=calculateProjectFinanceCore(input);return{value,input,result,isBase:Math.abs(value-baseVal)<1e-12};});
    const basePoint=computed.find(p=>p.isBase)!;
    if(hashCalculationResult(basePoint.result)!==base.run.result_hash) throw new SensitivityServiceError("SENSITIVITY_BASE_MISMATCH","Sensitivity base rerun does not reproduce the immutable base calculation result.",{base_run_id:base.run.id});
    if(args.variable==="ITC_RATE"){const baseDebt=Number((base.financing_result as any).permanent_debt);for(const point of computed)if(Math.abs(point.result.debt.financing_summary.permanent_debt-baseDebt)>1e-7)throw new SensitivityServiceError("SENSITIVITY_INVARIANT_FAILED","ITC-rate sensitivity changed permanent debt while operating and debt assumptions were unchanged.",{value:point.value});}

    const client=await this.pool.connect();
    try{
      await client.query("begin");await setTenant(client,args.context);
      const inserted=await client.query(`insert into project_finance.sensitivity_runs(organization_id,project_id,scenario_id,base_calculation_run_id,variable,status,created_by,created_at) values($1,$2,$3,$4,$5,'RUNNING',$6,now()) returning id,created_at`,[args.context.organizationId,base.run.project_id,args.scenarioId,base.run.id,args.variable,args.context.actorUserId]);
      const sensitivityRunId=inserted.rows[0].id as string; const points:SensitivityPointSummary[]=[];
      for(let i=0;i<computed.length;i++){
        const point=computed[i], field=sensitivityField(args.variable), baseSnapshot=structuredClone(base.run.input_snapshot_json) as any;
        baseSnapshot.finance_input=point.input;
        baseSnapshot.provenance={...(baseSnapshot.provenance??{}),[field]:{field_key:field,value:point.value,resolution_source:"SENSITIVITY_ENGINE",source_record_type:"SENSITIVITY_POINT",policy_default_used:false,override_used:false,metadata:{base_calculation_run_id:base.run.id,base_value:baseVal,sensitivity_variable:args.variable}}};
        baseSnapshot.sensitivity={variable:args.variable,base_calculation_run_id:base.run.id,base_value:baseVal,input_value:point.value};
        const resultHash=hashCalculationResult(point.result), childId=await insertChildCalculation(client,{context:args.context,projectId:base.run.project_id,scenarioId:args.scenarioId,base,input:point.input,snapshot:baseSnapshot,result:point.result,resultHash});
        const pointSummary=summary(point.result,point.value,point.isBase,childId);points.push(pointSummary);
        await client.query(`insert into project_finance.sensitivity_points(organization_id,sensitivity_run_id,sequence,input_value_json,child_calculation_run_id,summary_json) values($1,$2,$3,$4::jsonb,$5,$6::jsonb)`,[args.context.organizationId,sensitivityRunId,i,JSON.stringify({value:point.value,is_base:point.isBase}),childId,JSON.stringify(pointSummary)]);
      }
      const completed=await client.query(`update project_finance.sensitivity_runs set status='SUCCESS',completed_at=now() where id=$1 and organization_id=$2 returning id,project_id,scenario_id,base_calculation_run_id,variable,status,created_at,completed_at`,[sensitivityRunId,args.context.organizationId]);
      await client.query("commit");return{...completed.rows[0],points};
    }catch(error){await client.query("rollback").catch(()=>undefined);throw error instanceof SensitivityServiceError?error:new SensitivityServiceError("SENSITIVITY_PERSISTENCE_FAILED","Sensitivity run could not be persisted atomically.",{message:error instanceof Error?error.message:String(error)});}finally{client.release();}
  }

  async get(context:OrganizationContext,runId:string):Promise<SensitivityRunBundle>{
    const run=await this.pool.query(`select id,project_id,scenario_id,base_calculation_run_id,variable,status,created_at,completed_at from project_finance.sensitivity_runs where id=$1 and organization_id=$2`,[runId,context.organizationId]);
    if(!run.rowCount) throw new SensitivityServiceError("SENSITIVITY_BASE_NOT_FOUND","Sensitivity run was not found in the authorized tenant.");
    const points=await this.pool.query(`select summary_json from project_finance.sensitivity_points where sensitivity_run_id=$1 and organization_id=$2 order by sequence`,[runId,context.organizationId]);
    return{...run.rows[0],points:points.rows.map(r=>r.summary_json)};
  }

  async list(context:OrganizationContext,scenarioId:string){
    return (await this.pool.query(`select id,project_id,scenario_id,base_calculation_run_id,variable,status,created_at,completed_at,(select count(*)::int from project_finance.sensitivity_points p where p.sensitivity_run_id=r.id) as point_count from project_finance.sensitivity_runs r where organization_id=$1 and scenario_id=$2 order by created_at desc`,[context.organizationId,scenarioId])).rows;
  }
}

export function sensitivityRequestHash(input:{baseCalculationRunId:string;variable:SensitivityVariable;values:number[]}):string{return createHash("sha256").update(canonicalJson(input)).digest("hex");}

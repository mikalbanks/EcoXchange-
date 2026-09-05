import { createHash } from "node:crypto";
import { validateProjectFinanceInput, type ProjectFinanceInput } from "./domain-contracts";
import { CalculationService, hashCalculationResult, type OrganizationContext } from "./calculation-service";
import { PostgresCalculationRepository } from "./postgres-calculation-repository";
import { calculateProjectFinanceCore, type SensitivityVariable } from "./returns-downside";
import { canonicalJson } from "./scenario-resolver";
import { PostgresSensitivityRepository, type ComputedSensitivityPoint } from "./postgres-sensitivity-repository";
import { sensitivityBaseValue, sensitivityField, sensitivitySummary, type SensitivityPointSummary, type SensitivityRunBundle } from "./sensitivity-domain";

export { sensitivityBaseValue, sensitivityField, sensitivitySummary } from "./sensitivity-domain";
export type { SensitivityPointSummary, SensitivityRunBundle } from "./sensitivity-domain";

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

export function applySensitivity(input:ProjectFinanceInput,variable:SensitivityVariable,value:number):ProjectFinanceInput {
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
function stableValues(values:readonly number[],base:number):number[]{const result:number[]=[];for(const v of [base,...values])if(Number.isFinite(v)&&!result.some(x=>Math.abs(x-v)<1e-12))result.push(v);return result;}

export class SensitivityService {
  private readonly calculations:CalculationService;
  constructor(private readonly repository=new PostgresSensitivityRepository()){
    this.calculations=new CalculationService(new PostgresCalculationRepository(repository.pool));
  }
  async run(args:{context:OrganizationContext;scenarioId:string;baseCalculationRunId:string;variable:SensitivityVariable;values:number[]}):Promise<SensitivityRunBundle>{
    if(!SUPPORTED_SENSITIVITY_VARIABLES.includes(args.variable)) throw new SensitivityServiceError("UNSUPPORTED_SENSITIVITY_VARIABLE","Only approved deterministic sensitivity variables are supported.");
    const base=await this.calculations.getCalculationRun(args.context,args.baseCalculationRunId).catch(()=>null);
    if(!base) throw new SensitivityServiceError("SENSITIVITY_BASE_NOT_FOUND","Base calculation run was not found in the authorized tenant.");
    if(base.run.status!=="SUCCESS") throw new SensitivityServiceError("SENSITIVITY_BASE_NOT_SUCCESSFUL","Sensitivity requires a successful immutable base calculation.");
    if(base.run.scenario_id!==args.scenarioId) throw new SensitivityServiceError("SENSITIVITY_BASE_NOT_FOUND","Base calculation does not belong to the requested scenario.");
    const scenario=await this.repository.getScenarioState(args.context,args.scenarioId);
    if(!scenario) throw new SensitivityServiceError("SENSITIVITY_BASE_NOT_FOUND","Scenario was not found in the authorized tenant.");
    if(scenario.status==="STALE") throw new SensitivityServiceError("SENSITIVITY_BASE_STALE","Recalculate the scenario before running a new sensitivity.");
    const validation=validateProjectFinanceInput((base.run.input_snapshot_json as any)?.finance_input);
    if(!validation.success) throw new SensitivityServiceError("SENSITIVITY_BASE_NOT_SUCCESSFUL","Base calculation input snapshot is invalid.",{errors:validation.errors});
    const baseInput=validation.data;
    if(args.variable==="CAPACITY_FACTOR"&&baseInput.generation.annual_generation_override_mwh) throw new SensitivityServiceError("SENSITIVITY_NOT_APPLICABLE","Capacity-factor sensitivity is not applicable because the base calculation uses an explicit annual generation profile.");
    const baseValue=sensitivityBaseValue(baseInput,args.variable);
    const computed:ComputedSensitivityPoint[]=stableValues(args.values,baseValue).map(value=>{const input=applySensitivity(baseInput,args.variable,value);const result=calculateProjectFinanceCore(input);return{value,input,result,isBase:Math.abs(value-baseValue)<1e-12};});
    const basePoint=computed.find(p=>p.isBase)!;
    if(hashCalculationResult(basePoint.result)!==base.run.result_hash) throw new SensitivityServiceError("SENSITIVITY_BASE_MISMATCH","Sensitivity base rerun does not reproduce the immutable Base Calculation Run.",{base_run_id:base.run.id});
    if(args.variable==="ITC_RATE"){
      const debt=Number((base.financing_result as any).permanent_debt);
      for(const point of computed) if(Math.abs(point.result.debt.financing_summary.permanent_debt-debt)>1e-7) throw new SensitivityServiceError("SENSITIVITY_INVARIANT_FAILED","ITC-rate sensitivity changed permanent debt while operating and debt assumptions were unchanged.",{input_value:point.value});
    }
    try{return await this.repository.persistAtomic({context:args.context,base,variable:args.variable,points:computed});}
    catch(error){if(error instanceof SensitivityServiceError)throw error;throw new SensitivityServiceError("SENSITIVITY_PERSISTENCE_FAILED","Sensitivity run could not be persisted atomically.",{message:error instanceof Error?error.message:String(error)});}
  }
  async get(context:OrganizationContext,runId:string){
    try{return await this.repository.get(context,runId)}catch(error){if(error instanceof Error&&error.message==="SENSITIVITY_RUN_NOT_FOUND")throw new SensitivityServiceError("SENSITIVITY_BASE_NOT_FOUND","Sensitivity run was not found in the authorized tenant.");throw error;}
  }
  async list(context:OrganizationContext,scenarioId:string){
    const scenario=await this.repository.getScenarioState(context,scenarioId);
    if(!scenario) throw new SensitivityServiceError("SENSITIVITY_BASE_NOT_FOUND","Scenario was not found in the authorized tenant.");
    return this.repository.list(context,scenarioId);
  }
}

export function sensitivityRequestHash(input:{baseCalculationRunId:string;variable:SensitivityVariable;values:number[]}):string{return createHash("sha256").update(canonicalJson(input)).digest("hex");}

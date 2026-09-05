import { describe, expect, it } from "vitest";
import {
  analyzeBodySchema,
  projectCreateSchema,
  projectFactCreateSchema,
  scenarioAssumptionsSchema,
} from "../services/project-finance-engine/api-v1-contracts";
import { CalculationServiceError } from "../services/project-finance-engine/calculation-service";
import { projectFinanceHttpStatus, registerProjectFinanceV1Routes } from "./project-finance-v1";

const ORG="00000000-0000-0000-0000-000000000001";
const PROJECT="00000000-0000-0000-0000-000000000011";
const SCENARIO="00000000-0000-0000-0000-000000000012";
const CALC="00000000-0000-0000-0000-000000000013";
const UW="00000000-0000-0000-0000-000000000014";

function captureRoutes(service: any = {}) {
  const routes: Array<{ method: string; path: string; handler: any }> = [];
  const app: any = {};
  for (const method of ["get","post","put","patch","delete"]) app[method] = (path: string, handler: unknown) => { routes.push({ method: method.toUpperCase(), path, handler }); };
  registerProjectFinanceV1Routes(app, {
    service,
    resolveContext: async () => ({ organizationId: ORG, actorUserId: "user-1" }),
  });
  return routes;
}

function resMock() {
  return { statusCode: 200, body: undefined as any, status(code:number){this.statusCode=code;return this;}, json(body:any){this.body=body;return this;} };
}

const calcBundle:any={
  run:{id:CALC,organization_id:ORG,project_id:PROJECT,scenario_id:SCENARIO,status:"SUCCESS",calculation_engine_version:"0.2.0",resolver_version:"0.1.0",underwriting_policy_id:"policy-1",underwriting_policy_version:"0.1.0",input_hash:"ih",result_hash:"rh",input_snapshot_json:{},idempotency_key:null},
  annual_project_cashflows:[],annual_debt_schedules:[],financing_result:{permanent_debt:3_364_160,debt_to_capex:.4205,binding_constraint:"DSCR",minimum_dscr:1.30},tax_credit_result:{net_transfer_proceeds:2_097_600},capital_stack_result:{project_capex:8_000_000,sponsor_equity:2_995_000,net_itc_proceeds:2_097_600},return_result:{levered_sponsor_cash_irr:.024},downside_result:{minimum_downside_dscr:1.10},downside_cash_sweep_rows:[],reconciliation_result:{debt_reconciled:true,sources_uses_reconciled:true},warnings:[],metric_traces:[]
};
const uwBundle=(overall="PASS"):any=>({run:{id:UW,organization_id:ORG,project_id:PROJECT,scenario_id:SCENARIO,calculation_run_id:CALC,underwriting_policy_id:"policy-1",underwriting_policy_version:"0.1.0",execution_status:"SUCCESS",status:"SUCCESS",underwriting_engine_version:"0.1.0",underwriting_input_snapshot_json:{},underwriting_input_hash:"uih",underwriting_result_hash:"urh",financial_profile:overall==="FAIL"?"UNFINANCEABLE_UNDER_POLICY":"ACCEPTABLE",financing_readiness:"CLOSING_READY",overall_status:overall,idempotency_key:null},rule_results:[],risks:[],conditions:[],missing_information:[],lender_fit:[],recommendations:[]});

describe("Ticket 13 /api/v1 contracts", () => {
  it("registers the authoritative calculate, underwrite, analyze and history boundaries", () => {
    const routes = captureRoutes();
    expect(routes).toEqual(expect.arrayContaining([
      expect.objectContaining({ method:"POST",path:"/api/v1/scenarios/:scenarioId/calculate" }),
      expect.objectContaining({ method:"POST",path:"/api/v1/calculation-runs/:runId/underwrite" }),
      expect.objectContaining({ method:"POST",path:"/api/v1/scenarios/:scenarioId/analyze" }),
      expect.objectContaining({ method:"GET",path:"/api/v1/calculation-runs/:runId" }),
      expect.objectContaining({ method:"GET",path:"/api/v1/underwriting-runs/:runId" }),
      expect.objectContaining({ method:"GET",path:"/api/v1/scenarios/:scenarioId/resolved-input" }),
      expect.objectContaining({ method:"GET",path:"/api/v1/projects/:projectId/scenario-comparison" }),
    ]));
  });

  it("does not expose mutation or delete routes for immutable calculation/underwriting history", () => {
    const routes = captureRoutes();
    expect(routes.some(r => ["PATCH","PUT","DELETE"].includes(r.method) && /calculation-runs|underwriting-runs/.test(r.path))).toBe(false);
  });

  it("keeps organization identity out of project creation and accepts stable project capacity", () => {
    expect(projectCreateSchema.safeParse({ name:"Five MW",technology:"SOLAR_PV",organization_id:ORG }).success).toBe(false);
    expect(projectCreateSchema.safeParse({ name:"Five MW",technology:"SOLAR_PV",country_code:"US",capacity_mw_ac:5 }).success).toBe(true);
  });

  it("prevents ordinary fact writes from self-asserting VERIFIED",()=>{
    expect(projectFactCreateSchema.safeParse({field_key:"underwriting.ppa_status",value:"EXECUTED",source_type:"USER_ASSERTION",confidence_status:"VERIFIED"}).success).toBe(false);
    expect(projectFactCreateSchema.safeParse({field_key:"underwriting.ppa_status",value:"EXECUTED",source_type:"USER_ASSERTION",confidence_status:"REPORTED"}).success).toBe(true);
  });

  it("uses decimal rate conventions without guessing percentage points", () => {
    const parsed=scenarioAssumptionsSchema.parse({assumptions:[{field_key:"revenue.ppa_escalation_rate",value:.01,unit:"PERCENT_DECIMAL"}]});expect(parsed.assumptions[0].value).toBe(.01);
    const thirty=scenarioAssumptionsSchema.parse({assumptions:[{field_key:"tax_credit.itc_rate",value:30,unit:"PERCENT_DECIMAL"}]});expect(thirty.assumptions[0].value).toBe(30);
  });

  it("accepts explicit policy selectors and rejects client-computed finance results", () => {
    expect(analyzeBodySchema.safeParse({policy_code:"ECOXCHANGE_SOLAR_BASE",policy_version:"0.1.0"}).success).toBe(true);
    expect(analyzeBodySchema.safeParse({policy_code:"ECOXCHANGE_SOLAR_BASE",finance_result:{permanent_debt:1}}).success).toBe(false);
  });

  it("maps expected domain failures centrally", () => {
    expect(projectFinanceHttpStatus("CALCULATION_INPUT_INCOMPLETE")).toBe(422);
    expect(projectFinanceHttpStatus("POLICY_CALCULATION_MISMATCH")).toBe(409);
    expect(projectFinanceHttpStatus("IDEMPOTENCY_KEY_CONFLICT")).toBe(409);
    expect(projectFinanceHttpStatus("PROJECT_NOT_FOUND")).toBe(404);
  });

  it("returns HTTP success when underwriting executes and concludes credit FAIL",async()=>{
    let calcCalls=0,uwCalls=0;
    const service:any={getScenario:async()=>({id:SCENARIO,project_id:PROJECT}),calculations:{calculateScenario:async()=>{calcCalls++;return structuredClone(calcBundle)}},underwriting:{underwriteCalculation:async()=>{uwCalls++;return uwBundle("FAIL")}}};
    const route=captureRoutes(service).find(r=>r.method==="POST"&&r.path.endsWith("/:scenarioId/analyze"))!;
    const res=resMock();await route.handler({params:{scenarioId:SCENARIO},body:{},query:{},header:()=>undefined} as any,res as any);
    expect(res.statusCode).toBe(200);expect(res.body.data.underwriting_run.overall_status).toBe("FAIL");expect(calcCalls).toBe(1);expect(uwCalls).toBe(1);
  });

  it("does not invoke underwriting when calculation fails",async()=>{
    let uwCalls=0;
    const service:any={getScenario:async()=>({id:SCENARIO,project_id:PROJECT}),calculations:{calculateScenario:async()=>{throw new CalculationServiceError("CALCULATION_INPUT_INCOMPLETE","missing",{missing_fields:["transaction_costs.project_capex"]})}},underwriting:{underwriteCalculation:async()=>{uwCalls++;return uwBundle()}}};
    const route=captureRoutes(service).find(r=>r.method==="POST"&&r.path.endsWith("/:scenarioId/analyze"))!;
    const res=resMock();await route.handler({params:{scenarioId:SCENARIO},body:{},query:{},header:()=>undefined} as any,res as any);
    expect(res.statusCode).toBe(422);expect(res.body.error.code).toBe("CALCULATION_INPUT_INCOMPLETE");expect(uwCalls).toBe(0);
  });

  it("keeps fact, scenario, override and policy discovery endpoints versioned", () => {
    const routes=captureRoutes();expect(routes.every(r=>r.path.startsWith("/api/v1/"))).toBe(true);
    expect(routes).toEqual(expect.arrayContaining([
      expect.objectContaining({method:"POST",path:"/api/v1/projects/:projectId/facts"}),
      expect.objectContaining({method:"POST",path:"/api/v1/projects/:projectId/facts/:factId/supersede"}),
      expect.objectContaining({method:"PUT",path:"/api/v1/scenarios/:scenarioId/assumptions"}),
      expect.objectContaining({method:"POST",path:"/api/v1/scenarios/:scenarioId/policy-overrides"}),
      expect.objectContaining({method:"GET",path:"/api/v1/underwriting-policies"}),
    ]));
  });
});

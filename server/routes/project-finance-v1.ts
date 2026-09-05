import type { Express, Request, Response } from "express";
import { ZodError } from "zod";
import { pool } from "../db";
import {
  INDICATIVE_UNDERWRITING_DISCLAIMER,
  analyzeBodySchema,
  calculateBodySchema,
  idempotencyKeySchema,
  policyOverrideCreateSchema,
  projectCreateSchema,
  projectFactCreateSchema,
  projectPatchSchema,
  scenarioAssumptionsSchema,
  scenarioCreateSchema,
  scenarioPatchSchema,
  underwriteBodySchema,
  uuidSchema,
} from "../services/project-finance-engine/api-v1-contracts";
import { CalculationServiceError, type OrganizationContext, type PersistedCalculationBundle } from "../services/project-finance-engine/calculation-service";
import { UnderwritingServiceError, type PersistedUnderwritingBundle } from "../services/project-finance-engine/underwriting-service";
import { ProjectFinanceApiError, ProjectFinanceApiService } from "../services/project-finance-engine/project-finance-api-service";

const API = "/api/v1";
const defaultService = new ProjectFinanceApiService();

type Req = Request & { session?: { userId?: string } };

type ProjectFinanceApiDeps = {
  service?: ProjectFinanceApiService;
  resolveContext?: (req: Req) => Promise<OrganizationContext>;
};

async function defaultContext(req: Req): Promise<OrganizationContext> {
  const userId = req.session?.userId;
  if (!userId) throw new ProjectFinanceApiError("UNAUTHENTICATED", "Authentication is required.");
  const result = await pool.query(`select id,organization_id from public.users where id=$1`, [userId]);
  if (!result.rowCount || !result.rows[0].organization_id) throw new ProjectFinanceApiError("UNAUTHORIZED", "No project-finance tenant is assigned to this user.");
  return { organizationId: result.rows[0].organization_id, actorUserId: result.rows[0].id };
}

function ok<T>(res: Response, data: T, meta?: Record<string, unknown>, status = 200) {
  return res.status(status).json(meta ? { data, meta } : { data });
}

const statusByCode: Record<string, number> = {
  UNAUTHENTICATED: 401, UNAUTHORIZED: 403,
  PROJECT_NOT_FOUND: 404, PROJECT_FACT_NOT_FOUND: 404, SCENARIO_NOT_FOUND: 404, POLICY_NOT_FOUND: 404, UNDERWRITING_CALCULATION_NOT_FOUND: 404,
  SCENARIO_PROJECT_MISMATCH: 409, SCENARIO_ARCHIVED: 409, PROJECT_ARCHIVED: 409, CALCULATION_STALE: 409, CALCULATION_CONTEXT_STALE: 409,
  POLICY_CALCULATION_MISMATCH: 409, STALE_POLICY_OVERRIDE: 409, UNREGISTERED_POLICY_OVERRIDE: 409, IDEMPOTENCY_KEY_CONFLICT: 409,
  CALCULATION_INPUT_INCOMPLETE: 422, INVALID_RESOLVED_INPUT: 422, OUT_OF_SCOPE_FOR_CALCULATION: 422, CALCULATION_NOT_UNDERWRITABLE: 422,
  UNKNOWN_SCENARIO_FIELD: 400, INVALID_POLICY_OVERRIDE: 400, POLICY_CONFIGURATION_ERROR: 409, UNDERWRITING_POLICY_CONFIGURATION_ERROR: 409,
  FINANCE_ENGINE_FAILED: 500, CALCULATION_PERSISTENCE_FAILED: 500, UNDERWRITING_ENGINE_FAILED: 500, UNDERWRITING_PERSISTENCE_FAILED: 500,
};

export function projectFinanceHttpStatus(code: string): number { return statusByCode[code] ?? 500; }

function errorResponse(res: Response, error: unknown, extra?: Record<string, unknown>) {
  if (error instanceof ZodError) return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Request validation failed.", details: { issues: error.issues } } });
  if (error instanceof CalculationServiceError || error instanceof UnderwritingServiceError || error instanceof ProjectFinanceApiError) {
    return res.status(projectFinanceHttpStatus(error.code)).json({ error: { code: error.code, message: error.message, details: { ...(error.details ?? {}), ...(extra ?? {}) } } });
  }
  console.error("project-finance-v1", error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) });
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Project-finance request could not be completed.", details: extra } });
}

function parseId(raw: string) { return uuidSchema.parse(raw); }
function parseIdempotency(req: Request): string | undefined { const raw=req.header("Idempotency-Key"); return raw ? idempotencyKeySchema.parse(raw) : undefined; }
function selector(body: any) { return { policyId: body.policy_id, policyCode: body.policy_code, policyVersion: body.policy_version }; }

function financialSummary(bundle: PersistedCalculationBundle) {
  const f:any=bundle.financing_result, c:any=bundle.capital_stack_result, t:any=bundle.tax_credit_result, r:any=bundle.return_result, d:any=bundle.downside_result;
  return {
    project_capex: c?.project_capex ?? null,
    permanent_debt: f?.permanent_debt ?? null,
    debt_to_capex: f?.debt_to_capex ?? null,
    binding_constraint: f?.binding_constraint ?? null,
    sponsor_equity: c?.sponsor_equity ?? null,
    net_itc_proceeds: c?.net_itc_proceeds ?? t?.net_transfer_proceeds ?? null,
    minimum_p50_dscr: f?.minimum_dscr ?? null,
    minimum_downside_dscr: d?.minimum_downside_dscr ?? null,
    levered_sponsor_cash_irr: r?.levered_sponsor_cash_irr ?? null,
  };
}

function calculationDto(bundle: PersistedCalculationBundle) {
  return { ...bundle, financial_summary: financialSummary(bundle) };
}
function underwritingDto(bundle: PersistedUnderwritingBundle) {
  return { ...bundle, assessment_type: "INDICATIVE_UNDERWRITING", disclaimer: INDICATIVE_UNDERWRITING_DISCLAIMER };
}

export function registerProjectFinanceV1Routes(app: Express, deps: ProjectFinanceApiDeps = {}) {
  const service=deps.service ?? defaultService; const resolveContext=deps.resolveContext ?? defaultContext;
  const handler=(fn:(req:Req,res:Response,context:OrganizationContext)=>Promise<unknown>)=>async(req:Req,res:Response)=>{try{const context=await resolveContext(req);await fn(req,res,context);}catch(e){errorResponse(res,e);}};

  app.get(`${API}/projects`,handler(async(_req,res,ctx)=>ok(res,await service.listProjects(ctx))));
  app.post(`${API}/projects`,handler(async(req,res,ctx)=>ok(res,await service.createProject(ctx,projectCreateSchema.parse(req.body)),undefined,201)));
  app.get(`${API}/projects/:projectId`,handler(async(req,res,ctx)=>ok(res,await service.getProject(ctx,parseId(req.params.projectId)))));
  app.patch(`${API}/projects/:projectId`,handler(async(req,res,ctx)=>ok(res,await service.patchProject(ctx,parseId(req.params.projectId),projectPatchSchema.parse(req.body)))));
  app.post(`${API}/projects/:projectId/archive`,handler(async(req,res,ctx)=>ok(res,await service.archiveProject(ctx,parseId(req.params.projectId)))));

  app.get(`${API}/projects/:projectId/facts`,handler(async(req,res,ctx)=>ok(res,await service.listFacts(ctx,parseId(req.params.projectId)))));
  app.post(`${API}/projects/:projectId/facts`,handler(async(req,res,ctx)=>ok(res,await service.addFact(ctx,parseId(req.params.projectId),projectFactCreateSchema.parse(req.body)),undefined,201)));
  app.post(`${API}/projects/:projectId/facts/:factId/supersede`,handler(async(req,res,ctx)=>ok(res,await service.supersedeFact(ctx,parseId(req.params.projectId),parseId(req.params.factId),projectFactCreateSchema.omit({field_key:true}).parse(req.body)),undefined,201)));

  app.get(`${API}/projects/:projectId/scenarios`,handler(async(req,res,ctx)=>ok(res,await service.listScenarios(ctx,parseId(req.params.projectId)))));
  app.post(`${API}/projects/:projectId/scenarios`,handler(async(req,res,ctx)=>ok(res,await service.createScenario(ctx,parseId(req.params.projectId),scenarioCreateSchema.parse(req.body)),undefined,201)));
  app.get(`${API}/scenarios/:scenarioId`,handler(async(req,res,ctx)=>ok(res,await service.getScenario(ctx,parseId(req.params.scenarioId)))));
  app.patch(`${API}/scenarios/:scenarioId`,handler(async(req,res,ctx)=>ok(res,await service.patchScenario(ctx,parseId(req.params.scenarioId),scenarioPatchSchema.parse(req.body)))));
  app.get(`${API}/scenarios/:scenarioId/assumptions`,handler(async(req,res,ctx)=>ok(res,await service.listAssumptions(ctx,parseId(req.params.scenarioId)))));
  app.put(`${API}/scenarios/:scenarioId/assumptions`,handler(async(req,res,ctx)=>ok(res,await service.putAssumptions(ctx,parseId(req.params.scenarioId),scenarioAssumptionsSchema.parse(req.body).assumptions))));
  app.post(`${API}/scenarios/:scenarioId/policy-overrides`,handler(async(req,res,ctx)=>ok(res,await service.addPolicyOverride(ctx,parseId(req.params.scenarioId),policyOverrideCreateSchema.parse(req.body)),undefined,201)));

  app.get(`${API}/scenarios/:scenarioId/resolved-input`,handler(async(req,res,ctx)=>ok(res,await service.resolveScenario(ctx,parseId(req.params.scenarioId),{policyId:typeof req.query.policy_id==="string"?req.query.policy_id:undefined,policyCode:typeof req.query.policy_code==="string"?req.query.policy_code:undefined,policyVersion:typeof req.query.policy_version==="string"?req.query.policy_version:undefined}))));

  app.post(`${API}/scenarios/:scenarioId/calculate`,handler(async(req,res,ctx)=>{
    const scenarioId=parseId(req.params.scenarioId), body=calculateBodySchema.parse(req.body ?? {}), scenario=await service.getScenario(ctx,scenarioId);
    const result=await service.calculations.calculateScenario({context:ctx,projectId:scenario.project_id,scenarioId,...selector(body),idempotencyKey:parseIdempotency(req)});
    return ok(res,calculationDto(result));
  }));

  app.post(`${API}/calculation-runs/:runId/underwrite`,handler(async(req,res,ctx)=>{
    const runId=parseId(req.params.runId),body=underwriteBodySchema.parse(req.body ?? {}),calc=await service.calculations.getCalculationRun(ctx,runId);
    const result=await service.underwriting.underwriteCalculation({context:ctx,projectId:calc.run.project_id,scenarioId:calc.run.scenario_id,calculationRunId:runId,...selector(body),idempotencyKey:parseIdempotency(req)});
    return ok(res,underwritingDto(result));
  }));

  app.post(`${API}/scenarios/:scenarioId/analyze`,handler(async(req,res,ctx)=>{
    const scenarioId=parseId(req.params.scenarioId),body=analyzeBodySchema.parse(req.body ?? {}),scenario=await service.getScenario(ctx,scenarioId),key=parseIdempotency(req);
    const calculation=await service.calculations.calculateScenario({context:ctx,projectId:scenario.project_id,scenarioId,...selector(body),idempotencyKey:key?`calc:${key}`:undefined});
    try {
      const underwriting=await service.underwriting.underwriteCalculation({context:ctx,projectId:scenario.project_id,scenarioId,calculationRunId:calculation.run.id,...selector(body),idempotencyKey:key?`uw:${key}`:undefined});
      return ok(res,{project_id:scenario.project_id,scenario_id:scenarioId,calculation_run:{id:calculation.run.id,status:calculation.run.status,engine_version:calculation.run.calculation_engine_version,resolver_version:calculation.run.resolver_version,input_hash:calculation.run.input_hash,result_hash:calculation.run.result_hash},underwriting_run:{id:underwriting.run.id,execution_status:underwriting.run.execution_status,overall_status:underwriting.run.overall_status,financial_profile:underwriting.run.financial_profile,financing_readiness:underwriting.run.financing_readiness,policy_version:underwriting.run.underwriting_policy_version,underwriting_engine_version:underwriting.run.underwriting_engine_version},financial_summary:financialSummary(calculation),risks:underwriting.risks,conditions:underwriting.conditions,missing_information:underwriting.missing_information,lender_fit:underwriting.lender_fit,recommendations:underwriting.recommendations,assessment_type:"INDICATIVE_UNDERWRITING",disclaimer:INDICATIVE_UNDERWRITING_DISCLAIMER});
    } catch(e) { return errorResponse(res,e,{calculation_run_id:calculation.run.id}); }
  }));

  app.get(`${API}/calculation-runs/:runId`,handler(async(req,res,ctx)=>ok(res,calculationDto(await service.calculations.getCalculationRun(ctx,parseId(req.params.runId))))));
  app.get(`${API}/scenarios/:scenarioId/calculation-runs`,handler(async(req,res,ctx)=>ok(res,await service.listCalculationRuns(ctx,parseId(req.params.scenarioId)))));
  app.get(`${API}/underwriting-runs/:runId`,handler(async(req,res,ctx)=>ok(res,underwritingDto(await service.underwriting.getUnderwritingRun(ctx,parseId(req.params.runId))))));
  app.get(`${API}/scenarios/:scenarioId/underwriting-runs`,handler(async(req,res,ctx)=>ok(res,await service.listUnderwritingRuns(ctx,parseId(req.params.scenarioId)))));
  app.get(`${API}/projects/:projectId/scenario-comparison`,handler(async(req,res,ctx)=>ok(res,await service.scenarioComparison(ctx,parseId(req.params.projectId)))));
  app.get(`${API}/underwriting-policies`,handler(async(_req,res,ctx)=>ok(res,await service.listPolicies(ctx))));
}

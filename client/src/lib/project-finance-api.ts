export type ApiEnvelope<T> = { data: T; meta?: Record<string, unknown> };
export type ApiErrorBody = { error?: { code?: string; message?: string; details?: Record<string, unknown> } };

export class ProjectFinanceClientError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly details?: Record<string, unknown>) {
    super(message); this.name = "ProjectFinanceClientError";
  }
}

async function request<T>(method: string, url: string, body?: unknown, headers?: Record<string,string>): Promise<T> {
  const response = await fetch(url, { method, headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(headers ?? {}) }, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: "include" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const e = payload as ApiErrorBody;
    throw new ProjectFinanceClientError(response.status, e.error?.code ?? "REQUEST_FAILED", e.error?.message ?? "Project-finance request failed.", e.error?.details);
  }
  return (payload as ApiEnvelope<T>).data;
}

export type ProjectRecord = { id:string; name:string; technology:string; country_code:string; state_code:string|null; capacity_mw_ac:string|number|null; development_status:string|null; revenue_structure:string|null; created_at:string; updated_at:string; archived_at:string|null; latest_scenario_id?:string|null; latest_scenario_name?:string|null; latest_scenario_status?:string|null; latest_underwriting_status?:string|null; latest_underwriting_run_id?:string|null };
export type ScenarioRecord = { id:string; project_id:string; name:string; description?:string|null; scenario_type:string; status:string; latest_calculation_run_id?:string|null; latest_underwriting_run_id?:string|null; updated_at:string; archived_at?:string|null };
export type FactRecord = { id:string; field_key:string; value:unknown; unit?:string|null; source_type:string; confidence_status:string; source_document_id?:string|null; is_current:boolean; created_at:string };
export type AssumptionRecord = { id:string; field_key:string; value:unknown; unit?:string|null; source_type:string; provenance_type?:string|null; policy_id?:string|null; policy_version?:string|null };
export type ResolvedField = { field_key:string; value:unknown; unit?:string; resolution_source:string; source_record_id?:string; source_record_type?:string; source_strength?:string; verification_status?:string; policy_default_used:boolean; policy_value?:unknown; override_used:boolean; override_reason?:string };
export type ResolvedScenario = { project_id:string; scenario_id:string; finance_input:Record<string,any>|null; resolved_fields:Record<string,ResolvedField>; missing_fields:Array<{field_key:string;required_for:string;reason:string}>; warnings:Array<{code:string;field_key?:string;message:string;blocking:boolean}>; errors:Array<{code:string;field_key?:string;message:string;blocking:boolean}>; calculation_ready:boolean; policy_code:string; policy_version:string; resolver_version:string; input_hash:string|null };
export type PolicyRecord = { id:string; policy_code:string; policy_version:string; status:string; effective_date?:string|null; description?:string|null };
export type UnderwritingRunSummary = { id:string; calculation_run_id:string; underwriting_policy_version:string; execution_status:string; overall_status:string|null; financial_profile:string|null; financing_readiness:string|null; created_at?:string; completed_at?:string };
export type RuleResult = { rule_id:string; rule_version:string; category:string; status:string; severity:string; actual_value:unknown; required_value:unknown; message:string; condition?:string|null; source_reference?:string|null; metadata?:Record<string,unknown> };
export type RiskResult = { risk_code:string; category:string; severity:string; title:string; description:string; source_rule_id:string };
export type ConditionResult = { condition_code:string; severity:string; title:string; description:string; source_rule_id:string; status?:string };
export type MissingInformationResult = { field_key:string; reason:string; required_for:string; severity:string };
export type LenderFitResult = { lender_category:string; fit:string; reason_codes:string[] };
export type CalculationRunDetail = {
  run:{ id:string; project_id:string; scenario_id:string; status:string; calculation_engine_version:string; resolver_version:string; underwriting_policy_id:string|null; underwriting_policy_version:string|null; input_hash:string; result_hash:string|null; input_snapshot_json:Record<string,any>; created_at?:string; completed_at?:string };
  annual_project_cashflows:Array<Record<string,unknown>>; annual_debt_schedules:Array<Record<string,unknown>>;
  financing_result:Record<string,any>; tax_credit_result:Record<string,any>; capital_stack_result:Record<string,any>; return_result:Record<string,any>; downside_result:Record<string,any>|null;
  downside_cash_sweep_rows:Array<Record<string,unknown>>; reconciliation_result:Record<string,any>; warnings:Array<Record<string,any>>; metric_traces:Array<Record<string,any>>; financial_summary:Record<string,any>;
};
export type UnderwritingRunDetail = {
  run:{ id:string; project_id:string; scenario_id:string; calculation_run_id:string; underwriting_policy_id:string; underwriting_policy_version:string; execution_status:string; status:string; underwriting_engine_version:string; underwriting_input_snapshot_json:Record<string,any>; underwriting_input_hash:string; underwriting_result_hash:string|null; financial_profile:string|null; financing_readiness:string|null; overall_status:string|null; created_at?:string; completed_at?:string };
  rule_results:RuleResult[]; risks:RiskResult[]; conditions:ConditionResult[]; missing_information:MissingInformationResult[]; lender_fit:LenderFitResult[]; recommendations:string[]; assessment_type:string; disclaimer:string;
};
export type AnalyzeResult = { project_id:string; scenario_id:string; calculation_run:{id:string;status:string;engine_version:string;resolver_version:string;input_hash:string;result_hash:string|null}; underwriting_run:{id:string;execution_status:string;overall_status:string|null;financial_profile:string|null;financing_readiness:string|null;policy_version:string;underwriting_engine_version:string}; financial_summary:Record<string,unknown>; risks:unknown[]; conditions:unknown[]; missing_information:unknown[]; lender_fit:unknown[]; recommendations:unknown[]; assessment_type:string; disclaimer:string };

export const pfApi = {
  listProjects: () => request<ProjectRecord[]>("GET", "/api/v1/projects"), createProject: (body:unknown) => request<ProjectRecord>("POST", "/api/v1/projects", body), getProject: (id:string) => request<ProjectRecord>("GET", `/api/v1/projects/${id}`), patchProject: (id:string, body:unknown) => request<ProjectRecord>("PATCH", `/api/v1/projects/${id}`, body), archiveProject: (id:string) => request<{id:string;archived_at:string}>("POST", `/api/v1/projects/${id}/archive`, {}),
  listFacts: (projectId:string) => request<FactRecord[]>("GET", `/api/v1/projects/${projectId}/facts`), addFact: (projectId:string, body:unknown) => request<FactRecord>("POST", `/api/v1/projects/${projectId}/facts`, body),
  listScenarios: (projectId:string) => request<ScenarioRecord[]>("GET", `/api/v1/projects/${projectId}/scenarios`), createScenario: (projectId:string, body:unknown) => request<ScenarioRecord>("POST", `/api/v1/projects/${projectId}/scenarios`, body), getScenario: (scenarioId:string) => request<ScenarioRecord>("GET", `/api/v1/scenarios/${scenarioId}`),
  listAssumptions: (scenarioId:string) => request<AssumptionRecord[]>("GET", `/api/v1/scenarios/${scenarioId}/assumptions`), putAssumptions: (scenarioId:string, assumptions:unknown[]) => request<AssumptionRecord[]>("PUT", `/api/v1/scenarios/${scenarioId}/assumptions`, { assumptions }), addPolicyOverride: (scenarioId:string, body:unknown) => request<any>("POST", `/api/v1/scenarios/${scenarioId}/policy-overrides`, body), resolveScenario: (scenarioId:string, policyId?:string) => request<ResolvedScenario>("GET", `/api/v1/scenarios/${scenarioId}/resolved-input${policyId ? `?policy_id=${encodeURIComponent(policyId)}` : ""}`),
  listPolicies: () => request<PolicyRecord[]>("GET", "/api/v1/underwriting-policies"), listUnderwritingRuns: (scenarioId:string) => request<UnderwritingRunSummary[]>("GET", `/api/v1/scenarios/${scenarioId}/underwriting-runs`), getUnderwritingRun: (runId:string) => request<UnderwritingRunDetail>("GET", `/api/v1/underwriting-runs/${runId}`), getCalculationRun: (runId:string) => request<CalculationRunDetail>("GET", `/api/v1/calculation-runs/${runId}`),
  analyze: (scenarioId:string, body:unknown, idempotencyKey:string) => request<AnalyzeResult>("POST", `/api/v1/scenarios/${scenarioId}/analyze`, body, { "Idempotency-Key": idempotencyKey }),
};

export const displaySource = (source?:string) => ({ VERIFIED_PROJECT_FACT:"Fact",PROJECT_FACT:"Fact",DOCUMENT_FACT:"Document",USER_ASSERTION:"User Provided",SCENARIO_ASSUMPTION:"Custom Scenario",POLICY_DEFAULT:"EcoXchange Assumption",POLICY_OVERRIDE:"Override",LENDER_QUOTE:"Lender Quote",MISSING:"Missing" }[source ?? ""] ?? (source ? source.replaceAll("_"," ").toLowerCase().replace(/(^|\s)\w/g,m=>m.toUpperCase()) : "Unknown"));
export const humanize = (value?:string|null) => value ? value.replaceAll("_"," ").toLowerCase().replace(/(^|\s)\w/g,m=>m.toUpperCase()) : "Unknown";
export const percentFromDecimal = (value:unknown) => typeof value === "number" ? `${(value*100).toLocaleString(undefined,{maximumFractionDigits:2})}%` : "—";
export const percentToDecimal = (value:string) => { const n=Number(value); if(!Number.isFinite(n)) throw new Error("Enter a valid percentage."); return n/100; };
export const dscr = (value:unknown) => typeof value === "number" ? `${value.toFixed(2)}x` : "—";
export const money = (value:unknown,compact=false) => typeof value === "number" ? new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",notation:compact?"compact":"standard",maximumFractionDigits:compact?2:0}).format(value) : "Not available";
export const formatMetric = (value:unknown,kind?:"money"|"percent"|"dscr"|"number") => value == null ? "Not available" : kind==="money" ? money(value) : kind==="percent" ? percentFromDecimal(value) : kind==="dscr" ? dscr(value) : typeof value==="number" ? value.toLocaleString() : String(value);
export const isWithinV0Scope = (project:Pick<ProjectRecord,"technology"|"country_code"|"capacity_mw_ac"|"revenue_structure">) => { const mw=Number(project.capacity_mw_ac); return project.technology==="SOLAR_PV"&&project.country_code==="US"&&Number.isFinite(mw)&&mw>=1&&mw<=20&&project.revenue_structure==="FULLY_CONTRACTED"; };
export const canRunAnalyze = (resolved:Pick<ResolvedScenario,"calculation_ready">|undefined,project:Pick<ProjectRecord,"technology"|"country_code"|"capacity_mw_ac"|"revenue_structure">|undefined,pendingSaves:number) => Boolean(resolved?.calculation_ready&&project&&isWithinV0Scope(project)&&pendingSaves===0);

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FinanceabilityMarginPanel, RunSensitivityButton, SENSITIVITY_VARIABLE_LABELS, SensitivityHistory, SensitivityPointEditor, SensitivityResultChart, SensitivityResultTable, SensitivityVariableSelector } from "@/components/project-finance-sensitivity";
import { pfApi, ProjectFinanceClientError, type SensitivityRun, type SensitivityVariable } from "@/lib/project-finance-api";

const PRESENTATION_GRIDS:Partial<Record<SensitivityVariable,string>>={PPA_PRICE:"40,45,50,55,60",ITC_RATE:"0.06,0.30,0.40,0.50"};
function baseValue(calculation:any,variable:SensitivityVariable):number|null{const i=calculation?.run?.input_snapshot_json?.finance_input;if(!i)return null;if(variable==="PPA_PRICE")return Number(i.revenue?.ppa_price_year_1_per_mwh);if(variable==="INTEREST_RATE")return Number(i.financing?.annual_interest_rate);if(variable==="PROJECT_CAPEX")return Number(i.transaction_costs?.project_capex);if(variable==="CAPACITY_FACTOR")return Number(i.generation?.capacity_factor_p50);return Number(i.tax_credit?.itc_rate)}
function parseValues(raw:string){return raw.split(',').map(v=>Number(v.trim())).filter(Number.isFinite)}

export default function ProjectFinanceSensitivityPage(){
  const {projectId="",scenarioId=""}=useParams<{projectId:string;scenarioId:string}>(); const qc=useQueryClient();
  const projectQ=useQuery({queryKey:["pf-project",projectId],queryFn:()=>pfApi.getProject(projectId)});
  const scenarioQ=useQuery({queryKey:["pf-scenario",scenarioId],queryFn:()=>pfApi.getScenario(scenarioId)});
  const calcQ=useQuery({queryKey:["pf-calculation",scenarioQ.data?.latest_calculation_run_id],queryFn:()=>pfApi.getCalculationRun(scenarioQ.data!.latest_calculation_run_id!),enabled:Boolean(scenarioQ.data?.latest_calculation_run_id)});
  const historyQ=useQuery({queryKey:["pf-sensitivity-history",scenarioId],queryFn:()=>pfApi.listSensitivityRuns(scenarioId)});
  const [variable,setVariable]=useState<SensitivityVariable>("PPA_PRICE"); const [values,setValues]=useState(PRESENTATION_GRIDS.PPA_PRICE!); const [selectedRun,setSelectedRun]=useState<string|null>(null); const [metric,setMetric]=useState<"permanent_debt"|"sponsor_equity"|"levered_sponsor_cash_irr"|"debt_to_capex">("permanent_debt");
  const runQ=useQuery({queryKey:["pf-sensitivity-run",selectedRun],queryFn:()=>pfApi.getSensitivityRun(selectedRun!),enabled:Boolean(selectedRun)});
  const base=baseValue(calcQ.data,variable);
  useEffect(()=>{const preset=PRESENTATION_GRIDS[variable];setValues(preset??(base!==null&&Number.isFinite(base)?String(base):""));},[variable,base]);
  const mutation=useMutation({mutationFn:async()=>{if(!scenarioQ.data?.latest_calculation_run_id)throw new Error("A successful base calculation is required.");return pfApi.runSensitivity(scenarioId,{base_calculation_run_id:scenarioQ.data.latest_calculation_run_id,variable,values:parseValues(values)});},onSuccess:(run)=>{setSelectedRun(run.id);qc.invalidateQueries({queryKey:["pf-sensitivity-history",scenarioId]});}});
  const activeRun=(mutation.data?.id===selectedRun?mutation.data:runQ.data) as SensitivityRun|undefined;
  const explicitGeneration=Boolean(calcQ.data?.run.input_snapshot_json?.finance_input?.generation?.annual_generation_override_mwh);
  const notApplicable=variable==="CAPACITY_FACTOR"&&explicitGeneration;
  const stale=scenarioQ.data?.status==="STALE";
  const error=mutation.error instanceof ProjectFinanceClientError?mutation.error:null;
  return <DashboardLayout title="Sensitivity Analysis" description="One-variable deterministic reruns around an immutable Base Calculation." breadcrumbs={[{label:"Project Finance",href:"/developer/project-finance/projects"},{label:projectQ.data?.name??"Project",href:`/developer/project-finance/projects/${projectId}`},{label:"Sensitivity"}]}> 
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href={`/developer/project-finance/projects/${projectId}/scenarios/compare`}>Compare Scenarios</Link></Button><Button asChild variant="outline"><Link href={`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/inputs`}>Back to Inputs</Link></Button></div>
      <Alert><AlertTitle>Full deterministic reruns</AlertTitle><AlertDescription>A sensitivity point is a complete deterministic rerun of the Project Finance Engine with one approved input changed. It is not an interpolation of the Base Case result.</AlertDescription></Alert>
      {stale?<Alert variant="destructive"><AlertTitle>Base scenario is stale</AlertTitle><AlertDescription>Recalculate the current scenario before starting a new sensitivity. Historical sensitivity runs remain available below.</AlertDescription></Alert>:null}
      {notApplicable?<Alert><AlertTitle>Capacity-factor sensitivity is not applicable</AlertTitle><AlertDescription>This scenario uses an explicit annual generation profile, so capacity factor does not drive production for this immutable calculation.</AlertDescription></Alert>:null}
      <Card><CardHeader><CardTitle>Run sensitivity</CardTitle><CardDescription>Only Ticket 06 approved variables are available. The Base Case is automatically included and must reproduce the Base Calculation Run.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-[240px_1fr_auto] lg:items-end"><SensitivityVariableSelector value={variable} onChange={setVariable}/><SensitivityPointEditor variable={variable} values={values} onChange={setValues}/><RunSensitivityButton running={mutation.isPending} disabled={Boolean(stale||notApplicable||!scenarioQ.data?.latest_calculation_run_id||parseValues(values).length===0)} onClick={()=>mutation.mutate()}/></CardContent></Card>
      {error?<Alert variant="destructive"><AlertTitle>{error.code==="SENSITIVITY_NOT_APPLICABLE"?"Sensitivity not applicable":"Sensitivity could not be completed"}</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>:mutation.error?<Alert variant="destructive"><AlertTitle>Sensitivity could not be completed</AlertTitle><AlertDescription>{mutation.error.message}</AlertDescription></Alert>:null}
      {calcQ.data?<FinanceabilityMarginPanel base={calcQ.data}/>:null}
      {activeRun?<><div className="flex justify-end"><Select value={metric} onValueChange={v=>setMetric(v as any)}><SelectTrigger className="w-[220px]" aria-label="Chart metric"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="permanent_debt">Permanent Debt</SelectItem><SelectItem value="sponsor_equity">Sponsor Equity</SelectItem><SelectItem value="levered_sponsor_cash_irr">Cash IRR</SelectItem><SelectItem value="debt_to_capex">Debt / Capex</SelectItem></SelectContent></Select></div><SensitivityResultChart run={activeRun} metric={metric}/><SensitivityResultTable run={activeRun} projectId={projectId}/></>:null}
      <SensitivityHistory runs={historyQ.data??[]} onSelect={setSelectedRun}/>
      <Card><CardHeader><CardTitle>Supported mechanics</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm sm:grid-cols-2">{Object.entries(SENSITIVITY_VARIABLE_LABELS).map(([k,label])=><div className="rounded-md border p-3" key={k}><div className="font-medium">{label}</div><div className="text-xs text-muted-foreground">Full finance-engine rerun; Base Scenario remains unchanged.</div></div>)}</CardContent></Card>
    </div>
  </DashboardLayout>;
}

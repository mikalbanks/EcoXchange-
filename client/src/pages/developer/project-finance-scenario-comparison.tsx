import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScenarioAssumptionDiff, ScenarioComparisonSelector, ScenarioComparisonTable, RunVersionDisclosure } from "@/components/project-finance-sensitivity";
import { pfApi, type CalculationRunDetail, type ScenarioRecord, type UnderwritingRunSummary } from "@/lib/project-finance-api";

export default function ProjectFinanceScenarioComparison(){
  const {projectId=""}=useParams<{projectId:string}>();
  const projectQ=useQuery({queryKey:["pf-project",projectId],queryFn:()=>pfApi.getProject(projectId)});
  const scenariosQ=useQuery({queryKey:["pf-scenarios",projectId],queryFn:()=>pfApi.listScenarios(projectId)});
  const summariesQ=useQuery({queryKey:["pf-scenario-comparison",projectId],queryFn:()=>pfApi.scenarioComparison(projectId)});
  const calculated=(scenariosQ.data??[]).filter(s=>s.latest_calculation_run_id);
  const [selected,setSelected]=useState<string[]>([]);
  const effectiveSelected=selected.length?selected:calculated.slice(0,Math.min(2,calculated.length)).map(s=>s.id);
  const selectedScenarios=(scenariosQ.data??[]).filter(s=>effectiveSelected.includes(s.id));
  const calcQueries=useQueries({queries:selectedScenarios.map(s=>({queryKey:["pf-calculation",s.latest_calculation_run_id],queryFn:()=>pfApi.getCalculationRun(s.latest_calculation_run_id!),enabled:Boolean(s.latest_calculation_run_id)}))});
  const uwQueries=useQueries({queries:selectedScenarios.map(s=>({queryKey:["pf-underwriting-history",s.id],queryFn:()=>pfApi.listUnderwritingRuns(s.id)}))});
  const bundles=useMemo(()=>selectedScenarios.map((scenario,index)=>({scenario,summary:summariesQ.data?.find(r=>r.scenario_id===scenario.id),calculation:calcQueries[index]?.data as CalculationRunDetail|undefined,underwriting:(uwQueries[index]?.data?.[0] as UnderwritingRunSummary|undefined)??null})),[selectedScenarios,summariesQ.data,calcQueries,uwQueries]);
  const toggle=(id:string)=>setSelected(current=>{const base=current.length?current:effectiveSelected;if(base.includes(id))return base.filter(x=>x!==id);if(base.length>=4)return base;return [...base,id]});
  const busy=projectQ.isLoading||scenariosQ.isLoading||summariesQ.isLoading||calcQueries.some(q=>q.isLoading)||uwQueries.some(q=>q.isLoading);
  return <DashboardLayout title="Scenario Comparison" description="Compare immutable calculated scenarios without recalculating them." breadcrumbs={[{label:"Project Finance",href:"/developer/project-finance/projects"},{label:projectQ.data?.name??"Project",href:`/developer/project-finance/projects/${projectId}`},{label:"Compare Scenarios"}]}> 
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href={`/developer/project-finance/projects/${projectId}`}>Back to Project</Link></Button>{selectedScenarios[0]?.id?<Button asChild><Link href={`/developer/project-finance/projects/${projectId}/scenarios/${selectedScenarios[0].id}/sensitivities`}>Open Sensitivities</Link></Button>:null}</div>
      <ScenarioComparisonSelector scenarios={(scenariosQ.data??[]) as ScenarioRecord[]} selected={effectiveSelected} onToggle={toggle}/>
      {calculated.length<2?<Alert><AlertTitle>Two calculated scenarios are required</AlertTitle><AlertDescription>Analyze another Base, Custom, or Lender Case before using side-by-side financial comparison.</AlertDescription></Alert>:null}
      {selectedScenarios.some(s=>s.status==="STALE")?<Alert><AlertTitle>Historical / stale scenario included</AlertTitle><AlertDescription>At least one selected scenario has changed since its latest calculation. The comparison still shows the immutable historical run and does not recalculate it.</AlertDescription></Alert>:null}
      <RunVersionDisclosure bundles={bundles}/>
      {busy?<div className="rounded-md border p-6 text-sm text-muted-foreground">Loading immutable scenario runs…</div>:bundles.length>=2?<><ScenarioComparisonTable bundles={bundles}/><ScenarioAssumptionDiff bundles={bundles}/></>:null}
    </div>
  </DashboardLayout>;
}

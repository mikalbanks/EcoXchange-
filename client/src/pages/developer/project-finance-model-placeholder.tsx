import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, Calculator, FileClock, Info } from "lucide-react";
import {
  CalculationWarnings,
  DebtScheduleTable,
  DownsideSummary,
  FormulaTracePanel,
  InputSnapshotTable,
  OperatingModelTable,
  ReturnSummary,
  SourcesUsesTable,
  TaxCreditDetail,
} from "@/components/project-finance-detailed-model";
import { humanize, pfApi } from "@/lib/project-finance-api";

function shortHash(value?:string|null){return value?`${value.slice(0,10)}…${value.slice(-6)}`:"Not available";}
function dateLabel(value?:string|null){if(!value)return "Not available";const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleString();}

export default function ProjectFinanceModelPlaceholder(){
  const {projectId="",scenarioId="",calculationRunId=""}=useParams<{projectId:string;scenarioId:string;calculationRunId:string}>();
  const project=useQuery({queryKey:["project-finance","project",projectId],queryFn:()=>pfApi.getProject(projectId)});
  const scenario=useQuery({queryKey:["project-finance","scenario",scenarioId],queryFn:()=>pfApi.getScenario(scenarioId)});
  const calculation=useQuery({queryKey:["project-finance","calculation-run",calculationRunId],queryFn:()=>pfApi.getCalculationRun(calculationRunId)});

  if(project.isLoading||scenario.isLoading||calculation.isLoading) return <DashboardLayout><div className="space-y-4"><div className="h-24 animate-pulse rounded-lg bg-muted"/><div className="h-80 animate-pulse rounded-lg bg-muted"/><div className="h-80 animate-pulse rounded-lg bg-muted"/></div></DashboardLayout>;
  const error=project.error||scenario.error||calculation.error;
  if(error||!project.data||!scenario.data||!calculation.data) return <DashboardLayout title="Detailed model unavailable"><Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>Calculation data could not be loaded</AlertTitle><AlertDescription>{(error as Error)?.message||"The immutable calculation run could not be loaded."}</AlertDescription></Alert></DashboardLayout>;

  const run=calculation.data.run;
  const contextMismatch=run.project_id!==projectId||run.scenario_id!==scenarioId;
  if(contextMismatch) return <DashboardLayout title="Detailed model unavailable"><Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>Calculation context mismatch</AlertTitle><AlertDescription>The selected calculation does not belong to this project and scenario. No financial model was rendered.</AlertDescription></Alert></DashboardLayout>;

  const stale=scenario.data.status==="STALE"||scenario.data.latest_calculation_run_id!==calculationRunId;
  const policy=(run.input_snapshot_json?.policy_context??{}) as Record<string,unknown>;

  if(run.status!=="SUCCESS") return <DashboardLayout title={`${project.data.name} — Detailed Financial Model`} description="Calculation execution record"><Card className="max-w-2xl"><CardHeader><div className="flex items-center gap-2"><Calculator className="h-5 w-5"/><CardTitle>Calculation {humanize(run.status)}</CardTitle></div><CardDescription>Only successful immutable calculation runs expose authoritative financial tables.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><div>Calculation Run <span className="float-right font-mono text-xs">{run.id}</span></div><div>Engine Version <span className="float-right">{run.calculation_engine_version}</span></div><div>Resolver Version <span className="float-right">{run.resolver_version}</span></div></CardContent></Card></DashboardLayout>;

  return <DashboardLayout
    title={`${project.data.name} — Detailed Financial Model`}
    description="Read-only audit view of one immutable deterministic calculation run."
    breadcrumbs={[{label:"Project Finance",href:"/developer/project-finance/projects"},{label:project.data.name,href:`/developer/project-finance/projects/${projectId}`},{label:"Inputs",href:`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/inputs`},{label:"Detailed Model"}]}
    actions={<div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link href={`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/inputs`}><ArrowLeft className="mr-2 h-4 w-4"/>Back to Inputs</Link></Button>{scenario.data.latest_underwriting_run_id?<Button variant="outline" asChild><Link href={`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/results/${scenario.data.latest_underwriting_run_id}?calculationRunId=${calculationRunId}`}>Back to Results</Link></Button>:null}</div>}
  >
    <div className="space-y-6">
      {stale?<Alert><FileClock className="h-4 w-4"/><AlertTitle>Historical calculation</AlertTitle><AlertDescription>This model reflects the inputs used for this historical calculation run. Current project or scenario changes do not alter these persisted results.</AlertDescription></Alert>:null}

      <Card><CardHeader><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Immutable Calculation Run</Badge><Badge variant="secondary">{run.status}</Badge></div><CardTitle className="mt-3 text-2xl">{scenario.data.name}</CardTitle><CardDescription className="mt-2 max-w-3xl">The Detailed Model displays authoritative persisted calculation outputs. It does not recreate the financial model in the browser.</CardDescription></div><div className="text-sm text-muted-foreground"><div>Calculated: {dateLabel(run.completed_at??run.created_at)}</div><div>Policy: {String(policy.policy_code??"Not available")} {String(policy.policy_version??run.underwriting_policy_version??"")}</div></div></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Meta label="Calculation Run ID" value={run.id} mono/><Meta label="Calculation Engine" value={run.calculation_engine_version}/><Meta label="Resolver Version" value={run.resolver_version}/><Meta label="Input Hash" value={shortHash(run.input_hash)} title={run.input_hash} mono/><Meta label="Result Hash" value={shortHash(run.result_hash)} title={run.result_hash??undefined} mono/><Meta label="Project" value={project.data.name}/><Meta label="Scenario" value={scenario.data.name}/><Meta label="Policy Version" value={String(policy.policy_version??run.underwriting_policy_version??"Not available")}/></CardContent></Card>

      <nav aria-label="Detailed model sections" className="flex flex-wrap gap-2 rounded-lg border bg-card p-3 text-sm"><SectionLink href="#inputs">Inputs</SectionLink><SectionLink href="#operating-model">Operating Model</SectionLink><SectionLink href="#debt">Debt</SectionLink><SectionLink href="#capital-stack">Capital Stack</SectionLink><SectionLink href="#tax-credit">Tax Credit</SectionLink><SectionLink href="#returns">Returns</SectionLink><SectionLink href="#downside">Downside</SectionLink><SectionLink href="#formula-trace">Formula Trace</SectionLink><SectionLink href="#warnings">Warnings</SectionLink></nav>

      <Alert><Info className="h-4 w-4"/><AlertTitle>Reproducible historical record</AlertTitle><AlertDescription>This run preserves the exact resolved input snapshot and calculation version used to produce these results. Formula Trace explains approved formula identifiers and dependencies; it is not AI reasoning.</AlertDescription></Alert>

      <InputSnapshotTable snapshot={run.input_snapshot_json}/>
      <OperatingModelTable rows={calculation.data.annual_project_cashflows}/>
      <DebtScheduleTable calculation={calculation.data}/>
      <SourcesUsesTable calculation={calculation.data}/>
      <TaxCreditDetail calculation={calculation.data}/>
      <ReturnSummary calculation={calculation.data}/>
      <DownsideSummary calculation={calculation.data}/>
      <FormulaTracePanel traces={calculation.data.metric_traces}/>
      <CalculationWarnings warnings={calculation.data.warnings}/>

      <Card id="metadata"><CardHeader><CardTitle>Calculation Metadata</CardTitle><CardDescription>Immutable run lineage for audit and reproduction.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Meta label="Calculation Run" value={run.id} mono/><Meta label="Project ID" value={run.project_id} mono/><Meta label="Scenario ID" value={run.scenario_id} mono/><Meta label="Engine Version" value={run.calculation_engine_version}/><Meta label="Resolver Version" value={run.resolver_version}/><Meta label="Policy ID" value={String(policy.policy_id??run.underwriting_policy_id??"Not available")} mono/><Meta label="Policy Version" value={String(policy.policy_version??run.underwriting_policy_version??"Not available")}/><Meta label="Input Hash" value={run.input_hash} mono/><Meta label="Result Hash" value={run.result_hash??"Not available"} mono/></CardContent></Card>
    </div>
  </DashboardLayout>;
}

function Meta({label,value,title,mono=false}:{label:string;value:string;title?:string;mono?:boolean}){return <div className="rounded-md border p-3" title={title}><div className="text-xs text-muted-foreground">{label}</div><div className={`mt-1 break-all text-sm ${mono?"font-mono":"font-medium"}`}>{value}</div></div>}
function SectionLink({href,children}:{href:string;children:string}){return <a href={href} className="rounded-md border px-3 py-1.5 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring">{children}</a>}

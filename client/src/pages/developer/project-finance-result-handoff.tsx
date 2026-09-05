import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, FileClock, FileSearch, RefreshCcw } from "lucide-react";
import {
  BindingConstraintPanel, CapitalStack, CreditAssessment, DscrDownside, FinancialProfileReadiness,
  Findings, LenderFitTable, MetricCard, ModelNotes, StatusBadge, overallLabels,
} from "@/components/project-finance-results";
import { formatMetric, humanize, money, percentFromDecimal, pfApi } from "@/lib/project-finance-api";

function dateLabel(value?:string|null){ if(!value)return "Not available"; const d=new Date(value); return Number.isNaN(d.getTime())?value:d.toLocaleString(); }
function shortHash(value?:string|null){return value?`${value.slice(0,10)}…${value.slice(-6)}`:"Not available";}
function safeArray(value:unknown):any[]{return Array.isArray(value)?value:[];}

export default function ProjectFinanceResultHandoff(){
  const {projectId="",scenarioId="",underwritingRunId=""}=useParams<{projectId:string;scenarioId:string;underwritingRunId:string}>();
  const queryParam=new URLSearchParams(window.location.search).get("calculationRunId")||undefined;
  const project=useQuery({queryKey:["project-finance","project",projectId],queryFn:()=>pfApi.getProject(projectId)});
  const scenario=useQuery({queryKey:["project-finance","scenario",scenarioId],queryFn:()=>pfApi.getScenario(scenarioId)});
  const underwriting=useQuery({queryKey:["project-finance","underwriting-run",underwritingRunId],queryFn:()=>pfApi.getUnderwritingRun(underwritingRunId)});
  const calculationRunId=queryParam??underwriting.data?.run.calculation_run_id;
  const calculation=useQuery({queryKey:["project-finance","calculation-run",calculationRunId],queryFn:()=>pfApi.getCalculationRun(calculationRunId!),enabled:!!calculationRunId});
  const history=useQuery({queryKey:["project-finance","underwriting-history",scenarioId],queryFn:()=>pfApi.listUnderwritingRuns(scenarioId)});

  const mismatch=Boolean(underwriting.data&&calculation.data&&underwriting.data.run.calculation_run_id!==calculation.data.run.id);
  const loaded=project.data&&scenario.data&&underwriting.data&&calculation.data;
  const snapshot=underwriting.data?.run.underwriting_input_snapshot_json??{};
  const overrides=safeArray((snapshot as any)?.policy?.overrides);
  const finance=calculation.data?.financing_result??{};
  const stack=calculation.data?.capital_stack_result??{};
  const returns=calculation.data?.return_result??{};
  const tax=calculation.data?.tax_credit_result??{};
  const down=calculation.data?.downside_result??{};
  const uw=underwriting.data;
  const isLatest=scenario.data?.latest_underwriting_run_id===underwritingRunId;
  const stale=scenario.data?.status==="STALE";
  const sortedHistory=useMemo(()=>[...(history.data??[])].sort((a,b)=>String(b.completed_at??b.created_at??"").localeCompare(String(a.completed_at??a.created_at??""))),[history.data]);

  if(project.isLoading||scenario.isLoading||underwriting.isLoading||(!calculation.data&&calculation.isLoading)) return <DashboardLayout><div className="space-y-4"><div className="h-24 animate-pulse rounded-lg bg-muted"/><div className="grid gap-4 md:grid-cols-3"><div className="h-32 animate-pulse rounded-lg bg-muted"/><div className="h-32 animate-pulse rounded-lg bg-muted"/><div className="h-32 animate-pulse rounded-lg bg-muted"/></div><div className="h-80 animate-pulse rounded-lg bg-muted"/></div></DashboardLayout>;
  const error=project.error||scenario.error||underwriting.error||calculation.error;
  if(error||!loaded||mismatch) return <DashboardLayout title="Analysis unavailable"><Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>Analysis data could not be loaded completely</AlertTitle><AlertDescription>{mismatch?"The underwriting run references a different calculation than the requested result. Authoritative financial cards were not rendered.":(error as Error)?.message||"The immutable calculation and underwriting records could not both be loaded."}</AlertDescription></Alert></DashboardLayout>;

  const overall=uw.run.overall_status;
  const statusCopy=overall==="FAIL"?"Completed assessment — does not meet the selected policy.":overall==="PASS_WITH_CONDITIONS"?"Core tests pass, subject to the conditions below.":overall==="INSUFFICIENT_INFORMATION"?"Additional information is required to complete the underwriting assessment.":overall==="OUT_OF_SCOPE"?"This project falls outside the current EcoXchange underwriting model scope.":"Completed indicative underwriting assessment.";
  const taxAppetite=(snapshot as any)?.facts?.["underwriting.sponsor_tax_appetite"]?.value;

  return <DashboardLayout
    title={`${project.data.name} — ${scenario.data.name}`}
    description="Immutable financial calculation and indicative credit assessment."
    breadcrumbs={[{label:"Project Finance",href:"/developer/project-finance/projects"},{label:project.data.name,href:`/developer/project-finance/projects/${projectId}`},{label:"Inputs",href:`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/inputs`},{label:"Results"}]}
    actions={<div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link href={`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/inputs`}><ArrowLeft className="mr-2 h-4 w-4"/>Back to Inputs</Link></Button><Button variant="outline" asChild><Link href={`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/model/${calculation.data.run.id}`}><FileSearch className="mr-2 h-4 w-4"/>Detailed Model</Link></Button></div>}
  >
    <div className="space-y-6">
      {stale?<Alert><RefreshCcw className="h-4 w-4"/><AlertTitle>Project inputs have changed since this analysis</AlertTitle><AlertDescription>These results remain historical. <Link className="font-medium underline" href={`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/inputs`}>View current inputs and run a new analysis.</Link></AlertDescription></Alert>:null}
      {!isLatest?<Alert><FileClock className="h-4 w-4"/><AlertTitle>Historical Analysis</AlertTitle><AlertDescription>You are viewing a prior immutable assessment, not the scenario’s latest completed underwriting run.</AlertDescription></Alert>:null}

      <Card><CardHeader><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Indicative Underwriting</Badge><StatusBadge value={overall}/>{overrides.length?<Badge variant="secondary">Custom Policy Assumptions Used · {overrides.length}</Badge>:null}</div><CardTitle className="mt-3 text-2xl">{overallLabels[overall??""]??humanize(overall)}</CardTitle><CardDescription className="mt-2 max-w-3xl">{statusCopy} Permanent debt displayed here is indicative model output, not a lender commitment.</CardDescription></div><div className="text-right text-xs text-muted-foreground"><div>Underwriting: {dateLabel(uw.run.completed_at??uw.run.created_at)}</div><div>Policy: {uw.run.underwriting_policy_version}</div></div></div></CardHeader></Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Indicative Permanent Senior Debt" value={money(finance.permanent_debt,true)}/><MetricCard label="Sponsor Equity Required" value={money(stack.sponsor_equity,true)}/><MetricCard label="Transferred ITC Proceeds" value={money(stack.net_itc_proceeds,true)}/><MetricCard label="Minimum P50 DSCR" value={formatMetric(finance.minimum_dscr,"dscr")}/><MetricCard label="Debt / Capex" value={formatMetric(finance.debt_to_capex,"percent")}/><MetricCard label="Binding Constraint" value={humanize(finance.binding_constraint)}/><MetricCard label="Cash-Only Sponsor IRR" value={formatMetric(returns.levered_sponsor_cash_irr,"percent")} helper={returns.levered_sponsor_cash_irr_status?humanize(returns.levered_sponsor_cash_irr_status):undefined}/><MetricCard label="Minimum Downside DSCR" value={formatMetric(down?.minimum_downside_dscr,"dscr")}/></div>

      <FinancialProfileReadiness profile={uw.run.financial_profile} readiness={uw.run.financing_readiness}/>
      <BindingConstraintPanel financing={finance}/>
      <CapitalStack stack={stack} reconciliation={calculation.data.reconciliation_result}/>
      <DscrDownside calculation={calculation.data} rules={uw.rule_results}/>

      <Card><CardHeader><CardTitle>Sponsor Economics</CardTitle><CardDescription>Cash return remains primary; tax value is shown separately when modeled.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Sponsor Equity" value={money(stack.sponsor_equity,true)}/><MetricCard label="Sponsor Equity % of Uses" value={percentFromDecimal(stack.sponsor_equity_pct_total_uses)}/><MetricCard label="Cash-Only Sponsor IRR" value={formatMetric(returns.levered_sponsor_cash_irr,"percent")}/><MetricCard label="Simplified After-Tax Sponsor IRR" value={formatMetric(returns.simplified_sponsor_after_tax_irr,"percent")} helper={returns.simplified_sponsor_after_tax_irr==null?"Not available for this persisted run.":`Sponsor tax appetite: ${humanize(taxAppetite)}. Tax values are modeled assumptions and should be reviewed with qualified tax counsel.`}/></CardContent></Card>

      {overrides.length?<Card><CardHeader><CardTitle>Policy Override Disclosure</CardTitle><CardDescription>Registered scenario-specific assumptions; EcoXchange’s underlying policy is unchanged.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Field</th><th className="py-2">Policy Default</th><th className="py-2">Effective Value</th><th className="py-2">Reason</th></tr></thead><tbody>{overrides.map((o:any,i)=><tr key={`${o.fieldKey??o.field_key}-${i}`} className="border-b last:border-0"><td className="py-2">{humanize(o.fieldKey??o.field_key)}</td><td className="py-2">{String(o.originalValue??o.original_value??"—")}</td><td className="py-2">{String(o.effectiveValue??o.override_value??"—")}</td><td className="py-2">{String(o.reason??"Recorded override")}</td></tr>)}</tbody></table></CardContent></Card>:null}

      <CreditAssessment rules={uw.rule_results}/>
      <Findings risks={uw.risks} conditions={uw.conditions} missing={uw.missing_information}/>
      <ModelNotes warnings={calculation.data.warnings}/>

      <div className="grid gap-4 lg:grid-cols-2"><LenderFitTable rows={uw.lender_fit}/><Card><CardHeader><CardTitle>Recommended Next Actions</CardTitle><CardDescription>Deterministic recommendation codes from the underwriting engine.</CardDescription></CardHeader><CardContent className="space-y-2">{uw.recommendations.length?uw.recommendations.map(code=><div key={code} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"><span>{humanize(code)}</span><Button variant="ghost" size="sm" asChild><Link href={`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/inputs`}>Update Inputs</Link></Button></div>):<p className="text-sm text-muted-foreground">No deterministic financing recommendations were recorded.</p>}</CardContent></Card></div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><Card><CardHeader><CardTitle>Analysis History</CardTitle><CardDescription>Latest means most recent, not best outcome.</CardDescription></CardHeader><CardContent className="space-y-2">{sortedHistory.map((h,i)=><Link key={h.id} href={`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/results/${h.id}?calculationRunId=${h.calculation_run_id}`} className={`block rounded-md border p-3 text-sm ${h.id===underwritingRunId?"bg-muted/40":""}`}><div className="flex flex-wrap items-center justify-between gap-2"><div><strong>{dateLabel(h.completed_at??h.created_at)}</strong> {i===0?<Badge className="ml-2" variant="outline">Latest</Badge>:null}</div><StatusBadge value={h.overall_status}/></div><div className="mt-1 text-xs text-muted-foreground">Policy {h.underwriting_policy_version} · Financial Profile {humanize(h.financial_profile)} · Readiness {humanize(h.financing_readiness)}</div></Link>)}</CardContent></Card><Card><CardHeader><CardTitle>Analysis Details</CardTitle><CardDescription>Immutable run lineage and version metadata.</CardDescription></CardHeader><CardContent className="space-y-2 text-sm"><div>Calculation Run <span className="float-right font-mono text-xs">{calculation.data.run.id}</span></div><div>Underwriting Run <span className="float-right font-mono text-xs">{uw.run.id}</span></div><div>Calculation Engine <span className="float-right">{calculation.data.run.calculation_engine_version}</span></div><div>Resolver <span className="float-right">{calculation.data.run.resolver_version}</span></div><div>Underwriting Engine <span className="float-right">{uw.run.underwriting_engine_version}</span></div><div>Policy <span className="float-right">{uw.run.underwriting_policy_version}</span></div><div>Input Hash <span className="float-right font-mono text-xs" title={calculation.data.run.input_hash}>{shortHash(calculation.data.run.input_hash)}</span></div><div>Calculation Result Hash <span className="float-right font-mono text-xs" title={calculation.data.run.result_hash??undefined}>{shortHash(calculation.data.run.result_hash)}</span></div><div>Underwriting Result Hash <span className="float-right font-mono text-xs" title={uw.run.underwriting_result_hash??undefined}>{shortHash(uw.run.underwriting_result_hash)}</span></div></CardContent></Card></div>

      <Card><CardHeader><CardTitle>Tax Credit Detail</CardTitle><CardDescription>Modeled tax-credit values from the immutable calculation.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="ITC Face Value" value={money(tax.itc_face_value??tax.itc_face,true)}/><MetricCard label="Transfer Price" value={formatMetric(tax.transfer_price,"number")}/><MetricCard label="Gross Transfer Proceeds" value={money(tax.gross_transfer_proceeds,true)}/><MetricCard label="Net Transfer Proceeds" value={money(tax.net_transfer_proceeds,true)}/></CardContent></Card>
    </div>
  </DashboardLayout>;
}

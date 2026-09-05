import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Loader2, Play, RefreshCcw } from "lucide-react";
import {
  FinanceField,
  IllustrativeDownsideNotice,
  MissingInputsPanel,
  PolicyOverrideDialog,
  ReadinessField,
  ScenarioStatusBanner,
  ScopeGuard,
  WorkspaceSection,
} from "@/components/project-finance-workspace";
import {
  canRunAnalyze,
  humanize,
  isWithinV0Scope,
  pfApi,
  ProjectFinanceClientError,
} from "@/lib/project-finance-api";

const readiness = [
  { key: "underwriting.ppa_status", label: "PPA status", group: "PPA / Offtaker", options: ["UNKNOWN","EXECUTED","AWARDED_NOT_EXECUTED","TERM_SHEET","NEGOTIATION","NONE"] },
  { key: "underwriting.offtaker_credit_status", label: "Offtaker credit", group: "PPA / Offtaker", options: ["UNKNOWN","INVESTMENT_GRADE","STRONG_NON_RATED","NON_INVESTMENT_GRADE"] },
  { key: "underwriting.independent_engineer_status", label: "Independent engineer", group: "Engineering", options: ["UNKNOWN","FINAL","DRAFT","NOT_ENGAGED"] },
  { key: "underwriting.interconnection_status", label: "Interconnection", group: "Interconnection", options: ["UNKNOWN","FULLY_EXECUTED","APPROVED_PENDING_EXECUTION","STUDY_COMPLETE","IN_QUEUE","EARLY_STAGE"] },
  { key: "underwriting.epc_status", label: "EPC status", group: "EPC / Construction", options: ["UNKNOWN","EXECUTED","NEGOTIATING","TERM_SHEET","NONE"] },
  { key: "underwriting.epc_price_structure", label: "EPC price structure", group: "EPC / Construction", options: ["UNKNOWN","FIXED","CAPPED","OTHER"] },
  { key: "underwriting.contractor_quality", label: "Contractor quality", group: "EPC / Construction", options: ["UNKNOWN","STRONG","ADEQUATE","LIMITED"] },
  { key: "underwriting.permits_status", label: "Permits", group: "Permits / Site", options: ["UNKNOWN","COMPLETE","MATERIAL_PERMITS_PENDING","EARLY"] },
  { key: "underwriting.site_control_status", label: "Site control", group: "Permits / Site", options: ["UNKNOWN","SECURED","CONDITIONAL","NEGOTIATING","NONE"] },
  { key: "underwriting.om_status", label: "O&M", group: "Operations", options: ["UNKNOWN","EXECUTED","IDENTIFIED","NOT_ESTABLISHED"] },
  { key: "underwriting.insurance_status", label: "Insurance", group: "Operations", options: ["UNKNOWN","CONFIRMED","QUOTE_RECEIVED","PENDING"] },
  { key: "underwriting.itc_eligibility_status", label: "ITC eligibility", group: "Tax Credit", options: ["UNKNOWN","VERIFIED","USER_ASSERTED","PENDING_REVIEW"] },
  { key: "underwriting.itc_buyer_status", label: "ITC buyer", group: "Tax Credit", options: ["UNIDENTIFIED","IDENTIFIED_NOT_COMMITTED","COMMITTED","NOT_APPLICABLE"] },
  { key: "underwriting.sponsor_tax_appetite", label: "Sponsor tax appetite", group: "Tax Credit", options: ["UNKNOWN","CONFIRMED","PARTIAL","NONE"] },
  { key: "underwriting.sponsor_experience", label: "Sponsor experience", group: "Sponsor", options: ["UNKNOWN","STRONG","ADEQUATE","LIMITED"] },
  { key: "underwriting.completion_support", label: "Completion support", group: "Sponsor", options: ["UNKNOWN","CONFIRMED","PARTIAL","NONE"] },
  { key: "underwriting.cost_overrun_support", label: "Cost-overrun support", group: "Sponsor", options: ["UNKNOWN","CONFIRMED","PARTIAL","NONE"] },
  { key: "underwriting.equity_commitment", label: "Equity commitment", group: "Sponsor", options: ["UNKNOWN","CONFIRMED","PARTIAL","NONE"] },
] as const;

const sections = [
  ["Project","Core model identity and project horizon.",[
    ["project.capacity_mw_ac","Capacity","MW AC","number"],
    ["project.project_life_years","Project life","Years","number"],
  ]],
  ["Production","Production assumptions. Annual generation remains backend-calculated.",[
    ["generation.capacity_factor_p50","P50 Capacity Factor","Percent","percent"],
    ["generation.annual_degradation_rate","Annual degradation","Percent","percent"],
  ]],
  ["Revenue","Contracted revenue assumptions for this scenario.",[
    ["revenue.ppa_price_year_1_per_mwh","Year-1 PPA price","USD/MWh","money"],
    ["revenue.ppa_escalation_rate","PPA escalation","Percent","percent"],
    ["revenue.ppa_term_years","PPA term","Years","number"],
  ]],
  ["Operating Costs","Year-1 modeled operating costs and escalation.",[
    ["operating_costs.opex_year_1","Year-1 opex","USD","money"],
    ["operating_costs.opex_escalation_rate","Opex escalation","Percent","percent"],
  ]],
  ["Tax Credits","Modeled credit economics are separate from evidence of tax eligibility.",[
    ["tax_credit.itc_rate","Modeled ITC rate","Percent","percent"],
    ["tax_credit.itc_eligible_basis_pct","Eligible basis percentage","Percent","percent"],
    ["tax_credit.itc_transfer_price","Transfer price","Ratio","number"],
    ["tax_credit.itc_transaction_costs","ITC transaction costs","USD","money"],
  ]],
  ["Debt","Modeled permanent senior debt assumptions. Policy values remain visibly sourced.",[
    ["financing.annual_interest_rate","Interest rate","Percent","percent"],
    ["financing.target_dscr","Target P50 DSCR","Ratio","dscr"],
    ["financing.max_ltc","Maximum LTC","Percent","percent"],
    ["financing.amortization_years","Economic amortization","Years","number"],
    ["financing.debt_maturity_years","Loan maturity","Years","number"],
    ["financing.lender_fee_rate","Lender fee","Percent","percent"],
    ["reserves.dsra_months","DSRA requirement","Months of scheduled debt service","number"],
    ["transaction_costs.project_capex","Project capex","USD","money"],
    ["transaction_costs.closing_costs","Closing costs","USD","money"],
    ["transaction_costs.other_financing_uses","Other financing uses","USD","money"],
  ]],
] as const;

const controlled = new Set([
  "tax_credit.itc_rate","tax_credit.itc_transfer_price","financing.annual_interest_rate",
  "financing.target_dscr","financing.max_ltc","financing.amortization_years",
  "financing.debt_maturity_years","financing.lender_fee_rate","reserves.dsra_months",
]);
const units: Record<string,string> = {
  "project.capacity_mw_ac":"MW_AC","project.project_life_years":"YEARS",
  "generation.capacity_factor_p50":"PERCENT_DECIMAL","generation.annual_degradation_rate":"PERCENT_DECIMAL",
  "revenue.ppa_price_year_1_per_mwh":"USD_PER_MWH","revenue.ppa_escalation_rate":"PERCENT_DECIMAL","revenue.ppa_term_years":"YEARS",
  "operating_costs.opex_year_1":"USD","operating_costs.opex_escalation_rate":"PERCENT_DECIMAL",
  "tax_credit.itc_rate":"PERCENT_DECIMAL","tax_credit.itc_eligible_basis_pct":"PERCENT_DECIMAL","tax_credit.itc_transfer_price":"RATIO","tax_credit.itc_transaction_costs":"USD",
  "financing.annual_interest_rate":"PERCENT_DECIMAL","financing.target_dscr":"RATIO","financing.max_ltc":"PERCENT_DECIMAL","financing.amortization_years":"YEARS","financing.debt_maturity_years":"YEARS","financing.lender_fee_rate":"PERCENT_DECIMAL",
  "reserves.dsra_months":"MONTHS","transaction_costs.project_capex":"USD","transaction_costs.closing_costs":"USD","transaction_costs.other_financing_uses":"USD",
  "downside.downside_generation_multiplier":"PERCENT_DECIMAL",
};

export default function ProjectFinanceInputs() {
  const { projectId="", scenarioId="" } = useParams<{projectId:string;scenarioId:string}>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [policyId,setPolicyId] = useState<string>();
  const [overrideKey,setOverrideKey] = useState<string|null>(null);
  const [pendingSaves,setPendingSaves] = useState(0);
  const [dirtyFields,setDirtyFields] = useState<Set<string>>(()=>new Set());
  const [message,setMessage] = useState<{text:string;calculationRunId?:string}|null>(null);

  const project = useQuery({ queryKey:["project-finance","project",projectId], queryFn:()=>pfApi.getProject(projectId) });
  const scenario = useQuery({ queryKey:["project-finance","scenario",scenarioId], queryFn:()=>pfApi.getScenario(scenarioId) });
  const facts = useQuery({ queryKey:["project-finance","facts",projectId], queryFn:()=>pfApi.listFacts(projectId) });
  const policies = useQuery({ queryKey:["project-finance","policies"], queryFn:pfApi.listPolicies });
  const selectedPolicyId = policyId ?? policies.data?.find(p=>p.status==="ACTIVE")?.id ?? policies.data?.[0]?.id;
  const resolved = useQuery({
    queryKey:["project-finance","resolved",scenarioId,selectedPolicyId],
    queryFn:()=>pfApi.resolveScenario(scenarioId,selectedPolicyId), enabled:!!selectedPolicyId,
  });

  const currentFacts = useMemo(()=>new Map((facts.data??[]).filter(f=>f.is_current).map(f=>[f.field_key,f])),[facts.data]);
  const readinessMissing = useMemo(()=>readiness.filter(item=>{
    const f=currentFacts.get(item.key); return !f || f.value==null || f.value==="UNKNOWN" || f.value==="UNIDENTIFIED";
  }).map(item=>item.key),[currentFacts]);
  const provenanceCounts = useMemo(()=>{
    const counts:Record<string,number>={};
    for (const f of Object.values(resolved.data?.resolved_fields??{})) counts[f.resolution_source]=(counts[f.resolution_source]??0)+1;
    return counts;
  },[resolved.data]);

  const invalidate = async()=>Promise.all([
    qc.invalidateQueries({queryKey:["project-finance","facts",projectId]}),
    qc.invalidateQueries({queryKey:["project-finance","scenario",scenarioId]}),
    qc.invalidateQueries({queryKey:["project-finance","resolved",scenarioId]}),
  ]);
  const persist = async (work:()=>Promise<unknown>) => {
    setPendingSaves(x=>x+1); setMessage(null);
    try { await work(); await invalidate(); }
    catch(e){ setMessage({text:e instanceof Error?e.message:"Save failed."}); throw e; }
    finally { setPendingSaves(x=>x-1); }
  };
  const saveFact=(key:string,value:unknown)=>persist(()=>pfApi.addFact(projectId,{field_key:key,value,unit:units[key]??null,source_type:"USER_ASSERTION",confidence_status:"UNVERIFIED"}));
  const saveScenario=(key:string,value:unknown)=>persist(()=>pfApi.putAssumptions(scenarioId,[{field_key:key,value,unit:units[key]??null,source_type:"USER_ASSUMPTION",provenance_type:"USER_ENTERED"}]));
  const setDirty=(key:string,dirty:boolean)=>setDirtyFields(prev=>{const next=new Set(prev);if(dirty)next.add(key);else next.delete(key);return next});

  const analyze = useMutation({
    mutationFn:()=>pfApi.analyze(scenarioId,selectedPolicyId?{policy_id:selectedPolicyId}:{},crypto.randomUUID()),
    onSuccess:r=>navigate(`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/results/${r.underwriting_run.id}?calculationRunId=${r.calculation_run.id}`),
    onError:e=>{
      const pe=e as ProjectFinanceClientError;
      const calculationRunId=typeof pe.details?.calculation_run_id==="string"?pe.details.calculation_run_id:undefined;
      setMessage({text:calculationRunId?"Financial calculation completed, but underwriting could not be completed. The calculation remains available for retry.":pe.message,calculationRunId});
    },
  });

  if (project.isLoading||scenario.isLoading||policies.isLoading) return <DashboardLayout><div className="h-80 animate-pulse rounded-lg bg-muted"/></DashboardLayout>;
  if (!project.data||!scenario.data) return <DashboardLayout><Alert variant="destructive"><AlertTitle>Workspace unavailable</AlertTitle><AlertDescription>Project or scenario could not be loaded.</AlertDescription></Alert></DashboardLayout>;

  const p=project.data, s=scenario.data, r=resolved.data;
  const field=(key:string)=>r?.resolved_fields?.[key];
  const value=(key:string)=>field(key)?.value;
  const policy=policies.data?.find(x=>x.id===selectedPolicyId);
  const ready=canRunAnalyze(r,p,pendingSaves+dirtyFields.size)&&!analyze.isPending;
  const sectionStatus=(fields:readonly (readonly string[])[])=>{
    if(fields.some(x=>r?.missing_fields.some(m=>m.field_key===x[0])))return "Needs input";
    return fields.some(x=>["POLICY_DEFAULT","POLICY_OVERRIDE","SCENARIO_ASSUMPTION"].includes(field(x[0])?.resolution_source??""))?"Using assumptions":"Complete";
  };
  const jump=(key:string)=>document.getElementById(key)?.scrollIntoView({behavior:"smooth",block:"center"});

  return <DashboardLayout
    title={`${p.name} — ${s.name}`}
    description="What we know, what we assume, what is missing, and which policy will be applied."
    breadcrumbs={[{label:"Project Finance",href:"/developer/project-finance/projects"},{label:p.name,href:`/developer/project-finance/projects/${projectId}`},{label:s.name}]}
    actions={<div className="flex flex-wrap gap-2"><select aria-label="Underwriting policy" className="h-10 rounded-md border bg-background px-3 text-sm" value={selectedPolicyId??""} onChange={e=>setPolicyId(e.target.value)}>{(policies.data??[]).map(x=><option key={x.id} value={x.id}>{x.policy_code} v{x.policy_version}</option>)}</select><Button disabled={!ready} onClick={()=>analyze.mutate()}>{analyze.isPending?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Play className="mr-2 h-4 w-4"/>}Run Underwriting</Button></div>}
  >
    <div className="space-y-6">
      <ScenarioStatusBanner status={s.status}/>
      <ScopeGuard technology={p.technology} capacity={p.capacity_mw_ac==null?null:Number(p.capacity_mw_ac)} revenueStructure={p.revenue_structure}/>
      {dirtyFields.size>0?<Alert><AlertTriangle className="h-4 w-4"/><AlertTitle>Unsaved field edit</AlertTitle><AlertDescription>Save or cancel the open field edit before running underwriting so the backend analyzes exactly what you see.</AlertDescription></Alert>:null}
      {resolved.isFetching?<div className="flex items-center gap-2 text-sm text-muted-foreground"><RefreshCcw className="h-4 w-4 animate-spin"/>Checking inputs…</div>:r?.calculation_ready?<Alert><CheckCircle2 className="h-4 w-4"/><AlertTitle>Ready to analyze</AlertTitle><AlertDescription>Finance-critical inputs are complete. Missing readiness facts can still produce conditions or insufficient information.</AlertDescription></Alert>:<Alert><AlertTriangle className="h-4 w-4"/><AlertTitle>{r?.missing_fields.length??0} inputs required before financial analysis</AlertTitle><AlertDescription>EcoXchange does not silently guess missing values.</AlertDescription></Alert>}
      {message?<Alert variant="destructive"><AlertTitle>{message.calculationRunId?"Underwriting incomplete":"Workspace action needs attention"}</AlertTitle><AlertDescription>{message.text}{message.calculationRunId?<div className="mt-2 font-mono text-xs">Calculation run: {message.calculationRunId}</div>:null}</AlertDescription></Alert>:null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {sections.map(([title,description,fields])=><WorkspaceSection key={title} title={title} description={description} status={sectionStatus(fields)}>{fields.map(([key,label,unit,format])=><FinanceField
            key={key} id={key} label={label} unit={unit} value={value(key)} resolved={field(key)} format={format as any}
            policyControlled={controlled.has(key)}
            onSaveFact={!controlled.has(key)?v=>saveFact(key,v):undefined}
            onSaveScenario={!controlled.has(key)?v=>saveScenario(key,v):undefined}
            onOverride={controlled.has(key)?()=>setOverrideKey(key):undefined}
            onDirtyChange={dirty=>setDirty(key,dirty)}
            helper={key==="tax_credit.itc_rate"?"A modeled ITC rate is not confirmation of tax eligibility.":key==="reserves.dsra_months"?"The dollar reserve is calculated by the backend.":undefined}
          />)}</WorkspaceSection>)}

          <WorkspaceSection title="Downside" description="Configure the deterministic downside source without relabeling an illustrative case as lender P90." status={r?.missing_fields.some(m=>m.field_key.startsWith("downside."))?"Needs input":"Complete"}>
            <ReadinessField id="downside.downside_type" label="Downside type" value={value("downside.downside_type")} source={field("downside.downside_type")?.resolution_source} options={["NONE","ILLUSTRATIVE_MULTIPLIER","EXPLICIT_GENERATION"]} onSave={v=>saveScenario("downside.downside_type",v)}/>
            <ReadinessField id="downside.generation_source_type" label="Generation source" value={value("downside.generation_source_type")} source={field("downside.generation_source_type")?.resolution_source} options={["NONE","ILLUSTRATIVE_PERCENT_OF_P50","INDEPENDENT_ENGINEER_P90","USER_SUPPLIED_P90"]} onSave={v=>saveScenario("downside.generation_source_type",v)}/>
            {value("downside.downside_type")==="ILLUSTRATIVE_MULTIPLIER"?<FinanceField id="downside.downside_generation_multiplier" label="Illustrative generation multiplier" unit="Percent of P50" value={value("downside.downside_generation_multiplier")} resolved={field("downside.downside_generation_multiplier")} format="percent" onSaveScenario={v=>saveScenario("downside.downside_generation_multiplier",v)} onDirtyChange={dirty=>setDirty("downside.downside_generation_multiplier",dirty)}/>:null}
          </WorkspaceSection>
          {value("downside.generation_source_type")==="ILLUSTRATIVE_PERCENT_OF_P50"||value("downside.downside_type")==="ILLUSTRATIVE_MULTIPLIER"?<IllustrativeDownsideNotice/>:null}

          <Card id="financing-readiness"><CardHeader><CardTitle>Financing Readiness</CardTitle><CardDescription>Readiness facts are saved as project facts; the frontend does not assign credit outcomes.</CardDescription></CardHeader><CardContent className="space-y-6">{Array.from(new Set(readiness.map(x=>x.group))).map(group=><section key={group}><h3 className="mb-3 text-sm font-semibold">{group}</h3><div className="grid gap-4 md:grid-cols-2">{readiness.filter(x=>x.group===group).map(item=>{const fact=currentFacts.get(item.key);return <ReadinessField key={item.key} id={item.key} label={item.label} value={fact?.value} source={fact?.source_type} options={[...item.options]} onSave={v=>saveFact(item.key,v)}/>})}</div></section>)}</CardContent></Card>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card><CardHeader><CardTitle>Scenario resolution</CardTitle><CardDescription>Why EcoXchange will use the effective values shown on this page.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between gap-4"><span>Policy</span><strong className="text-right">{r?`${r.policy_code} v${r.policy_version}`:"Loading"}</strong></div><div className="grid grid-cols-2 gap-2">{Object.entries(provenanceCounts).map(([source,count])=><div key={source} className="rounded-md border p-2"><div className="text-lg font-semibold">{count}</div><div className="text-xs text-muted-foreground">{humanize(source)}</div></div>)}</div></CardContent></Card>
          <MissingInputsPanel financeMissing={(r?.missing_fields??[]).map(m=>m.field_key)} readinessMissing={readinessMissing} onJump={jump}/>
          {s.latest_underwriting_run_id?<Card><CardHeader><CardTitle>Previous analysis</CardTitle><CardDescription>Historical results remain immutable while this scenario evolves.</CardDescription></CardHeader><CardContent><p className="mb-3 break-all font-mono text-xs">{s.latest_underwriting_run_id}</p><Button variant="outline" asChild><Link href={`/developer/project-finance/projects/${projectId}`}>View project history</Link></Button></CardContent></Card>:null}
          <Card><CardContent className="pt-6 text-xs text-muted-foreground">Indicative underwriting is preliminary lender-style decision support, subject to lender, legal, tax, and engineering diligence.</CardContent></Card>
        </aside>
      </div>

      <PolicyOverrideDialog
        open={!!overrideKey}
        onOpenChange={open=>{if(!open)setOverrideKey(null)}}
        label={overrideKey?humanize(overrideKey.split(".").pop()):"Policy field"}
        originalValue={overrideKey?field(overrideKey)?.policy_value??field(overrideKey)?.value:undefined}
        policyVersion={policy?.policy_version??r?.policy_version??""}
        format={overrideKey?.includes("dscr")?"dscr":overrideKey&&["tax_credit.itc_rate","financing.annual_interest_rate","financing.max_ltc","financing.lender_fee_rate"].includes(overrideKey)?"percent":undefined}
        onSubmit={async(v,reason)=>{if(!overrideKey||!selectedPolicyId)return;await persist(()=>pfApi.addPolicyOverride(scenarioId,{field_key:overrideKey,override_value:v,reason,policy_id:selectedPolicyId,source_type:"OTHER"}))}}
      />
    </div>
  </DashboardLayout>;
}

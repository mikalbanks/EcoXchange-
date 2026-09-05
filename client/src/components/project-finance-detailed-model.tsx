import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { displaySource, dscr, formatMetric, humanize, money, percentFromDecimal, type CalculationRunDetail } from "@/lib/project-finance-api";

const FORMULA_DESCRIPTIONS: Record<string,{description:string;expression?:string}> = {
  GENERATION_YEAR1_V1:{description:"Year-1 modeled production from the approved generation input methodology."},
  GENERATION_DEGRADATION_V1:{description:"Annual production after applying the approved degradation assumption."},
  PPA_ESCALATION_V1:{description:"Annual contracted PPA price under the resolved escalation assumption."},
  REVENUE_CONTRACTED_V1:{description:"Contracted energy revenue from persisted generation and PPA price.",expression:"Revenue = Generation × PPA Price"},
  OPEX_ESCALATION_V1:{description:"Annual operating expense under the resolved escalation assumption."},
  CFADS_V1:{description:"Cash flow available for debt service before financing.",expression:"CFADS = Revenue − Opex"},
  ALLOWABLE_DEBT_SERVICE_V1:{description:"Debt service supported by modeled CFADS at the effective target DSCR.",expression:"Allowable Debt Service = CFADS ÷ Target DSCR"},
  DSCR_DEBT_CAPACITY_V1:{description:"Present-value debt capacity supported by the allowable debt-service stream."},
  LTC_LIMIT_V1:{description:"Maximum permanent debt permitted by the resolved LTC assumption."},
  PERMANENT_DEBT_V1:{description:"Final permanent debt selected by the finance engine from the competing sizing constraints.",expression:"Permanent Debt = min(DSCR Capacity, LTC Limit)"},
  DEBT_SCULPT_V1:{description:"Persisted annual debt-service schedule for the final permanent debt."},
  ANNUAL_DSCR_V1:{description:"Annual debt-service coverage using persisted CFADS and scheduled debt service.",expression:"DSCR = CFADS ÷ Debt Service"},
  ITC_ELIGIBLE_BASIS_V1:{description:"Modeled ITC-eligible basis under the resolved eligible-basis percentage."},
  ITC_FACE_VALUE_V1:{description:"Modeled face value of the investment tax credit."},
  ITC_TRANSFER_PROCEEDS_V1:{description:"Gross modeled proceeds from transferring the ITC."},
  NET_ITC_TRANSFER_PROCEEDS_V1:{description:"Net ITC transfer proceeds after persisted transaction costs."},
  DSRA_V1:{description:"Debt-service reserve amount under the resolved DSRA requirement."},
  LENDER_FEE_V1:{description:"Persisted lender fee calculated by the authoritative finance engine."},
  SPONSOR_EQUITY_V1:{description:"Sponsor equity required to close the persisted sources and uses.",expression:"Sponsor Equity = Total Closing Uses − Permanent Debt − Net ITC Proceeds − Other Permanent Sources"},
  SPONSOR_OPERATING_CASH_FLOW_V1:{description:"Annual sponsor operating cash flow after scheduled debt service."},
  SPONSOR_CASH_IRR_V1:{description:"Levered cash-only sponsor IRR using the persisted sponsor cash-flow series."},
  PROJECT_UNLEVERED_CASH_IRR_V1:{description:"Project unlevered cash IRR before modeled sponsor tax attributes."},
  DEPRECIABLE_BASIS_V1:{description:"Simplified modeled depreciable basis used by the optional tax module."},
  BONUS_DEPRECIATION_V1:{description:"Simplified modeled bonus depreciation amount."},
  IMMEDIATE_TAX_SHIELD_V1:{description:"Simplified immediate sponsor tax shield under the supplied tax-appetite assumptions."},
  SIMPLIFIED_AFTER_TAX_SPONSOR_IRR_V1:{description:"Simplified sponsor after-tax IRR under the optional modeled tax module."},
  DOWNSIDE_GENERATION_V1:{description:"Persisted downside generation under the selected downside source."},
  DOWNSIDE_REVENUE_V1:{description:"Persisted downside contracted revenue."},
  DOWNSIDE_CFADS_V1:{description:"Persisted downside cash flow available for debt service."},
  DOWNSIDE_DSCR_V1:{description:"Persisted annual downside debt-service coverage."},
  DOWNSIDE_CASH_SWEEP_V1:{description:"Cash-sweep repayment of the original base-case permanent debt under downside CFADS."},
};

function raw(value:unknown):string {
  if(value===null||value===undefined) return "—";
  if(typeof value==="object") return JSON.stringify(value);
  return String(value);
}
function numberLike(value:unknown):number|null {
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(typeof value==="string"&&value.trim()!==""&&Number.isFinite(Number(value))) return Number(value);
  return null;
}
function exact(value:unknown,kind?:"money"|"percent"|"dscr"|"mwh"|"ppa"|"number"):string {
  if(value===null||value===undefined) return "—";
  const n=numberLike(value);
  if(n===null) return raw(value);
  if(kind==="money") return money(n);
  if(kind==="percent") return percentFromDecimal(n);
  if(kind==="dscr") return dscr(n);
  if(kind==="mwh") return `${n.toLocaleString(undefined,{maximumFractionDigits:3})} MWh`;
  if(kind==="ppa") return `${money(n)}/MWh`;
  return n.toLocaleString(undefined,{maximumFractionDigits:6});
}

export function ModelTable({caption,headers,rows}:{caption:string;headers:string[];rows:ReactNode[][]}){
  return <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[760px] text-sm"><caption className="sr-only">{caption}</caption><thead className="bg-muted/40"><tr>{headers.map(h=><th key={h} scope="col" className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i} className="border-t">{row.map((cell,j)=><td key={j} className={`${j===0?"sticky left-0 bg-background font-medium":"text-right tabular-nums"} whitespace-nowrap px-3 py-2`}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function flatten(root:Record<string,any>,prefix=""):Array<{key:string;value:unknown}>{
  const out:Array<{key:string;value:unknown}>=[];
  Object.keys(root??{}).sort().forEach(key=>{
    const value=root[key]; const path=prefix?`${prefix}.${key}`:key;
    if(value&&typeof value==="object"&&!Array.isArray(value)) out.push(...flatten(value,path)); else out.push({key:path,value});
  });
  return out;
}

export function InputSnapshotTable({snapshot}:{snapshot:Record<string,any>}){
  const finance=snapshot?.finance_input??{}; const provenance=snapshot?.provenance??{};
  const rows=flatten(finance).map(({key,value})=>{
    const p=provenance[key]??{};
    return [<a href={`#input-${key.replaceAll(".","-")}`} className="font-medium" id={`input-${key.replaceAll(".","-")}`}>{humanize(key.split(".").at(-1))}</a>,raw(value),p.unit??"—",displaySource(p.resolution_source),humanize(p.verification_status),p.policy_default_used?"Yes":"No",p.override_used?`Yes${p.override_reason?` — ${p.override_reason}`:""}`:"No"];
  });
  return <Card id="inputs"><CardHeader><CardTitle>Input Snapshot</CardTitle><CardDescription>Read-only values frozen into this calculation run. Current project edits do not change this snapshot.</CardDescription></CardHeader><CardContent><ModelTable caption="Resolved calculation input snapshot" headers={["Field","Resolved Value","Unit","Source","Verification","Policy Default?","Override?"]} rows={rows}/></CardContent></Card>;
}

export function OperatingModelTable({rows}:{rows:Array<Record<string,unknown>>}){
  return <Card id="operating-model"><CardHeader><CardTitle>Operating Model</CardTitle><CardDescription>Persisted annual production, contracted revenue, operating costs, CFADS and sponsor operating cash flow.</CardDescription></CardHeader><CardContent><ModelTable caption="Annual operating model" headers={["Year","Generation","PPA Price","Revenue","Operating Costs","CFADS","Sponsor Operating Cash Flow"]} rows={rows.map(r=>[`Year ${raw(r.year)}`,exact(r.generation_mwh,"mwh"),exact(r.ppa_price_per_mwh,"ppa"),exact(r.revenue,"money"),exact(r.opex,"money"),exact(r.cfads,"money"),exact(r.sponsor_operating_cash_flow,"money")])}/></CardContent></Card>;
}

export function DebtScheduleTable({calculation}:{calculation:CalculationRunDetail}){
  const f=calculation.financing_result; const input=calculation.run.input_snapshot_json?.finance_input??{};
  return <Card id="debt"><CardHeader><CardTitle>Debt Model</CardTitle><CardDescription>The finance engine’s persisted sizing result and annual scheduled debt service.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="DSCR-Sized Debt" value={exact(f.dscr_sized_debt,"money")}/><Metric label="LTC Debt Limit" value={exact(f.ltc_debt_limit,"money")}/><Metric label="Permanent Senior Debt" value={exact(f.permanent_debt,"money")}/><Metric label="Binding Constraint" value={humanize(f.binding_constraint)}/><Metric label="Interest Rate" value={exact(input?.financing?.annual_interest_rate,"percent")}/><Metric label="Target DSCR" value={exact(input?.financing?.target_dscr,"dscr")}/><Metric label="Amortization" value={`${raw(input?.financing?.amortization_years)} years`}/><Metric label="Maturity" value={`${raw(input?.financing?.debt_maturity_years)} years`}/><Metric label="Minimum DSCR" value={exact(f.minimum_dscr,"dscr")} helper={f.minimum_dscr_year?`Year ${f.minimum_dscr_year}`:undefined}/><Metric label="Balloon Balance" value={exact(f.balloon_balance,"money")}/></div><ModelTable caption="Annual debt schedule" headers={["Year","Opening Balance","Interest","Principal","Debt Service","Ending Balance","DSCR"]} rows={calculation.annual_debt_schedules.map(r=>[`Year ${raw(r.year)}`,exact(r.opening_balance,"money"),exact(r.interest,"money"),exact(r.principal,"money"),exact(r.debt_service,"money"),exact(r.ending_balance,"money"),r.dscr==null?"N/A":exact(r.dscr,"dscr")])}/></CardContent></Card>;
}

export function Metric({label,value,helper}:{label:string;value:string;helper?:string}){return <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>{helper?<div className="mt-1 text-xs text-muted-foreground">{helper}</div>:null}</div>}

export function SourcesUsesTable({calculation}:{calculation:CalculationRunDetail}){
  const s=calculation.capital_stack_result,r=calculation.reconciliation_result;
  const uses=[["Project Capex",s.project_capex],["Closing Costs",s.closing_costs],["Lender Fee",s.lender_fee],["DSRA",s.dsra],["Other Financing Uses",s.other_financing_uses],["Total Closing Uses",s.total_closing_uses]];
  const sources=[["Permanent Senior Debt",s.permanent_debt],["Net ITC Transfer Proceeds",s.net_itc_proceeds],["Other Permanent Sources",s.other_permanent_sources],["Sponsor Equity",s.sponsor_equity]];
  return <Card id="capital-stack"><CardHeader><CardTitle>Sources & Uses</CardTitle><CardDescription>Persisted closing uses and permanent capital sources. Sponsor equity shown here is authoritative backend output.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 lg:grid-cols-2"><ModelTable caption="Closing uses" headers={["Use","Amount"]} rows={uses.map(([k,v])=>[k,exact(v,"money")])}/><ModelTable caption="Permanent sources" headers={["Source","Amount"]} rows={sources.map(([k,v])=>[k,exact(v,"money")])}/></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Debt % of Total Uses" value={exact(s.debt_pct_total_uses,"percent")}/><Metric label="ITC % of Total Uses" value={exact(s.itc_pct_total_uses,"percent")}/><Metric label="Sponsor Equity % of Uses" value={exact(s.sponsor_equity_pct_total_uses,"percent")}/><Metric label="Other Sources % of Uses" value={exact(s.other_sources_pct_total_uses,"percent")}/></div><Alert variant={r.sources_uses_reconciled===false?"destructive":undefined}>{r.sources_uses_reconciled===false?<AlertTriangle className="h-4 w-4"/>:<CheckCircle2 className="h-4 w-4"/>}<AlertTitle>{r.sources_uses_reconciled===false?"Sources and uses are not reconciled":"Sources & Uses Reconciled"}</AlertTitle><AlertDescription>Persisted difference: {exact(r.sources_uses_difference,"money")}. A successful calculation is expected to satisfy the engine reconciliation gate.</AlertDescription></Alert></CardContent></Card>;
}

export function TaxCreditDetail({calculation}:{calculation:CalculationRunDetail}){
  const t=calculation.tax_credit_result,ret=calculation.return_result,input=calculation.run.input_snapshot_json?.finance_input??{}; const enabled=input?.calculation_options?.tax_module_enabled===true;
  return <Card id="tax-credit"><CardHeader><CardTitle>Tax Credit Detail</CardTitle><CardDescription>Modeled tax-credit values; these do not confirm tax eligibility and do not constitute tax advice.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Eligible Basis" value={exact(t.eligible_basis,"money")}/><Metric label="Modeled ITC Rate" value={exact(t.itc_rate,"percent")}/><Metric label="ITC Face Value" value={exact(t.itc_face_value,"money")}/><Metric label="Transfer Price" value={exact(t.transfer_price,"percent")}/><Metric label="Gross Transfer Proceeds" value={exact(t.gross_transfer_proceeds,"money")}/><Metric label="Transaction Costs" value={exact(t.transaction_costs,"money")}/><Metric label="Net Transfer Proceeds" value={exact(t.net_transfer_proceeds,"money")}/></div>{enabled?<div><h4 className="mb-3 font-medium">Simplified Sponsor Tax Value</h4><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Depreciable Basis" value={exact(t.depreciable_basis,"money")}/><Metric label="Bonus Depreciation" value={exact(t.bonus_depreciation,"money")}/><Metric label="Immediate Tax Shield" value={exact(t.immediate_tax_shield??t.tax_shield,"money")}/><Metric label="Simplified After-Tax Sponsor IRR" value={exact(ret.simplified_sponsor_after_tax_irr,"percent")}/></div></div>:<p className="text-sm text-muted-foreground">Simplified tax module disabled for this calculation run.</p>}</CardContent></Card>;
}

export function ReturnSummary({calculation}:{calculation:CalculationRunDetail}){
  const r=calculation.return_result,s=calculation.capital_stack_result;
  return <Card id="returns"><CardHeader><CardTitle>Sponsor Cash Flows & Returns</CardTitle><CardDescription>Cash-only returns remain distinct from optional simplified sponsor tax value.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Initial Sponsor Equity" value={exact(s.sponsor_equity,"money")}/><Metric label="Levered Cash-Only Sponsor IRR" value={exact(r.levered_sponsor_cash_irr,"percent")} helper={humanize(r.levered_sponsor_cash_irr_status)}/><Metric label="Project Unlevered Cash IRR" value={exact(r.project_unlevered_cash_irr_before_tax_attributes,"percent")} helper={humanize(r.unlevered_irr_status)}/><Metric label="Sponsor NPV" value={exact(r.sponsor_npv,"money")}/><Metric label="Project NPV" value={exact(r.project_npv,"money")}/></div><ModelTable caption="Sponsor operating cash flows" headers={["Year","Sponsor Operating Cash Flow","Depreciation","Tax Shield"]} rows={calculation.annual_project_cashflows.map(r=>[`Year ${raw(r.year)}`,exact(r.sponsor_operating_cash_flow,"money"),exact(r.depreciation,"money"),exact(r.tax_shield,"money")])}/></CardContent></Card>;
}

export function DownsideSummary({calculation}:{calculation:CalculationRunDetail}){
  const d=calculation.downside_result;
  if(!d) return <Card id="downside"><CardHeader><CardTitle>Downside Analysis</CardTitle><CardDescription>No downside case was persisted for this calculation run.</CardDescription></Card></Card>;
  const source=String(d.generation_source_type??""); const illustrative=source==="ILLUSTRATIVE_PERCENT_OF_P50";
  return <Card id="downside"><CardHeader><CardTitle>Downside Analysis</CardTitle><CardDescription>{illustrative?"Illustrative 90%-of-P50 generation case — not an independent-engineer P90.":source==="INDEPENDENT_ENGINEER_P90"?"Independent Engineer P90 provenance is preserved by the backend.":"Persisted downside case and cash-sweep result."}</CardDescription></CardHeader><CardContent className="space-y-4">{illustrative?<Alert><Info className="h-4 w-4"/><AlertTitle>Illustrative downside — not lender-grade P90</AlertTitle><AlertDescription>The model uses an illustrative percentage-of-P50 stress rather than site-specific independent-engineer P90 evidence.</AlertDescription></Alert>:null}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Downside Type" value={humanize(d.downside_type)}/><Metric label="Generation Source" value={humanize(source)}/><Metric label="Generation Multiplier" value={exact(d.generation_multiplier,"percent")}/><Metric label="Minimum Downside DSCR" value={exact(d.minimum_downside_dscr,"dscr")} helper={d.minimum_downside_dscr_year?`Year ${d.minimum_downside_dscr_year}`:undefined}/><Metric label="Full Cash-Sweep Repayment" value={d.full_repayment===true?"Yes":d.full_repayment===false?"No":"—"}/><Metric label="Repayment Year" value={d.repayment_year?`Year ${d.repayment_year}`:"Not applicable"}/><Metric label="Unrepaid Balance" value={exact(d.unrepaid_balance,"money")}/><Metric label="Interest Shortfall" value={d.interest_shortfall===true?"Yes":d.interest_shortfall===false?"No":"—"}/></div><p className="text-sm text-muted-foreground">The cash-sweep test applies modeled downside CFADS to interest first and then principal against the original base-case debt.</p><CashSweepTable rows={calculation.downside_cash_sweep_rows}/></CardContent></Card>;
}

export function CashSweepTable({rows}:{rows:Array<Record<string,unknown>>}){
  if(!rows.length) return <p className="text-sm text-muted-foreground">No cash-sweep rows were persisted for this run.</p>;
  return <ModelTable caption="Downside cash-sweep schedule" headers={["Year","Opening Balance","Downside CFADS","Interest Due","Cash Available","Principal Paid","Ending Balance","Interest Shortfall"]} rows={rows.map(r=>[`Year ${raw(r.year)}`,exact(r.opening_balance,"money"),exact(r.downside_cfads,"money"),exact(r.interest_due,"money"),exact(r.cash_available,"money"),exact(r.principal_paid,"money"),exact(r.ending_balance,"money"),r.interest_shortfall?"Yes":"No"])}/>;
}

function traceValue(value:unknown):string { const n=numberLike(value); return n===null?raw(value):n.toLocaleString(undefined,{maximumFractionDigits:10}); }
export function FormulaTracePanel({traces}:{traces:Array<Record<string,any>>}){
  const traceKeys=new Set(traces.map(t=>String(t.metric_key)));
  return <Card id="formula-trace"><CardHeader><CardTitle>Calculation Trace</CardTitle><CardDescription>Formula Trace identifies the approved formula and persisted dependencies for a metric. It is not AI reasoning.</CardDescription></CardHeader><CardContent className="space-y-3">{traces.length?traces.map((t,i)=>{const desc=FORMULA_DESCRIPTIONS[String(t.formula_id)]??{description:"Detailed description unavailable for this engine formula ID."};return <details key={`${t.metric_key}-${i}`} id={`trace-${String(t.metric_key).replaceAll(".","-")}`} className="rounded-md border p-3"><summary className="cursor-pointer list-none font-medium"><div className="flex flex-wrap items-center justify-between gap-2"><span>{humanize(String(t.metric_key))}</span><Badge variant="outline">{String(t.formula_id)}</Badge></div></summary><div className="mt-3 space-y-3 text-sm"><div><span className="text-muted-foreground">Persisted value:</span> <span className="font-mono">{traceValue(t.value)}</span></div><div>{desc.description}</div>{desc.expression?<div className="rounded bg-muted/40 px-3 py-2 font-mono text-xs">{desc.expression}</div>:null}<div><div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Dependencies</div><div className="flex flex-wrap gap-2">{Array.isArray(t.dependencies)&&t.dependencies.length?t.dependencies.map((d:string)=>{const target=traceKeys.has(d)?`#trace-${d.replaceAll(".","-")}`:`#input-${d.replaceAll(".","-")}`;return <a key={d} href={target} className="rounded border px-2 py-1 text-xs hover:bg-muted">{d}</a>}):<span className="text-muted-foreground">No dependency list persisted.</span>}</div></div>{t.metadata?<pre className="overflow-x-auto rounded bg-muted/40 p-3 text-xs">{JSON.stringify(t.metadata,null,2)}</pre>:null}</div></details>}):<p className="text-sm text-muted-foreground">Detailed trace unavailable for this metric set in this engine version. The interface does not reconstruct missing traces.</p>}</CardContent></Card>;
}

export function CalculationWarnings({warnings}:{warnings:Array<Record<string,any>>}){
  return <Card id="warnings"><CardHeader><CardTitle>Calculation Warnings</CardTitle><CardDescription>Deterministic model warnings are separate from underwriting risks and conditions.</CardDescription></CardHeader><CardContent className="space-y-2">{warnings.length?warnings.map((w,i)=><Alert key={`${w.code}-${i}`} variant={w.severity==="CRITICAL"||w.severity==="HIGH"?"destructive":undefined}><AlertTriangle className="h-4 w-4"/><AlertTitle>{humanize(w.code)} · {humanize(w.severity)}</AlertTitle><AlertDescription>{w.message}{w.metric_key?` Metric: ${w.metric_key}.`:""}{w.year?` Year ${w.year}.`:""}</AlertDescription></Alert>):<p className="text-sm text-muted-foreground">No deterministic calculation warnings were persisted for this run.</p>}</CardContent></Card>;
}

import { useEffect, useState } from "react";
import { ArrowLeft, Banknote, ChevronDown, Loader2, RotateCcw, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

type ScenarioInput = {
  projectName: string;
  capacityMwAc: number;
  p50CapacityFactor: number;
  annualDegradationRate: number;
  projectLifeYears: number;
  ppaTermYears: number;
  yearOnePpaPricePerMwh: number;
  annualPpaEscalationRate: number;
  totalProjectCapexUsd: number;
  capexIncludesContingency: boolean;
  yearOneOpexUsd: number;
  annualOpexEscalationRate: number;
  itcRate: number;
  itcEligibleBasisPercent: number;
  itcTransferPrice: number;
  itcTransferTransactionCostsUsd: number;
  debtInterestRate: number;
  debtAmortizationYears: number;
  debtMaturityYears: number;
  targetP50Dscr: number;
  maximumLtc: number;
  upfrontFeePercent: number;
  dsraMonths: number;
  closingCostsUsd: number;
  otherFinancingUsesUsd: number;
  otherPermanentSourcesUsd: number;
  downsideGenerationMultiplier: number;
};

interface AnalysisResult {
  scenarioId: string;
  analyzedAt: string;
  finance: {
    metadata: { calculationEngineVersion: string; underwritingPolicyId?: string; underwritingPolicyVersion?: string };
    yearOneCfadsUsd: number;
    financingSummary: { dscrSizedDebtUsd: number; ltcDebtLimitUsd: number; permanentDebtUsd: number; bindingConstraint: string; debtToCapex: number };
    taxCreditResult: { eligibleBasisUsd: number; itcFaceValueUsd: number; itcRate: number; transferPrice: number; netTransferProceedsUsd: number };
    capitalStack: { totalClosingUsesUsd: number; permanentDebtUsd: number; netItcProceedsUsd: number; sponsorEquityUsd: number; sponsorEquityPctTotalUses: number };
    annualDebtSchedule: Array<{ debtServiceUsd: number }>;
    formulaTrace: Array<{ metric: string; value: number | null; formulaId: string }>;
  };
  assessment: {
    status: string;
    financialBankability: string;
    financingReadiness: string;
    lenderFit: Array<{ category: string; fit: string; rationale: string }>;
    missingInputs: Array<{ field: string; reason: string }>;
  };
  improvements: Array<{ kind: string; label: string; permanentDebtChangeUsd: number; sponsorEquityChangeUsd: number; bindingConstraint: string }>;
}

const BASE: ScenarioInput = {
  projectName: "EcoXchange 5 MW Reference Case",
  capacityMwAc: 5,
  p50CapacityFactor: 0.24,
  annualDegradationRate: 0.005,
  projectLifeYears: 25,
  ppaTermYears: 25,
  yearOnePpaPricePerMwh: 55,
  annualPpaEscalationRate: 0.01,
  totalProjectCapexUsd: 8_000_000,
  capexIncludesContingency: true,
  yearOneOpexUsd: 150_000,
  annualOpexEscalationRate: 0.025,
  itcRate: 0.30,
  itcEligibleBasisPercent: 0.95,
  itcTransferPrice: 0.92,
  itcTransferTransactionCostsUsd: 0,
  debtInterestRate: 0.065,
  debtAmortizationYears: 18,
  debtMaturityYears: 18,
  targetP50Dscr: 1.30,
  maximumLtc: 0.70,
  upfrontFeePercent: 0.0125,
  dsraMonths: 6,
  closingCostsUsd: 250_000,
  otherFinancingUsesUsd: 0,
  otherPermanentSourcesUsd: 0,
  downsideGenerationMultiplier: 0.90,
};

const BENCHMARK_FACTS = {
  technology: "SOLAR_PV",
  country: "US",
  projectStage: "READY_TO_BUILD",
  projectCoStructure: true,
  revenueContractStatus: "FULLY_CONTRACTED",
  p90Source: "ILLUSTRATIVE_PERCENT_OF_P50",
  itcEligibilityStatus: "VERIFIED",
  taxCreditBuyerStatus: "COMMITTED",
  offtakerName: "Benchmark Utility",
  offtakerCreditStatus: "INVESTMENT_GRADE",
  ppaDocumentationStatus: "EXECUTED",
  epcStatus: "EXECUTED_FIXED_PRICE",
  interconnectionStatus: "FULLY_EXECUTED",
  permitStatus: "COMPLETE",
  siteControlStatus: "LONG_TERM_LEASE_EXECUTED",
  omStatus: "EXECUTED",
  ieStatus: "FINAL_REPORT",
  insuranceStatus: "CONFIRMED",
  sponsorExperience: "EXPERIENCED",
  sponsorTaxAppetiteStatus: "CONFIRMED",
  technologyProven: true,
  materialInputSources: {
    ppa: "EXECUTED_DOCUMENT",
    p50: "INDEPENDENT_THIRD_PARTY_REPORT",
    capex: "SPONSOR_DOCUMENT",
    debtRate: "ECOXCHANGE_ASSUMPTION",
    itc: "EXECUTED_DOCUMENT",
  },
};

const money = (value?: number | null) => value == null || !Number.isFinite(value) ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const pct = (value?: number | null) => value == null || !Number.isFinite(value) ? "—" : `${(value * 100).toFixed(1)}%`;
const labelize = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function Field({ label, value, suffix, onChange }: { label: string; value: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="space-y-1.5"><span className="block text-xs font-medium text-textMuted">{label}</span><div className="relative"><input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-md border border-paleGreen/70 bg-white px-3 py-2 pr-16 text-sm text-textDark outline-none focus:border-medGreen" />{suffix && <span className="absolute right-3 top-2.5 text-[11px] text-textMuted">{suffix}</span>}</div></label>;
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return <div className="rounded-xl border border-paleGreen/60 bg-white p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-textMuted">{title}</p><p className="mt-2 font-heading text-3xl text-darkBg">{value}</p><p className="mt-1 text-sm text-textMuted">{note}</p></div>;
}

export function Bankability() {
  const [input, setInput] = useState<ScenarioInput>({ ...BASE });
  const [scenario, setScenario] = useState<"BASE" | "CUSTOM">("BASE");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  function update<K extends keyof ScenarioInput>(key: K, value: ScenarioInput[K]) {
    setScenario("CUSTOM");
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function analyze(nextInput: ScenarioInput = input, nextScenario: "BASE" | "CUSTOM" = scenario) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/project-finance/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: nextInput, facts: BENCHMARK_FACTS, scenarioId: nextScenario === "BASE" ? "demo-5mw-reference-case" : "demo-5mw-custom" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.message || "Financing analysis failed.");
      setResult(body as AnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The backend calculation service is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    const next = { ...BASE };
    setInput(next);
    setScenario("BASE");
    setAssumptionsOpen(false);
    void analyze(next, "BASE");
  }

  useEffect(() => {
    void analyze(BASE, "BASE");
    // The published reference case is explicitly route-scoped to this demo.
    // It is never selected by project capacity in the real developer workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lender = result?.assessment.lenderFit.find((item) => item.fit === "HIGH") || result?.assessment.lenderFit.find((item) => item.fit === "MEDIUM");
  const revenue = result?.finance.formulaTrace.find((row) => row.metric === "year_1_revenue_usd")?.value;
  const debtService = result?.finance.annualDebtSchedule[0]?.debtServiceUsd;

  return <div className="min-h-screen bg-cream px-4 py-8 text-textDark">
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><Link to="/demo" className="mb-3 inline-flex items-center gap-2 text-sm text-medGreen"><ArrowLeft className="h-4 w-4" />Demo controls</Link><p className="text-xs font-semibold uppercase tracking-[0.16em] text-medGreen">EcoXchange 5 MW Reference Case</p><h1 className="mt-2 font-heading text-3xl text-darkBg sm:text-4xl">Bankability & Sponsor Equity Analysis</h1><p className="mt-2 max-w-3xl text-lg text-textDark">How much senior debt could this project support, and how much sponsor equity would remain?</p><p className="mt-2 max-w-3xl text-sm text-textMuted">The reference case is submitted to the live EcoXchange project-finance service. Results are indicative and are not a financing commitment, lender approval, tax opinion, legal advice, or securities offering.</p></div>
        <div className="flex gap-2"><button onClick={reset} className="inline-flex items-center gap-2 rounded-md border border-medGreen px-4 py-2 text-sm font-medium text-medGreen"><RotateCcw className="h-4 w-4" />Reset Base Case</button>{result && <button onClick={() => setAssumptionsOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-md bg-medGreen px-5 py-2 text-sm font-medium text-white">{assumptionsOpen ? "Hide assumptions" : "Change assumptions"}</button>}</div>
      </div>

      <div className="rounded-xl border border-paleGreen/60 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong>{input.projectName}</strong><p className="text-sm text-textMuted">Solar PV · 5 MW AC · Scenario: {scenario === "BASE" ? "Base Case" : "Custom Scenario"}</p></div><span className="rounded-full bg-paleGreen/50 px-3 py-1 text-xs font-medium text-medGreen">Real backend calculation</span></div></div>

      {loading && <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl border border-paleGreen/60 bg-white p-6 text-sm text-textMuted"><Loader2 className="h-5 w-5 animate-spin text-medGreen" />Running the live 5 MW reference case…</div>}

      {error && <div className="flex gap-3 rounded-xl border border-red-300 bg-red-50 p-5 text-sm"><ShieldAlert className="h-5 w-5 shrink-0 text-red-600" /><div><strong>Analysis unavailable</strong><p className="text-textMuted">{error}</p><p className="mt-1 text-textMuted">No canned debt or sponsor-equity values are substituted.</p></div></div>}

      {result && <>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Metric title="Bank Debt Capacity" value={money(result.finance.financingSummary.permanentDebtUsd)} note={`${pct(result.finance.financingSummary.debtToCapex)} of capex · ${result.finance.financingSummary.bindingConstraint} binds`} />
          <Metric title="Tax Credit Monetization" value={money(result.finance.taxCreditResult.netTransferProceedsUsd)} note="Transferred 48E proceeds" />
          <Metric title="Estimated Sponsor Equity" value={money(result.finance.capitalStack.sponsorEquityUsd)} note={`${pct(result.finance.capitalStack.sponsorEquityPctTotalUses)} of closing uses`} />
          <Metric title="Economic Financeability" value={labelize(result.assessment.financialBankability)} note="Based on modeled project economics and financing assumptions." />
          <Metric title="Transaction Readiness" value={labelize(result.assessment.financingReadiness)} note={result.assessment.missingInputs.length ? `${result.assessment.missingInputs.length} diligence item(s) missing` : "Reference-case documentation profile complete"} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-paleGreen/60 bg-white p-5"><h2 className="font-heading text-xl text-darkBg">Why the debt number is what it is</h2><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span>DSCR-sized debt</span><strong>{money(result.finance.financingSummary.dscrSizedDebtUsd)}</strong></div><div className="flex justify-between"><span>LTC ceiling</span><strong>{money(result.finance.financingSummary.ltcDebtLimitUsd)}</strong></div><div className="flex justify-between border-t border-paleGreen/60 pt-3"><span>Permanent debt capacity</span><strong>{money(result.finance.financingSummary.permanentDebtUsd)}</strong></div></div></div><div className="rounded-xl border border-paleGreen/60 bg-white p-5"><h2 className="font-heading text-xl text-darkBg">Sponsor-equity bridge</h2><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span>Total closing uses</span><strong>{money(result.finance.capitalStack.totalClosingUsesUsd)}</strong></div><div className="flex justify-between"><span>minus Permanent debt</span><span>({money(result.finance.capitalStack.permanentDebtUsd)})</span></div><div className="flex justify-between"><span>minus Tax-credit proceeds</span><span>({money(result.finance.capitalStack.netItcProceedsUsd)})</span></div><div className="flex justify-between border-t border-paleGreen/60 pt-3"><span>equals Sponsor equity</span><strong>{money(result.finance.capitalStack.sponsorEquityUsd)}</strong></div></div></div></section>

        <section className="rounded-xl border border-paleGreen/60 bg-white p-5"><h2 className="font-heading text-xl text-darkBg">Indicative Lender Profile</h2><p className="mt-1 text-sm text-textMuted">Strongest potential category based on project scale, modeled economics, financing structure and current project maturity. This is not lender eligibility and does not indicate that any lender will offer financing.</p>{lender ? <div className="mt-3"><div className="flex flex-wrap items-center gap-2"><strong>{labelize(lender.category)}</strong><span className="rounded-full bg-paleGreen/50 px-2 py-0.5 text-xs font-medium text-medGreen">{lender.fit}</span></div><p className="mt-1 text-sm text-textMuted">{lender.rationale}</p></div> : <p className="mt-2 text-sm text-textMuted">No high- or medium-fit lender category returned.</p>}</section>

        <section className="rounded-xl border border-paleGreen/60 bg-white p-5"><h2 className="font-heading text-xl text-darkBg">What would improve this project?</h2><p className="mt-1 text-sm text-textMuted">Every item is a backend sensitivity run against the current scenario.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{result.improvements.map((item) => <div key={item.kind} className="rounded-lg border border-paleGreen/60 p-4"><strong>{item.label}</strong><p className="mt-1 text-sm text-textMuted">Permanent debt {money(item.permanentDebtChangeUsd)} · Sponsor equity {money(item.sponsorEquityChangeUsd)} · {item.bindingConstraint} binds</p></div>)}</div></section>

        <section className="rounded-xl border border-paleGreen/60 bg-white"><button type="button" onClick={() => setTraceOpen((open) => !open)} className="flex w-full items-center justify-between p-5 text-left"><div><h2 className="font-heading text-xl text-darkBg">Detailed calculation trace</h2><p className="text-sm text-textMuted">Backend-returned amounts and version metadata.</p></div><ChevronDown className={`h-4 w-4 transition-transform ${traceOpen ? "rotate-180" : ""}`} /></button>{traceOpen && <div className="grid gap-3 border-t border-paleGreen/60 p-5 sm:grid-cols-2"><div className="flex justify-between rounded border border-paleGreen/50 p-3 text-sm"><span>Year-one revenue</span><strong>{money(revenue)}</strong></div><div className="flex justify-between rounded border border-paleGreen/50 p-3 text-sm"><span>Year-one CFADS</span><strong>{money(result.finance.yearOneCfadsUsd)}</strong></div><div className="flex justify-between rounded border border-paleGreen/50 p-3 text-sm"><span>Year-one debt service</span><strong>{money(debtService)}</strong></div><div className="flex justify-between rounded border border-paleGreen/50 p-3 text-sm"><span>ITC eligible basis</span><strong>{money(result.finance.taxCreditResult.eligibleBasisUsd)}</strong></div><p className="sm:col-span-2 text-xs text-textMuted">Calculation engine {result.finance.metadata.calculationEngineVersion} · Policy {result.finance.metadata.underwritingPolicyId} {result.finance.metadata.underwritingPolicyVersion} · Scenario {result.scenarioId} · {new Date(result.analyzedAt).toLocaleString()}</p></div>}</section>
      </>}

      {assumptionsOpen && <section className="rounded-xl border border-paleGreen/60 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-heading text-xl text-darkBg">Explore a Custom Scenario</h2><p className="mt-1 text-sm text-textMuted">Edit assumptions and rerun. Results still come from the live backend service.</p></div><button onClick={() => void analyze()} disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-medGreen px-5 py-2 text-sm font-medium text-white disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}Update Analysis</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Total project capex" value={input.totalProjectCapexUsd} suffix="USD" onChange={(v) => update("totalProjectCapexUsd", v)} />
        <Field label="P50 capacity factor" value={input.p50CapacityFactor * 100} suffix="%" onChange={(v) => update("p50CapacityFactor", v / 100)} />
        <Field label="Year-one PPA" value={input.yearOnePpaPricePerMwh} suffix="$/MWh" onChange={(v) => update("yearOnePpaPricePerMwh", v)} />
        <Field label="Year-one opex" value={input.yearOneOpexUsd} suffix="USD" onChange={(v) => update("yearOneOpexUsd", v)} />
        <Field label="Borrowing rate" value={input.debtInterestRate * 100} suffix="%" onChange={(v) => update("debtInterestRate", v / 100)} />
        <Field label="Amortization" value={input.debtAmortizationYears} suffix="years" onChange={(v) => { update("debtAmortizationYears", v); update("debtMaturityYears", v); }} />
        <Field label="P50 sizing DSCR" value={input.targetP50Dscr} suffix="x" onChange={(v) => update("targetP50Dscr", v)} />
        <Field label="LTC ceiling" value={input.maximumLtc * 100} suffix="%" onChange={(v) => update("maximumLtc", v / 100)} />
        <Field label="48E / ITC rate" value={input.itcRate * 100} suffix="%" onChange={(v) => update("itcRate", v / 100)} />
        <Field label="Eligible basis" value={input.itcEligibleBasisPercent * 100} suffix="%" onChange={(v) => update("itcEligibleBasisPercent", v / 100)} />
        <Field label="Credit transfer price" value={input.itcTransferPrice} suffix="$/credit $" onChange={(v) => update("itcTransferPrice", v)} />
        <Field label="Closing costs" value={input.closingCostsUsd} suffix="USD" onChange={(v) => update("closingCostsUsd", v)} />
      </div></section>}
    </div>
  </div>;
}

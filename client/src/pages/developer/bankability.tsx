import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, Banknote, ChevronDown, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

interface ProjectListItem {
  id: string;
  name: string;
  technology: string;
  capacityMW: string | null;
  stage?: string;
}

interface ProjectDetailResponse {
  project: ProjectListItem & { stage: string };
}

interface PolicyDefaults {
  policyId: string;
  policyVersion: string;
  source: "ECOXCHANGE_ASSUMPTION";
  assumptions: {
    targetP50Dscr: number;
    maximumLtc: number;
    debtInterestRate: number;
    debtAmortizationYears: number;
    debtMaturityYears: number;
    dsraMonths: number;
    upfrontFeePercent: number;
    itcRate: number;
    itcTransferPrice: number;
    closingCostsUsd: number;
  };
}

interface FinanceInput {
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
  underwritingPolicyId: string;
  underwritingPolicyVersion: string;
}

interface AnalysisResult {
  scenarioId: string;
  analyzedAt: string;
  finance: {
    metadata: { calculationEngineVersion: string; underwritingPolicyId?: string; underwritingPolicyVersion?: string };
    yearOneCfadsUsd: number;
    financingSummary: {
      dscrSizedDebtUsd: number;
      ltcDebtLimitUsd: number;
      permanentDebtUsd: number;
      bindingConstraint: string;
      debtToCapex: number;
      lenderUpfrontFeeUsd: number;
      dsraRequiredUsd: number;
    };
    taxCreditResult: {
      eligibleBasisUsd: number;
      itcFaceValueUsd: number;
      itcRate: number;
      transferPrice: number;
      netTransferProceedsUsd: number;
    };
    capitalStack: {
      totalClosingUsesUsd: number;
      permanentDebtUsd: number;
      netItcProceedsUsd: number;
      sponsorEquityUsd: number;
      sponsorEquityPctTotalUses: number;
    };
    annualDebtSchedule: Array<{ year: number; debtServiceUsd: number }>;
    formulaTrace: Array<{ metric: string; value: number | null; formulaId: string }>;
    warnings: Array<{ code: string; message: string }>;
  };
  assessment: {
    status: string;
    financialBankability: string;
    financingReadiness: string;
    bindingDebtConstraint: string;
    lenderFit: Array<{ category: string; fit: string; rationale: string }>;
    risks: Array<{ description: string; mitigation: string; severity: string }>;
    conditionsPrecedent: string[];
    missingInputs: Array<{ field: string; reason: string }>;
  };
  improvements: Array<{
    kind: string;
    label: string;
    testedValue: number;
    permanentDebtChangeUsd: number;
    sponsorEquityChangeUsd: number;
    bindingConstraint: string;
  }>;
}

const money = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value)
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const pct = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : `${(value * 100).toFixed(1)}%`;
const labelize = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function stageValue(stage?: string): "DEVELOPMENT" | "READY_TO_BUILD" | "CONSTRUCTION" | "OPERATING" {
  const normalized = (stage || "").toUpperCase();
  if (normalized.includes("OPERAT")) return "OPERATING";
  if (normalized.includes("CONSTRUCT")) return "CONSTRUCTION";
  if (normalized.includes("READY")) return "READY_TO_BUILD";
  return "DEVELOPMENT";
}

function InputField({ label, value, onChange, suffix, step = "any" }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; step?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input type="number" value={Number.isFinite(value) ? value : ""} step={step} onChange={(event) => onChange(Number(event.target.value))} className={suffix ? "pr-14" : undefined} />
        {suffix && <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function ResultCard({ title, value, detail, children }: { title: string; value: string; detail?: string; children?: React.ReactNode }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="font-serif text-3xl font-semibold tracking-tight">{value}</div>
        {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
        {children}
      </CardContent>
    </Card>
  );
}

export default function BankabilityWorkspace() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const [selectedProjectId, setSelectedProjectId] = useState(params.id || "");
  const [scenario, setScenario] = useState<"BASE" | "CUSTOM">("BASE");
  const [input, setInput] = useState<FinanceInput | null>(null);
  const [baseInput, setBaseInput] = useState<FinanceInput | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: projects = [] } = useQuery<ProjectListItem[]>({ queryKey: ["/api/developer/projects"] });
  const { data: projectDetail } = useQuery<ProjectDetailResponse>({
    queryKey: ["/api/developer/projects", selectedProjectId],
    enabled: Boolean(selectedProjectId),
  });

  const selectedProject = projectDetail?.project || projects.find((project) => project.id === selectedProjectId);

  useEffect(() => {
    if (!selectedProject) return;
    const capacity = Number(selectedProject.capacityMW || 5);
    let cancelled = false;
    fetch(`/api/project-finance/defaults?capacityMwAc=${encodeURIComponent(capacity)}`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load financing policy assumptions.");
        return response.json() as Promise<PolicyDefaults>;
      })
      .then((defaults) => {
        if (cancelled) return;
        const size = Number.isFinite(capacity) && capacity > 0 ? capacity : 5;
        const benchmarkScale = size / 5;
        const next: FinanceInput = {
          projectName: selectedProject.name,
          capacityMwAc: size,
          p50CapacityFactor: 0.24,
          annualDegradationRate: 0.005,
          projectLifeYears: 25,
          ppaTermYears: 25,
          yearOnePpaPricePerMwh: 55,
          annualPpaEscalationRate: 0.01,
          totalProjectCapexUsd: 8_000_000 * benchmarkScale,
          capexIncludesContingency: true,
          yearOneOpexUsd: 150_000 * benchmarkScale,
          annualOpexEscalationRate: 0.025,
          itcRate: defaults.assumptions.itcRate,
          itcEligibleBasisPercent: 0.95,
          itcTransferPrice: defaults.assumptions.itcTransferPrice,
          itcTransferTransactionCostsUsd: 0,
          debtInterestRate: defaults.assumptions.debtInterestRate,
          debtAmortizationYears: defaults.assumptions.debtAmortizationYears,
          debtMaturityYears: defaults.assumptions.debtMaturityYears,
          targetP50Dscr: defaults.assumptions.targetP50Dscr,
          maximumLtc: defaults.assumptions.maximumLtc,
          upfrontFeePercent: defaults.assumptions.upfrontFeePercent,
          dsraMonths: defaults.assumptions.dsraMonths,
          closingCostsUsd: defaults.assumptions.closingCostsUsd,
          otherFinancingUsesUsd: 0,
          otherPermanentSourcesUsd: 0,
          downsideGenerationMultiplier: 0.90,
          underwritingPolicyId: defaults.policyId,
          underwritingPolicyVersion: defaults.policyVersion,
        };
        setInput(next);
        setBaseInput(next);
        setResult(null);
        setError(null);
        setScenario("BASE");
      })
      .catch((err: Error) => setError(err.message));
    return () => { cancelled = true; };
  }, [selectedProject?.id, selectedProject?.capacityMW, selectedProject?.name]);

  const facts = useMemo(() => ({
    technology: selectedProject?.technology === "SOLAR_STORAGE" ? "SOLAR_STORAGE" : "SOLAR_PV",
    country: "US",
    projectStage: stageValue(selectedProject?.stage),
    projectCoStructure: true,
    revenueContractStatus: "UNKNOWN",
    p90Source: "NONE",
    itcEligibilityStatus: "UNKNOWN",
    taxCreditBuyerStatus: "UNIDENTIFIED",
    offtakerCreditStatus: "UNKNOWN",
    ppaDocumentationStatus: "UNKNOWN",
    epcStatus: "UNKNOWN",
    interconnectionStatus: "UNKNOWN",
    permitStatus: "UNKNOWN",
    siteControlStatus: "UNKNOWN",
    omStatus: "UNKNOWN",
    ieStatus: "UNKNOWN",
    insuranceStatus: "UNKNOWN",
    sponsorExperience: "UNKNOWN",
    sponsorTaxAppetiteStatus: "UNKNOWN",
    technologyProven: selectedProject?.technology?.startsWith("SOLAR") ?? true,
    materialInputSources: {
      ppa: "USER_ASSERTION",
      p50: "USER_ASSERTION",
      capex: "USER_ASSERTION",
      debtRate: "ECOXCHANGE_ASSUMPTION",
      itc: "USER_ASSERTION",
    },
  }), [selectedProject?.technology, selectedProject?.stage]);

  async function analyze() {
    if (!input) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await apiRequest("POST", "/api/project-finance/analyze", {
        input,
        facts,
        scenarioId: `${selectedProjectId || "project"}-${scenario.toLowerCase()}`,
      });
      setResult(await response.json());
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Financing analysis failed. No fallback values were substituted.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function update<K extends keyof FinanceInput>(key: K, value: FinanceInput[K]) {
    setScenario("CUSTOM");
    setInput((current) => current ? { ...current, [key]: value } : current);
  }

  function resetBase() {
    if (!baseInput) return;
    setInput({ ...baseInput });
    setScenario("BASE");
    setResult(null);
    setError(null);
  }

  const topLenders = result?.assessment.lenderFit.filter((item) => item.fit === "HIGH" || item.fit === "MEDIUM") || [];
  const y1DebtService = result?.finance.annualDebtSchedule[0]?.debtServiceUsd;

  return (
    <DashboardLayout
      title="Bankability & Sponsor Equity Analysis"
      description="Indicative lender-style project-finance analysis. Results are not a financing commitment, credit decision, lender approval, tax opinion, or legal advice."
      breadcrumbs={[{ label: "Issuer", href: "/developer" }, { label: "Bankability & Sponsor Equity" }]}
      actions={<Button variant="outline" onClick={() => setLocation("/developer/projects")}><ArrowLeft className="mr-2 h-4 w-4" />Projects</Button>}
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedProjectId} onValueChange={(value) => { setSelectedProjectId(value); setLocation(`/developer/projects/${value}/finance`); }}>
                <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                <SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}{project.capacityMW ? ` · ${project.capacityMW} MW` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Link href="/developer/onboard"><Button variant="outline">Create / Onboard Project</Button></Link>
          </CardContent>
        </Card>

        {!selectedProjectId && (
          <Card><CardContent className="p-8 text-center"><Banknote className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><h2 className="font-serif text-xl font-semibold">Select a project to begin</h2><p className="mt-1 text-sm text-muted-foreground">Existing project name, technology, size, and stage will prepopulate where available.</p></CardContent></Card>
        )}

        {input && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{input.projectName} · {input.capacityMwAc} MW · {labelize(selectedProject?.technology || "SOLAR_PV")}</p>
                <p className="text-xs text-muted-foreground">Scenario: {scenario === "BASE" ? "Base Case" : "Custom Scenario"}</p>
              </div>
              <div className="flex gap-2"><Button variant="outline" onClick={resetBase} disabled={scenario === "BASE"}><RefreshCw className="mr-2 h-4 w-4" />Reset Base Case</Button><Button onClick={analyze} disabled={isAnalyzing}>{isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}Analyze Financing</Button></div>
            </div>

            <Card>
              <CardHeader><CardTitle>Scenario assumptions</CardTitle><p className="text-sm text-muted-foreground">Project-specific stored facts are used where available. Policy-derived debt assumptions are loaded from the backend and shown explicitly below.</p></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InputField label="Project size" value={input.capacityMwAc} suffix="MW AC" onChange={(v) => update("capacityMwAc", v)} />
                <InputField label="Total project capex" value={input.totalProjectCapexUsd} suffix="USD" onChange={(v) => update("totalProjectCapexUsd", v)} />
                <InputField label="P50 capacity factor" value={input.p50CapacityFactor * 100} suffix="%" onChange={(v) => update("p50CapacityFactor", v / 100)} />
                <InputField label="Year-one PPA" value={input.yearOnePpaPricePerMwh} suffix="$/MWh" onChange={(v) => update("yearOnePpaPricePerMwh", v)} />
                <InputField label="PPA escalation" value={input.annualPpaEscalationRate * 100} suffix="%/yr" onChange={(v) => update("annualPpaEscalationRate", v / 100)} />
                <InputField label="PPA term" value={input.ppaTermYears} suffix="years" step="1" onChange={(v) => update("ppaTermYears", v)} />
                <InputField label="Annual degradation" value={input.annualDegradationRate * 100} suffix="%/yr" onChange={(v) => update("annualDegradationRate", v / 100)} />
                <InputField label="Year-one opex" value={input.yearOneOpexUsd} suffix="USD" onChange={(v) => update("yearOneOpexUsd", v)} />
                <InputField label="Opex escalation" value={input.annualOpexEscalationRate * 100} suffix="%/yr" onChange={(v) => update("annualOpexEscalationRate", v / 100)} />
                <InputField label="Modeled borrowing rate" value={input.debtInterestRate * 100} suffix="%" onChange={(v) => update("debtInterestRate", v / 100)} />
                <InputField label="Debt amortization" value={input.debtAmortizationYears} suffix="years" step="1" onChange={(v) => { update("debtAmortizationYears", v); update("debtMaturityYears", v); }} />
                <InputField label="P50 sizing DSCR" value={input.targetP50Dscr} suffix="x" onChange={(v) => update("targetP50Dscr", v)} />
                <InputField label="LTC ceiling" value={input.maximumLtc * 100} suffix="%" onChange={(v) => update("maximumLtc", v / 100)} />
                <InputField label="DSRA" value={input.dsraMonths} suffix="months" onChange={(v) => update("dsraMonths", v)} />
                <InputField label="48E / ITC rate" value={input.itcRate * 100} suffix="%" onChange={(v) => update("itcRate", v / 100)} />
                <InputField label="ITC eligible basis" value={input.itcEligibleBasisPercent * 100} suffix="%" onChange={(v) => update("itcEligibleBasisPercent", v / 100)} />
                <InputField label="Tax-credit transfer price" value={input.itcTransferPrice} suffix="$/credit $" onChange={(v) => update("itcTransferPrice", v)} />
                <InputField label="Closing-cost allowance" value={input.closingCostsUsd} suffix="USD" onChange={(v) => update("closingCostsUsd", v)} />
              </CardContent>
            </Card>

            {error && <Card className="border-destructive/50"><CardContent className="flex gap-3 p-5 text-sm"><ShieldAlert className="h-5 w-5 shrink-0 text-destructive" /><div><p className="font-medium">Analysis unavailable</p><p className="text-muted-foreground">{error}</p><p className="mt-1 text-muted-foreground">No debt or sponsor-equity values are substituted when the backend request fails.</p></div></CardContent></Card>}

            {result && (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <ResultCard title="Bank Debt Capacity" value={money(result.finance.financingSummary.permanentDebtUsd)} detail={`${pct(result.finance.financingSummary.debtToCapex)} of project capex`}><p className="text-sm"><span className="text-muted-foreground">Binding constraint:</span> <strong>{result.finance.financingSummary.bindingConstraint}</strong></p></ResultCard>
                  <ResultCard title="Tax Credit Monetization" value={money(result.finance.taxCreditResult.netTransferProceedsUsd)} detail="Transferred 48E proceeds" />
                  <ResultCard title="Estimated Sponsor Equity" value={money(result.finance.capitalStack.sponsorEquityUsd)} detail={`${pct(result.finance.capitalStack.sponsorEquityPctTotalUses)} of total closing uses`} />
                  <ResultCard title="Financeability" value={labelize(result.assessment.financialBankability)} detail={`Assessment: ${labelize(result.assessment.status)}`} />
                  <ResultCard title="Financing Readiness" value={labelize(result.assessment.financingReadiness)} detail={result.assessment.missingInputs.length ? `${result.assessment.missingInputs.length} underwriting fact(s) still incomplete` : "No material underwriting facts missing"} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card><CardHeader><CardTitle>Why this debt capacity?</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span>DSCR-sized debt</span><strong>{money(result.finance.financingSummary.dscrSizedDebtUsd)}</strong></div><div className="flex justify-between"><span>LTC ceiling</span><strong>{money(result.finance.financingSummary.ltcDebtLimitUsd)}</strong></div><div className="flex justify-between border-t pt-3"><span>Selected permanent debt</span><strong>{money(result.finance.financingSummary.permanentDebtUsd)}</strong></div><div className="flex justify-between"><span>Modeled interest rate</span><span>{pct(input.debtInterestRate)}</span></div><div className="flex justify-between"><span>Amortization</span><span>{input.debtAmortizationYears} years</span></div></CardContent></Card>
                  <Card><CardHeader><CardTitle>Capital stack</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span>Total closing uses</span><strong>{money(result.finance.capitalStack.totalClosingUsesUsd)}</strong></div><div className="flex justify-between"><span>minus Permanent debt</span><span>({money(result.finance.capitalStack.permanentDebtUsd)})</span></div><div className="flex justify-between"><span>minus Tax-credit proceeds</span><span>({money(result.finance.capitalStack.netItcProceedsUsd)})</span></div><div className="flex justify-between border-t pt-3"><span>equals Sponsor equity</span><strong>{money(result.finance.capitalStack.sponsorEquityUsd)}</strong></div></CardContent></Card>
                </div>

                <Card><CardHeader><CardTitle>Lender fit</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{topLenders.length ? topLenders.map((lender) => <div key={lender.category} className="rounded-md border p-4"><div className="flex items-center justify-between gap-2"><strong>{labelize(lender.category)}</strong><span className="text-xs font-semibold">{lender.fit}</span></div><p className="mt-1 text-sm text-muted-foreground">{lender.rationale}</p></div>) : <p className="text-sm text-muted-foreground">No high- or medium-fit lender category is supported by the current policy assessment.</p>}</CardContent></Card>

                <Card><CardHeader><CardTitle>What would improve this project?</CardTitle><p className="text-sm text-muted-foreground">Each item below is a fresh backend sensitivity run against this scenario, not generic advice.</p></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{result.improvements.map((item) => <div key={item.kind} className="rounded-md border p-4"><strong>{item.label}</strong><p className="mt-1 text-sm text-muted-foreground">Debt change: {money(item.permanentDebtChangeUsd)} · Sponsor equity change: {money(item.sponsorEquityChangeUsd)} · Resulting constraint: {item.bindingConstraint}</p></div>)}</CardContent></Card>

                <Card><CardHeader className="cursor-pointer" onClick={() => setDetailsOpen((open) => !open)}><div className="flex items-center justify-between"><div><CardTitle>Detailed calculation trace</CardTitle><p className="text-sm text-muted-foreground">Backend-returned trace and source amounts. No financial calculations are performed in this UI.</p></div><ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} /></div></CardHeader>{detailsOpen && <CardContent className="space-y-4"><div className="grid gap-2 text-sm md:grid-cols-2"><div className="flex justify-between rounded border p-3"><span>Year-one revenue</span><span>{money(result.finance.formulaTrace.find((row) => row.metric === "year_1_revenue_usd")?.value)}</span></div><div className="flex justify-between rounded border p-3"><span>Year-one CFADS</span><span>{money(result.finance.yearOneCfadsUsd)}</span></div><div className="flex justify-between rounded border p-3"><span>Year-one debt service</span><span>{money(y1DebtService)}</span></div><div className="flex justify-between rounded border p-3"><span>DSCR-sized debt</span><span>{money(result.finance.financingSummary.dscrSizedDebtUsd)}</span></div><div className="flex justify-between rounded border p-3"><span>LTC ceiling</span><span>{money(result.finance.financingSummary.ltcDebtLimitUsd)}</span></div><div className="flex justify-between rounded border p-3"><span>ITC eligible basis</span><span>{money(result.finance.taxCreditResult.eligibleBasisUsd)}</span></div></div><div className="text-xs text-muted-foreground">Calculation engine {result.finance.metadata.calculationEngineVersion} · Policy {result.finance.metadata.underwritingPolicyId} {result.finance.metadata.underwritingPolicyVersion} · Scenario {result.scenarioId} · {new Date(result.analyzedAt).toLocaleString()}</div></CardContent>}</Card>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

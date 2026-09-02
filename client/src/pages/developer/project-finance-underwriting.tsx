import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Calculator, CheckCircle2, Info, Landmark, RefreshCcw } from "lucide-react";

type PreviewSummary = {
  year_1_cfads: number;
  dscr_sized_debt: number;
  permanent_debt: number;
  debt_to_capex: number;
  minimum_dscr: number | null;
  sponsor_equity: number;
  binding_constraint: string;
};

type PreviewResponse = {
  data: {
    persisted: false;
    input_hash: string;
    engine_version: string;
    analysis_type: string;
    summary: PreviewSummary;
    warnings: Array<{ code: string; message: string; year?: number }>;
    reconciliation: {
      sourcesUsesReconciled: boolean;
      debtReconciled: boolean;
    };
  };
};

type FormState = {
  projectName: string;
  capacityMw: string;
  capex: string;
  capacityFactor: string;
  degradation: string;
  projectLife: string;
  ppaPrice: string;
  ppaEscalation: string;
  ppaTerm: string;
  opex: string;
  opexEscalation: string;
  itcRate: string;
  eligibleBasis: string;
  transferPrice: string;
  debtRate: string;
  targetDscr: string;
  maxLtc: string;
  amortization: string;
  maturity: string;
  lenderFee: string;
  dsraMonths: string;
  closingCosts: string;
  downsideMultiplier: string;
};

const INITIAL: FormState = {
  projectName: "5 MW Example Solar Project",
  capacityMw: "5",
  capex: "8000000",
  capacityFactor: "0.24",
  degradation: "0.005",
  projectLife: "25",
  ppaPrice: "55",
  ppaEscalation: "0.01",
  ppaTerm: "25",
  opex: "150000",
  opexEscalation: "0.025",
  itcRate: "0.30",
  eligibleBasis: "0.95",
  transferPrice: "0.92",
  debtRate: "0.065",
  targetDscr: "1.30",
  maxLtc: "0.70",
  amortization: "18",
  maturity: "18",
  lenderFee: "0.0125",
  dsraMonths: "6",
  closingCosts: "250000",
  downsideMultiplier: "0.90",
};

const money = (value: number, compact = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 2 : 0,
    notation: compact ? "compact" : "standard",
  }).format(value);

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

function SourceBadge({ kind }: { kind: "FACT" | "ASSUMPTION" | "CUSTOM" }) {
  return <Badge variant={kind === "ASSUMPTION" ? "secondary" : "outline"}>{kind}</Badge>;
}

function Field({ label, value, onChange, source = "FACT", helper }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  source?: "FACT" | "ASSUMPTION" | "CUSTOM";
  helper?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <SourceBadge kind={source} />
      </div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" />
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {detail ? <div className="mt-1 text-sm text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

export default function ProjectFinanceUnderwriting() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [result, setResult] = useState<PreviewResponse["data"] | null>(null);

  const set = (key: keyof FormState) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const missing = useMemo(() => {
    const required: Array<[keyof FormState, string]> = [
      ["capacityMw", "Capacity"], ["capex", "Project capex"], ["capacityFactor", "P50 capacity factor"],
      ["ppaPrice", "PPA price"], ["ppaTerm", "PPA term"], ["opex", "Year-1 opex"],
      ["debtRate", "Debt rate"], ["targetDscr", "Target DSCR"], ["maxLtc", "Maximum LTC"],
    ];
    return required.filter(([key]) => !form[key].trim()).map(([, label]) => label);
  }, [form]);

  const preview = useMutation({
    mutationFn: async () => {
      const payload = {
        project: { technology: "SOLAR_PV", capacity_mw_ac: Number(form.capacityMw) },
        inputs: {
          project_name: form.projectName,
          capacity_factor_p50: Number(form.capacityFactor),
          annual_degradation_rate: Number(form.degradation),
          project_life_years: Number(form.projectLife),
          ppa_term_years: Number(form.ppaTerm),
          ppa_price_year_1_per_mwh: Number(form.ppaPrice),
          ppa_escalation_rate: Number(form.ppaEscalation),
          project_capex: Number(form.capex),
          opex_year_1: Number(form.opex),
          opex_escalation_rate: Number(form.opexEscalation),
          itc_rate: Number(form.itcRate),
          itc_eligible_basis_pct: Number(form.eligibleBasis),
          itc_transfer_price: Number(form.transferPrice),
          itc_transaction_costs: 0,
          debt_interest_rate: Number(form.debtRate),
          amortization_years: Number(form.amortization),
          debt_maturity_years: Number(form.maturity),
          target_dscr: Number(form.targetDscr),
          max_ltc: Number(form.maxLtc),
          lender_fee_rate: Number(form.lenderFee),
          dsra_months: Number(form.dsraMonths),
          closing_costs: Number(form.closingCosts),
          downside_generation_multiplier: Number(form.downsideMultiplier),
        },
      };
      const response = await apiRequest("POST", "/api/v1/calculations/preview", payload);
      return (await response.json()) as PreviewResponse;
    },
    onSuccess: (response) => setResult(response.data),
  });

  const run = () => {
    if (missing.length === 0) preview.mutate();
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Landmark className="h-4 w-4" /> Project Finance</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Indicative Underwriting</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">Understand how project cash flow, lender requirements, tax credits and financing assumptions shape debt capacity and sponsor equity.</p>
          </div>
          <Badge variant="outline">Preview · not persisted</Badge>
        </div>

        {missing.length ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{missing.length} required financial input{missing.length === 1 ? " is" : "s are"} missing</AlertTitle>
            <AlertDescription>{missing.join(", ")}</AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Calculation ready</AlertTitle>
            <AlertDescription>Financial inputs are complete enough for the deterministic preview. Full credit readiness requires project-document and counterparty facts in the persistence-backed workflow.</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Project economics</CardTitle><CardDescription>Core project, production and contracted-revenue assumptions.</CardDescription></CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Project name" value={form.projectName} onChange={set("projectName")} />
                <Field label="Capacity MW AC" value={form.capacityMw} onChange={set("capacityMw")} />
                <Field label="Total project cost (USD)" value={form.capex} onChange={set("capex")} />
                <Field label="P50 capacity factor" value={form.capacityFactor} onChange={set("capacityFactor")} helper="User-supplied production assumption in this preview." />
                <Field label="Annual degradation" value={form.degradation} onChange={set("degradation")} />
                <Field label="Project life (years)" value={form.projectLife} onChange={set("projectLife")} />
                <Field label="Year-1 PPA price ($/MWh)" value={form.ppaPrice} onChange={set("ppaPrice")} />
                <Field label="PPA escalation" value={form.ppaEscalation} onChange={set("ppaEscalation")} />
                <Field label="PPA term (years)" value={form.ppaTerm} onChange={set("ppaTerm")} />
                <Field label="Year-1 operating expense" value={form.opex} onChange={set("opex")} />
                <Field label="Opex escalation" value={form.opexEscalation} onChange={set("opexEscalation")} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Tax credits</CardTitle><CardDescription>Transferable ITC assumptions are modeled mechanically and do not constitute tax eligibility advice.</CardDescription></CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-3">
                <Field label="ITC rate" value={form.itcRate} onChange={set("itcRate")} source="ASSUMPTION" />
                <Field label="Eligible basis %" value={form.eligibleBasis} onChange={set("eligibleBasis")} source="ASSUMPTION" />
                <Field label="Transfer price" value={form.transferPrice} onChange={set("transferPrice")} source="ASSUMPTION" helper="Example: 0.92 means $0.92 per $1.00 of credit." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Debt assumptions</CardTitle><CardDescription>EcoXchange-style modeled assumptions are visible and editable. Edited values should become registered policy overrides in the persistence-backed workflow.</CardDescription></CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Interest rate" value={form.debtRate} onChange={set("debtRate")} source="ASSUMPTION" />
                <Field label="Target P50 DSCR" value={form.targetDscr} onChange={set("targetDscr")} source="ASSUMPTION" helper="CFADS divided by scheduled debt service." />
                <Field label="Maximum LTC" value={form.maxLtc} onChange={set("maxLtc")} source="ASSUMPTION" helper="A ceiling, not an entitlement to leverage." />
                <Field label="Amortization (years)" value={form.amortization} onChange={set("amortization")} source="ASSUMPTION" />
                <Field label="Maturity (years)" value={form.maturity} onChange={set("maturity")} source="ASSUMPTION" />
                <Field label="Lender fee" value={form.lenderFee} onChange={set("lenderFee")} source="ASSUMPTION" />
                <Field label="DSRA months" value={form.dsraMonths} onChange={set("dsraMonths")} source="ASSUMPTION" />
                <Field label="Closing costs" value={form.closingCosts} onChange={set("closingCosts")} source="CUSTOM" />
                <Field label="Illustrative downside multiplier" value={form.downsideMultiplier} onChange={set("downsideMultiplier")} source="ASSUMPTION" helper="Illustrative only; not an independent-engineer P90." />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <Card>
              <CardHeader><CardTitle>Base Case</CardTitle><CardDescription>Run the deterministic finance engine. No AI call is made.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={run} disabled={missing.length > 0 || preview.isPending}>
                  {preview.isPending ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                  Run Underwriting Preview
                </Button>
                <p className="text-xs text-muted-foreground">This preview is not a persisted underwriting run and does not create a financing commitment.</p>
              </CardContent>
            </Card>

            {preview.error ? (
              <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>We couldn’t complete this analysis</AlertTitle><AlertDescription>{preview.error.message}</AlertDescription></Alert>
            ) : null}

            {result ? (
              <Card>
                <CardHeader><CardTitle>Indicative result</CardTitle><CardDescription>Engine {result.engine_version}</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <Metric label="Indicative permanent debt" value={money(result.summary.permanent_debt, true)} detail={`${pct(result.summary.debt_to_capex)} of project capex`} />
                  <Metric label="Primary constraint" value={result.summary.binding_constraint === "DSCR" ? "Project cash flow / DSCR" : result.summary.binding_constraint} />
                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="Sponsor equity" value={money(result.summary.sponsor_equity, true)} />
                    <Metric label="Minimum DSCR" value={result.summary.minimum_dscr == null ? "Not available" : `${result.summary.minimum_dscr.toFixed(2)}x`} />
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">DSCR-sized debt</span><span>{money(result.summary.dscr_sized_debt, true)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Year-1 CFADS</span><span>{money(result.summary.year_1_cfads)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sources & uses</span><span>{result.reconciliation.sourcesUsesReconciled ? "Reconciled" : "Review"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Debt schedule</span><span>{result.reconciliation.debtReconciled ? "Reconciled" : "Review"}</span></div>
                  </div>
                  {result.summary.binding_constraint === "DSCR" ? (
                    <Alert><Info className="h-4 w-4" /><AlertTitle>Why isn’t debt equal to the LTC limit?</AlertTitle><AlertDescription>LTC is a maximum. Under the selected PPA, operating costs, borrowing rate and DSCR requirement, project cash flow supports less debt than the leverage ceiling permits.</AlertDescription></Alert>
                  ) : null}
                  {result.warnings.length ? (
                    <div className="space-y-2"><div className="text-sm font-medium">Warnings</div>{result.warnings.map((warning) => <div key={`${warning.code}-${warning.year ?? ""}`} className="rounded-md border p-3 text-sm"><div className="font-medium">{warning.code}</div><div className="text-muted-foreground">{warning.message}</div></div>)}</div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <p className="pb-8 text-xs text-muted-foreground">Indicative project-finance analysis based on selected assumptions. This is not a financing commitment, legal opinion, tax opinion or lender approval.</p>
      </div>
    </DashboardLayout>
  );
}

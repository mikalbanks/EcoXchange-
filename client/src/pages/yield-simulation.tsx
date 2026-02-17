import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, DollarSign, TrendingUp, BarChart3, PieChart as PieChartIcon, Calendar, Activity } from "lucide-react";
import { Link } from "wouter";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PROJECT_CONFIG = {
  name: "Tonopah Solar Array I",
  location: "Nye County, NV",
  capacity_kw: 2500,
  ppa_rate: 0.078,
  ppa_escalator: 0.02,
  rec_price: 12.5,
  total_raise: 3000000,
  num_investors: 24,
  spv: "EcoXchange Solar SPV I, LLC",
};

const MONTHLY_CF = [0.18, 0.21, 0.26, 0.30, 0.33, 0.35, 0.36, 0.34, 0.30, 0.25, 0.19, 0.16];

interface ProductionData {
  month: string;
  monthIndex: number;
  production_kwh: number;
  production_mwh: number;
  capacity_factor: number;
  irradiance_kwh_m2: number;
}

interface RevenueData extends ProductionData {
  ppa_revenue: number;
  rec_revenue: number;
  gross_revenue: number;
}

interface ExpenseBreakdown {
  om: number;
  insurance: number;
  land_lease: number;
  property_tax: number;
  debt_service: number;
  asset_mgmt: number;
  reserve: number;
  platform_fee: number;
}

interface WaterfallData extends RevenueData {
  expenses: ExpenseBreakdown;
  total_expenses: number;
  ndi: number;
}

function generateProductionData(): ProductionData[] {
  const hoursInMonth = [744, 672, 744, 720, 744, 720, 744, 744, 720, 744, 720, 744];
  return MONTHS.map((month, i) => {
    const jitter = 0.95 + Math.random() * 0.10;
    const production_kwh = PROJECT_CONFIG.capacity_kw * hoursInMonth[i] * MONTHLY_CF[i] * jitter;
    const production_mwh = production_kwh / 1000;
    return {
      month,
      monthIndex: i,
      production_kwh: Math.round(production_kwh),
      production_mwh: parseFloat(production_mwh.toFixed(1)),
      capacity_factor: parseFloat((MONTHLY_CF[i] * jitter).toFixed(3)),
      irradiance_kwh_m2: parseFloat((MONTHLY_CF[i] * jitter * 7.2).toFixed(1)),
    };
  });
}

function calculateRevenue(productionData: ProductionData[]): RevenueData[] {
  return productionData.map((d) => {
    const ppa_revenue = d.production_kwh * PROJECT_CONFIG.ppa_rate;
    const rec_revenue = d.production_mwh * PROJECT_CONFIG.rec_price;
    const gross_revenue = ppa_revenue + rec_revenue;
    return {
      ...d,
      ppa_revenue: parseFloat(ppa_revenue.toFixed(2)),
      rec_revenue: parseFloat(rec_revenue.toFixed(2)),
      gross_revenue: parseFloat(gross_revenue.toFixed(2)),
    };
  });
}

function applyWaterfall(revenueData: RevenueData[]): WaterfallData[] {
  return revenueData.map((d) => {
    const om = d.gross_revenue * 0.12;
    const insurance = d.gross_revenue * 0.035;
    const land_lease = 1800;
    const property_tax = 950;
    const debt_service = d.gross_revenue * 0.25;
    const asset_mgmt = d.gross_revenue * 0.02;
    const reserve = d.gross_revenue * 0.03;
    const platform_fee = d.gross_revenue * 0.006;
    const total_expenses = om + insurance + land_lease + property_tax + debt_service + asset_mgmt + reserve + platform_fee;
    const ndi = Math.max(0, d.gross_revenue - total_expenses);
    return {
      ...d,
      expenses: {
        om: parseFloat(om.toFixed(2)),
        insurance: parseFloat(insurance.toFixed(2)),
        land_lease: 1800,
        property_tax: 950,
        debt_service: parseFloat(debt_service.toFixed(2)),
        asset_mgmt: parseFloat(asset_mgmt.toFixed(2)),
        reserve: parseFloat(reserve.toFixed(2)),
        platform_fee: parseFloat(platform_fee.toFixed(2)),
      },
      total_expenses: parseFloat(total_expenses.toFixed(2)),
      ndi: parseFloat(ndi.toFixed(2)),
    };
  });
}

function calculateDistributions(waterfallData: WaterfallData[]) {
  const annual_ndi = waterfallData.reduce((sum, d) => sum + d.ndi, 0);
  const per_unit_annual = annual_ndi / PROJECT_CONFIG.total_raise;
  const avg_investor_stake = PROJECT_CONFIG.total_raise / PROJECT_CONFIG.num_investors;
  return {
    annual_ndi: parseFloat(annual_ndi.toFixed(2)),
    projected_yield: parseFloat((per_unit_annual * 100).toFixed(2)),
    avg_quarterly_distribution: parseFloat((annual_ndi / 4 / PROJECT_CONFIG.num_investors).toFixed(2)),
    avg_investor_stake,
    monthly_data: waterfallData,
  };
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-md p-3 text-xs font-mono shadow-lg">
      <div className="text-muted-foreground mb-2 text-[11px]">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-0.5" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{formatter ? formatter(p.value) : fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const AnimatedNumber = ({ value, format = fmt, duration = 1200 }: { value: number; format?: (n: number) => string; duration?: number }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{format(display)}</span>;
};

const PipelineStep = ({ number, label, sublabel, active, delay }: { number: string; label: string; sublabel: string; active: boolean; delay: number }) => (
  <div
    className="flex flex-col items-center gap-1.5 transition-all duration-500"
    style={{
      opacity: active ? 1 : 0.3,
      transitionDelay: `${delay}ms`,
      transform: active ? "translateY(0)" : "translateY(8px)",
    }}
  >
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-sm transition-all duration-500 ${
        active ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(115,172,32,0.3)]" : "bg-muted text-muted-foreground"
      }`}
    >
      {number}
    </div>
    <div className="text-center">
      <div className={`text-[11px] font-semibold font-mono tracking-wider ${active ? "text-foreground" : "text-muted-foreground/30"}`}>{label}</div>
      <div className={`text-[10px] mt-0.5 ${active ? "text-muted-foreground" : "text-muted-foreground/20"}`}>{sublabel}</div>
    </div>
  </div>
);

const PipelineArrow = ({ active, delay }: { active: boolean; delay: number }) => (
  <div
    className={`text-lg font-mono transition-all duration-500 -mt-4 ${active ? "text-primary" : "text-muted-foreground/10"}`}
    style={{ transitionDelay: `${delay}ms` }}
    data-testid="pipeline-arrow"
  >
    &rarr;
  </div>
);

const CHART_PRIMARY = "#73AC20";
const CHART_PRIMARY_DARK = "#5C8A1A";
const CHART_ACCENT = "#90C11B";

export default function YieldSimulationPage() {
  const [loaded, setLoaded] = useState(false);
  const [activeView, setActiveView] = useState("overview");
  const [pipelineStep, setPipelineStep] = useState(0);

  const productionData = useMemo(() => generateProductionData(), []);
  const revenueData = useMemo(() => calculateRevenue(productionData), [productionData]);
  const waterfallData = useMemo(() => applyWaterfall(revenueData), [revenueData]);
  const distributions = useMemo(() => calculateDistributions(waterfallData), [waterfallData]);

  const annualProduction = productionData.reduce((s, d) => s + d.production_mwh, 0);
  const annualRevenue = revenueData.reduce((s, d) => s + d.gross_revenue, 0);
  const annualExpenses = waterfallData.reduce((s, d) => s + d.total_expenses, 0);

  const expenseBreakdown = useMemo(() => {
    const totals: Record<string, number> = waterfallData.reduce((acc: Record<string, number>, d) => {
      Object.entries(d.expenses).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
      return acc;
    }, {});
    const labels: Record<string, string> = {
      om: "O&M", insurance: "Insurance", land_lease: "Land Lease", property_tax: "Property Tax",
      debt_service: "Debt Service", asset_mgmt: "Asset Mgmt", reserve: "Reserves", platform_fee: "Platform Fee",
    };
    const colors = [CHART_PRIMARY, CHART_PRIMARY_DARK, "#3B82F6", "#6366F1", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
    return Object.entries(totals).map(([k, v], i) => ({
      name: labels[k] || k, value: parseFloat(v.toFixed(0)), color: colors[i],
    }));
  }, [waterfallData]);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step <= 4) setPipelineStep(step);
      else clearInterval(interval);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const TABS = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "production", label: "Production", icon: Zap },
    { id: "waterfall", label: "Waterfall", icon: PieChartIcon },
    { id: "distributions", label: "Distributions", icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="border-b border-primary/10 bg-gradient-to-b from-primary/[0.04] to-transparent">
        <div className="max-w-[1200px] mx-auto px-6 md:px-8 pt-6 pb-5">
          <div className="mb-4">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-home">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </Link>
          </div>
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <Badge variant="secondary" className="mb-3 font-mono text-[10px] tracking-widest uppercase" data-testid="text-simulation-label">
                EcoXchange &middot; Yield Simulation Engine
              </Badge>
              <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-primary" data-testid="text-project-name">
                {PROJECT_CONFIG.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-project-details">
                {PROJECT_CONFIG.spv} &middot; {PROJECT_CONFIG.location} &middot; {PROJECT_CONFIG.capacity_kw} kW
              </p>
            </div>
            <div className="flex gap-1 p-1 bg-muted/50 rounded-md border border-border" data-testid="tabs-container">
              {TABS.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeView === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView(tab.id)}
                  className={`font-mono text-[11px] tracking-wide gap-1.5 ${activeView === tab.id ? "" : "text-muted-foreground"}`}
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-6 pb-2" data-testid="pipeline-visualization">
            <PipelineStep number="1" label="SCADA" sublabel="Production Data" active={pipelineStep >= 1} delay={0} />
            <PipelineArrow active={pipelineStep >= 2} delay={200} />
            <PipelineStep number="2" label="REVENUE" sublabel="PPA + RECs" active={pipelineStep >= 2} delay={400} />
            <PipelineArrow active={pipelineStep >= 3} delay={600} />
            <PipelineStep number="3" label="WATERFALL" sublabel="Expenses & Reserves" active={pipelineStep >= 3} delay={800} />
            <PipelineArrow active={pipelineStep >= 4} delay={1000} />
            <PipelineStep number="4" label="DISTRIBUTE" sublabel="Pro-Rata Yield" active={pipelineStep >= 4} delay={1200} />
          </div>
        </div>
      </div>

      <div
        className="max-w-[1200px] mx-auto px-6 md:px-8 py-6 pb-16 transition-all duration-700"
        style={{ opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)" }}
      >

        {activeView === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="kpi-cards">
              {[
                { label: "Annual Production", value: annualProduction, format: (v: number) => `${v.toFixed(0)} MWh`, icon: Zap, accent: CHART_PRIMARY },
                { label: "Gross Revenue", value: annualRevenue, format: fmt, icon: DollarSign, accent: "#3B82F6" },
                { label: "Net Distributable", value: distributions.annual_ndi, format: fmt, icon: TrendingUp, accent: "#F59E0B" },
                { label: "Projected Yield", value: distributions.projected_yield, format: (v: number) => `${v.toFixed(2)}%`, icon: Activity, accent: CHART_ACCENT },
              ].map((kpi, i) => (
                <Card key={i} style={{ borderTopWidth: 2, borderTopColor: kpi.accent }} data-testid={`kpi-card-${i}`}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono uppercase tracking-wider mb-2">
                      <kpi.icon className="w-3.5 h-3.5" />
                      {kpi.label}
                    </div>
                    <div className="text-2xl font-bold font-mono" style={{ color: kpi.accent }}>
                      <AnimatedNumber value={kpi.value} format={kpi.format} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card data-testid="chart-revenue-ndi">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Monthly Revenue &rarr; Net Distributable Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={waterfallData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradNDI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontFamily: "monospace", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontFamily: "monospace", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="gross_revenue" name="Gross Revenue" stroke="#3B82F6" strokeWidth={2} fill="url(#gradRevenue)" />
                    <Area type="monotone" dataKey="ndi" name="Net Distributable" stroke={CHART_PRIMARY} strokeWidth={2} fill="url(#gradNDI)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card data-testid="chart-expense-breakdown">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4" />
                    Waterfall Expense Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-5">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={expenseBreakdown} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                          {expenseBreakdown.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1.5 flex-1">
                      {expenseBreakdown.map((e, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: e.color }} />
                          <span className="text-muted-foreground flex-1">{e.name}</span>
                          <span className="font-mono font-medium text-foreground/70">{fmt(e.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="investor-distribution-preview">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Investor Distribution Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    {[
                      { label: "Total Raise", value: fmt(PROJECT_CONFIG.total_raise) },
                      { label: "Number of Investors", value: String(PROJECT_CONFIG.num_investors) },
                      { label: "Avg. Stake", value: fmt(distributions.avg_investor_stake) },
                      { label: "Projected Annual Yield", value: `${distributions.projected_yield}%`, highlight: true },
                      { label: "Avg. Quarterly Distribution", value: fmt(distributions.avg_quarterly_distribution), highlight: true },
                      { label: "Annual NDI (Total)", value: fmt(distributions.annual_ndi) },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className={`flex justify-between items-center py-2 px-3 rounded-md ${
                          row.highlight ? "bg-primary/[0.06] border border-primary/15" : ""
                        }`}
                        data-testid={`investor-row-${i}`}
                      >
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <span className={`font-mono text-sm font-semibold ${row.highlight ? "text-primary" : "text-foreground"}`}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeView === "production" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="production-kpi-cards">
              {[
                { label: "Annual Production", value: `${annualProduction.toFixed(0)} MWh`, sub: `${PROJECT_CONFIG.capacity_kw} kW nameplate` },
                { label: "Avg. Capacity Factor", value: fmtPct((productionData.reduce((s, d) => s + d.capacity_factor, 0) / 12) * 100), sub: "12-month average" },
                { label: "Peak Month", value: `${Math.max(...productionData.map(d => d.production_mwh)).toFixed(0)} MWh`, sub: productionData.find(d => d.production_mwh === Math.max(...productionData.map(x => x.production_mwh)))?.month || "" },
              ].map((kpi, i) => (
                <Card key={i}>
                  <CardContent className="pt-5 pb-4">
                    <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{kpi.label}</div>
                    <div className="text-2xl font-bold font-mono text-primary">{kpi.value}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{kpi.sub}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card data-testid="chart-production-bar">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Monthly Energy Production (MWh)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_PRIMARY} />
                        <stop offset="100%" stopColor={CHART_PRIMARY_DARK} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontFamily: "monospace", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontFamily: "monospace", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip formatter={(v: number) => `${v.toFixed(1)} MWh`} />} />
                    <Bar dataKey="production_mwh" name="Production" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="chart-capacity-factor">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Capacity Factor Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={productionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontFamily: "monospace", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontFamily: "monospace", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v*100).toFixed(0)}%`} />
                    <Tooltip content={<CustomTooltip formatter={(v: number) => `${(v*100).toFixed(1)}%`} />} />
                    <Line type="monotone" dataKey="capacity_factor" name="Capacity Factor" stroke="#F59E0B" strokeWidth={2.5} dot={{ fill: "#F59E0B", r: 4 }} activeDot={{ r: 6, fill: "#F59E0B", stroke: "hsl(var(--background))", strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === "waterfall" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="waterfall-kpi-cards">
              {[
                { label: "Gross Revenue", value: fmt(annualRevenue), accent: "#3B82F6" },
                { label: "Total Expenses", value: fmt(annualExpenses), accent: "#EF4444" },
                { label: "Net Distributable", value: fmt(distributions.annual_ndi), accent: CHART_PRIMARY },
              ].map((kpi, i) => (
                <Card key={i} style={{ borderTopWidth: 2, borderTopColor: kpi.accent }}>
                  <CardContent className="pt-5 pb-4">
                    <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{kpi.label}</div>
                    <div className="text-2xl font-bold font-mono" style={{ color: kpi.accent }}>{kpi.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card data-testid="waterfall-breakdown">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Annual Distribution Waterfall
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const items = [
                    { label: "Gross Revenue", value: annualRevenue, color: "#3B82F6", type: "income" as const },
                    ...expenseBreakdown.map(e => ({ label: e.name, value: -e.value, color: e.color, type: "expense" as const })),
                    { label: "Net Distributable Income", value: distributions.annual_ndi, color: CHART_PRIMARY, type: "result" as const },
                  ];
                  const maxVal = annualRevenue;
                  return (
                    <div className="flex flex-col gap-2">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-[140px] text-right text-[11px] font-mono text-muted-foreground flex-shrink-0">
                            {item.label}
                          </div>
                          <div className="flex-1 h-7 bg-muted/30 rounded overflow-hidden relative">
                            <div
                              className="h-full rounded flex items-center justify-end pr-2 transition-[width] duration-1000"
                              style={{
                                width: `${(Math.abs(item.value) / maxVal) * 100}%`,
                                background: item.type === "result"
                                  ? `linear-gradient(90deg, ${CHART_PRIMARY}, ${CHART_PRIMARY_DARK})`
                                  : item.type === "expense"
                                    ? `${item.color}88`
                                    : item.color,
                              }}
                            >
                              <span className={`font-mono text-[10px] font-semibold whitespace-nowrap ${
                                item.type === "result" ? "text-primary-foreground" : "text-foreground"
                              }`}>
                                {item.type === "expense" ? `\u2212${fmt(Math.abs(item.value))}` : fmt(item.value)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card data-testid="chart-monthly-expenses-ndi">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Monthly: Expenses vs Net Distributable
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={waterfallData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontFamily: "monospace", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontFamily: "monospace", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total_expenses" name="Expenses" stackId="a" fill="#EF444488" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="ndi" name="Net Distributable" stackId="a" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === "distributions" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="distribution-hero-cards">
              <Card className="border-primary/20 bg-primary/[0.04]">
                <CardContent className="pt-7 pb-6">
                  <div className="font-mono text-[10px] text-primary uppercase tracking-wider mb-2">Projected Annual Yield</div>
                  <div className="text-4xl font-bold font-mono text-primary" data-testid="text-projected-yield">
                    <AnimatedNumber value={distributions.projected_yield} format={(v: number) => `${v.toFixed(2)}%`} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Based on {annualProduction.toFixed(0)} MWh annual production @ ${PROJECT_CONFIG.ppa_rate}/kWh PPA
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-7 pb-6">
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Avg. Quarterly Distribution</div>
                  <div className="text-4xl font-bold font-mono text-foreground" data-testid="text-avg-quarterly-distribution">
                    <AnimatedNumber value={distributions.avg_quarterly_distribution} format={fmt} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Per investor &middot; {PROJECT_CONFIG.num_investors} investors &middot; {fmt(distributions.avg_investor_stake)} avg. stake
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="quarterly-schedule">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Quarterly Distribution Schedule (Simulated)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const quarters = ["Q1", "Q2", "Q3", "Q4"];
                  const qData = quarters.map((q, qi) => {
                    const months = waterfallData.slice(qi * 3, qi * 3 + 3);
                    const qNDI = months.reduce((s, m) => s + m.ndi, 0);
                    const perInvestor = qNDI / PROJECT_CONFIG.num_investors;
                    return { quarter: q, ndi: qNDI, perInvestor, production: months.reduce((s, m) => s + m.production_mwh, 0) };
                  });
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {qData.map((q, i) => (
                        <div
                          key={i}
                          className="bg-muted/30 border border-border rounded-md p-5 text-center"
                          style={{ borderLeftWidth: 3, borderLeftColor: i === 1 || i === 2 ? CHART_PRIMARY : `rgba(115, 172, 32, 0.4)` }}
                          data-testid={`quarter-card-${i}`}
                        >
                          <div className="font-mono text-sm font-bold text-foreground mb-3">{q.quarter}</div>
                          <div className="text-[11px] text-muted-foreground mb-1">Total NDI</div>
                          <div className="font-mono text-base font-semibold text-primary mb-3">{fmt(q.ndi)}</div>
                          <div className="text-[11px] text-muted-foreground mb-1">Per Investor</div>
                          <div className="font-mono text-sm font-semibold text-foreground mb-3">{fmt(q.perInvestor)}</div>
                          <div className="text-[10px] text-muted-foreground">{q.production.toFixed(0)} MWh produced</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card data-testid="chart-5year-projection">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  5-Year Cumulative Yield Projection
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const years = [1, 2, 3, 4, 5].map((y) => {
                    const escalated = distributions.annual_ndi * Math.pow(1 + PROJECT_CONFIG.ppa_escalator, y - 1);
                    return { year: `Year ${y}`, annual_ndi: parseFloat(escalated.toFixed(0)), yield_pct: parseFloat(((escalated / PROJECT_CONFIG.total_raise) * 100).toFixed(2)) };
                  });
                  const cumulative = years.reduce((acc: Array<{ year: string; annual_ndi: number; yield_pct: number; cumulative: number }>, y, i) => {
                    const prev = i > 0 ? acc[i - 1].cumulative : 0;
                    return [...acc, { ...y, cumulative: prev + y.annual_ndi }];
                  }, []);
                  return (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={cumulative} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="barGrad5yr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_PRIMARY} />
                            <stop offset="100%" stopColor={CHART_PRIMARY_DARK} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="year" tick={{ fill: "hsl(var(--muted-foreground))", fontFamily: "monospace", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontFamily: "monospace", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="cumulative" name="Cumulative Distributions" fill="url(#barGrad5yr)" radius={[4, 4, 0, 0]}>
                          {cumulative.map((_, i) => (
                            <Cell key={i} fill={`rgba(115, 172, 32, ${0.3 + i * 0.15})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-border/40 flex justify-between items-center flex-wrap gap-2" data-testid="simulation-footer">
          <span className="font-mono text-[10px] text-muted-foreground/40 tracking-wider">
            ECOXCHANGE YIELD SIMULATION &middot; SYNTHETIC DATA &middot; NOT A SECURITIES OFFERING
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/40">
            REG D 506(c) &middot; ACCREDITED INVESTORS ONLY
          </span>
        </div>
      </div>
    </div>
  );
}

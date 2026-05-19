import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  MapPin,
  Zap,
  ShieldCheck,
  Users,
  BarChart3,
  Calculator,
  Mail,
  DollarSign,
  Clock,
  Activity,
  Sun,
  Landmark,
  Building2,
} from "lucide-react";

interface FeaturedProject {
  id: string;
  name: string;
  state: string;
  county: string;
  capacityMW: number;
}

interface ScadaSummaryData {
  totalProductionMwh: number;
  totalNetRevenue: number;
  avgCapacityFactor: number;
  trailing12MonthRevenue: number;
}

interface UpcomingProject {
  id: string;
  name: string;
  location: string;
  state: string;
  capacityMW: number;
  capacityLabel: string;
  type: string;
  status: string;
  statusColor: string;
  estimatedYieldLow: number;
  estimatedYieldHigh: number;
  sourceLabel: string;
  icon: typeof Sun;
}

const upcomingProjects: UpcomingProject[] = [
  {
    id: "deptford-court",
    name: "Court at Deptford Solar",
    location: "Gloucester County",
    state: "NJ",
    capacityMW: 4.1,
    capacityLabel: "4.1 MW",
    type: "Grid-supply solar",
    status: "CSI Awarded",
    statusColor: "bg-green-600",
    estimatedYieldLow: 6,
    estimatedYieldHigh: 8,
    sourceLabel: "NJ BPU 8C Order",
    icon: Sun,
  },
  {
    id: "deptford-landfill",
    name: "Deptford Landfill Solar",
    location: "Deptford Township",
    state: "NJ",
    capacityMW: 10,
    capacityLabel: "10 MW",
    type: "Landfill brownfield solar",
    status: "CSI Awarded",
    statusColor: "bg-green-600",
    estimatedYieldLow: 5,
    estimatedYieldHigh: 7,
    sourceLabel: "NJ BPU 8C Order",
    icon: Landmark,
  },
  {
    id: "camden-municipal",
    name: "Camden Municipal Community Solar",
    location: "Camden",
    state: "NJ",
    capacityMW: 4,
    capacityLabel: "3–5 MW est.",
    type: "Municipal auto-enrollment",
    status: "RFP Active",
    statusColor: "bg-amber-500",
    estimatedYieldLow: 6,
    estimatedYieldHigh: 9,
    sourceLabel: "Camden RFP 26-04",
    icon: Building2,
  },
  {
    id: "howard-county",
    name: "Howard County Solar Portfolio",
    location: "Howard County",
    state: "MD",
    capacityMW: 5,
    capacityLabel: "~5 MW portfolio",
    type: "Landfill + canopy brownfield",
    status: "MEA Grant-Backed",
    statusColor: "bg-blue-600",
    estimatedYieldLow: 5,
    estimatedYieldHigh: 7,
    sourceLabel: "Howard County announcement",
    icon: Landmark,
  },
  {
    id: "groundswell-serp",
    name: "Groundswell Southeast Rural Power",
    location: "Southeast US",
    state: "Multi-state",
    capacityMW: 24,
    capacityLabel: "~24 MW initial",
    type: "Rural community solar",
    status: "RFP Active",
    statusColor: "bg-amber-500",
    estimatedYieldLow: 5,
    estimatedYieldHigh: 8,
    sourceLabel: "Groundswell SERP",
    icon: Sun,
  },
];

const capabilities = [
  {
    index: "01",
    title: "Compliant Offering Wrapper",
    description:
      "Launch accredited digital securities with asset-backed structures aligned to Reg D 506(c) and institutional investor norms.",
    highlight: false,
    badge: null as string | null,
  },
  {
    index: "02",
    title: "Investor Onboarding & Compliance",
    description:
      "Identity verification, accreditation checks, and AML workflows integrated into a single issuer-grade pipeline.",
    highlight: false,
    badge: null,
  },
  {
    index: "03",
    title: "Production Verification Engine",
    description:
      "Reconcile satellite irradiance and utility net-meter data into deterministic, auditable production figures—not ML-driven; full audit trail preserved.",
    highlight: true,
    badge: "Patent pending",
  },
  {
    index: "04",
    title: "Automated Yield Distribution",
    description:
      "Programmable waterfall logic and distribution rails aligned to offering documents and cap-table governance.",
    highlight: false,
    badge: null,
  },
];

function formatCompact(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function formatCurrency(num: number): string {
  return num.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden editorial-grid-dark bg-[hsl(158_83%_11%)] text-[hsl(48_28%_95%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30" aria-hidden>
        <div className="pitch-arcs" />
      </div>
      <div className="relative z-10 container mx-auto flex min-h-[78vh] flex-col px-4 pb-8 pt-16 md:pt-24">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="mb-6 font-mono text-[0.65rem] uppercase tracking-[0.35em] text-[hsl(48_28%_95%/0.55)]">
            PHYSICS-VERIFIED YIELD · DIRECT PROJECT EXPOSURE · REG D 506(C)
          </p>
          <h1
            className="mb-4 max-w-4xl font-serif text-5xl font-semibold tracking-tight md:text-7xl lg:text-8xl"
            data-testid="text-hero-title"
          >
            EcoXchange
          </h1>
          <p
            className="font-serif text-xl font-medium italic text-[hsl(48_28%_95%/0.88)] md:text-2xl"
            data-testid="text-hero-subtitle"
          >
            Physics-verified yield for accredited investors.
          </p>
          <div className="editorial-rule mx-auto my-10 max-w-xs bg-[hsl(48_28%_95%/0.25)]" />
          <p className="mb-8 max-w-xl font-mono text-[0.7rem] uppercase tracking-[0.28em] text-[hsl(48_28%_95%/0.65)]">
            A regulated digital-securities platform giving accredited investors direct,
            physics-verified yield on individual solar projects.
          </p>
          <div className="mb-8 flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[hsl(48_28%_95%/0.7)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            5 projects in active pipeline
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <a href="#signup">
              <Button size="lg" className="min-w-[220px] font-semibold" data-testid="button-hero-investor">
                Request investor access <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <a href="#pipeline">
              <Button
                size="lg"
                variant="outline"
                className="min-w-[200px] border-[hsl(48_28%_95%/0.45)] bg-transparent text-[hsl(48_28%_95%)] hover:bg-[hsl(48_28%_95%/0.08)] hover:text-[hsl(48_28%_95%)]"
                data-testid="button-hero-explore"
              >
                Explore projects →
              </Button>
            </a>
          </div>
        </div>

        <div className="relative mx-auto mt-6 min-h-[200px] w-full max-w-lg overflow-visible pb-8 pitch-plumb">
          <span className="pitch-plumb-dot" aria-hidden />
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[hsl(48_28%_95%/0.12)] pt-6 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-[hsl(48_28%_95%/0.45)] sm:flex-row sm:px-2">
          <span>EcoXchange.net</span>
          <span className="italic tracking-[0.15em] text-[hsl(48_28%_95%/0.55)]">Pre-seed · 2026 · Reg D 506(c)</span>
        </div>
      </div>
    </section>
  );
}

function YieldGapSection() {
  const stats = [
    { value: "$30.2B", label: "Tokenized real-world asset market — 420% YoY growth as accredited investors seek direct, verifiable exposure" },
    { value: "1", label: "Security per project — direct exposure, no pooling, no fund layer between investor and production" },
    { value: "99.74%", label: "Verification confidence on satellite-reconciled annual production data" },
    { value: "0", label: "Fund managers, REIT structures, or pooled-vehicle layers between investor and yield" },
  ];

  return (
    <section className="border-y border-border bg-background">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="flex flex-col justify-center border-b border-border px-6 py-16 lg:col-span-4 lg:border-b-0 lg:border-r lg:py-24 lg:pl-10 lg:pr-8 bg-secondary text-secondary-foreground">
          <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.3em] text-secondary-foreground/70">§ I — The Problem</p>
          <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">The yield gap for accredited investors.</h2>
          <p className="mt-6 font-serif text-lg italic text-secondary-foreground/85">
            Every available vehicle — pooled funds, REITs, yieldcos, Reg CF crowdfunding — delivers blended, fund-level performance.
            None can provide a deterministic, project-level return.
          </p>
          <div className="mt-8 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
            EcoXchange provides both the method and the platform.
          </div>
        </div>
        <div className="editorial-grid lg:col-span-8 px-6 py-16 lg:py-20 lg:pl-12 lg:pr-10">
          <div className="grid gap-6 md:grid-cols-2">
            {stats.map((item) => (
              <Card key={item.value} className="flex h-full flex-col border-border bg-card">
                <CardContent className="flex flex-1 flex-col p-6">
                  <div className="font-mono text-3xl font-bold text-primary tabular-nums">{item.value}</div>
                  <div className="editorial-rule-solid my-4" />
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VerificationSection() {
  return (
    <section className="border-t border-border bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mb-2 flex items-center gap-3">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">§ II — The Method</p>
        </div>
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 mb-12">
          <div>
            <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">The verification engine.</h2>
            <p className="mt-6 text-lg text-muted-foreground font-serif italic">
              A hardware-free, deterministic method that reconciles utility net-meter data against
              satellite-derived irradiance modeling — the foundation every investor distribution is built on.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: "00", label: "Hardware-free", detail: "No on-site sensors. Marginal verification cost approaches zero." },
              { icon: "01", label: "Deterministic", detail: "Double-entry reconciliation core. ML restricted to anomaly flagging only." },
              { icon: "02", label: "Auditable", detail: "Every yield figure traces back through utility meter + satellite irradiance." },
              { icon: "03", label: "Patent-pending", detail: "Provisional on file. Non-provisional conversion within 12-month window." },
            ].map((item) => (
              <Card key={item.label} className="border-border bg-card">
                <CardContent className="p-5">
                  <p className="font-mono text-[0.65rem] uppercase tracking-wider text-primary">{item.icon}</p>
                  <p className="mt-2 font-sans text-base font-bold">{item.label}</p>
                  <div className="editorial-rule-solid my-3" />
                  <p className="text-xs leading-snug text-muted-foreground">{item.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function InvestorSection() {
  const archetypes = [
    {
      icon: ShieldCheck,
      number: "01",
      title: "Self-directed retirement accounts",
      description:
        "SDIRA and Solo 401(k) holders seeking alternative yield uncorrelated with public markets. Physics-verified solar production is a genuinely new return driver for a tax-advantaged account.",
    },
    {
      icon: BarChart3,
      number: "02",
      title: "Independent RIAs",
      description:
        "Registered investment advisors building alternative-asset or climate-aligned sleeves for accredited clients. A direct, auditable yield instrument with end-to-end compliance handled on-platform.",
    },
    {
      icon: Users,
      number: "03",
      title: "Climate-mandate family offices",
      description:
        "Family office advisors and principals with an established clean energy allocation mandate. Direct project exposure with an auditable production trail — no fund-wrapper, no blended performance.",
    },
  ];

  return (
    <section className="border-t border-border bg-muted/50 py-20 editorial-grid">
      <div className="container mx-auto px-4">
        <div className="mb-2">
          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">§ III — For Investors</p>
          <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">Built for accredited investors.</h2>
        </div>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 mt-10">
          <div>
            <p className="text-lg text-muted-foreground">
              EcoXchange structures each solar project as a separate Reg D 506(c) digital security.
              One offering. One project. One auditable production trail.
            </p>
            <p className="mt-4 text-muted-foreground">
              Investors receive pro-rata distributions derived directly from verified physical output —
              not a fund manager's allocation decision, not a blended portfolio return.
              The platform handles accreditation verification, AML, suitability, and tax reporting end-to-end.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { label: "506(c)", detail: "Reg D exemption — general solicitation to verified accredited investors" },
                { label: "Direct", detail: "One security per project — your capital exposed to exactly one auditable production asset" },
                { label: "Physics", detail: "Distributions from satellite irradiance × utility meter reconciliation" },
                { label: "Handled", detail: "Accreditation, AML, suitability, and tax reporting managed on-platform" },
              ].map((item) => (
                <div key={item.label} className="rounded-md border border-border bg-card p-4">
                  <p className="font-mono text-lg font-bold text-primary">{item.label}</p>
                  <div className="editorial-rule-solid my-2" />
                  <p className="text-xs leading-snug text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <a href="#signup">
                <Button size="lg" className="font-semibold">
                  Request investor access <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground mb-4">
              This offering is designed for
            </p>
            {archetypes.map((arch) => (
              <Card key={arch.number} className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <p className="font-mono text-[0.7rem] text-primary mb-2">{arch.number}</p>
                      <arch.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-sans text-base font-bold">{arch.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{arch.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeeStructureSection() {
  const rows = [
    { label: "Origination fee (one-time, at close)", ecox: "3% of equity raised", competitor: "4–8% placement + 1–3% warrants" },
    { label: "Setup fee (one-time, at close)", ecox: "$15,000 fixed", competitor: "$80K–$250K legal + admin" },
    { label: "Servicing fee (recurring)", ecox: "1.25% of AUA / year", competitor: "$10K–$25K/yr per project" },
    { label: "Investor load charge", ecox: "None", competitor: "0–5% upfront" },
    { label: "Production verification", ecox: "Physics-based, included", competitor: "$5K–$15K/yr third-party" },
    { label: "Distribution cadence", ecox: "Monthly, USDC, auto", competitor: "Quarterly, manual, 30–90d" },
  ];

  return (
    <section className="border-t border-border bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mb-2">
          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">§ IV — Fee Structure</p>
          <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">How the fee is structured.</h2>
        </div>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 mt-10">
          <div>
            <p className="text-lg text-muted-foreground">
              EcoXchange charges three fees, <strong className="text-foreground font-semibold">all borne by the project SPV
              — not by investors directly</strong>. Investor returns are quoted net of these fees.
            </p>
            <p className="mt-4 text-muted-foreground">
              A <strong className="text-foreground font-semibold">3% origination fee</strong> and a fixed{" "}
              <strong className="text-foreground font-semibold">$15,000 setup fee</strong> are paid by the SPV at offering close
              from the capital raised. A <strong className="text-foreground font-semibold">1.25% annual servicing fee on assets
              under administration</strong> is billed monthly to the SPV thereafter — covering production verification,
              smart-contract distribution infrastructure, investor reporting, and K-1 coordination.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="rounded-md border border-primary/30 bg-primary/5 p-5">
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-primary mb-2">Origination</p>
                <p className="font-sans text-3xl font-bold text-primary">3%</p>
                <p className="mt-2 text-xs text-muted-foreground">Of equity raised. SPV pays at close.</p>
              </div>
              <div className="rounded-md border border-primary/30 bg-primary/5 p-5">
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-primary mb-2">Setup</p>
                <p className="font-sans text-3xl font-bold text-primary">$15K</p>
                <p className="mt-2 text-xs text-muted-foreground">Fixed per offering. SPV pays at close.</p>
              </div>
              <div className="rounded-md border border-primary/30 bg-primary/5 p-5">
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-primary mb-2">Servicing</p>
                <p className="font-sans text-3xl font-bold text-primary">1.25%</p>
                <p className="mt-2 text-xs text-muted-foreground">Of AUA / year. Billed monthly to SPV.</p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border overflow-hidden">
            <div className="bg-muted/50 px-5 py-3 border-b border-border">
              <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">Fee Comparison</p>
            </div>
            <div className="grid grid-cols-3 bg-muted/30 border-b border-border">
              <div className="px-4 py-2" />
              <div className="px-4 py-2 border-l border-border">
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-primary font-semibold">EcoXchange</p>
              </div>
              <div className="px-4 py-2 border-l border-border">
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">Traditional Reg D</p>
              </div>
            </div>
            {rows.map((row) => (
              <div key={row.label} className="grid grid-cols-3 border-b border-border/60 last:border-b-0">
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground">{row.label}</p>
                </div>
                <div className="px-4 py-3 border-l border-border/60">
                  <p className="text-sm font-semibold text-primary">{row.ecox}</p>
                </div>
                <div className="px-4 py-3 border-l border-border/60">
                  <p className="text-sm text-muted-foreground">{row.competitor}</p>
                </div>
              </div>
            ))}
            <div className="bg-muted/40 px-5 py-3 border-t border-border">
              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                All EcoXchange fees are paid by the project SPV, not by investors directly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedProjectSection() {
  const { data: featuredProject } = useQuery<FeaturedProject>({
    queryKey: ["/api/public/projects/featured"],
    queryFn: async () => {
      const res = await fetch("/api/public/projects/featured", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch featured project");
      return res.json();
    },
    staleTime: 120000,
  });

  const featuredProjectId = featuredProject?.id || "";

  const { data, isLoading } = useQuery<ScadaSummaryData>({
    queryKey: ["/api/public/projects", featuredProjectId, "scada", "summary"],
    queryFn: async () => {
      const res = await fetch(`/api/public/projects/${featuredProjectId}/scada/summary`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project summary");
      return res.json();
    },
    enabled: !!featuredProjectId,
    staleTime: 120000,
  });

  return (
    <section className="border-t border-border bg-muted/40 py-20 editorial-grid">
      <div className="container mx-auto px-4">
        <div className="mb-2 text-center">
          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">§ V — Verification in Action</p>
          <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">Featured solar offering</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Real operational metrics from a live project. This is what physics-verified yield looks like in practice.
          </p>
        </div>

        <Card className="mx-auto max-w-5xl overflow-hidden border-border mt-10">
          <div
            className="h-56 bg-gradient-to-b from-[hsl(158_83%_11%/0.4)] via-[hsl(158_83%_11%/0.6)] to-[hsl(158_83%_11%/0.85)]"
            aria-label="Solar project"
          />
          <CardContent className="p-6 md:p-8">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h3 className="font-serif text-2xl font-semibold" data-testid="text-featured-name">
                  {featuredProject?.name || "Featured Institutional Solar Project"}
                </h3>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {featuredProject?.county && featuredProject?.state
                      ? `${featuredProject.county}, ${featuredProject.state}`
                      : "Location TBD"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5" />
                    {featuredProject ? `${featuredProject.capacityMW.toFixed(2)} MW` : "N/A"}
                  </span>
                </p>
              </div>
              <Badge className="w-fit border-transparent font-mono text-[0.65rem] uppercase tracking-wider">Active</Badge>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-md" />
                ))}
              </div>
            ) : data ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: "Production", value: `${data.totalProductionMwh.toLocaleString()} MWh`, testid: "text-featured-production" },
                  { label: "Net revenue", value: formatCompact(data.totalNetRevenue), testid: "text-featured-revenue" },
                  { label: "Capacity factor", value: `${(data.avgCapacityFactor * 100).toFixed(1)}%`, testid: "text-featured-capacity" },
                  { label: "Trailing 12m", value: formatCompact(data.trailing12MonthRevenue), testid: "text-featured-trailing" },
                ].map((row) => (
                  <div key={row.label} className="rounded-md border border-border bg-muted/30 p-4">
                    <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">{row.label}</p>
                    <p className="mt-2 font-sans text-lg font-semibold tabular-nums" data-testid={row.testid}>
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Performance data will appear here once the first offering is live.</p>
            )}

            <div className="mt-6 flex justify-end">
              <Link href="/performance">
                <Button variant="link" className="p-0 font-semibold text-primary" data-testid="button-view-performance">
                  View full performance <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function MarketplaceSection() {
  return (
    <section id="pipeline" className="border-t border-border bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mb-2">
          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">§ VI — Project Pipeline</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">Active pipeline</h2>
            <div className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {upcomingProjects.length} projects in due diligence
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Real projects sourced from public procurement records, state incentive programs, and municipal RFPs.
            Each project is evaluated against EcoXchange's underwriting criteria before entering the offering pipeline.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {upcomingProjects.map((project) => {
            const ProjectIcon = project.icon;
            return (
              <Card key={project.id} className="border-border bg-card flex flex-col">
                <CardContent className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <ProjectIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-sans text-base font-bold leading-tight">{project.name}</h3>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {project.location}, {project.state}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="font-mono text-[0.6rem] uppercase tracking-wider">
                      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${project.statusColor}`} />
                      {project.status}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-[0.6rem] uppercase tracking-wider">
                      {project.type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded border border-border/60 bg-muted/30 p-3">
                      <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">Capacity</p>
                      <p className="mt-1 font-sans text-sm font-semibold flex items-center gap-1">
                        <Zap className="h-3 w-3 text-primary" />
                        {project.capacityLabel}
                      </p>
                    </div>
                    <div className="rounded border border-border/60 bg-muted/30 p-3">
                      <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">Est. yield</p>
                      <p className="mt-1 font-sans text-sm font-semibold text-primary">
                        {project.estimatedYieldLow}–{project.estimatedYieldHigh}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto pt-3 border-t border-border/40">
                    <p className="font-mono text-[0.55rem] uppercase tracking-wider text-muted-foreground/70">
                      Source: {project.sourceLabel}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="mt-6 text-center font-mono text-[0.6rem] text-muted-foreground/60 max-w-3xl mx-auto">
          Projected returns are estimates based on historical irradiance data and current offtake contracts.
          Past performance does not guarantee future results. This is not an offer to sell securities.
          All investments involve risk, including potential loss of principal.
        </p>
      </div>
    </section>
  );
}

function ROICalculatorSection() {
  const [investmentAmount, setInvestmentAmount] = useState(25000);
  const [selectedProjectId, setSelectedProjectId] = useState(upcomingProjects[0].id);
  const [holdingPeriod, setHoldingPeriod] = useState(10);

  const selectedProject = upcomingProjects.find((p) => p.id === selectedProjectId) || upcomingProjects[0];
  const midYield = (selectedProject.estimatedYieldLow + selectedProject.estimatedYieldHigh) / 2 / 100;
  const mgmtFee = 0.01;
  const netYield = midYield - mgmtFee;

  const annualDistribution = investmentAmount * netYield;
  const cumulativeReturn = investmentAmount * Math.pow(1 + netYield, holdingPeriod) - investmentAmount;
  const totalDistributions = annualDistribution * holdingPeriod;
  const effectiveYield = netYield * 100;

  const yearByYear = Array.from({ length: Math.min(holdingPeriod, 10) }, (_, i) => {
    const year = i + 1;
    const compoundValue = investmentAmount * Math.pow(1 + netYield, year);
    const totalDist = annualDistribution * year;
    return { year, compoundValue, totalDist };
  });

  return (
    <section className="border-t border-border bg-muted/40 py-20">
      <div className="container mx-auto px-4">
        <div className="mb-2">
          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">§ VII — Yield Simulator</p>
          <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">Simulate your investment</h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Model hypothetical returns based on estimated project yields. Adjust your investment amount,
            select a project, and choose a holding period to see projected distributions.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 mt-10">
          <Card className="border-border bg-card">
            <CardContent className="p-6 space-y-6">
              <div>
                <label className="block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-3">
                  <DollarSign className="inline h-3 w-3 mr-1" />
                  Investment amount
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1000}
                    max={500000}
                    step={1000}
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="min-w-[100px] text-right font-mono text-lg font-bold text-primary tabular-nums">
                    {formatCurrency(investmentAmount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-3">
                  <Activity className="inline h-3 w-3 mr-1" />
                  Select project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {upcomingProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.estimatedYieldLow}–{p.estimatedYieldHigh}% est. yield
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-3">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Holding period: {holdingPeriod} {holdingPeriod === 1 ? "year" : "years"}
                </label>
                <input
                  type="range"
                  min={1}
                  max={25}
                  step={1}
                  value={holdingPeriod}
                  onChange={(e) => setHoldingPeriod(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[0.6rem] text-muted-foreground/60 mt-1">
                  <span>1 yr</span>
                  <span>25 yrs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Est. annual distribution", value: formatCurrency(annualDistribution), sub: `After 1% mgmt fee` },
                { label: "Effective net yield", value: `${effectiveYield.toFixed(1)}%`, sub: `Mid-range minus 1% fee` },
                { label: `Total distributions (${holdingPeriod}yr)`, value: formatCurrency(totalDistributions), sub: "Simple cumulative" },
                { label: `Compound return (${holdingPeriod}yr)`, value: formatCurrency(cumulativeReturn), sub: "Reinvested distributions" },
              ].map((item) => (
                <Card key={item.label} className="border-border bg-card">
                  <CardContent className="p-4">
                    <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">{item.label}</p>
                    <p className="mt-2 font-sans text-xl font-bold text-primary tabular-nums">{item.value}</p>
                    <p className="mt-1 text-[0.6rem] text-muted-foreground/70">{item.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-3">
                  Year-by-year projection (first {yearByYear.length} years)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60">
                        <th className="py-2 text-left font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">Year</th>
                        <th className="py-2 text-right font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">Cumulative dist.</th>
                        <th className="py-2 text-right font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">Compound value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearByYear.map((row) => (
                        <tr key={row.year} className="border-b border-border/30">
                          <td className="py-1.5 tabular-nums">{row.year}</td>
                          <td className="py-1.5 text-right tabular-nums text-muted-foreground">{formatCurrency(row.totalDist)}</td>
                          <td className="py-1.5 text-right tabular-nums font-semibold text-primary">{formatCurrency(row.compoundValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 rounded-md border border-amber-500/30 bg-amber-500/5 p-5 max-w-4xl mx-auto">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Important:</strong> This calculator provides hypothetical projections for
            illustrative purposes only. Actual returns depend on project performance, market conditions, and regulatory
            factors. These projections do not constitute an offer to sell securities or a solicitation of an offer to buy
            securities. All investments involve risk, including potential loss of principal. EcoXchange offerings are
            restricted to verified accredited investors under Reg D 506(c). Past performance and projections do not
            guarantee future results.
          </p>
        </div>
      </div>
    </section>
  );
}

function CapabilitiesSection() {
  return (
    <section className="border-t border-border bg-secondary py-20 text-secondary-foreground editorial-grid-dark">
      <div className="container mx-auto px-4">
        <div className="mb-14 max-w-4xl">
          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-secondary-foreground/60">§ VIII — Platform</p>
          <h2 className="font-serif text-4xl font-semibold tracking-tight text-secondary-foreground md:text-5xl">
            One platform. Four integrated capabilities.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {capabilities.map((cap) => (
            <Card
              key={cap.index}
              className={
                cap.highlight
                  ? "border-primary bg-primary text-primary-foreground shadow-none"
                  : "border-[hsl(48_28%_95%/0.12)] bg-[hsl(158_55%_14%)] text-[hsl(48_28%_95%)] shadow-none"
              }
            >
              <CardContent className="flex h-full min-h-[280px] flex-col p-6">
                <span className="font-mono text-xs opacity-80">{cap.index}</span>
                <h3 className="mt-4 font-sans text-sm font-bold uppercase tracking-[0.12em]">{cap.title}</h3>
                <div className={cap.highlight ? "editorial-rule-solid my-4 bg-primary-foreground/25" : "editorial-rule-solid my-4 bg-[hsl(48_28%_95%/0.15)]"} />
                <p className={`flex-1 text-sm leading-relaxed ${cap.highlight ? "text-primary-foreground/95" : "text-[hsl(48_28%_95%/0.82)]"}`}>
                  {cap.description}
                </p>
                {cap.badge ? (
                  <p className="mt-4 font-mono text-[0.6rem] uppercase tracking-wider text-primary-foreground/90">{cap.badge}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function DeveloperSection() {
  return (
    <section className="border-t border-border bg-muted/35 py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">§ IX — For Developers</p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">For solar developers.</h2>
            <p className="mt-6 text-muted-foreground">
              The capital path EcoXchange provides to accredited investors is, by structural design,
              also a capital path for small permitted solar projects in the{" "}
              <strong className="text-foreground">$1M–$5M range</strong> — too small for institutional desks,
              too complex for retail crowdfunding.
            </p>
            <p className="mt-4 text-muted-foreground">
              Developers bring a permitted project. EcoXchange underwrites it, structures the SPV,
              runs the production backtest, and manages all investor distributions and reporting post-funding.
              No on-site verification hardware required.
            </p>
            <div className="mt-8">
              <Link href="/develop">
                <Button variant="outline">Submit a project →</Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "$1–5M", label: "Target project size" },
              { value: "0", label: "On-site sensors required" },
              { value: "3% + $15K + 1.25%", label: "Origination + setup + AUA servicing" },
              { value: "Auto", label: "Post-funding distributions" },
            ].map((metric) => (
              <Card key={metric.label} className="border-border bg-card">
                <CardContent className="p-5">
                  <p className="font-mono text-2xl font-bold text-primary">{metric.value}</p>
                  <div className="editorial-rule-solid my-3" />
                  <p className="text-xs leading-snug text-muted-foreground">{metric.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function InsightsSection() {
  return (
    <section className="border-t border-border bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="border-border bg-card">
            <CardContent className="p-8">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-serif text-2xl font-semibold">Company announcements</h3>
              </div>
              <div className="space-y-6">
                {[
                  {
                    date: "May 08, 2026",
                    title: "EcoXchange enters active due diligence on five community solar projects across NJ and MD",
                    summary: "Pipeline includes CSI-awarded grid-supply and landfill projects in New Jersey, a municipal community solar RFP in Camden, and an MEA grant-backed portfolio in Howard County, Maryland.",
                  },
                  {
                    date: "Apr 22, 2026",
                    title: "EcoXchange opens investor access applications for pilot stage",
                    summary: "Accredited investors, RIAs, and family offices may now submit access requests for the pilot offering pipeline.",
                  },
                  {
                    date: "Mar 15, 2026",
                    title: "Physics-verified yield engine reaches 99.74% reconciliation confidence",
                    summary: "Independent backtest against 8,760 hours of metered production data confirms method accuracy.",
                  },
                  {
                    date: "Feb 03, 2026",
                    title: "Reg D 506(c) structure confirmed with securities counsel",
                    summary: "EcoXchange completes offering structure review. General solicitation to verified accredited investors now permitted.",
                  },
                ].map((item) => (
                  <article key={item.title} className="border-b border-border/70 pb-5 last:border-none last:pb-0">
                    <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">{item.date}</p>
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section className="border-t border-border bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="rounded-md border border-primary/30 bg-primary px-8 py-12 text-center text-primary-foreground md:px-14 md:py-16">
          <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.35em] text-primary-foreground/60">
            REQUEST ACCESS · REG D 506(C) · VERIFIED ACCREDITED INVESTORS ONLY
          </p>
          <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">
            A short conversation.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-primary-foreground/90">
            EcoXchange is pre-offering and operates a high-touch process during the pilot stage.
            If you are an accredited investor, an RIA building an alternative sleeve, or a family office
            with a clean energy mandate — we will respond personally within two business days.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center mt-10">
            <a href="#signup">
              <Button
                variant="outline"
                className="min-w-[220px] border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                Register your interest
              </Button>
            </a>
            <Link href="/develop">
              <Button
                variant="outline"
                className="min-w-[200px] border-primary-foreground/30 bg-transparent text-primary-foreground/80 hover:bg-primary-foreground/10"
              >
                Developer submission →
              </Button>
            </Link>
          </div>
          <p className="mt-8 font-mono text-[0.6rem] text-primary-foreground/50 max-w-xl mx-auto">
            No offering is currently open. This page is for informational and pipeline-building purposes only
            and does not constitute a solicitation of securities. EcoXchange offerings are restricted to
            verified accredited investors under Reg D 506(c).
          </p>
        </div>
      </div>
    </section>
  );
}

function EmailSignupSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [investorType, setInvestorType] = useState("Accredited Investor");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Interest from ${name} (${investorType})`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nType: ${investorType}\n\nSubmitted via EcoXchange website interest form.`
    );
    window.location.href = `mailto:contact@ecoxchange.net?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  return (
    <section id="signup" className="border-t border-border bg-muted/50 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-10">
            <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
              <Mail className="inline h-3 w-3 mr-1" />
              Stay informed
            </p>
            <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">Register your interest</h2>
            <p className="mt-4 text-muted-foreground">
              Join the EcoXchange investor pipeline. We will reach out personally within two business days.
            </p>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-8">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold">Thank you</h3>
                  <p className="mt-3 text-muted-foreground">
                    Your email client should have opened with a pre-filled message.
                    If it did not, please email <a href="mailto:contact@ecoxchange.net" className="text-primary underline">contact@ecoxchange.net</a> directly.
                    We will respond within two business days.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-2">
                      Full name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-2">
                      Email address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-2">
                      I am a...
                    </label>
                    <select
                      value={investorType}
                      onChange={(e) => setInvestorType(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option>Accredited Investor</option>
                      <option>RIA / Investment Advisor</option>
                      <option>Family Office</option>
                      <option>Solar Developer</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <Button type="submit" size="lg" className="w-full font-semibold">
                    Register interest <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="mt-6 text-center font-mono text-[0.6rem] text-muted-foreground/60 max-w-xl mx-auto">
            No offering is currently open. Submitting this form does not constitute an investment or
            commitment to invest. EcoXchange offerings are restricted to verified accredited investors
            under Reg D 506(c). Contact: contact@ecoxchange.net
          </p>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  const footerLinks = [
    {
      heading: "Investors",
      links: [
        { label: "Request Access", href: "#signup" },
        { label: "How It Works", href: "#" },
        { label: "Fee Structure", href: "#" },
      ],
    },
    {
      heading: "Platform",
      links: [
        { label: "Pipeline", href: "#pipeline" },
        { label: "ROI Simulator", href: "#" },
        { label: "Verification", href: "#" },
      ],
    },
    {
      heading: "Developers",
      links: [
        { label: "Submit Project", href: "/develop" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "Announcements", href: "#" },
        { label: "Contact", href: "mailto:contact@ecoxchange.net" },
      ],
    },
  ];

  return (
    <footer className="border-t border-primary/25 bg-secondary py-12 text-secondary-foreground editorial-grid-dark">
      <div className="container mx-auto px-4">
        <p className="mb-10 border-b border-[hsl(48_28%_95%/0.12)] pb-6 text-xs italic leading-relaxed text-secondary-foreground/65">
          Disclosures: EcoXchange operates as a digital infrastructure platform. Investment offerings are subject to applicable securities regulations and
          investor qualification requirements. No offering is currently open. This page does not constitute a solicitation of securities.
        </p>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-6 lg:gap-8">
          <div className="lg:col-span-2">
            <p className="mb-4 font-sans text-lg font-bold text-primary">EcoXchange</p>
            <p className="max-w-sm text-sm text-secondary-foreground/75">
              Physics-verified yield for accredited investors. Reg D 506(c) digital securities for individual solar projects.
            </p>
            <p className="mt-4 text-sm text-secondary-foreground/60">
              <a href="mailto:contact@ecoxchange.net" className="hover:text-primary transition-colors">
                contact@ecoxchange.net
              </a>
            </p>
          </div>
          {footerLinks.map((col) => (
            <div key={col.heading}>
              <h4 className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-primary">{col.heading}</h4>
              <ul className="space-y-2 text-sm text-secondary-foreground/75">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="hover:text-primary transition-colors">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-[hsl(48_28%_95%/0.12)] pt-6 text-center">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-secondary-foreground/40">
            © 2026 EcoXchange · All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <HeroSection />
        <YieldGapSection />
        <VerificationSection />
        <InvestorSection />
        <FeeStructureSection />
        <FeaturedProjectSection />
        <MarketplaceSection />
        <ROICalculatorSection />
        <CapabilitiesSection />
        <DeveloperSection />
        <InsightsSection />
        <CtaBanner />
        <EmailSignupSection />
      </main>
      <FooterSection />
    </div>
  );
}

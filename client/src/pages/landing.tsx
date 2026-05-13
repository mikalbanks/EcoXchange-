import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  Leaf,
  TrendingUp,
  Eye,
  Network,
  MapPin,
  Zap,
  Newspaper,
  ShieldCheck,
  Users,
  BarChart3,
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

interface PublicSgtProject {
  projectId: string;
  projectName: string;
  state: string;
  county: string;
  capacityMW: number;
  health: string;
  sgtEstimated: {
    avgCapacityFactor: number;
  };
}

interface PublicSgtProjectsResponse {
  projects: PublicSgtProject[];
}

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

const inTheNews = [
  {
    publication: "Clean Finance Journal",
    date: "Apr 2026",
    title: "Institutional capital turns to tokenized solar infrastructure",
  },
  {
    publication: "Energy Markets Weekly",
    date: "Mar 2026",
    title: "How digital securities are modernizing renewable project finance",
  },
  {
    publication: "Climate Investor Review",
    date: "Feb 2026",
    title: "EcoXchange expands access to infrastructure-backed clean energy investments",
  },
];

function formatCompact(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
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
          <p className="mb-12 max-w-xl font-mono text-[0.7rem] uppercase tracking-[0.28em] text-[hsl(48_28%_95%/0.65)]">
            A regulated digital-securities platform giving accredited investors direct,
            physics-verified yield on individual solar projects.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <a href="mailto:contact@ecoxchange.net?subject=Investor%20access%20inquiry">
              <Button size="lg" className="min-w-[220px] font-semibold" data-testid="button-hero-investor">
                Request investor access <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Link href="/market">
              <Button
                size="lg"
                variant="outline"
                className="min-w-[200px] border-[hsl(48_28%_95%/0.45)] bg-transparent text-[hsl(48_28%_95%)] hover:bg-[hsl(48_28%_95%/0.08)] hover:text-[hsl(48_28%_95%)]"
                data-testid="button-hero-explore"
              >
                Explore projects →
              </Button>
            </Link>
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
              <a href="mailto:contact@ecoxchange.net?subject=Investor%20access%20inquiry">
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
    { label: "Annual management fee", ecox: "None", competitor: "1–2% / year", ecoxGood: true },
    { label: "Investor load charge", ecox: "None", competitor: "0–5% upfront", ecoxGood: true },
    { label: "Production verification", ecox: "Physics-based", competitor: "Developer self-report", ecoxGood: true },
    { label: "Yield exposure", ecox: "Direct, per-project", competitor: "Pooled, blended", ecoxGood: true },
    { label: "Compliance handled", ecox: "On-platform", competitor: "By investor / advisor", ecoxGood: true },
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
              EcoXchange charges a <strong className="text-foreground font-semibold">5% origination fee to the project SPV
              at offering close</strong> — paid from the capital raised, not from investor returns.
              Investors pay no management fee, no annual platform fee, and no load charge.
            </p>
            <p className="mt-4 text-muted-foreground">
              After close, investor distributions are calculated entirely from verified production figures.
              The origination fee is a one-time transaction charge; it does not persist as an annual drag on yield.
            </p>
            <p className="mt-4 text-muted-foreground">
              The platform retains an ongoing servicing fee from the project SPV to cover distribution
              calculation, reporting, and audit delivery. This is also borne by the project side, not by investors.
            </p>
            <div className="mt-8 rounded-md border border-primary/30 bg-primary/5 p-5">
              <p className="font-mono text-[0.65rem] uppercase tracking-wider text-primary mb-2">Origination fee</p>
              <p className="font-sans text-3xl font-bold text-primary">5%</p>
              <p className="mt-2 text-sm text-muted-foreground">Charged to project SPV at close. From capital raised. Investors pay nothing.</p>
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
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">Fund / REIT / Reg CF</p>
              </div>
            </div>
            {rows.map((row) => (
              <div key={row.label} className="grid grid-cols-3 border-b border-border/60 last:border-b-0">
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground">{row.label}</p>
                </div>
                <div className="px-4 py-3 border-l border-border/60">
                  <p className={`text-sm font-semibold ${row.ecoxGood ? "text-primary" : "text-foreground"}`}>{row.ecox}</p>
                </div>
                <div className="px-4 py-3 border-l border-border/60">
                  <p className="text-sm text-muted-foreground">{row.competitor}</p>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-3 bg-primary/5 border-t border-primary/20">
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Origination fee</p>
              </div>
              <div className="px-4 py-3 border-l border-primary/20">
                <p className="text-sm font-semibold text-primary">5% — charged to SPV at close</p>
              </div>
              <div className="px-4 py-3 border-l border-primary/20">
                <p className="text-sm text-muted-foreground">Varies — often embedded</p>
              </div>
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
            className="h-56"
            style={{
              backgroundImage:
                "linear-gradient(180deg, hsl(158 83% 11% / 0.15), hsl(158 83% 11% / 0.82)), url('https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1600&q=80')",
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
            aria-label="Solar project image"
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
                      : "California"}
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
              <p className="text-sm text-muted-foreground">Performance data loading...</p>
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

function CapabilitiesSection() {
  return (
    <section className="border-t border-border bg-secondary py-20 text-secondary-foreground editorial-grid-dark">
      <div className="container mx-auto px-4">
        <div className="mb-14 max-w-4xl">
          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-secondary-foreground/60">§ VI — Platform</p>
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
                <div className="mt-6">
                  <a
                    className={`inline-flex items-center gap-1 text-sm font-semibold hover:underline ${cap.highlight ? "text-primary-foreground" : "text-primary"}`}
                    href="/auth/login"
                  >
                    Learn more <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
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
            <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">§ VII — For Developers</p>
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
              <a href="mailto:contact@ecoxchange.net?subject=Developer%20submission">
                <Button variant="outline">Submit a project →</Button>
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "$1–5M", label: "Target project size" },
              { value: "0", label: "On-site sensors required" },
              { value: "5%", label: "Origination fee at close" },
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
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
          <Card className="border-border bg-card">
            <CardContent className="p-8">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-serif text-2xl font-semibold">Company announcements</h3>
                <Button variant="outline" size="sm">
                  View all
                </Button>
              </div>
              <div className="space-y-6">
                {[
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

          <div>
            <h3 className="font-serif text-2xl font-semibold">In the news</h3>
            <div className="mt-6 space-y-4">
              {inTheNews.map((item) => (
                <Card key={item.title}>
                  <CardContent className="p-6">
                    <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                      <Newspaper className="h-3.5 w-3.5" />
                      <span>{item.publication}</span>
                      <span aria-hidden>•</span>
                      <span>{item.date}</span>
                    </div>
                    <p className="font-semibold leading-snug">{item.title}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
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
            <a href="mailto:contact@ecoxchange.net?subject=Investor%20access%20inquiry">
              <Button
                variant="outline"
                className="min-w-[220px] border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                Investor inquiry
              </Button>
            </a>
            <a href="mailto:contact@ecoxchange.net?subject=Developer%20submission">
              <Button
                variant="outline"
                className="min-w-[200px] border-primary-foreground/30 bg-transparent text-primary-foreground/80 hover:bg-primary-foreground/10"
              >
                Developer submission →
              </Button>
            </a>
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

function FooterSection() {
  return (
    <footer className="border-t border-primary/25 bg-secondary py-12 text-secondary-foreground editorial-grid-dark">
      <div className="container mx-auto px-4">
        <p className="mb-10 border-b border-[hsl(48_28%_95%/0.12)] pb-6 text-xs italic leading-relaxed text-secondary-foreground/65">
          Disclosures: EcoXchange operates as a digital infrastructure platform. Investment offerings are subject to applicable securities regulations and
          investor qualification requirements. No offering is currently open. This page does not constitute a solicitation of securities.
        </p>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-6 lg:gap-8">
          <div className="lg:col-span-2">
            <img src="/brand/ecoxchange-logo.png" alt="EcoXchange" className="mb-4 h-10 w-auto opacity-95" data-testid="img-footer-logo" />
            <p className="max-w-sm text-sm text-secondary-foreground/75">
              Physics-verified yield for accredited investors. Reg D 506(c) digital securities for individual solar projects.
            </p>
          </div>
          {[
            { heading: "Investors", links: ["Request Access", "How It Works", "Fee Structure"] },
            { heading: "Platform", links: ["Marketplace", "Performance", "Verification"] },
            { heading: "Developers", links: ["Submit Project", "Underwriting", "SPV Structure"] },
            { heading: "Company", links: ["Announcements", "In the News", "Contact"] },
          ].map((col) => (
            <div key={col.heading}>
              <h4 className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-primary">{col.heading}</h4>
              <ul className="space-y-2 text-sm text-secondary-foreground/75">
                {col.links.map((link) => (
                  <li key={link}>{link}</li>
                ))}
              </ul>
            </div>
          ))}
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
        <CapabilitiesSection />
        <DeveloperSection />
        <InsightsSection />
        <CtaBanner />
      </main>
      <FooterSection />
    </div>
  );
}

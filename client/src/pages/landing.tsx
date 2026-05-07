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

const benefits = [
  {
    icon: Leaf,
    title: "Sustainable Impact",
    description: "Back utility-scale solar assets that deliver measurable environmental and financial outcomes.",
  },
  {
    icon: TrendingUp,
    title: "Attractive Returns",
    description: "Access income-oriented digital securities tied to contracted generation and project cash flows.",
  },
  {
    icon: Eye,
    title: "Transparent Data",
    description: "Track production, revenue, and asset health through auditable project-level analytics.",
  },
  {
    icon: Network,
    title: "Open Access",
    description: "Connect issuers, investors, and partners in one institutional-grade marketplace.",
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

const partnerLogos = ["Solcast", "Securitize", "GreenLedger", "SolarGrid", "CleanYield", "NovaInfra"];

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

const gapProblems = [
  {
    n: "01",
    title: "Small solar is underserved",
    body: "Mid-market projects lack standardized rails for compliant capital formation and ongoing investor reporting.",
  },
  {
    n: "02",
    title: "Yield claims need proof",
    body: "Performance narratives often rely on developer-reported data instead of independently reconciled production truth.",
  },
  {
    n: "03",
    title: "Institutional workflow gaps",
    body: "Investors need structured workflows—from onboarding through distributions—that match fund-grade expectations.",
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
            Professional clean energy marketplace
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
            Small solar. Verified yield. Institutional rails.
          </p>
          <div className="editorial-rule mx-auto my-10 max-w-xs bg-[hsl(48_28%_95%/0.25)]" />
          <p className="mb-12 max-w-xl font-mono text-[0.7rem] uppercase tracking-[0.28em] text-[hsl(48_28%_95%/0.65)]">
            Connect accredited investors with production-verified solar infrastructure.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/market">
              <Button size="lg" className="min-w-[200px] font-semibold" data-testid="button-hero-explore">
                Explore projects <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button
                size="lg"
                variant="outline"
                className="min-w-[200px] border-[hsl(48_28%_95%/0.45)] bg-transparent text-[hsl(48_28%_95%)] hover:bg-[hsl(48_28%_95%/0.08)] hover:text-[hsl(48_28%_95%)]"
                data-testid="button-hero-create-account"
              >
                Create account
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mx-auto mt-6 min-h-[200px] w-full max-w-lg overflow-visible pb-8 pitch-plumb">
          <span className="pitch-plumb-dot" aria-hidden />
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[hsl(48_28%_95%/0.12)] pt-6 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-[hsl(48_28%_95%/0.45)] sm:flex-row sm:px-2">
          <span>EcoXchange.net</span>
          <span className="italic tracking-[0.15em] text-[hsl(48_28%_95%/0.55)]">Pre-seed · 2026</span>
        </div>
      </div>
    </section>
  );
}

function GapSection() {
  return (
    <section className="border-y border-border bg-background">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="flex flex-col justify-center border-b border-border px-6 py-16 lg:col-span-4 lg:border-b-0 lg:border-r lg:py-24 lg:pl-10 lg:pr-8 bg-secondary text-secondary-foreground">
          <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.3em] text-secondary-foreground/70">Problem</p>
          <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">The gap.</h2>
          <p className="mt-6 font-serif text-lg italic text-secondary-foreground/85">
            $1M–$5M solar projects need compliant rails—not spreadsheets and one-off diligence packs.
          </p>
          <div className="mt-8 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
            $7B unmet capital need
          </div>
        </div>
        <div className="editorial-grid lg:col-span-8 px-6 py-16 lg:py-20 lg:pl-12 lg:pr-10">
          <div className="grid gap-6 md:grid-cols-3">
            {gapProblems.map((item) => (
              <Card key={item.n} className="flex h-full flex-col border-border bg-card">
                <CardContent className="flex flex-1 flex-col p-6">
                  <span className="font-mono text-xs text-muted-foreground">{item.n}</span>
                  <div className="editorial-rule-solid my-4" />
                  <h3 className="font-sans text-base font-bold uppercase tracking-wide text-foreground">{item.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 max-w-2xl">
          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">Why EcoXchange</p>
          <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">Built for institutional participants.</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="h-full border-border bg-card">
              <CardContent className="p-6">
                <benefit.icon className="mb-4 h-7 w-7 text-primary" aria-hidden="true" />
                <h3 className="font-sans text-lg font-bold">{benefit.title}</h3>
                <div className="editorial-rule-solid my-4 max-w-[3rem]" />
                <p className="text-sm leading-relaxed text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function OpportunitySection() {
  return (
    <section className="border-t border-border bg-muted/50 py-20 editorial-grid">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">Market</p>
            <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">A large market with an urgent opening.</h2>
            <p className="mt-6 text-lg text-muted-foreground">
              Global clean-energy investment is accelerating as utility-scale solar and storage become core infrastructure assets.
            </p>
            <p className="mt-4 text-muted-foreground">
              EcoXchange gives accredited investors a structured path to participate—with transparent reporting and project-level underwriting context.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "$1.4T+", label: "Global solar investment by 2030" },
              { value: "28%", label: "Projected solar CAGR" },
              { value: "500GW+", label: "New annual renewable capacity by decade end" },
              { value: "24/7", label: "Performance visibility and reporting" },
            ].map((metric) => (
              <Card key={metric.label} className="border-border bg-card">
                <CardContent className="p-5">
                  <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">Metric</p>
                  <p className="mt-2 font-sans text-3xl font-bold tabular-nums text-primary">{metric.value}</p>
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
    <section className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">Spotlight</p>
          <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">Featured solar offering</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Real operational metrics from a live project in the EcoXchange marketplace.
          </p>
        </div>

        <Card className="mx-auto max-w-5xl overflow-hidden border-border">
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

function ProjectsSection() {
  const { data, isLoading } = useQuery<PublicSgtProjectsResponse>({
    queryKey: ["/api/public/projects/sgt-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/public/projects/sgt-metrics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
    staleTime: 120000,
  });

  return (
    <section className="border-t border-border bg-muted/40 py-20 editorial-grid">
      <div className="container mx-auto px-4">
        <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">Marketplace</p>
            <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">Projects & offerings</h2>
            <p className="mt-2 text-muted-foreground">Evaluate active and pipeline solar opportunities in one marketplace.</p>
          </div>
          <Link href="/market">
            <Button variant="outline">Browse marketplace</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-[340px] w-full rounded-md" />
            ))}
          </div>
        ) : data?.projects?.length ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {data.projects.slice(0, 6).map((project) => (
              <Card key={project.projectId} data-testid={`card-public-project-${project.projectId}`}>
                <div
                  className="h-44"
                  style={{
                    backgroundImage:
                      "linear-gradient(180deg, hsl(158 83% 11% / 0.08), hsl(158 83% 11% / 0.75)), url('https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=1000&q=80')",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }}
                  aria-label="Project image"
                />
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h3 className="font-sans text-lg font-semibold leading-snug">{project.projectName}</h3>
                    <Badge variant="outline" className="font-mono text-[0.6rem] uppercase">
                      {project.health}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <p className="font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground">Location</p>
                    <p className="text-right font-medium">
                      {project.county}, {project.state}
                    </p>
                    <p className="font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground">Capacity</p>
                    <p className="text-right font-medium">{project.capacityMW} MW</p>
                    <p className="font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground">Target return</p>
                    <p className="text-right font-medium">{(project.sgtEstimated.avgCapacityFactor * 100).toFixed(1)}% CF</p>
                    <p className="font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground">Minimum</p>
                    <p className="text-right font-medium">$25,000</p>
                  </div>
                  <div className="mt-4 flex justify-end border-t border-border/70 pt-4">
                    <Link href="/market" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                      View project <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No approved projects with public metrics are available yet.
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

function CapabilitiesSection() {
  return (
    <section className="border-t border-border bg-secondary py-20 text-secondary-foreground editorial-grid-dark">
      <div className="container mx-auto px-4">
        <div className="mb-14 max-w-4xl">
          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-secondary-foreground/60">Solution</p>
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

function EcosystemSection() {
  return (
    <section className="bg-background py-20 editorial-grid">
      <div className="container mx-auto px-4 text-center">
        <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">Ecosystem</p>
        <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">Powered by industry partners</h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          EcoXchange integrates institutional technology and energy-data providers to power compliant digital infrastructure.
        </p>
        <div className="mx-auto mb-10 mt-12 grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {partnerLogos.map((partner) => (
            <div
              key={partner}
              className="border border-border bg-card px-3 py-5 font-mono text-[0.7rem] font-semibold uppercase tracking-wide text-foreground/90"
            >
              {partner}
            </div>
          ))}
        </div>
        <Button variant="outline">Explore ecosystem</Button>
      </div>
    </section>
  );
}

function InsightsSection() {
  return (
    <section className="border-t border-border bg-muted/35 py-20">
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
                    title: "EcoXchange expands issuer onboarding for utility-scale portfolios",
                    summary: "New issuer workflows streamline diligence, data validation, and listing readiness.",
                  },
                  {
                    date: "Mar 15, 2026",
                    title: "Performance dashboard now includes enhanced SCADA insights",
                    summary: "Investors can review production and revenue trends with greater interval transparency.",
                  },
                  {
                    date: "Feb 03, 2026",
                    title: "Partner network grows across digital asset administration",
                    summary: "Additional ecosystem integrations improve reporting and settlement operations.",
                  },
                ].map((item) => (
                  <article key={item.title} className="border-b border-border/70 pb-5 last:border-none last:pb-0">
                    <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">{item.date}</p>
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
                    <a href="#" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                      Read more <ArrowRight className="h-4 w-4" />
                    </a>
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
          <h2 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">
            Let&apos;s build the future of clean energy together.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-primary-foreground/90">
            Partner with EcoXchange to originate, structure, and scale institutional-quality solar investment opportunities.
          </p>
          <Button
            variant="outline"
            className="mt-10 border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary"
          >
            Get in touch
          </Button>
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
          investor qualification requirements.
        </p>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-6 lg:gap-8">
          <div className="lg:col-span-2">
            <img src="/brand/ecoxchange-logo.png" alt="EcoXchange" className="mb-4 h-10 w-auto opacity-95" data-testid="img-footer-logo" />
            <p className="max-w-sm text-sm text-secondary-foreground/75">
              Digital securities infrastructure for renewable energy investment marketplaces.
            </p>
          </div>
          {[
            { heading: "Marketplace", links: ["Projects", "Offerings", "Performance"] },
            { heading: "Solutions", links: ["Tokenization", "Administration", "Reporting"] },
            { heading: "Ecosystem", links: ["Partners", "Integrations", "Developers"] },
            { heading: "Insights", links: ["Announcements", "In the News", "Resources"] },
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
        <GapSection />
        <BenefitsSection />
        <OpportunitySection />
        <FeaturedProjectSection />
        <ProjectsSection />
        <CapabilitiesSection />
        <EcosystemSection />
        <InsightsSection />
        <CtaBanner />
      </main>
      <FooterSection />
    </div>
  );
}

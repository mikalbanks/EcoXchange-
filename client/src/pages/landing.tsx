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
  Sun,
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

const solutions = [
  {
    title: "Tokenization as a Service",
    description: "Launch compliant, asset-backed digital offerings for solar infrastructure portfolios.",
  },
  {
    title: "Fund Administration",
    description: "Automate investor operations, cap table governance, and distribution workflows.",
  },
  {
    title: "Digital Asset Reporting",
    description: "Unify operational telemetry and investor disclosures in a single reporting layer.",
  },
  {
    title: "Enterprise",
    description: "Deploy EcoXchange infrastructure across institutional clean-energy ecosystems.",
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

function formatCompact(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(11,29,45,0.88), rgba(11,29,45,0.62)), url('https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1800&q=80')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
        aria-hidden="true"
      />
      <div className="relative container mx-auto px-4 py-24 md:py-32">
        <div className="max-w-4xl text-white">
          <p className="text-sm md:text-base font-semibold tracking-[0.2em] uppercase text-primary-foreground/80 mb-5">
            Professional Clean Energy Marketplace
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl leading-tight font-bold mb-6" data-testid="text-hero-title">
            Invest in a cleaner future.
          </h1>
          <p className="text-base md:text-xl text-white/85 max-w-2xl mb-10" data-testid="text-hero-subtitle">
            EcoXchange connects investors with high-quality solar projects through compliant, data-transparent digital securities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/market">
              <Button size="lg" className="min-w-[210px]" data-testid="button-hero-explore">
                Explore Projects <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="lg" variant="outline" className="min-w-[210px] border-white text-white hover:bg-white hover:text-foreground" data-testid="button-hero-create-account">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="h-full">
              <CardContent className="p-6">
                <benefit.icon className="h-8 w-8 text-primary mb-4" aria-hidden="true" />
                <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
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
    <section className="py-20 bg-muted/35">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-4xl font-bold mb-5">The Solar Market Opportunity</h2>
            <p className="text-muted-foreground text-lg mb-4">
              Global clean-energy investment is accelerating as utility-scale solar and storage become core infrastructure assets.
            </p>
            <p className="text-muted-foreground">
              EcoXchange gives accredited investors a structured path to participate in growth, with transparent reporting and project-level underwriting context.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "$1.4T+", label: "Global solar investment by 2030" },
              { value: "28%", label: "Projected solar CAGR" },
              { value: "500GW+", label: "New annual renewable capacity by decade end" },
              { value: "24/7", label: "Performance visibility and reporting" },
            ].map((metric) => (
              <Card key={metric.label} className="bg-card">
                <CardContent className="p-6">
                  <p className="text-3xl font-bold text-primary mb-2">{metric.value}</p>
                  <p className="text-sm text-muted-foreground leading-snug">{metric.label}</p>
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
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Featured Solar Offering</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real operational metrics from a live project in the EcoXchange marketplace.
          </p>
        </div>

        <Card className="max-w-5xl mx-auto overflow-hidden">
          <div
            className="h-56"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(11,29,45,0.2), rgba(11,29,45,0.7)), url('https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1600&q=80')",
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
            aria-label="Solar project image"
          />
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-semibold" data-testid="text-featured-name">{featuredProject?.name || "Featured Institutional Solar Project"}</h3>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{featuredProject?.county && featuredProject?.state ? `${featuredProject.county}, ${featuredProject.state}` : "California"}</span>
                  <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5" />{featuredProject ? `${featuredProject.capacityMW.toFixed(2)} MW` : "N/A"}</span>
                </p>
              </div>
              <Badge className="w-fit">Active</Badge>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : data ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Production</p>
                  <p className="text-lg font-semibold" data-testid="text-featured-production">{data.totalProductionMwh.toLocaleString()} MWh</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Net Revenue</p>
                  <p className="text-lg font-semibold" data-testid="text-featured-revenue">{formatCompact(data.totalNetRevenue)}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Capacity Factor</p>
                  <p className="text-lg font-semibold" data-testid="text-featured-capacity">{(data.avgCapacityFactor * 100).toFixed(1)}%</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Trailing 12m</p>
                  <p className="text-lg font-semibold" data-testid="text-featured-trailing">{formatCompact(data.trailing12MonthRevenue)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Performance data loading...</p>
            )}

            <div className="mt-6 flex justify-end">
              <Link href="/performance">
                <Button variant="link" className="p-0" data-testid="button-view-performance">View Full Performance <ArrowRight className="h-4 w-4" /></Button>
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
    <section className="py-20 bg-muted/25">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="text-4xl font-bold mb-2">Projects & Offerings</h2>
            <p className="text-muted-foreground">Evaluate active and pipeline solar opportunities in one marketplace.</p>
          </div>
          <Link href="/market">
            <Button variant="outline">Browse Marketplace</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-[340px] w-full rounded-xl" />
            ))}
          </div>
        ) : data?.projects?.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {data.projects.slice(0, 6).map((project) => (
              <Card key={project.projectId} data-testid={`card-public-project-${project.projectId}`}>
                <div
                  className="h-44"
                  style={{
                    backgroundImage:
                      "linear-gradient(180deg, rgba(11,29,45,0.1), rgba(11,29,45,0.7)), url('https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=1000&q=80')",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }}
                  aria-label="Project image"
                />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="text-lg font-semibold leading-snug">{project.projectName}</h3>
                    <Badge variant="outline">{project.health}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <p className="text-muted-foreground">Location</p>
                    <p className="text-right font-medium">{project.county}, {project.state}</p>
                    <p className="text-muted-foreground">Capacity</p>
                    <p className="text-right font-medium">{project.capacityMW} MW</p>
                    <p className="text-muted-foreground">Target Return</p>
                    <p className="text-right font-medium">{(project.sgtEstimated.avgCapacityFactor * 100).toFixed(1)}% CF</p>
                    <p className="text-muted-foreground">Minimum</p>
                    <p className="text-right font-medium">$25,000</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/60 flex justify-end">
                    <Link href="/market" className="text-sm font-semibold text-primary inline-flex items-center gap-1 hover:underline">
                      View Project <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">No approved projects with public metrics are available yet.</CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

function SolutionsSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold mb-10">Solutions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {solutions.map((solution, index) => (
            <Card key={solution.title} className="relative overflow-hidden text-white min-h-[240px]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, rgba(11,29,45,0.45), rgba(11,29,45,0.88)), url('https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1000&q=80')",
                  backgroundPosition: `${20 + index * 15}% center`,
                  backgroundSize: "cover",
                }}
              />
              <CardContent className="relative z-10 p-6 h-full flex flex-col justify-end">
                <h3 className="text-xl font-semibold mb-2">{solution.title}</h3>
                <p className="text-sm text-white/85 mb-4">{solution.description}</p>
                <a className="text-sm font-semibold inline-flex items-center gap-1 hover:underline" href="/auth/login">
                  Learn More <ArrowRight className="h-4 w-4" />
                </a>
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
    <section className="py-20 bg-muted/35">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold mb-3">Powered by industry partners</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-10">
          EcoXchange integrates institutional technology and energy-data providers to power compliant digital infrastructure.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {partnerLogos.map((partner) => (
            <div key={partner} className="rounded-xl border border-border bg-card py-5 px-3 text-sm font-semibold text-foreground/85">
              {partner}
            </div>
          ))}
        </div>
        <Button variant="outline">Explore Ecosystem</Button>
      </div>
    </section>
  );
}

function InsightsSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h3 className="text-2xl font-semibold">Company Announcements</h3>
                <Button variant="outline" size="sm">View All Announcements</Button>
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
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{item.date}</p>
                    <h4 className="font-semibold mb-2">{item.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{item.summary}</p>
                    <a href="#" className="text-sm text-primary font-semibold inline-flex items-center gap-1 hover:underline">
                      Read More <ArrowRight className="h-4 w-4" />
                    </a>
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-2xl font-semibold mb-6">In the News</h3>
            <div className="space-y-4">
              {inTheNews.map((item) => (
                <Card key={item.title}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-2">
                      <Newspaper className="h-3.5 w-3.5" />
                      <span>{item.publication}</span>
                      <span>•</span>
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
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="rounded-2xl bg-primary text-primary-foreground p-10 md:p-14 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-5">Let’s build the future of clean energy together.</h2>
          <p className="text-primary-foreground/85 max-w-2xl mx-auto mb-8">
            Partner with EcoXchange to originate, structure, and scale institutional-quality solar investment opportunities.
          </p>
          <Button variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
            Get in Touch
          </Button>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="bg-[#0B1D2D] text-white pt-10 pb-12">
      <div className="container mx-auto px-4">
        <p className="text-xs text-white/70 mb-8 border-b border-white/20 pb-4">
          Disclosures: EcoXchange operates as a digital infrastructure platform. Investment offerings are subject to applicable securities regulations and investor qualification requirements.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          <div className="lg:col-span-2">
            <img src="/brand/ecoxchange-logo.png" alt="EcoXchange" className="h-10 w-auto mb-4" data-testid="img-footer-logo" />
            <p className="text-sm text-white/70">Digital securities infrastructure for renewable energy investment marketplaces.</p>
          </div>
          {[
            { heading: "Marketplace", links: ["Projects", "Offerings", "Performance"] },
            { heading: "Solutions", links: ["Tokenization", "Administration", "Reporting"] },
            { heading: "Ecosystem", links: ["Partners", "Integrations", "Developers"] },
            { heading: "Insights", links: ["Announcements", "In the News", "Resources"] },
          ].map((col) => (
            <div key={col.heading}>
              <h4 className="font-semibold mb-3">{col.heading}</h4>
              <ul className="space-y-2 text-sm text-white/70">
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
        <BenefitsSection />
        <OpportunitySection />
        <FeaturedProjectSection />
        <ProjectsSection />
        <SolutionsSection />
        <EcosystemSection />
        <InsightsSection />
        <CtaBanner />
      </main>
      <FooterSection />
    </div>
  );
}

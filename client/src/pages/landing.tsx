import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HealthBadge } from "@/components/scada";
import { 
  Sun, 
  Wind, 
  Zap, 
  Shield, 
  TrendingUp, 
  ArrowRight,
  Building2,
  Wallet,
  Lock,
  BarChart3,
  Globe,
  FileCheck,
  Layers,
  CircleDollarSign,
  Scale,
  RefreshCw,
  CheckCircle,
  MapPin,
  Activity,
} from "lucide-react";

interface ScadaSummaryData {
  totalProductionMwh: number;
  totalGrossRevenue: number;
  totalNetRevenue: number;
  avgCapacityFactor: number;
  periodsReported: number;
  trailing12MonthRevenue: number;
  provenance: {
    verificationStatus: string;
    sourceType: string;
    providerName: string | null;
    dataQuality: string;
  };
}

function formatCompact(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function FeaturedProjectSection() {
  const { data, isLoading } = useQuery<ScadaSummaryData>({
    queryKey: ["/api/public/projects", "proj3", "scada", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/public/projects/proj3/scada/summary", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 120000,
  });

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-medium text-primary">Live SCADA Data</span>
          </div>
          <h2 className="text-3xl font-bold mb-4" data-testid="text-featured-title">Featured Project</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real-time production data from Solcast Sky Oracle-verified solar installations
          </p>
        </div>

        <Card className="max-w-4xl mx-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardContent className="p-6 md:p-8 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                  <Sun className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold" data-testid="text-featured-name">Lancaster Sun Ranch</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> California</span>
                    <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> 25 MW</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <HealthBadge projectId="proj3" size="md" usePublicApi />
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
              </div>
            ) : data && data.periodsReported > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-lg bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" /> Production</p>
                    <p className="text-lg font-bold mt-1" data-testid="text-featured-production">{data.totalProductionMwh.toLocaleString()} MWh</p>
                    <p className="text-xs text-muted-foreground">{data.periodsReported} months</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Net Revenue</p>
                    <p className="text-lg font-bold mt-1" data-testid="text-featured-revenue">{formatCompact(data.totalNetRevenue)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Capacity Factor</p>
                    <p className="text-lg font-bold mt-1" data-testid="text-featured-capacity">{(data.avgCapacityFactor * 100).toFixed(1)}%</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Trailing 12m</p>
                    <p className="text-lg font-bold mt-1" data-testid="text-featured-trailing">{formatCompact(data.trailing12MonthRevenue)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                      {data.provenance.verificationStatus.replace(/_/g, " ")}
                    </Badge>
                    <span>{data.provenance.providerName || data.provenance.sourceType.replace(/_/g, " ")}</span>
                  </div>
                  <Link href="/performance">
                    <Button variant="outline" size="sm" className="gap-1" data-testid="button-view-performance">
                      View Full Performance <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Performance data loading...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-dark-green">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(115,172,32,0.15),transparent_50%)]" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <img src="/brand/ecoxchange-logo.png" alt="" className="h-4 w-auto" data-testid="img-hero-badge-logo" />
              <span className="text-sm font-medium text-primary">Digital Securities Platform</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
              Invest in Digital Renewable
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mt-2">
                Energy Securities
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4" data-testid="text-hero-subtitle">
              EcoXchange tokenizes renewable energy project SPV membership interests into regulated securities and distributes yield based on real-world energy production.
            </p>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-10">
              Asset-backed digital securities structured under Reg D 506(c) with yield from solar PPAs and contracted energy revenues.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup?role=investor">
                <Button size="lg" className="min-w-[200px] gap-2" data-testid="button-cta-investor">
                  <Wallet className="h-5 w-5" />
                  Start Investing
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/signup?role=developer">
                <Button size="lg" variant="outline" className="min-w-[200px] gap-2" data-testid="button-cta-developer">
                  <Building2 className="h-5 w-5" />
                  Tokenize a Project
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Product Pillars */}
      <section id="pillars" className="py-20 border-t border-border/40 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-pillars-title">Platform Pillars</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Five foundational pillars powering a compliant digital securities platform for renewable energy
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Layers,
                title: "Digital Securities Issuance",
                desc: "Tokenized renewable energy securities with offering management workflows, cap table tracking, and compliance gating.",
              },
              {
                icon: TrendingUp,
                title: "Yield Infrastructure",
                desc: "Revenue ingestion from projects, production-based yield calculations, automated distribution logic, and transparent reporting.",
              },
              {
                icon: Globe,
                title: "Investment Infrastructure",
                desc: "Investor onboarding, project discovery, offering participation, investor dashboards, and future secondary trading rails.",
              },
              {
                icon: Shield,
                title: "Compliance-First Architecture",
                desc: "KYC/AML verification, broker-dealer/ATS pathway, transfer agent and custodian integrations, and securities transfer restrictions.",
              },
              {
                icon: RefreshCw,
                title: "Liquidity Layer",
                desc: "Compliant secondary trading environment with programmatic transfer restrictions and holding period logic.",
                badge: "Coming Soon",
              },
            ].map((pillar) => (
              <Card key={pillar.title} className="group hover-elevate relative overflow-visible">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4 group-hover:glow-lime transition-all">
                    <pillar.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{pillar.title}</h3>
                      {pillar.badge && (
                        <Badge variant="secondary" className="text-xs">{pillar.badge}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{pillar.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Asset Classes */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Asset Classes</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Digitized securities backed by diversified renewable energy infrastructure
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="group hover-elevate relative overflow-visible">
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 mx-auto mb-4 group-hover:glow-lime transition-all">
                  <Sun className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Solar</h3>
                <p className="text-sm text-muted-foreground">
                  Utility-scale and distributed solar with yield from long-term PPAs
                </p>
              </CardContent>
            </Card>
            
            <Card className="group hover-elevate relative overflow-visible">
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4 group-hover:glow-lime transition-all">
                  <Wind className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Wind</h3>
                <p className="text-sm text-muted-foreground">
                  Onshore and offshore wind farms with structured cash flow distributions
                </p>
              </CardContent>
            </Card>
            
            <Card className="group hover-elevate relative overflow-visible">
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-secondary/20 mx-auto mb-4 group-hover:glow-lime transition-all">
                  <Zap className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Storage</h3>
                <p className="text-sm text-muted-foreground">
                  Battery storage paired with solar for firm capacity and revenue stacking
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Project — Live SCADA */}
      <FeaturedProjectSection />

      {/* Sample Offering + Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Institutional-Grade Digital Securities
              </h2>
              <p className="text-muted-foreground mb-8">
                EcoXchange provides compliant infrastructure for digital securities issuance, yield distribution, and investment participation. Each project is held in a dedicated SPV (Delaware LLC) with tokenized membership interests.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: Lock, title: "Compliance-First", desc: "KYC/AML verification, broker-dealer alignment, and regulatory-aware architecture" },
                  { icon: CircleDollarSign, title: "Yield Distribution", desc: "Automated yield based on real-world energy production and PPA revenues" },
                  { icon: BarChart3, title: "Transparent Reporting", desc: "Full project dashboards with readiness scoring and capital stack visibility" },
                ].map((feature) => (
                  <div key={feature.title} className="flex gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl blur-3xl" />
              <Card className="relative">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <img 
                      src="/brand/ecoxchange-logo.png" 
                      alt="EcoXchange" 
                      className="h-10 w-auto"
                    />
                    <div>
                      <p className="font-semibold">Sample Offering</p>
                      <p className="text-sm text-muted-foreground">Imperial Valley Solar I</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Target Raise</span>
                      <span className="font-medium" data-testid="text-sample-target-raise">$13,800,000</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Min Investment</span>
                      <span className="font-medium" data-testid="text-sample-min-investment">$25,000</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Expected Yield (IRR)</span>
                      <span className="font-medium text-primary" data-testid="text-sample-irr">8.5%</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Yield Basis</span>
                      <span className="font-medium">Solar PPA Revenue</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Distribution</span>
                      <span className="font-medium">Quarterly</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Security Type</span>
                      <span className="font-medium">Revenue-Share Token</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      Securities are asset-backed and yield-generating. Secondary trading is simulated in the MVP and will become compliant live trading in later phases.
                    </p>
                  </div>
                  
                  <Button className="w-full mt-4" disabled>
                    View Offering Details
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-card/30 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A streamlined, compliance-first process for both issuers and investors
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">For Issuers</h3>
                </div>
                <ol className="space-y-4">
                  {[
                    "Register and complete issuer profile with KYC/AML",
                    "Tokenize your renewable energy project and define security terms",
                    "Run compliance checks and obtain readiness score",
                    "Upload data room documents and complete checklist",
                    "List offering for qualified investors",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Wallet className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">For Investors</h3>
                </div>
                <ol className="space-y-4">
                  {[
                    "Register and complete investor KYC/AML verification",
                    "Browse offerings and review project dashboards",
                    "Invest in digital securities with structured yield",
                    "Receive yield distributions based on energy production",
                    "Trade securities on compliant secondary market (future)",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Audience / Phases */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Who Can Invest</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              EcoXchange currently serves accredited investors with plans to expand access through compliant regulatory frameworks
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="border-primary/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Available Now</h3>
                  <Badge variant="default" className="ml-auto">Phase 1</Badge>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" /> Accredited investors</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" /> Family offices</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" /> Climate funds</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" /> High-net-worth individuals</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-muted/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Scale className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">Coming Soon</h3>
                  <Badge variant="secondary" className="ml-auto">Phase 2+</Badge>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5 shrink-0" /> Non-accredited investors (Reg CF/Reg A+)</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5 shrink-0" /> Retail investors</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5 shrink-0" /> Climate-aligned individuals seeking yield</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5 shrink-0" /> Secondary market trading</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-roadmap-title">Platform Roadmap</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A phased execution strategy from digital securities platform to fully regulated marketplace
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                phase: "Phase 1",
                status: "Live",
                statusColor: "text-primary",
                items: [
                  "Accredited investors only",
                  "Private offerings (Reg D 506(c))",
                  "Simulated secondary liquidity",
                  "Yield calculation engine",
                  "KYC/AML verification",
                ],
              },
              {
                phase: "Phase 2",
                status: "Upcoming",
                statusColor: "text-muted-foreground",
                items: [
                  "Real yield distribution",
                  "Transfer agent integration",
                  "Custodian integration",
                  "Structured SPV offerings",
                  "Enhanced reporting dashboards",
                ],
              },
              {
                phase: "Phase 3",
                status: "Future",
                statusColor: "text-muted-foreground",
                items: [
                  "Reg CF / Reg A+ pathways",
                  "Non-accredited investor access",
                  "ATS integration or licensing",
                  "Compliant secondary marketplace",
                  "Programmatic transfer restrictions",
                ],
              },
            ].map((phase) => (
              <Card key={phase.phase}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">{phase.phase}</h3>
                    <span className={`text-sm font-medium ${phase.statusColor}`}>{phase.status}</span>
                  </div>
                  <ul className="space-y-3">
                    {phase.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <FileCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join the compliant platform connecting renewable energy infrastructure with qualified investors.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="min-w-[180px]" data-testid="button-cta-signup">
                  Create Account
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline" className="min-w-[180px]">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance & Regulatory Footnotes */}
      <section id="compliance" className="py-12 border-t border-border/40 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Regulatory & Compliance</h3>
            <div className="space-y-3 text-xs text-muted-foreground">
              <p>
                EcoXchange is pursuing broker-dealer and ATS partnerships, transfer agent and custodian integrations, and will enforce securities transfer restrictions programmatically. Until those integrations are live, secondary trading is simulated and only accredited investors may participate.
              </p>
              <p>
                All offerings on EcoXchange comply with relevant securities exemptions. Phase 1 operates under Reg D 506(c) for accredited investors with general solicitation permitted. Future phases will introduce Reg CF and Reg A+ pathways for broader investor access, subject to regulatory approvals and BD/funding portal partnerships.
              </p>
              <p>
                Securities offered through EcoXchange are asset-backed and yield-generating. All participants must complete KYC/AML verification. This platform is not a broker-dealer or investment advisor. Investment involves risk, including possible loss of principal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/brand/ecoxchange-logo.png" 
                alt="EcoXchange" 
                className="h-8 w-auto"
                data-testid="img-footer-logo"
              />
              <span className="text-sm text-muted-foreground">Digital Securities Platform</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <Link href="/auth/login" className="hover:text-foreground transition-colors" data-testid="link-footer-login">Sign In</Link>
              <Link href="/auth/signup" className="hover:text-foreground transition-colors">Create Account</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-footer-privacy">Privacy Policy</Link>
              <span>© 2026 EcoXchange, Inc.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

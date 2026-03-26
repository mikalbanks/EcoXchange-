import { Header } from "@/components/header";
import { ScadaSummaryCards, ProductionChart, ForecastChart, RevenueBridgeWaterfall, HealthBadge } from "@/components/scada";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenancePanel, type ScadaProvenance } from "@/components/scada/provenance-panel";
import { Sun, MapPin, Zap, ArrowRight, BarChart3 } from "lucide-react";

const FEATURED_PROJECT_ID = "proj3";

interface ScadaSummary {
  totalProductionMwh: number;
  totalGrossRevenue: number;
  totalNetRevenue: number;
  totalDistributed: number;
  avgCapacityFactor: number;
  periodsReported: number;
  annualizedProductionMwh: number;
  trailing12MonthRevenue: number;
  provenance: ScadaProvenance;
}

export default function PerformancePage() {
  const { data: summary, isLoading } = useQuery<ScadaSummary>({
    queryKey: ["/api/public/projects", FEATURED_PROJECT_ID, "scada", "summary"],
    queryFn: async () => {
      const res = await fetch(`/api/public/projects/${FEATURED_PROJECT_ID}/scada/summary`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 60000,
  });

  return (
    <div className="min-h-screen bg-gradient-dark-green">
      <Header />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(115,172,32,0.12),transparent_50%)]" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Live Performance Data</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" data-testid="text-performance-title">
              Project Performance
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-performance-subtitle">
              Real-time SCADA telemetry from verified renewable energy projects. Production data sourced from NREL PVDAQ with full provenance tracking.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                  <Sun className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl" data-testid="text-featured-project-name">Colorado Sun CdTe I</CardTitle>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Colorado, Weld</span>
                    <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> 6.3 MW</span>
                    <span>CdTe Thin-Film Solar</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HealthBadge projectId={FEATURED_PROJECT_ID} size="md" usePublicApi />
                <Link href="/auth/signup?role=investor">
                  <Button size="sm" className="gap-1" data-testid="button-invest-featured">
                    Invest <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
        </Card>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <ScadaSummaryCards projectId={FEATURED_PROJECT_ID} showProvenance usePublicApi />
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProductionChart projectId={FEATURED_PROJECT_ID} showProvenance usePublicApi />
          <ForecastChart projectId={FEATURED_PROJECT_ID} showProvenance usePublicApi />
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <RevenueBridgeWaterfall projectId={FEATURED_PROJECT_ID} showProvenance usePublicApi />
      </section>

      <section className="container mx-auto px-4 pb-8">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : summary?.provenance ? (
          <ProvenancePanel provenance={summary.provenance} />
        ) : null}
      </section>

      <section className="container mx-auto px-4 pb-16">
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="text-xl font-bold mb-2">Ready to invest in verified renewable energy?</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              All performance data is sourced from NREL PVDAQ with full provenance tracking. Create an account to access the complete marketplace.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/auth/signup?role=investor">
                <Button size="lg" data-testid="button-performance-cta">Start Investing</Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline" data-testid="button-performance-learn-more">Learn More</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>Performance data is historical and does not guarantee future results. Securities involve risk including loss of principal.</p>
        </div>
      </footer>
    </div>
  );
}

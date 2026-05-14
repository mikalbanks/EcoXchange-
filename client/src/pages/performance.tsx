import { useMemo } from "react";
import { Header } from "@/components/header";
import { ScadaSummaryCards, ProductionChart, ForecastChart, ForecastVsActualChart, RevenueBridgeWaterfall, DistributionWaterfall, HealthBadge } from "@/components/scada";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenancePanel, type ScadaProvenance } from "@/components/scada/provenance-panel";
import { Sun, MapPin, Zap, ArrowRight, BarChart3 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DEFAULT_PROJECT_ID = "";
const LEVELTEN_Q1_2026_MARKET_REFERENCE_MWH = 64.49;

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

interface PublicSgtProject {
  projectId: string;
  projectName: string;
  state: string;
  county: string;
  technology: string;
  capacityMW: number;
}

interface PublicSgtProjectsResponse {
  projects: PublicSgtProject[];
}

export default function PerformancePage() {
  const params = useParams<{ projectId?: string }>();
  const { data: projectCatalog } = useQuery<PublicSgtProjectsResponse>({
    queryKey: ["/api/public/projects/sgt-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/public/projects/sgt-metrics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load project catalog");
      return res.json();
    },
    staleTime: 60000,
  });

  const defaultProjectId = projectCatalog?.projects?.[0]?.projectId || DEFAULT_PROJECT_ID;
  const projectId = params.projectId || defaultProjectId;
  const projectInfo = useMemo(() => {
    if (!projectCatalog?.projects?.length) return null;
    return projectCatalog.projects.find((p) => p.projectId === projectId) || projectCatalog.projects[0];
  }, [projectCatalog, projectId]);

  const { data: summary, isLoading } = useQuery<ScadaSummary>({
    queryKey: ["/api/public/projects", projectId, "scada", "summary"],
    queryFn: async () => {
      const res = await fetch(`/api/public/projects/${projectId}/scada/summary`, { credentials: "include" });
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
              Real-time SCADA telemetry powered by the SGT Pipeline — Solcast Sky Oracle satellite data, Utility Shadow net metering, and double-entry waterfall settlement.
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
                  <CardTitle className="text-xl" data-testid="text-featured-project-name">{projectInfo?.projectName || "Institutional Project"}</CardTitle>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {projectInfo ? `${projectInfo.state}, ${projectInfo.county}` : "California"}</span>
                    <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> {projectInfo ? `${projectInfo.capacityMW.toFixed(2)} MW` : "N/A"}</span>
                    <span>{projectInfo ? projectInfo.technology.replace(/_/g, " ") : "Solar"}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HealthBadge projectId={projectId} size="md" usePublicApi />
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
        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help underline decoration-dotted underline-offset-2">
                PPA Rate
              </span>
            </TooltipTrigger>
            <TooltipContent>
              LevelTen Q1 2026 institutional benchmark: ${LEVELTEN_Q1_2026_MARKET_REFERENCE_MWH.toFixed(2)}/MWh.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help underline decoration-dotted underline-offset-2">
                Market Reference
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Market reference anchored to LevelTen Q1 2026 benchmark pricing (${LEVELTEN_Q1_2026_MARKET_REFERENCE_MWH.toFixed(2)}/MWh).
            </TooltipContent>
          </Tooltip>
        </div>
        <ScadaSummaryCards projectId={projectId} showProvenance usePublicApi />
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProductionChart projectId={projectId} showProvenance usePublicApi />
          <ForecastChart projectId={projectId} showProvenance usePublicApi />
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <ForecastVsActualChart projectId={projectId} showProvenance usePublicApi />
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueBridgeWaterfall projectId={projectId} showProvenance usePublicApi />
          <DistributionWaterfall projectId={projectId} showProvenance usePublicApi />
        </div>
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
              All performance data flows through the SGT Pipeline — satellite telemetry, utility metering, and waterfall settlement with full provenance tracking.
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

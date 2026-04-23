import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery as useScadaQuery } from "@tanstack/react-query";
import { HealthBadge } from "@/components/scada";
import {
  AlertTriangle,
  Search,
  MapPin,
  Zap,
  DollarSign,
  Users,
  Filter,
  X,
  Activity,
} from "lucide-react";
import { InstitutionalProjectMetrics } from "@/components/institutional-project-metrics";

interface ScadaQuickData {
  totalProductionMwh: number;
  trailing12MonthRevenue: number;
  avgCapacityFactor: number;
}

function ScadaQuickMetrics({ projectId }: { projectId: string }) {
  const { data } = useScadaQuery<ScadaQuickData>({
    queryKey: ["/api/projects", projectId, "scada", "summary"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/scada/summary`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000,
  });

  if (!data || data.totalProductionMwh === 0) return null;

  return (
    <div className="border-t border-border pt-2 space-y-1" data-testid={`scada-metrics-${projectId}`}>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
        <Activity className="h-3 w-3 text-primary" />
        <span className="font-medium text-primary">SCADA Metrics</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground block">Production</span>
          <span className="font-medium" data-testid={`text-scada-prod-${projectId}`}>
            {data.totalProductionMwh.toLocaleString()} MWh
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">Revenue</span>
          <span className="font-medium" data-testid={`text-scada-rev-${projectId}`}>
            ${(data.trailing12MonthRevenue / 1000).toFixed(0)}K
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">Cap Factor</span>
          <span className="font-medium" data-testid={`text-scada-cf-${projectId}`}>
            {(data.avgCapacityFactor * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const STAGE_OPTIONS = [
  { value: "PRE_NTP", label: "Pre-NTP" },
  { value: "NTP", label: "NTP" },
  { value: "CONSTRUCTION", label: "Construction" },
  { value: "COD", label: "COD" },
];

const RATING_OPTIONS = [
  { value: "GREEN", label: "Green" },
  { value: "YELLOW", label: "Yellow" },
  { value: "RED", label: "Red" },
];

const OFFTAKER_OPTIONS = [
  { value: "C_AND_I", label: "C&I" },
  { value: "COMMUNITY_SOLAR", label: "Community Solar" },
  { value: "UTILITY", label: "Utility" },
  { value: "MERCHANT", label: "Merchant" },
];

interface DealProject {
  id: string;
  name: string;
  technology: string;
  stage: string;
  state: string;
  county: string;
  capacityMW: string | null;
  offtakerType: string;
  validationConfidence?: string | null;
  financialApyPct?: string | null;
  marketPpaBenchmarkUsdPerMwh?: string | null;
  readinessScore?: {
    score: number;
    rating: string;
  };
  capitalStack?: {
    totalCapex: string | null;
    equityNeeded: string | null;
  };
  totalInterest: number;
  interestCount: number;
}

function formatCurrency(value: string | number | null): string {
  if (!value) return "$0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function InvestorDeals() {
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [minMW, setMinMW] = useState<string>("");
  const [maxMW, setMaxMW] = useState<string>("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [offtakerFilter, setOfftakerFilter] = useState<string>("all");

  const { data: deals, isLoading, error } = useQuery<DealProject[]>({
    queryKey: ["/api/investor/deals"],
  });

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    return deals.filter((deal) => {
      if (stateFilter !== "all" && deal.state !== stateFilter) return false;
      if (stageFilter !== "all" && deal.stage !== stageFilter) return false;
      if (ratingFilter !== "all" && deal.readinessScore?.rating !== ratingFilter) return false;
      if (offtakerFilter !== "all" && deal.offtakerType !== offtakerFilter) return false;
      if (minMW) {
        const mw = parseFloat(deal.capacityMW || "0");
        if (mw < parseFloat(minMW)) return false;
      }
      if (maxMW) {
        const mw = parseFloat(deal.capacityMW || "0");
        if (mw > parseFloat(maxMW)) return false;
      }
      return true;
    });
  }, [deals, stateFilter, minMW, maxMW, stageFilter, ratingFilter, offtakerFilter]);

  const hasActiveFilters = stateFilter !== "all" || minMW || maxMW || stageFilter !== "all" || ratingFilter !== "all" || offtakerFilter !== "all";

  function clearFilters() {
    setStateFilter("all");
    setMinMW("");
    setMaxMW("");
    setStageFilter("all");
    setRatingFilter("all");
    setOfftakerFilter("all");
  }

  return (
    <DashboardLayout
      title="Browse Offerings"
      description="Explore approved digital securities offerings backed by renewable energy"
      breadcrumbs={[
        { label: "Overview", href: "/investor" },
        { label: "Offerings" },
      ]}
    >
      <Card className="mb-6 border-yellow-500/30 bg-yellow-500/10">
        <CardContent className="p-4 flex items-center gap-4">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
          <p className="text-sm text-yellow-500" data-testid="text-terms-banner">
            Securities offered are asset-backed and yield-generating. All investments are subject to KYC/AML verification. Secondary trading is simulated in Phase 1. Only accredited investors may currently participate.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1" data-testid="button-clear-filters">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">State</label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger data-testid="select-state-filter">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {US_STATES.map((st) => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Min MW</label>
              <Input
                type="number"
                placeholder="Min"
                value={minMW}
                onChange={(e) => setMinMW(e.target.value)}
                data-testid="input-min-mw"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Max MW</label>
              <Input
                type="number"
                placeholder="Max"
                value={maxMW}
                onChange={(e) => setMaxMW(e.target.value)}
                data-testid="input-max-mw"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Stage</label>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger data-testid="select-stage-filter">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {STAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rating</label>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger data-testid="select-rating-filter">
                  <SelectValue placeholder="All Ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  {RATING_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Offtaker</label>
              <Select value={offtakerFilter} onValueChange={setOfftakerFilter}>
                <SelectTrigger data-testid="select-offtaker-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {OFFTAKER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3 opacity-50" />
            <p className="text-destructive" data-testid="text-error-message">Failed to load deals</p>
          </CardContent>
        </Card>
      ) : !filteredDeals.length ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Search}
              title={hasActiveFilters ? "No offerings match your filters" : "No offerings available"}
              description={hasActiveFilters ? "Try adjusting your filter criteria to see more results." : "Check back later for new digital securities offerings."}
              action={
                hasActiveFilters ? (
                  <Button size="sm" variant="outline" onClick={clearFilters} data-testid="button-clear-filters-empty">
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeals.map((deal) => (
            <Link key={deal.id} href={`/investor/deals/${deal.id}`}>
              <Card
                className="hover-elevate cursor-pointer h-full"
                data-testid={`card-deal-${deal.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base" data-testid={`text-deal-name-${deal.id}`}>
                      {deal.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <HealthBadge projectId={deal.id} size="sm" />
                      {deal.readinessScore && (
                        <StatusBadge status={deal.readinessScore.rating} type="readiness" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {deal.state}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" />
                      {deal.capacityMW || "N/A"} MW
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>{deal.technology.replace(/_/g, " ")}</span>
                    <span>{deal.stage.replace(/_/g, " ")}</span>
                  </div>

                  <ScadaQuickMetrics projectId={deal.id} />

                  <InstitutionalProjectMetrics
                    variant="strip"
                    className="pt-2 border-t border-border/60"
                    testIdPrefix={deal.id}
                    validationConfidence={deal.validationConfidence}
                    financialApyPct={deal.financialApyPct}
                  />

                  <div className="border-t border-border pt-3 space-y-1.5">
                    {deal.capitalStack?.totalCapex && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Target Raise</span>
                        <span className="font-medium" data-testid={`text-deal-capex-${deal.id}`}>
                          {formatCurrency(deal.capitalStack.totalCapex)}
                        </span>
                      </div>
                    )}
                    {deal.capitalStack?.equityNeeded && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Min Investment</span>
                        <span className="font-medium" data-testid={`text-deal-equity-${deal.id}`}>
                          {formatCurrency(deal.capitalStack.equityNeeded)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm pt-1">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {deal.interestCount} interest{deal.interestCount !== 1 ? "s" : ""}
                    </span>
                    {deal.totalInterest > 0 && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatCurrency(deal.totalInterest)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

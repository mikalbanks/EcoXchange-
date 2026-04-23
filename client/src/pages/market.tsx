import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  Search,
  MapPin,
  Zap,
  ArrowRight,
  TrendingUp,
  ExternalLink,
  BarChart3,
} from "lucide-react";

interface MarketProject {
  id: string;
  name: string;
  technology: string;
  stage: string;
  state: string;
  county: string;
  capacityMW: string | null;
  summary: string | null;
  listingUrl?: string | null;
  auctionListing?: {
    bidStatus: string | null;
    statusOutcome: string | null;
    winningBid: string | null;
  } | null;
  yieldProjectionIllustrative?: {
    minimumTicketUsd: number;
    estimatedAnnualIncomeUsd: number;
    yieldPct: number;
    disclaimer: string;
  } | null;
}

export default function PublicMarketPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<MarketProject[]>({
    queryKey: ["/api/public/market/projects"],
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((p) =>
      [p.name, p.county, p.state, p.technology, p.stage].join(" ").toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="min-h-screen bg-gradient-dark-green">
      <Header />
      <main className="container mx-auto px-4 py-10 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Project Marketplace</h1>
          <p className="text-muted-foreground">
            Public project discovery with surface-level due diligence, auction outcomes, and SGT-based illustrative yield metrics.
          </p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by project, county, state, stage..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-market-search"
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-28 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : !filtered.length ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={BarChart3}
                title="No projects found"
                description="Try a different query."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Card key={p.id} className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.county}, {p.state}</span>
                    <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" />{p.capacityMW || "N/A"} MW</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{p.technology.replace(/_/g, " ")}</Badge>
                    <Badge variant="secondary">{p.stage.replace(/_/g, " ")}</Badge>
                  </div>
                  {p.yieldProjectionIllustrative && (
                    <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">SGT illustrative yield (@ ${p.yieldProjectionIllustrative.minimumTicketUsd.toLocaleString()})</span>
                        <span className="font-semibold text-primary">~{p.yieldProjectionIllustrative.yieldPct.toFixed(1)}%</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Est. annual income: ${p.yieldProjectionIllustrative.estimatedAnnualIncomeUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/market/${p.id}`}>
                      <Button size="sm" className="gap-1" data-testid={`button-view-market-${p.id}`}>
                        View diligence
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    {p.listingUrl && (
                      <a href={p.listingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Listing
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

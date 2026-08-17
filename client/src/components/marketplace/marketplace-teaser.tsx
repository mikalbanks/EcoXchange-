import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, MapPin, Zap } from "lucide-react";
import { ConfidenceBadge } from "./confidence-badge";

interface MarketplaceListing {
  id: string;
  source: "PROJECT" | "QUEUE";
  name: string;
  state: string;
  county: string | null;
  technology: string | null;
  stage: string | null;
  capacityMW: number;
  ppaPriceUsdPerKwh: {
    value: number;
    confidence: "KNOWN" | "ESTIMATED" | "MARKET_PROXY";
    source: string;
  };
  irrProxyPct: {
    value: number;
    confidence: "KNOWN" | "ESTIMATED" | "MARKET_PROXY";
    source: string;
  };
  detailHref: string;
}

interface MarketplaceListResponse {
  listings: MarketplaceListing[];
  refreshedAt: string | null;
  total: number;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Refreshing…";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `Updated ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Updated ${hrs}h ago`;
  return `Updated ${Math.floor(hrs / 24)}d ago`;
}

export function MarketplaceTeaser() {
  const { data, isLoading } = useQuery<MarketplaceListResponse>({
    queryKey: ["/api/public/market/projects?limit=3"],
  });

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Live marketplace</h2>
          <p className="text-sm text-muted-foreground">
            Illustrative project candidates and market comparisons with confidence-tagged financials. No offering is currently open.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" data-testid="badge-marketplace-refreshed">
            {timeAgo(data?.refreshedAt ?? null)}
          </Badge>
          <Link href="/market">
            <Button size="sm" variant="ghost" className="gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading
          ? [...Array(3)].map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
            ))
          : (data?.listings ?? []).slice(0, 3).map((listing) => (
              <Link key={listing.id} href={listing.detailHref}>
                <Card className="h-full cursor-pointer hover-elevate" data-testid={`teaser-${listing.id}`}>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-tight">{listing.name}</h3>
                      <Badge variant={listing.source === "PROJECT" ? "default" : "secondary"} className="shrink-0">
                        {listing.source === "PROJECT" ? "Curated" : "Queue"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{listing.county ?? "—"}, {listing.state}</span>
                      <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{listing.capacityMW.toFixed(1)} MW</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t text-sm">
                      <span className="text-muted-foreground">PPA</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">${listing.ppaPriceUsdPerKwh.value.toFixed(4)}/kWh</span>
                        <ConfidenceBadge
                          confidence={listing.ppaPriceUsdPerKwh.confidence}
                          source={listing.ppaPriceUsdPerKwh.source}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Est. cash yield</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{listing.irrProxyPct.value.toFixed(1)}%</span>
                        <ConfidenceBadge
                          confidence={listing.irrProxyPct.confidence}
                          source={listing.irrProxyPct.source}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>
    </section>
  );
}

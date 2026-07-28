import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowRight } from "lucide-react";
import {
  PortfolioSummary,
  type PortfolioAnalysis,
} from "@/components/portfolio/portfolio-summary";
import { ConcentrationChart } from "@/components/portfolio/concentration-chart";

interface SharedResponse {
  portfolio: {
    id: string;
    name: string;
    targetCheckSizeUsd: string;
    updatedAt: string | null;
  };
  analysis: PortfolioAnalysis;
}

export default function SharedPortfolioPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useQuery<SharedResponse>({
    queryKey: [`/api/public/portfolio/shared/${token}`],
    enabled: !!token,
  });

  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        {isLoading ? (
          <div className="py-10 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error || !data ? (
          <Card className="my-10">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3 opacity-50" />
              <p className="text-destructive">This portfolio link is not valid.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="public-hero pt-8">
              <p className="public-eyebrow">Shared portfolio · read only</p>
              <h1 className="public-title">{data.portfolio.name}</h1>
              <p className="public-copy">
                A blended allocation across {data.analysis.positions.length} EcoXchange listings.
                Figures are illustrative and not an offer to sell securities.
              </p>
            </section>

            <section className="public-section public-section-tight space-y-4">
              <PortfolioSummary analysis={data.analysis} />
              <ConcentrationChart analysis={data.analysis} />

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-2">Positions</h3>
                  <div className="space-y-1.5">
                    {data.analysis.positions.map((p) => (
                      <div
                        key={p.listingId}
                        className="flex items-center justify-between gap-3 text-sm border-b last:border-0 py-1.5"
                        data-testid={`shared-position-${p.listingId}`}
                      >
                        <span className="min-w-0 truncate">{p.name}</span>
                        <span className="flex items-center gap-4 shrink-0 font-mono text-xs">
                          <span>{p.weightPct.toFixed(1)}%</span>
                          <span className={p.clearsHurdle ? "" : "text-muted-foreground"}>
                            {p.cashYieldOnEquityPct.toFixed(1)}%
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Link href="/portfolio">
                <Button className="gap-1" data-testid="button-build-your-own">
                  Build your own <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import {
  AllocationBuilder,
  type Allocation,
  type BuilderListing,
} from "@/components/portfolio/allocation-builder";
import {
  PortfolioSummary,
  type PortfolioAnalysis,
} from "@/components/portfolio/portfolio-summary";
import { ConcentrationChart } from "@/components/portfolio/concentration-chart";
import { FundOptInCard } from "@/components/portfolio/fund-optin-card";
import { ArrowRight, Link2, Save } from "lucide-react";

interface MarketResponse {
  listings: BuilderListing[];
}

interface SavedPortfolio {
  id: string;
  name: string;
  shareToken: string;
}

const DEFAULT_CHECK_SIZE = 250_000;

export default function PortfolioPage() {
  const [checkSize, setCheckSize] = useState(DEFAULT_CHECK_SIZE);
  const [name, setName] = useState("My yield portfolio");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [saved, setSaved] = useState<SavedPortfolio | null>(null);

  const { data: market, isLoading } = useQuery<MarketResponse>({
    queryKey: ["/api/public/market/projects"],
  });

  const listings = useMemo(() => market?.listings ?? [], [market]);

  // Seed the builder with an equal-weight slice of the four highest-yielding
  // operating assets, so the page is useful before the investor touches it.
  useEffect(() => {
    if (allocations.length > 0 || listings.length === 0) return;
    const seed = [...listings]
      .filter((l) => l.isOperating)
      .sort((a, b) => b.cashYieldOnEquityPct.value - a.cashYieldOnEquityPct.value)
      .slice(0, 4);
    if (seed.length === 0) return;
    const w = Number((100 / seed.length).toFixed(2));
    setAllocations(seed.map((l) => ({ listingId: l.id, listingSource: l.source, weightPct: w })));
  }, [listings, allocations.length]);

  const analyze = useMutation({
    mutationFn: async (payload: { allocations: Allocation[]; targetCheckSizeUsd: number }) => {
      const res = await apiRequest("POST", "/api/public/portfolio/analyze", payload);
      return (await res.json()) as PortfolioAnalysis;
    },
    onSuccess: setAnalysis,
  });

  // Re-analyze whenever the allocation or check size settles.
  useEffect(() => {
    const t = setTimeout(() => {
      analyze.mutate({ allocations, targetCheckSizeUsd: checkSize });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocations, checkSize]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portfolios", {
        name,
        targetCheckSizeUsd: checkSize,
        allocations,
      });
      return (await res.json()) as SavedPortfolio;
    },
    onSuccess: setSaved,
  });

  const shareUrl = saved ? `${window.location.origin}/portfolio/shared/${saved.shareToken}` : null;

  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <section className="public-hero public-hero-split">
          <div>
            <p className="public-eyebrow">Portfolio construction</p>
            <h1 className="public-title">
              Yield is one number.
              <br />
              <em>Risk is five.</em>
            </h1>
            <p className="public-copy">
              Ranking assets by cash yield concentrates capital in whatever is riskiest that quarter.
              Blend positions across resource regions, offtaker types and contract expiries, and see
              what the combination is actually exposed to — or register interest in a managed sleeve
              that does it for you.
            </p>
            <div className="public-actions">
              <Link href="/market" className="public-btn public-btn-outline">
                Browse the marketplace →
              </Link>
            </div>
          </div>
          <aside className="public-hero-aside">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="portfolio-name" className="text-xs">
                    Portfolio name
                  </Label>
                  <Input
                    id="portfolio-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-portfolio-name"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="check-size" className="text-xs">
                    Capital to deploy (USD)
                  </Label>
                  <Input
                    id="check-size"
                    type="number"
                    min={0}
                    step={25000}
                    value={checkSize}
                    onChange={(e) => setCheckSize(Number(e.target.value) || 0)}
                    data-testid="input-check-size"
                  />
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => save.mutate()}
                  disabled={allocations.length === 0 || save.isPending}
                  data-testid="button-save-portfolio"
                >
                  <Save className="h-4 w-4" />
                  {save.isPending ? "Saving…" : "Save portfolio"}
                </Button>
                {save.isError && (
                  <p className="text-xs text-muted-foreground" data-testid="text-save-error">
                    Saving requires an account.{" "}
                    <Link href="/auth/login?redirect=/portfolio" className="text-primary underline">
                      Sign in
                    </Link>{" "}
                    to keep this portfolio.
                  </p>
                )}
                {shareUrl && (
                  <div className="rounded-md border p-2" data-testid="text-share-url">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                      <Link2 className="h-3 w-3" /> Read-only share link
                    </p>
                    <code className="text-[10px] break-all">{shareUrl}</code>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </section>

        <section className="public-section public-section-tight">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">Build the allocation.</h2>
          </div>

          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <AllocationBuilder
                listings={listings}
                allocations={allocations}
                hurdlePct={analysis?.hurdlePct ?? 9}
                onChange={setAllocations}
              />
              <div className="space-y-4">
                {analysis ? (
                  <>
                    <PortfolioSummary analysis={analysis} />
                    <ConcentrationChart analysis={analysis} />
                  </>
                ) : (
                  <Skeleton className="h-64 w-full" />
                )}
              </div>
            </div>
          )}
        </section>

        <section className="public-section pt-0">
          <div className="public-section-header">
            <span className="public-section-label">§ II</span>
            <h2 className="public-section-title">Or let someone else blend it.</h2>
          </div>
          <FundOptInCard sourcePortfolioId={saved?.id} />
        </section>

        <section className="public-section pt-0">
          <p className="text-xs text-muted-foreground">
            Blended figures are capital-weighted across the positions as entered. Projections apply
            each asset's modeled cash yield to its share of the capital shown and assume the yield
            holds for a full year — they are not forecasts, and they do not model curtailment,
            offtaker default, degradation beyond what is in each asset's underwriting, or the tax
            treatment of distributions. Illustrative only; not investment advice and not an offer to
            sell securities.
          </p>
          <div className="mt-4">
            <Link href="/market">
              <Button variant="outline" className="gap-1" data-testid="button-back-to-market">
                Back to the marketplace <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

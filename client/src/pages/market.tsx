import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { InvestorOnboardingWizard } from "@/components/investor-onboarding-wizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Search, MapPin, Zap, ArrowRight, ExternalLink, BarChart3 } from "lucide-react";
import { ConfidenceBadge } from "@/components/marketplace/confidence-badge";
import { ProjectImage } from "@/components/marketplace/project-image";
import { isTargetCapacity } from "@shared/benchmark";

interface FinancialField<T> {
  value: T;
  confidence: "KNOWN" | "ESTIMATED" | "MARKET_PROXY";
  source: string;
  asOf: string;
}

interface MarketplaceListing {
  id: string;
  source: "PROJECT" | "QUEUE";
  name: string;
  state: string;
  county: string | null;
  technology: string | null;
  stage: string | null;
  capacityMW: number;
  ppaPriceUsdPerKwh: FinancialField<number>;
  annualGrossRevenueUsd: FinancialField<number>;
  irrProxyPct: FinancialField<number>;
  cashYieldOnEquityPct: FinancialField<number>;
  unleveredCashYieldPct: FinancialField<number>;
  capacityFactorPct: FinancialField<number>;
  investorEquityUsd: FinancialField<number>;
  dscrX: FinancialField<number>;
  arrayType: string | null;
  image: { url: string | null; alt: string | null; credit: string | null; license: string | null };
  isOperating: boolean;
  contractTermRemainingYears: number | null;
  externalLinks: { label: string; url: string; source: string }[];
  detailHref: string;
}

/** The cash yield an offering has to clear to be worth a sophisticated investor's time. */
const HURDLE_PCT = 9;

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

export default function PublicMarketPage() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"" | "PROJECT" | "QUEUE">("");
  const [hurdleOnly, setHurdleOnly] = useState(false);
  const [targetOnly, setTargetOnly] = useState(true);

  const { data, isLoading } = useQuery<MarketplaceListResponse>({
    queryKey: ["/api/public/market/projects"],
  });

  const filtered = useMemo(() => {
    const listings = data?.listings ?? [];
    const q = search.trim().toLowerCase();
    return listings.filter((l) => {
      if (targetOnly && !isTargetCapacity(l.capacityMW * 1000)) return false;
      if (sourceFilter && l.source !== sourceFilter) return false;
      if (hurdleOnly && l.cashYieldOnEquityPct.value < HURDLE_PCT) return false;
      if (!q) return true;
      return [l.name, l.county, l.state, l.technology, l.stage]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data, search, sourceFilter, hurdleOnly, targetOnly]);

  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <section className="public-hero public-hero-split">
          <div>
            <p className="public-eyebrow">Project marketplace</p>
            <h1 className="public-title">
              Review projects,
              <br />
              <em>before an offering opens.</em>
            </h1>
            <p className="public-copy">
              Explore an illustrative pipeline of project candidates and market comparisons. No project shown here
              is currently open for investment; known, estimated, and market-proxy figures are labeled separately.
            </p>
            <div className="public-actions">
              <a href="#onboard" className="public-btn public-btn-primary">
                Join the investor waitlist
              </a>
              <a href="#pipeline" className="public-btn public-btn-outline">
                Browse current pipeline →
              </a>
              <Link href="/portfolio" className="public-btn public-btn-outline">
                Build a portfolio →
              </Link>
            </div>
          </div>
          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">506(c)</span>
                <span className="public-mini-stat-label">Verified accredited investors only</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">$10K</span>
                <span className="public-mini-stat-label">Target minimum investment per offering</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Monthly</span>
                <span className="public-mini-stat-label">Distribution eligibility after verified production</span>
              </div>
            </div>
          </aside>
        </section>

        <section id="onboard" className="public-section scroll-mt-24">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">Begin onboarding before the next offering opens.</h2>
          </div>
          <p className="public-section-copy">
            Preview five future steps: accreditation, identity verification, ownership-record setup, subscription,
            and funding. Completing this preview does not create an account or reserve an investment.
          </p>
          <InvestorOnboardingWizard />
        </section>

        <section id="pipeline" className="public-section public-section-tight scroll-mt-24">
          <div className="public-section-header">
            <span className="public-section-label">§ II</span>
            <h2 className="public-section-title">Illustrative target pipeline.</h2>
          </div>

          <Card className="public-toolbar-card mb-6">
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by project, county, state, stage..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-market-search"
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                {(["", "PROJECT", "QUEUE"] as const).map((src) => (
                  <Button
                    key={src || "ALL"}
                    size="sm"
                    variant={sourceFilter === src ? "default" : "outline"}
                    onClick={() => setSourceFilter(src)}
                    data-testid={`filter-source-${src || "ALL"}`}
                  >
                    {src === "" ? "All" : src === "PROJECT" ? "Curated" : "Queue"}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant={hurdleOnly ? "default" : "outline"}
                  onClick={() => setHurdleOnly((v) => !v)}
                  data-testid="filter-hurdle"
                >
                  {HURDLE_PCT}%+ yield
                </Button>
                <Button
                  size="sm"
                  variant={targetOnly ? "default" : "outline"}
                  onClick={() => setTargetOnly((value) => !value)}
                  aria-pressed={targetOnly}
                  data-testid="filter-target-capacity"
                >
                  {targetOnly ? "1–20 MW target only" : "All projects + comparisons"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
              Illustrative pipeline · not open for investment
            </p>
            <Badge variant="outline" data-testid="badge-refreshed">
              {timeAgo(data?.refreshedAt ?? null)}
            </Badge>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-40 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !filtered.length ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={BarChart3}
                  title="No listings found"
                  description="Try a different query or filter."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((l) => (
                <Card key={l.id} className="public-listing-card overflow-hidden" data-testid={`card-listing-${l.id}`}>
                  <ProjectImage
                    project={{
                      id: l.id,
                      name: l.name,
                      state: l.state,
                      county: l.county,
                      capacityMW: l.capacityMW,
                      arrayType: l.arrayType,
                      imageUrl: l.image?.url ?? null,
                      imageAlt: l.image?.alt ?? null,
                      imageCredit: l.image?.credit ?? null,
                      imageLicense: l.image?.license ?? null,
                    }}
                  />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{l.name}</CardTitle>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant="outline">Illustrative</Badge>
                        <Badge variant={l.isOperating ? "default" : l.source === "QUEUE" ? "secondary" : "outline"}>
                          {l.isOperating ? "Operating" : l.source === "QUEUE" ? "Queue" : "Pre-COD"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{l.county ?? "—"}, {l.state}</span>
                      <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" />{l.capacityMW.toFixed(1)} MW</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {l.technology && <Badge variant="outline">{l.technology.replace(/_/g, " ")}</Badge>}
                      {l.stage && <Badge variant="secondary">{l.stage.replace(/_/g, " ")}</Badge>}
                      {/* EcoXchange originates in the 1–20 MW band. Anything
                          outside it is shown for comparison, not as a target
                          project — say so on the card rather than leaving the
                          reader to infer it from the capacity figure. */}
                      {!isTargetCapacity(l.capacityMW * 1000) && (
                        <Badge
                          variant="outline"
                          className="border-dashed text-muted-foreground"
                          data-testid={`out-of-scope-${l.id}`}
                        >
                          Comparison · outside 1–20 MW target
                        </Badge>
                      )}
                    </div>
                    <div className="rounded-md border bg-muted/40 px-3 py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs text-muted-foreground">Cash yield on equity</span>
                        <ConfidenceBadge
                          confidence={l.cashYieldOnEquityPct.confidence}
                          source={l.cashYieldOnEquityPct.source}
                        />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`font-mono text-2xl font-semibold ${
                            l.cashYieldOnEquityPct.value >= HURDLE_PCT ? "" : "text-muted-foreground"
                          }`}
                          data-testid={`yield-${l.id}`}
                        >
                          {l.cashYieldOnEquityPct.value.toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {l.unleveredCashYieldPct.value.toFixed(1)}% unlevered
                        </span>
                      </div>
                      {!l.isOperating && (
                        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-500">
                          Pre-COD — modeled at commercial operation, not distributing today.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Contract price</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">${l.ppaPriceUsdPerKwh.value.toFixed(4)}/kWh</span>
                          <ConfidenceBadge
                            confidence={l.ppaPriceUsdPerKwh.confidence}
                            source={l.ppaPriceUsdPerKwh.source}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Annual revenue</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            ${l.annualGrossRevenueUsd.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                          </span>
                          <ConfidenceBadge
                            confidence={l.annualGrossRevenueUsd.confidence}
                            source={l.annualGrossRevenueUsd.source}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Investor equity</span>
                        <span className="font-mono">
                          ${l.investorEquityUsd.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Capacity factor</span>
                        <span className="font-mono">{l.capacityFactorPct.value.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">DSCR</span>
                        <span className="font-mono">
                          {l.dscrX.value > 0 ? `${l.dscrX.value.toFixed(2)}x` : "Unlevered"}
                        </span>
                      </div>
                    </div>
                    {l.externalLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1 border-t">
                        {l.externalLinks.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                            data-testid={`link-external-${l.id}-${i}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Link href={l.detailHref}>
                        <Button size="sm" className="gap-1" data-testid={`button-view-listing-${l.id}`}>
                          View diligence <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            <strong>Cash yield on equity</strong> is distributable cash after operating expense,
            reserves, senior debt service and the platform fee, divided by the equity an investor
            funds. <strong>Unlevered</strong> is cash available for debt service over total project
            cost. Neither is an IRR: both ignore time value, contract escalation and residual value.
            Figures for pre-COD assets are modeled at commercial operation. Illustrative underwriting
            for evaluation only — not an offer to sell securities.
          </p>
        </section>
      </main>
    </div>
  );
}

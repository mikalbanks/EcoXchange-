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
      if (!q) return true;
      return [l.name, l.county, l.state, l.technology, l.stage]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data, search, sourceFilter, targetOnly]);

  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <section className="public-hero public-hero-split">
          <div>
            <p className="public-eyebrow">Qualified renewable project pipeline</p>
            <h1 className="public-title">
              Project-linked renewable supply,
              <br />
              <em>organized for buyers and capital partners.</em>
            </h1>
            <p className="public-copy">
              EcoXchange organizes source-labeled renewable-project information for clean-energy buyers,
              capital partners, and strategic partners. Current listings are illustrative research unless explicitly
              qualified otherwise; this page does not represent a live securities offering or guaranteed energy supply.
            </p>
            <div className="public-actions">
              <a href="#pipeline" className="public-btn public-btn-primary">Explore Project Supply</a>
              <a href="mailto:contact@ecoxchange.net?subject=EcoXchange%20clean-energy%20buyer%20inquiry" className="public-btn public-btn-outline">Source Clean Energy →</a>
              <Link href="/develop" className="public-btn public-btn-outline">Submit a Project →</Link>
            </div>
          </div>
          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Buyers</span>
                <span className="public-mini-stat-label">Data centers, utilities, and large electricity users</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Capital</span>
                <span className="public-mini-stat-label">Structured project information and sponsor-equity need</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Project-linked</span>
                <span className="public-mini-stat-label">PPA, REC/EAC forward, utility, or other long-term structures where available</span>
              </div>
            </div>
          </aside>
        </section>

        <section id="capital" className="public-section scroll-mt-24">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">Two ways to engage the pipeline.</h2>
          </div>
          <div className="public-card-grid">
            <div className="public-card">
              <p className="public-card-kicker">For clean-energy buyers</p>
              <h3 className="public-card-title">Find project-linked renewable supply.</h3>
              <p className="public-card-copy">
                Engage around location, technology, MW, development stage, contracted revenue, and environmental-attribute availability. EcoXchange never assumes attributes are available if they are already committed to a state, utility, program, offtaker, or buyer.
              </p>
            </div>
            <div className="public-card">
              <p className="public-card-kicker">For capital partners</p>
              <h3 className="public-card-title">Review structured renewable-project opportunities.</h3>
              <p className="public-card-copy">
                Use standardized project and finance-readiness information to understand project status, modeled debt capacity, sponsor-equity need, and diligence context before any financing process begins.
              </p>
            </div>
          </div>
        </section>

        <section id="pipeline" className="public-section public-section-tight scroll-mt-24">
          <div className="public-section-header">
            <span className="public-section-label">§ II</span>
            <h2 className="public-section-title">Illustrative renewable project pipeline.</h2>
          </div>
          <p className="public-section-copy mb-5">
            Future qualification filters will center on state, utility / ISO / RTO, technology, MW, development stage,
            contracted revenue, REC / EAC availability, and sponsor-equity need. The current dataset does not fabricate
            live buyer matches or attribute availability.
          </p>

          <Card className="public-toolbar-card mb-6">
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by project, county, state, technology, stage..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-market-search"
                />
              </div>
              <div className="flex items-center gap-2 text-sm flex-wrap">
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
              Illustrative research pipeline · availability subject to qualification
            </p>
            <Badge variant="outline" data-testid="badge-refreshed">{timeAgo(data?.refreshedAt ?? null)}</Badge>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : !filtered.length ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={BarChart3}
                  title="No qualified project records match these filters yet"
                  description="Change the search or filters. EcoXchange does not fabricate project availability to fill an empty state."
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
                      {!isTargetCapacity(l.capacityMW * 1000) && (
                        <Badge variant="outline" className="border-dashed text-muted-foreground">Comparison · outside 1–20 MW target</Badge>
                      )}
                    </div>
                    <div className="space-y-1.5 text-sm rounded-md border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Contract price</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">${l.ppaPriceUsdPerKwh.value.toFixed(4)}/kWh</span>
                          <ConfidenceBadge confidence={l.ppaPriceUsdPerKwh.confidence} source={l.ppaPriceUsdPerKwh.source} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Annual revenue</span>
                        <span className="font-mono">${l.annualGrossRevenueUsd.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Capacity factor</span>
                        <span className="font-mono">{l.capacityFactorPct.value.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Modeled DSCR</span>
                        <span className="font-mono">{l.dscrX.value > 0 ? `${l.dscrX.value.toFixed(2)}x` : "Unlevered"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Modeled equity requirement</span>
                        <span className="font-mono">${l.investorEquityUsd.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                    {l.externalLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1 border-t">
                        {l.externalLinks.map((link, i) => (
                          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                            <ExternalLink className="h-3 w-3" />{link.label}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Link href={l.detailHref}>
                        <Button size="sm" className="gap-1" data-testid={`button-view-listing-${l.id}`}>
                          View project record <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            Financial fields are indicative and source-labeled. They are not lender commitments, investment returns,
            securities solicitations, tax opinions, or guarantees that project-linked RECs/EACs remain available.
          </p>
        </section>
      </main>
    </div>
  );
}

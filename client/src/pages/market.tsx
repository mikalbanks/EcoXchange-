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
import { Search, MapPin, Zap, Leaf, FileCheck2, Handshake, BarChart3 } from "lucide-react";
import { ProjectImage } from "@/components/marketplace/project-image";
import { isTargetCapacity } from "@shared/benchmark";
import { BUYER_PATHWAY, PUBLIC_POSITIONING } from "@/lib/public-positioning";

interface MarketplaceListing {
  id: string;
  source: "PROJECT" | "QUEUE";
  name: string;
  state: string;
  county: string | null;
  technology: string | null;
  stage: string | null;
  capacityMW: number;
  arrayType: string | null;
  image: { url: string | null; alt: string | null; credit: string | null; license: string | null };
  isOperating: boolean;
  contractTermRemainingYears: number | null;
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
  const [targetOnly, setTargetOnly] = useState(true);

  const { data, isLoading } = useQuery<MarketplaceListResponse>({
    queryKey: ["/api/public/market/projects"],
  });

  const filtered = useMemo(() => {
    const listings = data?.listings ?? [];
    const q = search.trim().toLowerCase();
    return listings.filter((listing) => {
      if (targetOnly && !isTargetCapacity(listing.capacityMW * 1000)) return false;
      if (!q) return true;
      return [listing.name, listing.county, listing.state, listing.technology, listing.stage]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data, search, targetOnly]);

  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <section className="public-hero public-hero-split">
          <div>
            <p className="public-eyebrow">For clean-energy buyers</p>
            <h1 className="public-title">
              Source qualified renewable projects.
              <br />
              <em>Build long-term clean-energy commitments around real project supply.</em>
            </h1>
            <p className="public-copy">{PUBLIC_POSITIONING}</p>
            <p className="public-copy">
              Buyer engagement is organized around project fit, not an investment marketplace. EcoXchange can help buyers evaluate qualified project supply, explore long-term clean-energy structures where project rights are available, and receive source-labeled production reporting as projects operate.
            </p>
            <div className="public-actions">
              <a href="#buyer-path" className="public-btn public-btn-primary">Explore Buyer Pathway</a>
              <a href="mailto:contact@ecoxchange.net?subject=EcoXchange%20clean-energy%20buyer%20inquiry" className="public-btn public-btn-outline">Source Clean Energy →</a>
            </div>
          </div>

          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Qualified supply</span>
                <span className="public-mini-stat-label">Project location, technology, MW, stage, and contractual context</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Long-term structures</span>
                <span className="public-mini-stat-label">PPAs, REC/EAC forwards, utility programs, or other structures where rights are available</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Verified reporting</span>
                <span className="public-mini-stat-label">Source-labeled production evidence and ongoing project reporting</span>
              </div>
            </div>
          </aside>
        </section>

        <section id="buyer-path" className="public-section scroll-mt-24">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">Clean-Energy Buyers → Project Supply → Long-Term Commitment → Verified Reporting</h2>
          </div>
          <div className="public-card-grid">
            <div className="public-card">
              <Search className="h-5 w-5 text-primary" />
              <h3 className="public-card-title">{BUYER_PATHWAY[0]}</h3>
              <p className="public-card-copy">Screen projects by geography, technology, MW, development stage, utility / market context, and project readiness.</p>
            </div>
            <div className="public-card">
              <Handshake className="h-5 w-5 text-primary" />
              <h3 className="public-card-title">{BUYER_PATHWAY[1]}</h3>
              <p className="public-card-copy">Structure depends on buyer requirements, project rights, existing commitments, market rules, and diligence.</p>
            </div>
            <div className="public-card">
              <FileCheck2 className="h-5 w-5 text-primary" />
              <h3 className="public-card-title">{BUYER_PATHWAY[2]}</h3>
              <p className="public-card-copy">Production evidence and project reporting remain source-labeled so operating performance can be reviewed with clear provenance.</p>
            </div>
          </div>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ II</span>
            <h2 className="public-section-title">Environmental attributes must be actually available.</h2>
          </div>
          <div className="public-callout">
            <Leaf className="mb-4 h-6 w-6 text-primary" />
            <p className="public-section-copy mb-0">
              EcoXchange will not present a REC, EAC, or other project-linked environmental attribute as available if it is already committed to a state program, utility, offtaker, buyer, or other contractual counterparty. Buyer-facing structures are subject to project-specific rights, registry context, contracts, and diligence.
            </p>
          </div>
        </section>

        <section id="pipeline" className="public-section public-section-tight scroll-mt-24">
          <div className="public-section-header">
            <span className="public-section-label">§ III</span>
            <h2 className="public-section-title">Illustrative project research pipeline.</h2>
          </div>
          <p className="public-section-copy mb-5">
            This is not an investment marketplace and does not represent guaranteed project availability. The current public dataset is illustrative research unless a project is explicitly qualified for buyer engagement.
          </p>

          <Card className="public-toolbar-card mb-6">
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search project, county, state, technology, stage..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  data-testid="input-market-search"
                />
              </div>
              <Button
                size="sm"
                variant={targetOnly ? "default" : "outline"}
                onClick={() => setTargetOnly((value) => !value)}
                aria-pressed={targetOnly}
                data-testid="filter-target-capacity"
              >
                {targetOnly ? "1–20 MW target only" : "All projects + comparisons"}
              </Button>
            </CardContent>
          </Card>

          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">Buyer-oriented project research · qualification required</p>
            <Badge variant="outline" data-testid="badge-refreshed">{timeAgo(data?.refreshedAt ?? null)}</Badge>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, index) => (
                <Card key={index}><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : !filtered.length ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={BarChart3}
                  title="No project records match these filters yet"
                  description="Change the search or filters. EcoXchange does not fabricate project supply to fill an empty state."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((listing) => (
                <Card key={listing.id} className="public-listing-card overflow-hidden" data-testid={`card-listing-${listing.id}`}>
                  <ProjectImage
                    project={{
                      id: listing.id,
                      name: listing.name,
                      state: listing.state,
                      county: listing.county,
                      capacityMW: listing.capacityMW,
                      arrayType: listing.arrayType,
                      imageUrl: listing.image?.url ?? null,
                      imageAlt: listing.image?.alt ?? null,
                      imageCredit: listing.image?.credit ?? null,
                      imageLicense: listing.image?.license ?? null,
                    }}
                  />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{listing.name}</CardTitle>
                      <Badge variant="outline">Illustrative</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{listing.county ?? "—"}, {listing.state}</span>
                      <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" />{listing.capacityMW.toFixed(1)} MW</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {listing.technology && <Badge variant="outline">{listing.technology.replace(/_/g, " ")}</Badge>}
                      {listing.stage && <Badge variant="secondary">{listing.stage.replace(/_/g, " ")}</Badge>}
                      <Badge variant={listing.isOperating ? "default" : "outline"}>{listing.isOperating ? "Operating" : "Pre-COD / development"}</Badge>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Buyer suitability, contracted rights, environmental-attribute availability, and long-term commitment structure require project-specific qualification.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section id="capital" className="public-section scroll-mt-24">
          <div className="public-section-header">
            <span className="public-section-label">§ IV</span>
            <h2 className="public-section-title">For capital partners.</h2>
          </div>
          <p className="public-section-copy">
            Capital partners can engage separately around qualified projects with standardized finance-readiness outputs, sponsor-equity requirements, project status, and diligence context. The buyer pathway and capital-partner pathway share the same underlying project record but are not presented as an investor marketplace.
          </p>
          <div className="public-actions">
            <a href="mailto:contact@ecoxchange.net?subject=EcoXchange%20capital%20partner%20inquiry" className="public-btn public-btn-primary">Discuss Capital Partnership</a>
            <Link href="/develop" className="public-btn public-btn-outline">View Developer Workflow →</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  MapPin,
  Receipt,
  Zap,
} from "lucide-react";
import {
  FinancialBreakdownTable,
  type FinancialField,
} from "@/components/marketplace/financial-breakdown-table";
import { ProjectImage } from "@/components/marketplace/project-image";

interface MarketplaceListingDetail {
  id: string;
  source: "PROJECT" | "QUEUE";
  name: string;
  state: string;
  county: string | null;
  technology: string | null;
  stage: string | null;
  capacityMW: number;
  summary: string | null;
  capacityKw: FinancialField<number>;
  ppaPriceUsdPerKwh: FinancialField<number>;
  annualKwh: FinancialField<number>;
  annualGrossRevenueUsd: FinancialField<number>;
  monthlyDebtServiceUsd: FinancialField<number>;
  monthlyOpexUsd: FinancialField<number>;
  capexUsd: FinancialField<number>;
  irrProxyPct: FinancialField<number>;
  moicProxy: FinancialField<number>;
  annualInvestorYieldUsd: FinancialField<number>;
  cashYieldOnEquityPct: FinancialField<number>;
  unleveredCashYieldPct: FinancialField<number>;
  capacityFactorPct: FinancialField<number>;
  seniorDebtUsd: FinancialField<number>;
  itcTransferProceedsUsd: FinancialField<number>;
  investorEquityUsd: FinancialField<number>;
  dscrX: FinancialField<number>;
  arrayType: string | null;
  image: { url: string | null; alt: string | null; credit: string | null; license: string | null };
  isOperating: boolean;
  commercialOperationDate: string | null;
  contractTermRemainingYears: number | null;
  externalLinks: { label: string; url: string; source: string }[];
  monthlySeries?: Array<{ monthIndex: number; label: string; grossRevenueUsd: number; investorYieldUsd: number }>;
  evidenceHash?: string;
}

export default function MarketProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery<MarketplaceListingDetail>({
    queryKey: [`/api/public/market/projects/${id}`],
    enabled: !!id,
  });

  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <div className="py-8">
          <Link href="/market">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to marketplace
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : error || !data ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3 opacity-50" />
              <p className="text-destructive">Could not load listing.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="public-hero public-hero-split pt-4">
              <div>
                <p className="public-eyebrow">Project diligence</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h1 className="public-title mt-0 text-[clamp(2.8rem,5vw,4.5rem)]">{data.name}</h1>
                  <Badge variant={data.source === "PROJECT" ? "default" : "secondary"}>
                    {data.source === "PROJECT" ? "Curated" : "Queue"}
                  </Badge>
                </div>
                <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {data.county ?? "—"}, {data.state}</span>
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {data.capacityMW.toFixed(2)} MW</span>
                  {data.technology && <span>{data.technology.replace(/_/g, " ")}</span>}
                  {data.stage && <span>{data.stage.replace(/_/g, " ")}</span>}
                </p>
                {data.summary && <p className="public-copy">{data.summary}</p>}
                <div className="mt-5 max-w-md">
                  <ProjectImage
                    project={{
                      id: data.id,
                      name: data.name,
                      state: data.state,
                      county: data.county,
                      capacityMW: data.capacityMW,
                      arrayType: data.arrayType,
                      imageUrl: data.image?.url ?? null,
                      imageAlt: data.image?.alt ?? null,
                      imageCredit: data.image?.credit ?? null,
                      imageLicense: data.image?.license ?? null,
                    }}
                  />
                </div>
              </div>
              <aside className="public-hero-aside">
                <div className="public-mini-stat-grid">
                  <div className="public-mini-stat">
                    <span className="public-mini-stat-value">{data.cashYieldOnEquityPct.value.toFixed(1)}%</span>
                    <span className="public-mini-stat-label">
                      Cash yield on equity · {data.unleveredCashYieldPct.value.toFixed(1)}% unlevered
                    </span>
                  </div>
                  <div className="public-mini-stat">
                    <span className="public-mini-stat-value">${data.annualGrossRevenueUsd.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                    <span className="public-mini-stat-label">Annual gross revenue</span>
                  </div>
                  {data.source === "PROJECT" && (
                    <div className="public-mini-stat">
                      <Link href={`/auth/login?redirect=/investor/deals/${id}`} className="public-btn public-btn-primary w-full">
                        Open deal room
                      </Link>
                    </div>
                  )}
                </div>
              </aside>
            </section>

            {data.source === "QUEUE" && (
              <div className="public-section py-6">
                <Card className="border-amber-500/40 bg-amber-500/5">
                  <CardContent className="py-4 text-sm">
                    This is an <strong>interconnection queue entry</strong>. Production and revenue are modeled from
                    NSRDB satellite irradiance and market PPA proxies — not metered yet.
                  </CardContent>
                </Card>
              </div>
            )}

            <section className="public-section">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Financial breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FinancialBreakdownTable
                    rows={[
                      { label: "Capacity", field: { ...data.capacityKw, value: data.capacityKw.value / 1000 } as any, format: "multiple" },
                      { label: "PPA price", field: data.ppaPriceUsdPerKwh, format: "usd_per_kwh" },
                      { label: "Annual production", field: data.annualKwh, format: "kwh" },
                      { label: "Annual gross revenue", field: data.annualGrossRevenueUsd, format: "usd" },
                      { label: "Monthly debt service", field: data.monthlyDebtServiceUsd, format: "usd" },
                      { label: "Monthly opex", field: data.monthlyOpexUsd, format: "usd" },
                      { label: "Capacity factor", field: data.capacityFactorPct, format: "pct" },
                      { label: "Total project cost", field: data.capexUsd, format: "usd" },
                      { label: "Senior debt", field: data.seniorDebtUsd, format: "usd" },
                      { label: "ITC transfer proceeds", field: data.itcTransferProceedsUsd, format: "usd" },
                      { label: "Investor equity", field: data.investorEquityUsd, format: "usd" },
                      { label: "DSCR", field: data.dscrX, format: "multiple" },
                      { label: "Annual investor cash", field: data.annualInvestorYieldUsd, format: "usd" },
                      { label: "Unlevered cash yield", field: data.unleveredCashYieldPct, format: "pct" },
                      { label: "Cash yield on equity", field: data.cashYieldOnEquityPct, format: "pct" },
                    ]}
                  />
                  <p className="text-xs text-muted-foreground mt-3">
                    <strong>Cash yield on equity</strong> divides distributable cash — after opex,
                    reserves, senior debt service and the platform fee — by the equity an investor
                    funds. <strong>Unlevered cash yield</strong> divides cash available for debt
                    service by total project cost. Neither is an IRR.
                    {!data.isOperating && (
                      <> This asset is pre-COD: the figures are modeled at commercial operation and
                      are not being distributed today.</>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Known</strong> = sourced from contracted data or recorded operational results. {" "}
                    <strong>Estimated</strong> = modeled from physical assumptions. {" "}
                    <strong>Market proxy</strong> = derived from CAISO hub / LevelTen / jurisdiction benchmarks.
                  </p>
                  {data.evidenceHash && (
                    <p className="text-[11px] text-muted-foreground mt-2 font-mono">
                      Evidence hash: {data.evidenceHash.slice(0, 16)}…
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>

            {data.externalLinks.length > 0 && (
              <section className="public-section pt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">External references</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {data.externalLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          data-testid={`link-external-${i}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {link.label}
                          <span className="text-xs text-muted-foreground ml-1">({link.source})</span>
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

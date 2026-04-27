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
  CheckCircle2,
  ExternalLink,
  FileSearch,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";

interface MarketProjectDetail {
  project: {
    id: string;
    name: string;
    technology: string;
    stage: string;
    state: string;
    county: string;
    capacityMW: string | null;
    summary: string | null;
  };
  readinessScore: {
    score: number;
    rating: string;
    reasons: string[];
  } | null;
  capitalStack: {
    totalCapex: string | null;
    equityNeeded: string | null;
  } | null;
  dueDiligence: {
    documentCount: number;
    checklist: Array<{
      key: string;
      label: string;
      status: string;
      required: boolean;
    }>;
  };
  listingUrl?: string | null;
  auctionListing?: {
    bidStatus: string | null;
    statusOutcome: string | null;
    winningBid: string | null;
    closingInformation: string | null;
  } | null;
  yieldProjectionIllustrative?: {
    minimumTicketUsd: number;
    estimatedAnnualIncomeUsd: number;
    yieldPct: number;
    disclaimer: string;
  } | null;
}

function formatCurrency(v: string | number | null): string {
  const n = typeof v === "string" ? parseFloat(v) : v ?? 0;
  if (!Number.isFinite(n)) return "$0";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function statusTone(status: string): string {
  if (status === "VERIFIED") return "text-emerald-400";
  if (status === "UPLOADED") return "text-primary";
  return "text-muted-foreground";
}

export default function MarketProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery<MarketProjectDetail>({
    queryKey: ["/api/public/market/projects", id],
    enabled: !!id,
  });

  return (
    <div className="min-h-screen bg-gradient-dark-green">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/market">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to marketplace
            </Button>
          </Link>
          <Link href={`/auth/login?redirect=/investor/deals/${id}`}>
            <Button size="sm">Open investor deal room</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : error || !data ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3 opacity-50" />
              <p className="text-destructive">Could not load project details.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold">{data.project.name}</h1>
                    <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {data.project.county}, {data.project.state}</span>
                      <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {data.project.capacityMW || "N/A"} MW</span>
                      <span>{data.project.technology.replace(/_/g, " ")}</span>
                      <span>{data.project.stage.replace(/_/g, " ")}</span>
                    </p>
                  </div>
                  {data.readinessScore && (
                    <Badge variant="outline">
                      Readiness {data.readinessScore.rating} · {data.readinessScore.score}
                    </Badge>
                  )}
                </div>
                {data.project.summary && (
                  <p className="text-sm text-muted-foreground mt-4">{data.project.summary}</p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Illustrative earnings (surface diligence)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {data.yieldProjectionIllustrative ? (
                    <>
                      <p>
                        At a <strong>${data.yieldProjectionIllustrative.minimumTicketUsd.toLocaleString()}</strong> minimum ticket, estimated annual modeled income is{" "}
                        <strong>{formatCurrency(data.yieldProjectionIllustrative.estimatedAnnualIncomeUsd)}</strong>.
                      </p>
                      <p className="text-2xl font-semibold tabular-nums">
                        ~{data.yieldProjectionIllustrative.yieldPct.toFixed(2)}% annualized
                      </p>
                      <p className="text-xs text-muted-foreground">{data.yieldProjectionIllustrative.disclaimer}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No modeled projection available yet.</p>
                  )}
                  <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                    <p>Target raise: {formatCurrency(data.capitalStack?.totalCapex ?? null)}</p>
                    <p>Modeled equity stack: {formatCurrency(data.capitalStack?.equityNeeded ?? null)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSearch className="h-4 w-4" />
                    Listing & bid reference
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {data.auctionListing?.bidStatus && <p><span className="text-muted-foreground">Bid status:</span> {data.auctionListing.bidStatus}</p>}
                  {data.auctionListing?.statusOutcome && <p><span className="text-muted-foreground">Outcome:</span> {data.auctionListing.statusOutcome}</p>}
                  {data.auctionListing?.winningBid && <p><span className="text-muted-foreground">Winning bid:</span> {data.auctionListing.winningBid}</p>}
                  {data.auctionListing?.closingInformation && <p><span className="text-muted-foreground">Closing:</span> {data.auctionListing.closingInformation}</p>}
                  {data.listingUrl ? (
                    <a
                      href={data.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open official listing source
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">No source URL in this row yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Surface due diligence checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Data room items uploaded: <strong>{data.dueDiligence.documentCount}</strong>
                </p>
                <div className="space-y-2">
                  {data.dueDiligence.checklist.map((item) => (
                    <div key={item.key} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`h-4 w-4 ${statusTone(item.status)}`} />
                        <span>{item.label}</span>
                        {item.required && (
                          <Badge variant="secondary" className="text-[10px]">Required</Badge>
                        )}
                      </div>
                      <span className={`text-xs ${statusTone(item.status)}`}>{item.status.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

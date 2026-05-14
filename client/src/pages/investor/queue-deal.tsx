import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, RefreshCw, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface QueueDetail {
  id: string;
  projectName: string;
  isoCode: string;
  queueStatus: string | null;
  resourceType: string | null;
  capacityMW: string | null;
  state: string;
  county: string | null;
  latitude: string | null;
  longitude: string | null;
  analytics: {
    computeStatus: string;
    annualMwhModeled: string | null;
    annualKwhNsrdb: string | null;
    irrProxyPct: string | null;
    moicProxy: string | null;
    ppaScenario: Record<string, unknown> | null;
    waterfallSummary: Record<string, number> | null;
    monthlyWaterfallSeries: unknown[] | null;
    backtestSummary: Record<string, unknown> | null;
    errorMessage: string | null;
    engineVersion: string | null;
  } | null;
}

function waterfallChartData(summary: Record<string, number> | null) {
  if (!summary) return [];
  const order = ["DEBT_SERVICE", "OPEX_FUND", "RESERVES", "PLATFORM_FEE", "INVESTOR_YIELD"];
  return order
    .filter((k) => summary[k] != null)
    .map((k) => ({ name: k.replace(/_/g, " "), value: Math.round(summary[k] ?? 0) }));
}

export default function QueueDealDetail() {
  const { id = "" } = useParams() as { id: string };
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<QueueDetail>({
    queryKey: ["/api/investor/queue-entries", id],
    queryFn: async () => {
      const res = await fetch(`/api/investor/queue-entries/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: Boolean(id),
  });

  const recompute = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/investor/queue-entries/${id}/recompute`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || "Recompute failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investor/queue-entries", id] });
    },
  });

  const wfData = data?.analytics ? waterfallChartData(data.analytics.waterfallSummary) : [];

  return (
    <DashboardLayout
      title="Interconnection queue prospect"
      description="Modeled production and prospect waterfall (not a platform offering)"
      breadcrumbs={[
        { label: "Overview", href: "/investor" },
        { label: "Marketplace", href: "/investor/deals" },
        { label: "Queue detail" },
      ]}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/investor/deals?tab=queue">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => recompute.mutate()}
          disabled={recompute.isPending || !id}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${recompute.isPending ? "animate-spin" : ""}`} />
          Recompute
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error || !data ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">Not found or failed to load</CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex gap-3 text-sm text-muted-foreground">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <p>
                Queue data is sourced from public ISO interconnection filings (via{" "}
                <a
                  className="text-primary underline"
                  href="https://opensource.gridstatus.io"
                  target="_blank"
                  rel="noreferrer"
                >
                  GridStatus
                </a>
                ). Modeled kWh, PPA reference, and waterfall are <strong>illustrative</strong> and not an offer
                to sell securities.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{data.projectName}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {data.isoCode} · {data.resourceType || "Solar"} · {data.queueStatus || "—"}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground text-right">
                  <span
                    className={
                      data.analytics?.computeStatus === "READY"
                        ? "text-emerald-600"
                        : data.analytics?.computeStatus === "FAILED"
                          ? "text-destructive"
                          : ""
                    }
                  >
                    {data.analytics?.computeStatus || "PENDING"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-4">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {data.state}
                  {data.county ? `, ${data.county}` : ""}
                </span>
                <span>Capacity: {data.capacityMW ?? "—"} MW</span>
                {data.latitude && data.longitude && (
                  <span className="text-muted-foreground">
                    {data.latitude}, {data.longitude}
                  </span>
                )}
              </div>
              {data.analytics?.errorMessage && (
                <p className="text-destructive text-xs">{data.analytics.errorMessage}</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Modeled annual MWh</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {data.analytics?.annualMwhModeled
                    ? Number(data.analytics.annualMwhModeled).toLocaleString()
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">IRR proxy (illustrative)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {data.analytics?.irrProxyPct != null
                    ? `${Number(data.analytics.irrProxyPct).toFixed(1)}%`
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">MOIC proxy (illustrative)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {data.analytics?.moicProxy != null ? Number(data.analytics.moicProxy).toFixed(2) : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {data.analytics?.ppaScenario && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">PPA / market reference</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto">
                  {JSON.stringify(data.analytics.ppaScenario, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {wfData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prospect cashflow waterfall (annual, USD)</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wfData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {data.analytics?.backtestSummary && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Model / backtest details</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto max-h-64">
                  {JSON.stringify(data.analytics.backtestSummary, null, 2)}
                </pre>
                {data.analytics.engineVersion && (
                  <p className="text-xs text-muted-foreground mt-2">Engine: {data.analytics.engineVersion}</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

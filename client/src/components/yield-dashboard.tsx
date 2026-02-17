import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  TrendingUp,
  Zap,
  DollarSign,
  Calendar,
  ArrowUpRight,
  FileText,
} from "lucide-react";

interface YieldData {
  ppas: Array<{
    id: string;
    offtakerName: string;
    contractStartDate: string;
    contractEndDate: string;
    pricePerMwh: string;
    escalationType: string;
    escalationRate: string;
    contractedCapacityMW: string;
  }>;
  production: Array<{
    id: string;
    periodStart: string;
    periodEnd: string;
    productionMwh: string;
    capacityFactor: string | null;
    source: string;
  }>;
  revenue: Array<{
    id: string;
    periodStart: string;
    periodEnd: string;
    grossRevenue: string;
    operatingExpenses: string;
    netRevenue: string;
  }>;
  distributions: Array<{
    id: string;
    periodLabel: string;
    totalDistributable: string;
    investorShare: string;
    platformFee: string;
    status: string;
    distributedAt: string | null;
  }>;
  summary: {
    totalProductionMwh: number;
    totalGrossRevenue: number;
    totalNetRevenue: number;
    totalDistributed: number;
    avgCapacityFactor: number;
    periodsReported: number;
  };
}

function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMwh(value: number): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 0 })} MWh`;
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short" });
}

function MiniBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-full w-full flex items-end">
      <div
        className={`w-full rounded-sm ${colorClass}`}
        style={{ height: `${pct}%`, minHeight: pct > 0 ? "2px" : "0" }}
      />
    </div>
  );
}

export function YieldDashboard({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery<YieldData>({
    queryKey: [`/api/projects/${projectId}/yield`],
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!data || data.production.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground" data-testid="text-no-yield-data">
            No yield data available for this project yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { summary, ppas, production, revenue, distributions } = data;
  const maxMwh = Math.max(...production.map(p => parseFloat(p.productionMwh)));
  const maxGross = Math.max(...revenue.map(r => parseFloat(r.grossRevenue)));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Zap className="h-3.5 w-3.5" />
              Total Production
            </div>
            <p className="text-lg font-bold" data-testid="text-total-production">
              {formatMwh(summary.totalProductionMwh)}
            </p>
            <p className="text-xs text-muted-foreground">{summary.periodsReported} months</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              Gross Revenue
            </div>
            <p className="text-lg font-bold" data-testid="text-total-gross-revenue">
              {formatCurrency(summary.totalGrossRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Net Revenue
            </div>
            <p className="text-lg font-bold" data-testid="text-total-net-revenue">
              {formatCurrency(summary.totalNetRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Distributed
            </div>
            <p className="text-lg font-bold" data-testid="text-total-distributed">
              {formatCurrency(summary.totalDistributed)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Monthly Production
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-28" data-testid="chart-production">
            {production.map((p) => (
              <div key={p.id} className="flex-1 flex flex-col items-center gap-1 h-full">
                <MiniBar
                  value={parseFloat(p.productionMwh)}
                  max={maxMwh}
                  colorClass="bg-primary/80"
                />
                <span className="text-[10px] text-muted-foreground leading-none">
                  {formatMonth(p.periodStart)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>Avg Capacity Factor: {(summary.avgCapacityFactor * 100).toFixed(1)}%</span>
            <span>Source: {production[0]?.source || "N/A"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Revenue Waterfall
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-28" data-testid="chart-revenue">
            {revenue.map((r) => (
              <div key={r.id} className="flex-1 flex flex-col items-center gap-1 h-full">
                <div className="w-full h-full flex items-end gap-px">
                  <div className="flex-1">
                    <MiniBar
                      value={parseFloat(r.grossRevenue)}
                      max={maxGross}
                      colorClass="bg-emerald-500/70"
                    />
                  </div>
                  <div className="flex-1">
                    <MiniBar
                      value={parseFloat(r.netRevenue)}
                      max={maxGross}
                      colorClass="bg-primary/80"
                    />
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground leading-none">
                  {formatMonth(r.periodStart)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-emerald-500/70" />
              Gross
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-primary/80" />
              Net
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Distributions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5" data-testid="list-distributions">
            {distributions.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30"
                data-testid={`distribution-${d.id}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{d.periodLabel}</span>
                  <Badge
                    variant={d.status === "DISTRIBUTED" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {d.status}
                  </Badge>
                </div>
                <span className="font-medium">{formatCurrency(d.investorShare)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {ppas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              PPA Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ppas.map((ppa) => (
              <div key={ppa.id} className="space-y-2" data-testid={`ppa-${ppa.id}`}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Offtaker</span>
                    <p className="font-medium" data-testid="text-ppa-offtaker">{ppa.offtakerName}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Price</span>
                    <p className="font-medium" data-testid="text-ppa-price">${ppa.pricePerMwh}/MWh</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Capacity</span>
                    <p className="font-medium">{ppa.contractedCapacityMW} MW</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Start</span>
                    <p className="font-medium">{new Date(ppa.contractStartDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">End</span>
                    <p className="font-medium">{new Date(ppa.contractEndDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Escalation</span>
                    <p className="font-medium">
                      {ppa.escalationType === "ESCALATING" ? `${ppa.escalationRate}%/yr` : "Fixed"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

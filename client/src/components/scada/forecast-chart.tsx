import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenancePanel, type ScadaProvenance } from "./provenance-panel";
import { TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

interface ScadaForecastMonth {
  month: string;
  forecastMwh: number;
  forecastRevenue: number;
}

interface ScadaForecast {
  months: ScadaForecastMonth[];
  assumptions: {
    ppaRatePerKwh: number;
    degradationRateAnnual: number;
    monthsForward: number;
  };
  totalForecastMwh: number;
  totalForecastRevenue: number;
  provenance: ScadaProvenance;
}

interface ForecastChartProps {
  projectId: string;
  showProvenance?: boolean;
  height?: number;
  usePublicApi?: boolean;
}

function formatMonthLabel(m: string): string {
  const [y, mo] = m.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(mo, 10) - 1]} '${y.slice(2)}`;
}

function formatCurrency(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

export function ForecastChart({ projectId, showProvenance = false, height = 280, usePublicApi = false }: ForecastChartProps) {
  const basePath = usePublicApi ? "/api/public/projects" : "/api/projects";
  const { data, isLoading } = useQuery<ScadaForecast>({
    queryKey: [basePath, projectId, "scada", "forecast"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/${projectId}/scada/forecast`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch forecast");
      return res.json();
    },
    enabled: !!projectId,
    staleTime: 60000,
  });

  if (isLoading) {
    return <Card><CardContent className="pt-6"><Skeleton className="w-full" style={{ height }} /></CardContent></Card>;
  }

  if (!data || data.months.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">Forecast unavailable — insufficient history</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.months.map((m) => ({
    name: formatMonthLabel(m.month),
    mwh: Math.round(m.forecastMwh),
    revenue: Math.round(m.forecastRevenue),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            12-Month Forecast
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Total: {Math.round(data.totalForecastMwh).toLocaleString()} MWh</span>
            <span>{formatCurrency(data.totalForecastRevenue)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div data-testid="chart-scada-forecast">
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Area
                type="monotone"
                dataKey="mwh"
                name="Forecast (MWh)"
                stroke="hsl(var(--primary))"
                fill="url(#forecastGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>PPA Rate: ${(data.assumptions.ppaRatePerKwh * 1000).toFixed(2)}/MWh</span>
          <span>Market Reference (LevelTen Q1 2026): $64.49/MWh</span>
          <span>Degradation: {(data.assumptions.degradationRateAnnual * 100).toFixed(1)}%/yr</span>
        </div>
        {showProvenance && <div className="mt-3"><ProvenancePanel provenance={data.provenance} compact /></div>}
      </CardContent>
    </Card>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenancePanel, type ScadaProvenance } from "./provenance-panel";
import { GitCompareArrows } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

interface MonthlyRecord {
  period: string;
  productionMwh: number;
}

interface ForecastMonth {
  month: string;
  forecastMwh: number;
}

interface ForecastVsActualData {
  months: Array<{
    label: string;
    actual: number | null;
    forecast: number | null;
    variance: number | null;
  }>;
  provenance: ScadaProvenance;
}

interface ForecastVsActualChartProps {
  projectId: string;
  showProvenance?: boolean;
  height?: number;
  usePublicApi?: boolean;
}

function formatMonthKey(m: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [y, mo] = m.split("-");
  return `${months[parseInt(mo, 10) - 1]} '${y.slice(2)}`;
}

function periodToKey(period: string): string {
  const parts = period.split(" ");
  if (parts.length < 2) return period;
  const monthNames: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  return `${parts[1]}-${monthNames[parts[0]] || "01"}`;
}

export function ForecastVsActualChart({ projectId, showProvenance = false, height = 300, usePublicApi = false }: ForecastVsActualChartProps) {
  const basePath = usePublicApi ? "/api/public/projects" : "/api/projects";

  const { data: monthly } = useQuery<{ records: MonthlyRecord[]; provenance: ScadaProvenance }>({
    queryKey: [basePath, projectId, "scada", "monthly"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/${projectId}/scada/monthly`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!projectId,
    staleTime: 60000,
  });

  const { data: forecast } = useQuery<{ months: ForecastMonth[]; provenance: ScadaProvenance }>({
    queryKey: [basePath, projectId, "scada", "forecast"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/${projectId}/scada/forecast`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!projectId,
    staleTime: 60000,
  });

  const isLoading = !monthly && !forecast;

  if (isLoading) {
    return <Card><CardContent className="pt-6"><Skeleton className="w-full" style={{ height }} /></CardContent></Card>;
  }

  const actualByKey = new Map<string, number>();
  if (monthly?.records) {
    for (const r of monthly.records) {
      const key = periodToKey(r.period);
      actualByKey.set(key, r.productionMwh);
    }
  }

  const forecastByKey = new Map<string, number>();
  if (forecast?.months) {
    for (const f of forecast.months) {
      forecastByKey.set(f.month, f.forecastMwh);
    }
  }

  const allKeys = new Set(Array.from(actualByKey.keys()).concat(Array.from(forecastByKey.keys())));
  const sortedKeys = Array.from(allKeys).sort();

  if (sortedKeys.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <GitCompareArrows className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">Insufficient data for comparison</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = sortedKeys.map((key) => {
    const actual = actualByKey.get(key) ?? null;
    const fc = forecastByKey.get(key) ?? null;
    return {
      name: formatMonthKey(key),
      actual: actual !== null ? Math.round(actual) : null,
      forecast: fc !== null ? Math.round(fc) : null,
    };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4" />
          Forecast vs Actual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div data-testid="chart-forecast-vs-actual">
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "MWh", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }} />
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
              <Bar dataKey="actual" name="Actual (MWh)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast (MWh)"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: "#f59e0b" }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {showProvenance && monthly?.provenance && <div className="mt-3"><ProvenancePanel provenance={monthly.provenance} compact /></div>}
      </CardContent>
    </Card>
  );
}

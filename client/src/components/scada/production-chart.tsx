import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenancePanel, type ScadaProvenance } from "./provenance-panel";
import { BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

interface ScadaMonthlyRecord {
  period: string;
  periodStart: string;
  productionMwh: number;
  capacityFactor: number;
  grossRevenue: number;
  netRevenue: number;
}

interface ScadaMonthlyHistory {
  records: ScadaMonthlyRecord[];
  provenance: ScadaProvenance;
}

interface ProductionChartProps {
  projectId: string;
  showProvenance?: boolean;
  height?: number;
  usePublicApi?: boolean;
}

function formatMonth(period: string): string {
  const parts = period.split(" ");
  return parts.length >= 2 ? `${parts[0]} '${parts[1].slice(2)}` : period;
}

export function ProductionChart({ projectId, showProvenance = false, height = 280, usePublicApi = false }: ProductionChartProps) {
  const basePath = usePublicApi ? "/api/public/projects" : "/api/projects";
  const { data, isLoading } = useQuery<ScadaMonthlyHistory>({
    queryKey: [basePath, projectId, "scada", "monthly"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/${projectId}/scada/monthly`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch monthly data");
      return res.json();
    },
    enabled: !!projectId,
    staleTime: 60000,
  });

  if (isLoading) {
    return <Card><CardContent className="pt-6"><Skeleton className="w-full" style={{ height }} /></CardContent></Card>;
  }

  if (!data || data.records.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">No production history available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.records.map((r) => ({
    name: formatMonth(r.period),
    production: Math.round(r.productionMwh),
    capacity: Math.round(r.capacityFactor * 100),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Monthly Production
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div data-testid="chart-scada-production">
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
              <Bar dataKey="production" name="Production (MWh)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {showProvenance && <ProvenancePanel provenance={data.provenance} compact />}
      </CardContent>
    </Card>
  );
}

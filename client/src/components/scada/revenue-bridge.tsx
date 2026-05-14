import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenancePanel, type ScadaProvenance } from "./provenance-panel";
import { DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevenueBridgeStep {
  label: string;
  amount: number;
  type: "add" | "subtract" | "total";
}

interface ScadaRevenueBridge {
  steps: RevenueBridgeStep[];
  summary: {
    totalProductionMwh: number;
    ppaRatePerMwh: number;
    grossRevenue: number;
    operatingExpenses: number;
    opexRate: number;
    netRevenue: number;
    platformFee: number;
    platformFeeRate: number;
    distributableCash: number;
  };
  provenance: ScadaProvenance;
}

interface RevenueBridgeWaterfallProps {
  projectId: string;
  showProvenance?: boolean;
  usePublicApi?: boolean;
}

function formatCurrency(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

export function RevenueBridgeWaterfall({ projectId, showProvenance = false, usePublicApi = false }: RevenueBridgeWaterfallProps) {
  const basePath = usePublicApi ? "/api/public/projects" : "/api/projects";
  const { data, isLoading } = useQuery<ScadaRevenueBridge>({
    queryKey: [basePath, projectId, "scada", "revenue-bridge"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/${projectId}/scada/revenue-bridge`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch revenue bridge");
      return res.json();
    },
    enabled: !!projectId,
    staleTime: 60000,
  });

  if (isLoading) {
    return <Card><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>;
  }

  if (!data || data.steps.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">Revenue bridge unavailable</p>
        </CardContent>
      </Card>
    );
  }

  const maxAmount = Math.max(...data.steps.map(s => Math.abs(s.amount)));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Revenue Bridge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2" data-testid="chart-revenue-bridge">
          {data.steps.map((step, i) => {
            const pct = maxAmount > 0 ? (Math.abs(step.amount) / maxAmount) * 100 : 0;
            const isFirst = step.label === "Energy Production";
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-48 shrink-0 text-right">
                  <p className={cn(
                    "text-xs",
                    step.type === "total" ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-6 rounded-md bg-muted/30 overflow-hidden relative">
                    <div
                      className={cn(
                        "h-full rounded-md transition-all",
                        step.type === "subtract" ? "bg-red-500/60" :
                        step.type === "total" ? "bg-primary/80" :
                        "bg-emerald-500/60"
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-xs font-medium w-20 text-right shrink-0",
                    step.type === "subtract" ? "text-red-400" :
                    step.type === "total" ? "text-foreground" :
                    "text-emerald-400"
                  )} data-testid={`text-bridge-step-${i}`}>
                    {isFirst ? `${step.amount.toLocaleString()} MWh` :
                     step.type === "subtract" ? `-${formatCurrency(step.amount)}` :
                     formatCurrency(step.amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {showProvenance && <div className="mt-4"><ProvenancePanel provenance={data.provenance} compact /></div>}
      </CardContent>
    </Card>
  );
}

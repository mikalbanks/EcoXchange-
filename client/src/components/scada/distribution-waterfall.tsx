import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenancePanel, type ScadaProvenance } from "./provenance-panel";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface DistributionRecord {
  period: string;
  grossRevenue: number;
  operatingExpenses: number;
  netRevenue: number;
  platformFee: number;
  investorShare: number;
  status: string;
}

interface ScadaDistributions {
  records: DistributionRecord[];
  totals: {
    grossRevenue: number;
    operatingExpenses: number;
    netRevenue: number;
    platformFee: number;
    investorShare: number;
    distributed: number;
    pending: number;
  };
  provenance: ScadaProvenance;
}

interface DistributionWaterfallProps {
  projectId: string;
  showProvenance?: boolean;
  usePublicApi?: boolean;
}

function formatCurrency(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

export function DistributionWaterfall({ projectId, showProvenance = false, usePublicApi = false }: DistributionWaterfallProps) {
  const basePath = usePublicApi ? "/api/public/projects" : "/api/projects";
  const { data, isLoading } = useQuery<ScadaDistributions>({
    queryKey: [basePath, projectId, "scada", "distributions"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/${projectId}/scada/distributions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch distributions");
      return res.json();
    },
    enabled: !!projectId,
    staleTime: 60000,
  });

  if (isLoading) {
    return <Card><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>;
  }

  if (!data || data.records.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">Distribution data unavailable</p>
        </CardContent>
      </Card>
    );
  }

  const steps = [
    { label: "Gross Revenue", amount: data.totals.grossRevenue, type: "add" as const },
    { label: "Operating Expenses", amount: data.totals.operatingExpenses, type: "subtract" as const },
    { label: "Net Revenue", amount: data.totals.netRevenue, type: "total" as const },
    { label: "Platform Fee", amount: data.totals.platformFee, type: "subtract" as const },
    { label: "Distributed to Investors", amount: data.totals.distributed, type: "total" as const },
    ...(data.totals.pending > 0 ? [{ label: "Pending Distribution", amount: data.totals.pending, type: "pending" as const }] : []),
  ];

  const maxAmount = Math.max(...steps.map(s => Math.abs(s.amount)));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Distribution Waterfall
          </CardTitle>
          <span className="text-xs text-muted-foreground">{data.records.length} periods</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2" data-testid="chart-distribution-waterfall">
          {steps.map((step, i) => {
            const pct = maxAmount > 0 ? (Math.abs(step.amount) / maxAmount) * 100 : 0;
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
                        step.type === "pending" ? "bg-yellow-500/60" :
                        "bg-emerald-500/60"
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-xs font-medium w-20 text-right shrink-0",
                    step.type === "subtract" ? "text-red-400" :
                    step.type === "total" ? "text-foreground" :
                    step.type === "pending" ? "text-yellow-400" :
                    "text-emerald-400"
                  )} data-testid={`text-dist-step-${i}`}>
                    {step.type === "subtract" ? `-${formatCurrency(step.amount)}` : formatCurrency(step.amount)}
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

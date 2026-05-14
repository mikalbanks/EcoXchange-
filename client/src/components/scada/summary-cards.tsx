import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenancePanel, type ScadaProvenance } from "./provenance-panel";
import { Zap, DollarSign, TrendingUp, ArrowUpRight, BarChart3, Calendar } from "lucide-react";

interface ScadaSummary {
  totalProductionMwh: number;
  totalGrossRevenue: number;
  totalNetRevenue: number;
  totalDistributed: number;
  avgCapacityFactor: number;
  periodsReported: number;
  annualizedProductionMwh: number;
  trailing12MonthRevenue: number;
  provenance: ScadaProvenance;
}

function formatCurrency(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMwh(value: number): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 0 })} MWh`;
}

interface ScadaSummaryCardsProps {
  projectId: string;
  showProvenance?: boolean;
  compact?: boolean;
  usePublicApi?: boolean;
}

export function ScadaSummaryCards({ projectId, showProvenance = false, compact = false, usePublicApi = false }: ScadaSummaryCardsProps) {
  const basePath = usePublicApi ? "/api/public/projects" : "/api/projects";
  const { data, isLoading } = useQuery<ScadaSummary>({
    queryKey: [basePath, projectId, "scada", "summary"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/${projectId}/scada/summary`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch SCADA summary");
      return res.json();
    },
    enabled: !!projectId,
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"}>
        {[...Array(compact ? 4 : 6)].map((_, i) => (
          <Card key={i}><CardContent className="pt-4 pb-3"><Skeleton className="h-12 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!data || data.periodsReported === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground" data-testid="text-no-scada-data">No SCADA data available</p>
        </CardContent>
      </Card>
    );
  }

  const cards = [
    { icon: Zap, label: "Total Production", value: formatMwh(data.totalProductionMwh), sub: `${data.periodsReported} months` },
    { icon: DollarSign, label: "Gross Revenue", value: formatCurrency(data.totalGrossRevenue) },
    { icon: TrendingUp, label: "Net Revenue", value: formatCurrency(data.totalNetRevenue) },
    { icon: ArrowUpRight, label: "Distributed", value: formatCurrency(data.totalDistributed) },
    { icon: BarChart3, label: "Avg Capacity", value: `${(data.avgCapacityFactor * 100).toFixed(1)}%` },
    { icon: Calendar, label: "Trailing 12m Rev", value: formatCurrency(data.trailing12MonthRevenue) },
  ];

  const displayCards = compact ? cards.slice(0, 4) : cards;

  return (
    <div className="space-y-3" data-testid="scada-summary-cards">
      <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"}>
        {displayCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <card.icon className="h-3.5 w-3.5" />
                {card.label}
              </div>
              <p className={compact ? "text-base font-bold" : "text-lg font-bold"} data-testid={`text-scada-${card.label.toLowerCase().replace(/\s/g, "-")}`}>
                {card.value}
              </p>
              {card.sub && <p className="text-xs text-muted-foreground">{card.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      {showProvenance && data.provenance && (
        <ProvenancePanel provenance={data.provenance} compact />
      )}
    </div>
  );
}

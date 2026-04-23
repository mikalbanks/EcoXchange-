import { Badge } from "@/components/ui/badge";

interface InstitutionalMetricsInput {
  avgCapacityFactor: number;
  next12MonthProductionMwh: number;
  next12MonthRevenueUsd: number;
}

interface InstitutionalProjectMetricsProps {
  metrics: InstitutionalMetricsInput;
  className?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function InstitutionalProjectMetrics({ metrics, className = "" }: InstitutionalProjectMetricsProps) {
  const validationPct = clamp(metrics.avgCapacityFactor * 100, 0, 100);
  const liveYieldPerMwh = metrics.next12MonthProductionMwh > 0
    ? metrics.next12MonthRevenueUsd / metrics.next12MonthProductionMwh
    : 0;

  return (
    <div className={`rounded-lg border border-border/60 bg-muted/20 p-3 ${className}`} data-testid="institutional-project-metrics">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          NLR 4km
        </Badge>
        <span className="text-[10px] text-muted-foreground">Institutional telemetry band</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-background/60 p-2">
          <p className="text-muted-foreground">Validation %</p>
          <p className="font-semibold" data-testid="text-validation-percent">
            {validationPct.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-md bg-background/60 p-2">
          <p className="text-muted-foreground">Live Yield</p>
          <p className="font-semibold" data-testid="text-live-yield">
            ${liveYieldPerMwh.toFixed(2)}/MWh
          </p>
        </div>
      </div>
    </div>
  );
}

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LEVELTEN_P25_Q1_2026_USD_PER_MWH } from "@/lib/institutional-market";
import { cn } from "@/lib/utils";

export interface InstitutionalMetricsProps {
  validationConfidence?: string | null;
  financialApyPct?: string | null;
  /** compact = single row; default = wrapped badges */
  variant?: "default" | "compact" | "strip";
  className?: string;
  /** e.g. deal id for `data-testid` hooks */
  testIdPrefix?: string;
}

function fmtPct(v: string | null | undefined, decimals: number): string | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(decimals) : null;
}

export function InstitutionalProjectMetrics({
  validationConfidence,
  financialApyPct,
  variant = "default",
  className,
  testIdPrefix,
}: InstitutionalMetricsProps) {
  const val = fmtPct(validationConfidence, 1);
  const yieldPct = fmtPct(financialApyPct, 2);

  const badgeClass =
    "inline-flex items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400";

  if (variant === "strip") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground",
          className,
        )}
      >
        <span className={badgeClass}>NLR 4km</span>
        <span>
          Validation:{" "}
          <span className="font-mono text-foreground">{val != null ? `${val}%` : "—"}</span>
        </span>
        <span className="flex items-center gap-0.5">
          Live yield:{" "}
          <span
            className="font-mono text-primary"
            data-testid={testIdPrefix ? `text-live-yield-${testIdPrefix}` : undefined}
          >
            {yieldPct != null ? `${yieldPct}%` : "—"}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Market reference"
                data-testid={testIdPrefix ? `button-market-ref-${testIdPrefix}` : undefined}
              >
                <Info className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs leading-snug">
              LevelTen Q1 2026 P25 benchmark: ${LEVELTEN_P25_Q1_2026_USD_PER_MWH.toFixed(2)}/MWh. CA
              projects without a fixed PPA use NP-15 / SP-15 hub references (env: CAISO_NP15_USD_PER_MWH,
              CAISO_SP15_USD_PER_MWH).
            </TooltipContent>
          </Tooltip>
        </span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <span className={badgeClass}>NLR 4km</span>
        {val != null && (
          <span className="text-xs text-muted-foreground">
            Validation <span className="font-mono text-foreground">{val}%</span>
          </span>
        )}
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          Live yield{" "}
          <span
            className="font-mono font-medium text-primary"
            data-testid={testIdPrefix ? `text-live-yield-${testIdPrefix}` : undefined}
          >
            {yieldPct != null ? `${yieldPct}%` : "—"}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex text-muted-foreground hover:text-foreground"
                aria-label="Market reference"
                data-testid={testIdPrefix ? `button-market-ref-${testIdPrefix}` : undefined}
              >
                <Info className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs leading-snug">
              LevelTen Q1 2026 P25: ${LEVELTEN_P25_Q1_2026_USD_PER_MWH.toFixed(2)}/MWh.
            </TooltipContent>
          </Tooltip>
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex flex-wrap gap-2">
        <span className={badgeClass}>Data fidelity: NLR 4km</span>
        {val != null && (
          <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
            Validation confidence: <span className="ml-1 font-mono text-foreground">{val}%</span>
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <span>Live yield</span>
        <span className="font-mono text-base font-semibold text-primary">
          {yieldPct != null ? `${yieldPct}%` : "—"}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Market reference"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs leading-snug">
            Institutional formula: (annual kWh × market PPA − annual O&M) ÷ asset CapEx. Market
            reference: LevelTen Q1 2026 P25 at ${LEVELTEN_P25_Q1_2026_USD_PER_MWH.toFixed(2)}/MWh.
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

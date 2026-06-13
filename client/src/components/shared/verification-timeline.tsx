import type { MonthlyBacktestResult } from "@shared/developer-backtest";
import { monthLabel } from "@/lib/backtest-format";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VerificationTimelineProps {
  months: MonthlyBacktestResult[];
}

/** Horizontal dot timeline — green = verified, amber = flagged. */
export function VerificationTimeline({ months }: VerificationTimelineProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3" data-testid="verification-timeline">
      {months.map((m) => {
        const verified = m.status === "verified";
        return (
          <Tooltip key={m.month}>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "h-3.5 w-3.5 rounded-full",
                    verified ? "bg-emerald-500" : "bg-amber-500",
                  )}
                  data-testid={`timeline-dot-${m.month}`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {monthLabel(m.month)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs font-medium">
                {monthLabel(m.month)}: {verified ? "Verified" : "Flagged"}
              </p>
              <p className="text-xs text-muted-foreground">
                {m.deviation_pct > 0 ? "+" : ""}
                {m.deviation_pct}% vs. expected
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

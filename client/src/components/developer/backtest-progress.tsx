import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyBacktestResult } from "@shared/developer-backtest";
import { monthLabelLong, formatMwh } from "@/lib/backtest-format";

interface BacktestProgressProps {
  projectName: string;
  location: string;
  progressPct: number;
  message: string;
  months: MonthlyBacktestResult[];
}

/** Live SSE progress view — rows appear as each month's result streams in. */
export function BacktestProgress({
  projectName,
  location,
  progressPct,
  message,
  months,
}: BacktestProgressProps) {
  return (
    <Card data-testid="backtest-progress">
      <CardHeader>
        <CardTitle className="text-lg">Running Production Backtest</CardTitle>
        <p className="text-sm text-muted-foreground">
          {projectName} · {location}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress value={progressPct} data-testid="progress-bar" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{message || "Starting…"}</span>
            <span className="ml-auto font-mono">{Math.round(progressPct)}%</span>
          </div>
        </div>

        <div className="rounded-md border border-border divide-y divide-border">
          {months.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              Fetching satellite irradiance data…
            </div>
          ) : (
            months.map((m) => {
              const verified = m.status === "verified";
              return (
                <div
                  key={m.month}
                  className="flex items-center gap-3 px-4 py-2 text-sm"
                  data-testid={`progress-row-${m.month}`}
                >
                  {verified ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <span className="w-24 font-medium">{monthLabelLong(m.month)}</span>
                  <span className="w-24 text-muted-foreground">
                    {formatMwh(m.expected_kwh)}
                  </span>
                  <span className="w-16 tabular-nums text-muted-foreground">
                    {m.deviation_pct > 0 ? "+" : ""}
                    {m.deviation_pct}%
                  </span>
                  <span
                    className={`ml-auto text-xs uppercase ${
                      verified ? "text-emerald-500" : "text-amber-500"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Data source: NASA POWER satellite irradiance · Physics model: pvlib /
          Hay-Davies
        </p>
      </CardContent>
    </Card>
  );
}

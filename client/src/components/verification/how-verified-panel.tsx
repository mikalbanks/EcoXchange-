import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VerificationSummary {
  countsByStatus: Record<string, number>;
  totalRuns30d: number;
  pctVerified30d: number;
  openAnomalyCount: number;
  lastSettledAt: string | null;
}

interface PublicTrace {
  run: {
    expectedKwh: string;
    actualKwh: string;
    variancePct: string;
    tolerancePct: string;
    ppaRateUsdPerKwh: string;
    ppaSource: string;
    grossRevenueUsd: string;
    status: string;
    evidenceHash: string;
  };
  snapshot: {
    satelliteSource: string;
    rawResponseHash: string;
  } | null;
}

export function HowVerifiedPanel({ projectId }: { projectId: string }) {
  const { data: summary } = useQuery<VerificationSummary>({
    queryKey: [`/api/projects/${projectId}/verification/summary`],
    retry: false,
  });

  // Try to load the most recent settled trace for the badge row.
  const { data: trace } = useQuery<PublicTrace>({
    queryKey: [`/api/public/projects/${projectId}/verification/trace`],
    enabled: false, // requires a runId; show summary-only view by default.
  });

  if (!summary || summary.totalRuns30d === 0) {
    return (
      <Card data-testid="how-verified-panel">
        <CardHeader>
          <CardTitle className="text-base">How this yield is verified</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Verification engine is online. Once intervals are settled they appear here with a full evidence chain — irradiance read &rarr; meter read &rarr; reconciliation &rarr; price source &rarr; ledger transaction.
        </CardContent>
      </Card>
    );
  }

  const variancePct = trace ? Number(trace.run.variancePct).toFixed(2) : null;
  const tolerancePct = trace ? Number(trace.run.tolerancePct).toFixed(1) : null;
  const expectedKwh = trace ? Number(trace.run.expectedKwh).toFixed(0) : null;
  const actualKwh = trace ? Number(trace.run.actualKwh).toFixed(0) : null;
  const usdPerKwh = trace ? Number(trace.run.ppaRateUsdPerKwh).toFixed(4) : null;

  return (
    <Card data-testid="how-verified-panel">
      <CardHeader>
        <CardTitle className="text-base">How this yield is verified</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <Badge variant="default" data-testid="badge-verified-pct">
            {summary.pctVerified30d.toFixed(1)}% verified (30d)
          </Badge>
          <span className="text-muted-foreground">&rsaquo;</span>
          <Badge variant="outline" data-testid="badge-runs-count">
            {summary.totalRuns30d} runs
          </Badge>
          {actualKwh && expectedKwh && (
            <>
              <span className="text-muted-foreground">&rsaquo;</span>
              <Badge variant="outline" data-testid="badge-energy">
                {actualKwh} kWh metered ≈ {expectedKwh} kWh modeled
              </Badge>
            </>
          )}
          {variancePct && tolerancePct && (
            <>
              <span className="text-muted-foreground">&rsaquo;</span>
              <Badge variant="outline" data-testid="badge-variance">
                {variancePct}% variance / ±{tolerancePct}% band
              </Badge>
            </>
          )}
          {usdPerKwh && trace && (
            <>
              <span className="text-muted-foreground">&rsaquo;</span>
              <Badge variant="outline" data-testid="badge-price">
                ${usdPerKwh}/kWh · {trace.run.ppaSource}
              </Badge>
            </>
          )}
          {summary.openAnomalyCount > 0 && (
            <>
              <span className="text-muted-foreground">&rsaquo;</span>
              <Badge variant="secondary" data-testid="badge-anomalies">
                {summary.openAnomalyCount} open anomal{summary.openAnomalyCount === 1 ? "y" : "ies"}
              </Badge>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Deterministic reconciliation of utility net-meter against satellite irradiance. Every kWh ties
          back to an archived irradiance snapshot and a frozen kWh price; every settled dollar ties back
          to a ledger posting.
        </p>
      </CardContent>
    </Card>
  );
}

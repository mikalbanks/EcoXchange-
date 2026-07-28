import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Info } from "lucide-react";

export interface PortfolioAnalysis {
  positions: Array<{
    listingId: string;
    name: string;
    weightPct: number;
    allocatedUsd: number;
    cashYieldOnEquityPct: number;
    projectedAnnualCashUsd: number;
    clearsHurdle: boolean;
  }>;
  totalWeightPct: number;
  targetCheckSizeUsd: number;
  blendedCashYieldOnEquityPct: number;
  blendedUnleveredCashYieldPct: number;
  projectedAnnualCashUsd: number;
  projectedQuarterlyCashUsd: number;
  weightedDscrX: number | null;
  weightedContractTermYears: number | null;
  operatingWeightPct: number;
  hurdleClearingWeightPct: number;
  diversificationScore: number;
  concentrations: Array<{
    dimension: string;
    label: string;
    buckets: Array<{ key: string; label: string; weightPct: number }>;
    hhi: number;
    topWeightPct: number;
  }>;
  warnings: Array<{ severity: "INFO" | "WARN"; code: string; message: string }>;
  hurdlePct: number;
}

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function Stat({
  label,
  value,
  sub,
  emphasis,
  testId,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasis?: "good" | "muted";
  testId?: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`font-mono text-xl font-semibold ${emphasis === "muted" ? "text-muted-foreground" : ""}`}
        data-testid={testId}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export function PortfolioSummary({ analysis }: { analysis: PortfolioAnalysis }) {
  const clears = analysis.blendedCashYieldOnEquityPct >= analysis.hurdlePct;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Blended yield"
          value={`${analysis.blendedCashYieldOnEquityPct.toFixed(2)}%`}
          sub={`${analysis.blendedUnleveredCashYieldPct.toFixed(2)}% unlevered · ${analysis.hurdlePct}% hurdle`}
          emphasis={clears ? "good" : "muted"}
          testId="stat-blended-yield"
        />
        <Stat
          label="Projected annual cash"
          value={usd(analysis.projectedAnnualCashUsd)}
          sub={`${usd(analysis.projectedQuarterlyCashUsd)} per quarter on ${usd(analysis.targetCheckSizeUsd)}`}
          testId="stat-annual-cash"
        />
        <Stat
          label="Diversification"
          value={`${analysis.diversificationScore}/100`}
          sub={`${analysis.positions.length} position${analysis.positions.length === 1 ? "" : "s"}`}
          testId="stat-diversification"
        />
        <Stat
          label="Weighted DSCR"
          value={analysis.weightedDscrX != null ? `${analysis.weightedDscrX.toFixed(2)}x` : "Unlevered"}
          sub={
            analysis.weightedContractTermYears != null
              ? `${analysis.weightedContractTermYears.toFixed(1)} yr avg contract term`
              : "Contract term not recorded"
          }
          testId="stat-dscr"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Operating"
          value={`${analysis.operatingWeightPct.toFixed(0)}%`}
          sub="Share of capital in assets already distributing"
          testId="stat-operating"
        />
        <Stat
          label={`Above ${analysis.hurdlePct}%`}
          value={`${analysis.hurdleClearingWeightPct.toFixed(0)}%`}
          sub="Share of capital in assets clearing the hurdle on their own"
          testId="stat-hurdle-weight"
        />
      </div>

      {analysis.warnings.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold">What this portfolio is exposed to</h3>
            {analysis.warnings.map((wrn) => (
              <div
                key={wrn.code}
                className="flex items-start gap-2 text-sm"
                data-testid={`warning-${wrn.code}`}
              >
                {wrn.severity === "WARN" ? (
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-500" />
                ) : (
                  <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                )}
                <span className={wrn.severity === "WARN" ? "" : "text-muted-foreground"}>
                  {wrn.message}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

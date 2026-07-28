import { Card, CardContent } from "@/components/ui/card";
import type { PortfolioAnalysis } from "./portfolio-summary";

/**
 * Concentration is shown as stacked share bars rather than pie charts: the
 * question an investor is asking is "how much of my money is in one thing",
 * which reads off a single horizontal bar far faster than off a wheel.
 */

// Sequential ramp — position in the stack carries the meaning, not hue identity.
const RAMP = [
  "hsl(174 62% 32%)",
  "hsl(174 48% 44%)",
  "hsl(38 74% 52%)",
  "hsl(24 68% 55%)",
  "hsl(210 24% 55%)",
  "hsl(210 16% 68%)",
];

function ShareBar({
  dim,
}: {
  dim: PortfolioAnalysis["concentrations"][number];
}) {
  const total = dim.buckets.reduce((s, b) => s + b.weightPct, 0);
  if (total <= 0) return null;

  return (
    <div className="space-y-1.5" data-testid={`concentration-${dim.dimension}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium">{dim.label}</span>
        <span className="text-[11px] text-muted-foreground font-mono">
          top {dim.topWeightPct.toFixed(0)}%
        </span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {dim.buckets.map((b, i) => (
          <div
            key={b.key}
            style={{
              width: `${(b.weightPct / total) * 100}%`,
              backgroundColor: RAMP[i % RAMP.length],
            }}
            title={`${b.label}: ${b.weightPct.toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {dim.buckets.slice(0, 5).map((b, i) => (
          <span key={b.key} className="inline-flex items-center gap-1.5 text-[11px]">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: RAMP[i % RAMP.length] }}
              aria-hidden
            />
            <span className="text-muted-foreground">
              {b.label} {((b.weightPct / total) * 100).toFixed(0)}%
            </span>
          </span>
        ))}
        {dim.buckets.length > 5 && (
          <span className="text-[11px] text-muted-foreground">
            +{dim.buckets.length - 5} more
          </span>
        )}
      </div>
    </div>
  );
}

export function ConcentrationChart({ analysis }: { analysis: PortfolioAnalysis }) {
  if (analysis.positions.length === 0) return null;
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Concentration</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Share of capital by risk dimension. Two assets in different states can still share a
            regulator, an offtaker class or a weather system.
          </p>
        </div>
        {analysis.concentrations.map((dim) => (
          <ShareBar key={dim.dimension} dim={dim} />
        ))}
      </CardContent>
    </Card>
  );
}

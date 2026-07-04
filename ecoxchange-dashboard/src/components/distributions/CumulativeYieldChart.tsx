import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { palette } from "../../config/palette.js";
import { formatUsd } from "../../utils/formatters.js";
import type { DistributionRecord } from "../../types/distributions.js";

function monthLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Cumulative USDC received across the distribution history (completed
 * records only, oldest -> newest), as a gradient area chart.
 */
export function CumulativeYieldChart({ records }: { records: DistributionRecord[] }) {
  const ascending = [...records]
    .filter((r) => r.status === "completed")
    .sort((a, b) => a.period_start.localeCompare(b.period_start));

  let running = 0;
  const data = ascending.map((r) => {
    running += r.net_distribution;
    return {
      label: monthLabel(r.period_start),
      cumulative: Math.round(running * 100) / 100,
    };
  });

  if (data.length === 0) return null;

  return (
    <div className="h-56 w-full" data-testid="cumulative-yield-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="cumulativeYieldFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.accentBrt} stopOpacity={0.35} />
              <stop offset="100%" stopColor={palette.accentBrt} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={palette.paleGreen} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: palette.textMuted, fontSize: 11 }}
            stroke={palette.textMuted}
          />
          <YAxis
            tick={{ fill: palette.textMuted, fontSize: 11 }}
            stroke={palette.textMuted}
            tickFormatter={(n: number) => formatUsd(n)}
            width={64}
          />
          <Tooltip
            formatter={(value: number) => [formatUsd(value, true), "Cumulative received"]}
            contentStyle={{
              borderRadius: 0,
              border: `1px solid ${palette.paleGreen}`,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            name="Cumulative received"
            stroke={palette.medGreen}
            strokeWidth={2}
            fill="url(#cumulativeYieldFill)"
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

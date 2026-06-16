import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { palette } from "../../config/palette.js";
import { formatUsd } from "../../utils/formatters.js";
import type { MonthlyDataPoint } from "../../utils/calculator.js";

interface Props {
  series: MonthlyDataPoint[];
  reinvest: boolean;
}

function compactUsd(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

// Stack components of total value without double-counting: principal invested,
// distributions received (non-DRIP only), and growth above principal.
export function ProjectionChart({ series, reinvest }: Props) {
  const data = series.map((p) => ({
    label: p.date_label,
    invested: Math.round(p.cumulative_invested),
    distributions: Math.round(p.cumulative_distributions),
    growth: Math.round(Math.max(0, p.portfolio_value - p.cumulative_invested)),
  }));
  const tickInterval = Math.max(0, Math.floor(data.length / 8) - 1);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={palette.paleGreen} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: palette.textMuted, fontSize: 11 }}
            stroke={palette.textMuted}
            interval={tickInterval}
          />
          <YAxis
            tick={{ fill: palette.textMuted, fontSize: 11 }}
            stroke={palette.textMuted}
            tickFormatter={compactUsd}
            width={56}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatUsd(value), name]}
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${palette.paleGreen}`,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="invested"
            name="Cumulative Invested"
            stackId="1"
            stroke={palette.lightGreen}
            fill={palette.paleGreen}
          />
          {!reinvest ? (
            <Area
              type="monotone"
              dataKey="distributions"
              name="Distributions Received"
              stackId="1"
              stroke={palette.medGreen}
              fill={palette.lightGreen}
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="growth"
            name="Portfolio Growth"
            stackId="1"
            stroke={palette.darkBg}
            fill={palette.medGreen}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

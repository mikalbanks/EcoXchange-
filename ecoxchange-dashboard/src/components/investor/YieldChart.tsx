import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VerificationRecord } from "../../utils/types.js";
import { formatMonth, formatUsd } from "../../utils/formatters.js";

interface Props {
  records: VerificationRecord[];
  investorSharePct?: number;
  height?: number;
}

// Cumulative investor yield over time. Records are summed chronologically; the
// area is the running total of (estimated_revenue × investor share).
export function YieldChart({
  records,
  investorSharePct = 2.0,
  height = 280,
}: Props) {
  const share = investorSharePct / 100;
  const sorted = [...records].sort((a, b) =>
    a.period_start.localeCompare(b.period_start),
  );
  let running = 0;
  const data = sorted.map((r) => {
    running += r.estimated_revenue * share;
    return {
      month: formatMonth(r.period_start),
      cumulative: Math.round(running),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="yieldFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C8E8D4" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#C8E8D4" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#C8E8D4" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#6B7B6E" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6B7B6E" }}
          tickLine={false}
          width={56}
          tickFormatter={(v: number) => formatUsd(v)}
        />
        <RechartsTooltip
          formatter={(v: number) => [formatUsd(v, true), "Cumulative yield"]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #C8E8D4",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="#2E7D52"
          strokeWidth={2}
          fill="url(#yieldFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

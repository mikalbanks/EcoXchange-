import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyBacktestResult } from "@shared/developer-backtest";
import { monthLabel } from "@/lib/backtest-format";

const BAR_COLOR = "#1B4D35";

interface CapacityFactorChartProps {
  months: MonthlyBacktestResult[];
}

/** Monthly capacity factor (%) — shows the seasonal yield pattern. */
export function CapacityFactorChart({ months }: CapacityFactorChartProps) {
  const data = months.map((m) => ({
    month: monthLabel(m.month),
    cf: Math.round(m.capacity_factor * 1000) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          domain={[0, 30]}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v: number) => [`${v}%`, "Capacity factor"]}
        />
        <Bar dataKey="cf" fill={BAR_COLOR} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

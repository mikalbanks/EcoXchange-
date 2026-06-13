import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyBacktestResult } from "@shared/developer-backtest";
import { monthLabel } from "@/lib/backtest-format";

const LINE_COLOR = "#76C945";

interface TemperatureChartProps {
  months: MonthlyBacktestResult[];
}

/**
 * Average cell temperature by month, with the 25°C STC reference. Demonstrates
 * that the engine accounts for temperature derating — builds developer trust.
 */
export function TemperatureChart({ months }: TemperatureChartProps) {
  const data = months.map((m) => ({
    month: monthLabel(m.month),
    temp: Math.round(m.cell_temperature_avg_c * 10) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}°`} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v: number) => [`${v}°C`, "Avg cell temp"]}
        />
        <ReferenceLine
          y={25}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="4 4"
          label={{ value: "25°C STC", fontSize: 10, position: "insideTopRight" }}
        />
        <Line
          dataKey="temp"
          stroke={LINE_COLOR}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

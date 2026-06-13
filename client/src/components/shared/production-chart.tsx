import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyBacktestResult } from "@shared/developer-backtest";
import { monthLabel } from "@/lib/backtest-format";

const EXPECTED_COLOR = "#2E7D52";
const SIMULATED_COLOR = "#8DC4A4";
const BAND_COLOR = "#B45309";

interface ProductionChartProps {
  months: MonthlyBacktestResult[];
}

/**
 * Primary results chart: grouped bars of expected vs. simulated inverter
 * production per month, with dashed ±15% tolerance-band lines around expected.
 */
export function ProductionChart({ months }: ProductionChartProps) {
  const data = months.map((m) => ({
    month: monthLabel(m.month),
    expected: Math.round(m.expected_kwh / 1000),
    simulated: Math.round(m.simulated_inverter_kwh / 1000),
    upper: Math.round((m.expected_kwh * 1.15) / 1000),
    lower: Math.round((m.expected_kwh * 0.85) / 1000),
    deviation: m.deviation_pct,
    status: m.status,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          label={{ value: "MWh", angle: -90, position: "insideLeft", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: number, name: string, props: any) => {
            if (name === "Expected" || name === "Simulated inverter") {
              return [`${value} MWh`, name];
            }
            return [`${value} MWh`, name];
          }}
          labelFormatter={(label, payload) => {
            const p = payload?.[0]?.payload;
            if (!p) return label;
            return `${label} · ${p.deviation > 0 ? "+" : ""}${p.deviation}% · ${p.status}`;
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="expected" name="Expected" fill={EXPECTED_COLOR} radius={[2, 2, 0, 0]} />
        <Bar
          dataKey="simulated"
          name="Simulated inverter"
          fill={SIMULATED_COLOR}
          radius={[2, 2, 0, 0]}
        />
        <Line
          dataKey="upper"
          name="+15% tolerance"
          stroke={BAND_COLOR}
          strokeDasharray="4 4"
          dot={false}
          strokeWidth={1}
        />
        <Line
          dataKey="lower"
          name="-15% tolerance"
          stroke={BAND_COLOR}
          strokeDasharray="4 4"
          dot={false}
          strokeWidth={1}
          legendType="none"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Stacked monthly production across all active projects (Spec 5) — the
// diversification story as one Recharts area chart, one green shade per
// project.

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
import type { DemoProject } from "../../data/demo-projects.js";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// 8-step green ramp from the brand palette (dark → pale).
const SERIES_COLORS = [
  palette.darkBgDeep,
  palette.darkBg,
  "#256344",
  palette.medGreen,
  "#4E9E63",
  palette.accentBrt,
  palette.lightGreen,
  palette.paleGreen,
];

export function StackedProductionChart({
  projects,
}: {
  projects: DemoProject[];
}) {
  const active = projects.filter((p) => p.status === "active");
  const rows = MONTHS.map((month, i) => {
    const row: Record<string, number | string> = { month };
    for (const p of active) row[p.name] = p.monthly_production_mwh[i];
    return row;
  });

  return (
    <div className="h-72 w-full" data-testid="stacked-production-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid
            stroke={palette.paleGreen}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fill: palette.textMuted, fontSize: 11 }}
            stroke={palette.textMuted}
          />
          <YAxis
            tick={{ fill: palette.textMuted, fontSize: 11 }}
            stroke={palette.textMuted}
            width={48}
            tickFormatter={(v: number) => v.toLocaleString()}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              `${Number(value).toLocaleString()} MWh`,
              name,
            ]}
            contentStyle={{
              border: `1px solid ${palette.paleGreen}`,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {active.map((p, i) => (
            <Area
              key={p.id}
              type="monotone"
              dataKey={p.name}
              stackId="production"
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              fill={SERIES_COLORS[i % SERIES_COLORS.length]}
              fillOpacity={0.75}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

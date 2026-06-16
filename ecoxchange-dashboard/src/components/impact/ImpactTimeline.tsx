import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { palette } from "../../config/palette.js";
import { fmtInt, fmtKwh } from "./format.js";
import type { MonthlyImpactPoint } from "../../types/impact.js";

function monthLabel(period: string): string {
  return new Date(`${period}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

// Monthly CO2-avoided timeline — shows the seasonal solar production pattern.
export function ImpactTimeline({ data }: { data: MonthlyImpactPoint[] }) {
  const rows = data.map((d) => ({
    month: monthLabel(d.period),
    co2: Math.round(d.co2_kg),
    kwh: Math.round(d.verified_kwh),
  }));

  return (
    <div className="rounded-xl border border-paleGreen/60 bg-white p-5 shadow-sm">
      <h3 className="font-heading text-lg text-darkBg">Monthly Impact Timeline</h3>
      <p className="mb-3 text-xs text-textMuted">CO₂ avoided per month (kg)</p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid stroke={palette.paleGreen} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: palette.textMuted, fontSize: 11 }}
              stroke={palette.textMuted}
            />
            <YAxis
              tick={{ fill: palette.textMuted, fontSize: 11 }}
              stroke={palette.textMuted}
              tickFormatter={(v: number) => fmtInt(v)}
              width={48}
            />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === "co2"
                  ? [`${fmtInt(value)} kg CO₂`, "Avoided"]
                  : [fmtKwh(value), "Verified"]
              }
              labelStyle={{ color: palette.darkBg }}
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${palette.paleGreen}`,
                fontSize: 12,
              }}
            />
            <Bar dataKey="co2" name="co2" fill={palette.medGreen} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

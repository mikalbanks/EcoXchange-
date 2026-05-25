import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VerificationRecord } from "../utils/types.js";
import { palette } from "../config/palette.js";
import {
  formatKwh,
  formatMonth,
  formatMonthShort,
  formatPct,
} from "../utils/formatters.js";

interface Datum {
  month: string;
  monthIso: string;
  actual: number;
  expected: number;
  deviation: number;
  status: string;
}

interface Props {
  records: VerificationRecord[];
}

export function ProductionChart({ records }: Props) {
  const data: Datum[] = records.map((r) => ({
    month: formatMonthShort(r.period_start),
    monthIso: r.period_start,
    actual: r.inverter_kwh,
    expected: r.expected_kwh,
    deviation: r.inv_vs_expected_pct,
    status: r.status,
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke={palette.paleGreen} strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tick={{ fill: palette.textMuted, fontSize: 12 }}
            stroke={palette.textMuted}
          />
          <YAxis
            tick={{ fill: palette.textMuted, fontSize: 12 }}
            stroke={palette.textMuted}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            label={{
              value: "kWh",
              angle: -90,
              position: "insideLeft",
              fill: palette.textMuted,
              fontSize: 12,
            }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: palette.textMuted }}
            iconType="circle"
          />
          <Bar dataKey="actual" name="Actual production" radius={[4, 4, 0, 0]}>
            {data.map((d, idx) => (
              <Cell
                key={idx}
                fill={d.status === "flagged" ? palette.flagAmber : palette.medGreen}
              />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="expected"
            name="Expected"
            stroke={palette.lightGreen}
            strokeDasharray="6 4"
            strokeWidth={2}
            dot={{ fill: palette.lightGreen, r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Datum }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-paleGreen rounded-md shadow px-3 py-2 text-sm">
      <div className="font-medium text-darkBg">{formatMonth(d.monthIso)}</div>
      <div className="text-textMuted">Expected: {formatKwh(d.expected)}</div>
      <div className="text-textMuted">Actual: {formatKwh(d.actual)}</div>
      <div className="text-textMuted">
        Deviation: {formatPct(d.deviation)}
      </div>
      <div
        className={`mt-1 uppercase text-xs font-semibold ${
          d.status === "flagged" ? "text-flagAmber" : "text-medGreen"
        }`}
      >
        {d.status}
      </div>
    </div>
  );
}

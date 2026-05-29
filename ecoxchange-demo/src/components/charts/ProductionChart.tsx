import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VerificationRecord } from "../../data/types.js";
import {
  formatKwh,
  formatKwhCompact,
  formatMonthAxis,
  formatMonthLong,
} from "../../utils/formatters.js";

interface Props {
  records: VerificationRecord[];
  /** Caption number, default "I". */
  figureNumber?: string;
  caption?: string;
}

const COLOR_VERIFIED = "#1B4D35";
const COLOR_FLAGGED = "#C17B1A";
const COLOR_EXPECTED = "#76C945";

const tickStyle = {
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: 10,
  fill: "#6B7B6E",
  letterSpacing: "0.1em",
};

interface TooltipPayloadEntry {
  dataKey?: string;
  payload?: VerificationRecord;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const rec = payload[0]?.payload;
  if (!rec) return null;
  return (
    <div className="figure-frame px-4 py-3 shadow-sm space-y-1.5">
      <p className="font-mono text-[10px] uppercase tracking-tag text-eco-olive">
        {label} {formatMonthLong(rec.period_start).split(" ")[1]}
      </p>
      <div className="space-y-0.5 text-[12px] font-body">
        <p className="text-eco-text-body">
          <span className="text-eco-text-muted">Inverter:</span>{" "}
          <span className="font-medium text-eco-text-primary">
            {formatKwh(rec.inverter_kwh)}
          </span>
        </p>
        <p className="text-eco-text-body">
          <span className="text-eco-text-muted">Expected:</span>{" "}
          <span className="font-medium text-eco-text-primary">
            {formatKwh(rec.expected_kwh)}
          </span>
        </p>
        <p className="text-eco-text-body">
          <span className="text-eco-text-muted">Utility:</span>{" "}
          <span className="font-medium text-eco-text-primary">
            {formatKwh(rec.utility_kwh)}
          </span>
        </p>
      </div>
    </div>
  );
}

export function ProductionChart({
  records,
  figureNumber = "I",
  caption = "Monthly Production · 2024",
}: Props) {
  const data = records.map((r) => ({
    ...r,
    month: formatMonthAxis(r.period_start),
  }));

  return (
    <div>
      <div className="w-full" style={{ height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 24, bottom: 8, left: 0 }}
          >
            <CartesianGrid stroke="#E8F0EA" vertical={false} />
            <XAxis
              dataKey="month"
              tick={tickStyle}
              tickLine={false}
              axisLine={{ stroke: "#C8D4CA" }}
            />
            <YAxis
              tick={tickStyle}
              tickLine={false}
              axisLine={{ stroke: "#C8D4CA" }}
              tickFormatter={formatKwhCompact}
              width={56}
            />
            <Tooltip
              cursor={{ fill: "rgba(118, 201, 69, 0.08)" }}
              content={<ChartTooltip />}
            />
            <Bar
              dataKey="inverter_kwh"
              name="Inverter (actual)"
              shape={(props: unknown) => {
                const { x, y, width, height, payload } = props as {
                  x: number;
                  y: number;
                  width: number;
                  height: number;
                  payload: VerificationRecord;
                };
                const fill =
                  payload.status === "flagged" ? COLOR_FLAGGED : COLOR_VERIFIED;
                return <rect x={x} y={y} width={width} height={height} fill={fill} />;
              }}
            />
            <Line
              dataKey="expected_kwh"
              name="Expected"
              type="monotone"
              stroke={COLOR_EXPECTED}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ stroke: COLOR_EXPECTED, fill: "#fff", r: 3, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-tag text-eco-text-muted">
        FIG. {figureNumber} · {caption}
      </p>
    </div>
  );
}

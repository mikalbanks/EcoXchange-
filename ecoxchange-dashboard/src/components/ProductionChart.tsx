import { useEffect, useRef, useState } from "react";
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
import { X } from "lucide-react";
import type { VerificationRecord } from "../utils/types.js";
import { palette } from "../config/palette.js";
import { useIsMobile } from "../hooks/useMediaQuery.js";
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

const MOBILE_WINDOW = 6; // months visible at once on mobile
const RANGE_STEP = 3; // months shifted per Earlier/Later tap or swipe
const SWIPE_THRESHOLD_PX = 48;

export function ProductionChart({ records }: Props) {
  const isMobile = useIsMobile();

  const data: Datum[] = records.map((r) => ({
    month: formatMonthShort(r.period_start),
    monthIso: r.period_start,
    actual: r.inverter_kwh,
    expected: r.expected_kwh,
    deviation: r.inv_vs_expected_pct,
    status: r.status,
  }));

  const maxStart = Math.max(0, data.length - MOBILE_WINDOW);
  const [start, setStart] = useState(maxStart);
  const [selected, setSelected] = useState<Datum | null>(null);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);

  // Re-anchor to the latest window (and drop any open panel) when the dataset
  // changes — e.g. the demo scenario flips between verified and flagged.
  useEffect(() => {
    setStart(Math.max(0, records.length - MOBILE_WINDOW));
    setSelected(null);
  }, [records]);

  const clampedStart = Math.min(start, maxStart);
  const visible = isMobile
    ? data.slice(clampedStart, clampedStart + MOBILE_WINDOW)
    : data;

  const shiftRange = (delta: number) => {
    setStart((s) => Math.min(maxStart, Math.max(0, s + delta)));
    setSelected(null);
  };

  // Horizontal swipe shifts the visible month range (mobile only). Passive
  // touch handlers are fine: we never preventDefault, just read the delta.
  const onTouchStart = (e: React.TouchEvent) => {
    touchOrigin.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !touchOrigin.current) return;
    const dx = e.changedTouches[0].clientX - touchOrigin.current.x;
    const dy = e.changedTouches[0].clientY - touchOrigin.current.y;
    touchOrigin.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;
    // Swipe left = slide the window toward later months (natural scroll).
    shiftRange(dx < 0 ? RANGE_STEP : -RANGE_STEP);
  };

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className={isMobile ? "w-full h-60" : "w-full h-80"}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visible}
            margin={{ top: 16, right: 16, bottom: 8, left: 8 }}
            onClick={
              isMobile
                ? (state) => {
                    const payload = state?.activePayload?.[0]?.payload as
                      | Datum
                      | undefined;
                    if (payload) {
                      setSelected((prev) =>
                        prev?.monthIso === payload.monthIso ? null : payload,
                      );
                    }
                  }
                : undefined
            }
          >
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
              label={
                isMobile
                  ? undefined
                  : {
                      value: "kWh",
                      angle: -90,
                      position: "insideLeft",
                      fill: palette.textMuted,
                      fontSize: 12,
                    }
              }
            />
            {/* Mobile replaces the floating tooltip with a tap-to-open panel
                below the chart (floating tooltips get cut off at 375px). */}
            {!isMobile && <Tooltip content={<ChartTooltip />} />}
            {!isMobile && (
              <Legend
                wrapperStyle={{ fontSize: 12, color: palette.textMuted }}
                iconType="circle"
              />
            )}
            <Bar
              dataKey="actual"
              name="Actual production"
              radius={[4, 4, 0, 0]}
              barSize={isMobile ? 24 : undefined}
            >
              {visible.map((d, idx) => (
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

      {isMobile && (
        <>
          {/* Month-range navigation */}
          <div className="mt-1 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => shiftRange(-RANGE_STEP)}
              disabled={clampedStart === 0}
              className="min-h-[44px] px-3 text-sm text-medGreen disabled:opacity-30"
            >
              ← Earlier
            </button>
            {visible.length > 0 && (
              <span className="font-mono text-xs text-textMuted">
                {formatMonth(visible[0].monthIso)} –{" "}
                {formatMonth(visible[visible.length - 1].monthIso)}
              </span>
            )}
            <button
              type="button"
              onClick={() => shiftRange(RANGE_STEP)}
              disabled={clampedStart >= maxStart}
              className="min-h-[44px] px-3 text-sm text-medGreen disabled:opacity-30"
            >
              Later →
            </button>
          </div>

          {/* Stacked legend (Recharts inline legend is cramped at 375px) */}
          <div className="mt-1 flex flex-col gap-1 px-1 text-xs text-textMuted">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: palette.medGreen }}
              />
              Actual production
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4"
                style={{
                  backgroundImage: `repeating-linear-gradient(90deg, ${palette.lightGreen} 0 6px, transparent 6px 10px)`,
                }}
              />
              Expected
            </span>
          </div>

          {selected && (
            <MobileTooltipPanel d={selected} onClose={() => setSelected(null)} />
          )}
        </>
      )}
    </div>
  );
}

/** Full-width tap-tooltip replacement rendered below the chart on mobile. */
function MobileTooltipPanel({ d, onClose }: { d: Datum; onClose: () => void }) {
  return (
    <div className="mt-3 animate-fade-in rounded-lg border border-paleGreen bg-white p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between">
        <div className="font-medium text-darkBg">{formatMonth(d.monthIso)}</div>
        <button
          type="button"
          aria-label="Close details"
          onClick={onClose}
          className="-m-2 flex h-11 w-11 items-center justify-center text-textMuted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <TooltipBody d={d} />
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
    <div className="bg-white border border-paleGreen rounded-md shadow-lg px-3 py-2 text-sm min-w-[200px]">
      <div className="font-medium text-darkBg mb-1.5">
        {formatMonth(d.monthIso)}
      </div>
      <TooltipBody d={d} />
    </div>
  );
}

/** Shared tooltip content: expected/actual rows, deviation, status. */
function TooltipBody({ d }: { d: Datum }) {
  const actualColor = d.status === "flagged" ? palette.flagAmber : palette.medGreen;
  const deviationKwh = Math.round(d.actual - d.expected);
  const deviationSign = deviationKwh >= 0 ? "+" : "";
  return (
    <>
      <Row dot={palette.lightGreen} label="Expected" value={formatKwh(Math.round(d.expected))} />
      <Row dot={actualColor} label="Actual" value={formatKwh(Math.round(d.actual))} />
      <div className="mt-1.5 pt-1.5 border-t border-paleGreen/60 text-textMuted">
        Deviation: {deviationSign}
        {deviationKwh.toLocaleString()} kWh ({formatPct(d.deviation)})
      </div>
      <div
        className={`mt-1 uppercase text-xs font-semibold ${
          d.status === "flagged" ? "text-flagAmber" : "text-medGreen"
        }`}
      >
        {d.status}
      </div>
    </>
  );
}

function Row({
  dot,
  label,
  value,
}: {
  dot: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-textMuted">
        <span
          className="h-2 w-2 rounded-full inline-block"
          style={{ backgroundColor: dot }}
        />
        {label}
      </span>
      <span className="text-textDark tabular-nums">{value}</span>
    </div>
  );
}

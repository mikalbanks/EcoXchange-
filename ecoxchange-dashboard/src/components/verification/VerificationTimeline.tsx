// Monthly verification timeline (Spec 3, Component B): a horizontal dot row
// over 12–24 months of verification history — green verified, amber
// flagged, gray pending — with a deviation sparkline underneath that makes
// drift visible against the ±15% tolerance band. Clicking a month hands
// the record to the host page (which typically expands the
// ReconciliationDiagram inline).

import type { VerificationRecord } from "../../utils/types.js";
import { formatMonthShort, formatPct } from "../../utils/formatters.js";

const TOLERANCE_PCT = 15;

interface Props {
  records: VerificationRecord[];
  onSelect?: (record: VerificationRecord) => void;
  selectedPeriod?: string | null;
}

const DOT_CLASSES: Record<VerificationRecord["status"], string> = {
  verified: "bg-accentBrt border-accentBrt",
  flagged: "bg-flagAmber border-flagAmber",
  pending: "bg-transparent border-gray-400",
};

function Sparkline({ records }: { records: VerificationRecord[] }) {
  const width = 100; // viewBox units; preserveAspectRatio stretches to fit
  const height = 36;
  const scale = 25; // ±25% vertical range
  const y = (pct: number) =>
    height / 2 - (Math.max(-scale, Math.min(scale, pct)) / scale) * (height / 2);
  const x = (i: number) =>
    records.length > 1 ? (i / (records.length - 1)) * width : width / 2;
  const points = records
    .map((r, i) => `${x(i).toFixed(2)},${y(r.inv_vs_expected_pct).toFixed(2)}`)
    .join(" ");
  const bandTop = y(TOLERANCE_PCT);
  const bandBottom = y(-TOLERANCE_PCT);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-12 w-full"
      role="img"
      aria-label="Deviation from expected generation by month, with the ±15% tolerance band"
    >
      {/* tolerance band */}
      <rect
        x={0}
        y={bandTop}
        width={width}
        height={bandBottom - bandTop}
        fill="#C8E8D4"
        opacity={0.35}
      />
      {/* zero line */}
      <line
        x1={0}
        x2={width}
        y1={height / 2}
        y2={height / 2}
        stroke="#8DC4A4"
        strokeWidth={0.4}
        strokeDasharray="1.5 1.5"
      />
      <polyline
        points={points}
        fill="none"
        stroke="#2E7D52"
        strokeWidth={0.8}
        vectorEffect="non-scaling-stroke"
      />
      {records.map((r, i) => (
        <circle
          key={r.period_start}
          cx={x(i)}
          cy={y(r.inv_vs_expected_pct)}
          r={1.4}
          fill={r.status === "flagged" ? "#D97706" : "#2E7D52"}
        />
      ))}
    </svg>
  );
}

export function VerificationTimeline({
  records,
  onSelect,
  selectedPeriod,
}: Props) {
  if (records.length === 0) return null;

  return (
    <div data-testid="verification-timeline">
      {/* Dot row — horizontal scroll beyond ~12 months on narrow screens */}
      <div className="overflow-x-auto">
        <div
          className="flex min-w-[480px] items-start"
          role="listbox"
          aria-label="Verification history by month"
        >
          {records.map((r, i) => {
            const selected = r.period_start === selectedPeriod;
            const monthLabel = formatMonthShort(r.period_start);
            // Label every month ≤12 records on sm+; every 3rd on tight rows.
            const showLabel = records.length <= 12 || i % 3 === 0;
            return (
              <button
                key={r.period_start}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={`${monthLabel} ${r.period_start.slice(0, 4)}: ${r.status}, deviation ${formatPct(r.inv_vs_expected_pct)}`}
                title={`${monthLabel} · ${r.status.toUpperCase()} · ${formatPct(r.inv_vs_expected_pct)}`}
                onClick={() => onSelect?.(r)}
                className="flex min-h-[44px] flex-1 flex-col items-center gap-1.5 pt-1"
              >
                <span
                  className={`block rounded-full border-2 transition-all duration-150 ${DOT_CLASSES[r.status]} ${
                    selected
                      ? "h-4 w-4 ring-2 ring-darkBg/30 ring-offset-1"
                      : "h-3 w-3"
                  } ${r.status === "flagged" ? "animate-badge-pulse" : ""}`}
                  aria-hidden
                />
                <span
                  className={`font-mono text-[10px] ${
                    selected ? "font-semibold text-darkBg" : "text-textMuted"
                  }`}
                >
                  {showLabel ? monthLabel : " "}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Deviation sparkline */}
      <div className="mt-1">
        <Sparkline records={records} />
        <div className="flex items-center justify-between font-mono text-[10px] text-textMuted">
          <span>
            {formatMonthShort(records[0].period_start)}{" "}
            {records[0].period_start.slice(0, 4)}
          </span>
          <span>deviation vs expected · band ±{TOLERANCE_PCT}%</span>
          <span>
            {formatMonthShort(records[records.length - 1].period_start)}{" "}
            {records[records.length - 1].period_start.slice(0, 4)}
          </span>
        </div>
      </div>
    </div>
  );
}

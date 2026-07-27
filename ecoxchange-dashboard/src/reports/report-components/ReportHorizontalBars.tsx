// CSS horizontal comparison bars (capacity factor in context; cost
// comparison). Static divs for html2canvas.

export interface HorizontalBarRow {
  label: string;
  valueLabel: string;
  /** 0–100, relative to the row set's scale. */
  widthPct: number;
  /** Tailwind bg class for the fill. */
  fillClass: string;
  /** Optional secondary (hatched-style) segment appended after the fill. */
  rangeWidthPct?: number;
}

export function ReportHorizontalBars({ rows }: { rows: HorizontalBarRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-[11px] font-medium text-textDark">
              {row.label}
            </span>
            <span className="font-mono text-[11px] font-bold text-darkBg tabular-nums">
              {row.valueLabel}
            </span>
          </div>
          <div className="flex h-5 w-full bg-paleGreen/30">
            <div
              className={`h-full ${row.fillClass}`}
              style={{ width: `${Math.min(100, row.widthPct)}%` }}
            />
            {row.rangeWidthPct ? (
              <div
                className="h-full"
                style={{
                  width: `${Math.min(100, row.rangeWidthPct)}%`,
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(107,114,128,0.55) 0 5px, rgba(107,114,128,0.25) 5px 10px)",
                }}
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

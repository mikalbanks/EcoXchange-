// CSS vertical bar chart for the report's monthly production profile.
// Plain divs only — html2canvas rasterizes styled divs reliably where SVG
// (Recharts) is not dependable. Bars are self-labeling (MWh above, month
// letter below), so no y-axis.

import type { MonthlyBar } from "../report-utils/report-model.js";

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function monthShort(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

export function ReportBarChart({
  bars,
  maxKwh,
}: {
  bars: MonthlyBar[];
  maxKwh: number;
}) {
  const maxBarHeight = 190; // px, inside a 240px-tall chart area

  return (
    <div className="w-full">
      <div className="flex items-end gap-2" style={{ height: "240px" }}>
        {bars.map((bar, i) => {
          const h = Math.max(6, (bar.kwh / maxKwh) * maxBarHeight);
          return (
            <div
              key={bar.month}
              className="relative flex flex-1 flex-col items-center justify-end"
            >
              <span className="mb-1 font-mono text-[9px] text-darkBg tabular-nums">
                {bar.mwhLabel}
              </span>
              <div
                className="w-full bg-medGreen"
                style={{ height: `${h}px` }}
              />
              <span className="mt-1 font-mono text-[9px] text-textMuted">
                {bars.length <= 12 ? monthShort(bar.month) : MONTH_LETTERS[i % 12]}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-right font-mono text-[8px] text-textMuted">
        Bars: expected monthly generation, MWh
      </p>
    </div>
  );
}

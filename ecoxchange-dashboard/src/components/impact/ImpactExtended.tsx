import { fmtInt, fmtAcres, fmtKwh } from "./format.js";
import type { ImpactMetrics } from "../../types/impact.js";

interface Row {
  icon: string;
  value: string;
  label: string;
}

// 2x2 grid of additional equivalencies.
export function ImpactExtended({ impact }: { impact: ImpactMetrics }) {
  const rows: Row[] = [
    {
      icon: "⛽",
      value: `${fmtInt(impact.gallons_gas_avoided)} gallons`,
      label: "of gasoline avoided",
    },
    {
      icon: "🚗",
      value: `${fmtInt(impact.miles_driving_avoided)} miles`,
      label: "of driving avoided",
    },
    {
      icon: "🌲",
      value: `${fmtAcres(impact.acres_forest_equivalent)} acres`,
      label: "of forest (1 year)",
    },
    {
      icon: "⚡",
      value: fmtKwh(impact.verified_kwh),
      label: "production input",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-center gap-4 rounded-xl border border-paleGreen/60 bg-white p-5 shadow-sm"
        >
          <div className="text-3xl" aria-hidden="true">
            {r.icon}
          </div>
          <div>
            <div className="font-mono text-xl font-bold text-darkBg tabular-nums">
              {r.value}
            </div>
            <div className="text-sm text-textMuted">{r.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

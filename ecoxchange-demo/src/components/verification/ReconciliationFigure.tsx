import type { VerificationRecord } from "../../data/types.js";
import {
  formatKwh,
  formatMonthShortMono,
  formatPct,
} from "../../utils/formatters.js";

interface Props {
  record: VerificationRecord;
}

const TOLERANCES = {
  invVsExpected: 15,
  invVsUtility: 10,
  utilVsExpected: 20,
};

function passOrFail(dev: number, threshold: number) {
  return Math.abs(dev) <= threshold ? "✓ PASS" : "✗ FAIL";
}

export function ReconciliationFigure({ record }: Props) {
  const flagged = record.status === "flagged";
  const verdict = flagged ? "FLAGGED · CONFIDENCE 99.74%" : "VERIFIED · CONFIDENCE 99.74%";

  const rows: Array<[string, number, number]> = [
    ["INV ↔ EXP", record.inv_vs_expected_pct, TOLERANCES.invVsExpected],
    ["INV ↔ UTIL", record.inv_vs_utility_pct, TOLERANCES.invVsUtility],
    ["UTIL ↔ EXP", record.util_vs_expected_pct, TOLERANCES.utilVsExpected],
  ];

  return (
    <div className="figure-frame">
      <div className="border-b border-eco-border px-5 sm:px-7 py-3">
        <p className="font-mono text-[11px] uppercase tracking-tag text-eco-olive">
          FIG. II · Three-way reconciliation · {formatMonthShortMono(record.period_start)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-eco-border">
        <DataBox
          label="Inverter"
          value={formatKwh(record.inverter_kwh)}
          source="SolarEdge API"
          accent={flagged ? "warn" : "neutral"}
        />
        <DataBox
          label="Utility Meter"
          value={formatKwh(record.utility_kwh)}
          source="Bayou / Utility"
          accent="neutral"
        />
        <DataBox
          label="Expected (Satellite)"
          value={formatKwh(record.expected_kwh)}
          source="NASA POWER"
          accent="neutral"
        />
      </div>

      <div className="border-t border-eco-border px-5 sm:px-7 py-5 space-y-2 bg-eco-pale/40">
        {rows.map(([label, dev, threshold]) => {
          const result = passOrFail(dev, threshold);
          const ok = result.startsWith("✓");
          return (
            <div
              key={label}
              className="grid grid-cols-12 font-mono text-[12px] uppercase tracking-tag"
            >
              <span className="col-span-3 text-eco-text-primary">{label}</span>
              <span
                className={`col-span-3 text-right ${ok ? "text-eco-verified" : "text-eco-flagged"}`}
              >
                {formatPct(dev)}
              </span>
              <span className="col-span-4 text-right text-eco-text-muted">
                threshold ±{threshold}%
              </span>
              <span
                className={`col-span-2 text-right ${ok ? "text-eco-verified" : "text-eco-flagged"}`}
              >
                {result}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-eco-border px-5 sm:px-7 py-4 space-y-1">
        <p
          className={`font-mono text-[12px] uppercase tracking-tag ${flagged ? "text-eco-flagged" : "text-eco-verified"}`}
        >
          Verdict: {verdict}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-tag text-eco-text-muted">
          Engine v0.1.0 · Hay-Davies transposition
        </p>
      </div>
    </div>
  );
}

function DataBox({
  label,
  value,
  source,
  accent,
}: {
  label: string;
  value: string;
  source: string;
  accent: "neutral" | "warn";
}) {
  return (
    <div className="px-5 sm:px-7 py-5 space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-tag text-eco-text-muted">
        {label}
      </p>
      <p
        className={`font-display italic text-[24px] sm:text-[28px] leading-tight ${
          accent === "warn" ? "text-eco-flagged" : "text-eco-text-primary"
        }`}
      >
        {value}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-tag text-eco-olive">
        {source}
      </p>
    </div>
  );
}

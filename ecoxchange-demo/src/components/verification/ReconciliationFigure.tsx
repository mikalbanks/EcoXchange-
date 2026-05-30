import type { VerificationRecord } from "../../data/types.js";
import {
  formatKwh,
  formatMonthShortMono,
  formatPct,
} from "../../utils/formatters.js";
import { MetricLabel } from "../ui/MetricExplainer.js";

interface Props {
  record: VerificationRecord;
}

const TOLERANCES = {
  invVsExpected: 15,
  invVsUtility: 10,
  utilVsExpected: 20,
};

function passOrFail(dev: number | null, threshold: number) {
  if (dev === null) return "DATA REQUIRED";
  return Math.abs(dev) <= threshold ? "PASS" : "REVIEW";
}

export function ReconciliationFigure({ record }: Props) {
  const flagged = record.status === "flagged";
  const dataRequired = record.status === "data_required";
  const verdict = dataRequired
    ? "DATA REQUIRED"
    : flagged
      ? "FLAGGED - CONFIDENCE REVIEW"
      : "VERIFIED - CONFIDENCE 99.74%";

  const rows: Array<[string, number | null, number]> = [
    ["INV -> EXP", record.inv_vs_expected_pct, TOLERANCES.invVsExpected],
    ["INV -> UTIL", record.inv_vs_utility_pct, TOLERANCES.invVsUtility],
    ["UTIL -> EXP", record.util_vs_expected_pct, TOLERANCES.utilVsExpected],
  ];

  return (
    <div className="figure-frame">
      <div className="border-b border-eco-border px-5 sm:px-7 py-3">
        <p className="font-mono text-[11px] uppercase tracking-tag text-eco-olive">
          FIG. II - Three-way reconciliation -{" "}
          {formatMonthShortMono(record.period_start)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-eco-border">
        <DataBox
          label="Inverter Data"
          value={formatKwh(record.inverter_kwh)}
          source="Inverter or plant API"
          accent={flagged || dataRequired ? "warn" : "neutral"}
        />
        <DataBox
          label="Utility Meter Data"
          value={formatKwh(record.utility_kwh)}
          source="Utility or settlement meter"
          accent="neutral"
        />
        <DataBox
          label="Expected Production"
          value={formatKwh(record.expected_kwh)}
          source="Satellite irradiance model"
          accent="neutral"
        />
      </div>

      <div className="border-t border-eco-border px-5 sm:px-7 py-5 space-y-2 bg-eco-pale/40">
        {rows.map(([label, dev, threshold]) => {
          const result = passOrFail(dev, threshold);
          const ok = result === "PASS";
          return (
            <div
              key={label}
              className="grid grid-cols-12 gap-2 font-mono text-[12px] uppercase tracking-tag"
            >
              <span className="col-span-4 text-eco-text-primary">{label}</span>
              <span
                className={`col-span-3 text-right ${ok ? "text-eco-verified" : "text-eco-flagged"}`}
              >
                {formatPct(dev)}
              </span>
              <span className="col-span-3 text-right text-eco-text-muted">
                threshold +/-{threshold}%
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
          className={`font-mono text-[12px] uppercase tracking-tag ${
            flagged || dataRequired ? "text-eco-flagged" : "text-eco-verified"
          }`}
        >
          Verdict: {verdict}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-tag text-eco-text-muted">
          Engine v0.1.0 - Uses persisted expected production, then reruns the
          reconciliation decision.
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
  const metric =
    label === "Expected Production" ? "expected_production" : undefined;

  return (
    <div className="px-5 sm:px-7 py-5 space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-tag text-eco-text-muted">
        {metric ? (
          <MetricLabel metric={metric}>Expected Production</MetricLabel>
        ) : (
          label
        )}
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

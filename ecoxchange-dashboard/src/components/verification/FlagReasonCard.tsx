// Plain-language explanation of a FLAGGED month (Spec 3, Component D).
// Shows the raw flag reasons and — when the anomaly classifier has run
// (Spec 7) — the likely cause, confidence, and a recommended action.

import { AlertTriangle } from "lucide-react";
import type {
  AnomalyCategory,
  VerificationRecord,
} from "../../utils/types.js";
import { formatMonthLong, formatPct } from "../../utils/formatters.js";

const CATEGORY_LABELS: Record<AnomalyCategory, string> = {
  weather_anomaly: "Weather Anomaly",
  inverter_fault: "Inverter Fault",
  soiling: "Soiling",
  curtailment: "Curtailment",
  meter_error: "Meter Error",
  degradation: "Degradation",
  unknown: "Unknown",
};

export function FlagReasonCard({ record }: { record: VerificationRecord }) {
  if (record.status !== "flagged") return null;
  const classification = record.classification;

  return (
    <div
      className="border-l-4 border-flagAmber bg-amber-50 p-4 sm:p-5"
      data-testid="flag-reason-card"
    >
      <p className="flex items-center gap-2 font-medium text-darkBg">
        <AlertTriangle className="h-4 w-4 shrink-0 text-flagAmber" aria-hidden />
        Production flagged for {formatMonthLong(record.period_start)}
      </p>

      {classification ? (
        <div className="mt-3">
          <p className="font-mono text-xs uppercase tracking-wide text-textMuted">
            Classification
          </p>
          <p className="mt-1">
            <span className="inline-flex items-center gap-2 bg-flagAmber/15 px-2.5 py-1 font-mono text-sm font-semibold uppercase tracking-wide text-flagAmber">
              {CATEGORY_LABELS[classification.category]}
            </span>
            <span className="ml-2 text-xs text-textMuted">
              {classification.confidence} confidence
            </span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-textDark">
            {classification.reasoning}
          </p>
          <p className="mt-3 border border-flagAmber/30 bg-white/70 px-3 py-2 text-sm text-textDark">
            <span className="font-medium">Recommended action:</span>{" "}
            {classification.recommended_action}
          </p>
        </div>
      ) : null}

      <div className="mt-3">
        <p className="font-mono text-xs uppercase tracking-wide text-textMuted">
          Raw deviations
        </p>
        <ul className="mt-1 space-y-0.5 font-mono text-xs text-textDark tabular-nums">
          <li>Inverter vs Expected: {formatPct(record.inv_vs_expected_pct)}</li>
          <li>
            Inverter vs Utility:{" "}
            {record.inv_vs_utility_pct != null
              ? formatPct(record.inv_vs_utility_pct)
              : "—"}
          </li>
          <li>
            Utility vs Expected:{" "}
            {record.util_vs_expected_pct != null
              ? formatPct(record.util_vs_expected_pct)
              : "—"}
          </li>
        </ul>
      </div>

      {record.flag_reasons.length > 0 ? (
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-textDark">
          {record.flag_reasons.map((reason) => (
            <li key={reason.slice(0, 48)}>{reason}</li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-xs text-textMuted">
        This flag does not stop the verification process — it triggers manual
        review before distributions are released.
      </p>
    </div>
  );
}

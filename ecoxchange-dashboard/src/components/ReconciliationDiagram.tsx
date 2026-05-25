import { Check, X } from "lucide-react";
import type { VerificationRecord } from "../utils/types.js";
import { formatKwh, formatPct } from "../utils/formatters.js";

const TOL = {
  inv_vs_expected: 15,
  inv_vs_utility: 10,
  util_vs_expected: 20,
};

function Source({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex-1 rounded-lg border p-4 text-center ${
        highlight
          ? "bg-paleGreen border-medGreen"
          : "bg-white border-paleGreen"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-textMuted">{label}</div>
      <div className="font-heading text-2xl text-darkBg mt-2">
        {value === null ? "—" : formatKwh(value)}
      </div>
    </div>
  );
}

function Comparison({
  label,
  pct,
  tolerance,
}: {
  label: string;
  pct: number | null | undefined;
  tolerance: number;
}) {
  if (pct === null || pct === undefined) {
    return (
      <div className="flex items-center justify-between bg-cream border border-paleGreen rounded-md px-3 py-2 text-sm">
        <span className="text-textMuted">{label}</span>
        <span className="text-textMuted">N/A · tolerance ±{tolerance}%</span>
      </div>
    );
  }
  const within = Math.abs(pct) <= tolerance;
  return (
    <div className="flex items-center justify-between bg-white border border-paleGreen rounded-md px-3 py-2 text-sm">
      <span className="text-textDark">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-textDark">{formatPct(pct)}</span>
        <span className="text-textMuted">±{tolerance}%</span>
        {within ? (
          <Check className="h-4 w-4 text-accentBrt" />
        ) : (
          <X className="h-4 w-4 text-flagAmber" />
        )}
      </span>
    </div>
  );
}

export function ReconciliationDiagram({ record }: { record: VerificationRecord }) {
  return (
    <div className="bg-white rounded-lg border border-paleGreen/60 p-6">
      <h2 className="font-heading text-xl text-darkBg mb-4">
        Three-Way Reconciliation
      </h2>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Source label="Inverter" value={record.inverter_kwh} />
        <Source label="Utility Meter" value={record.utility_kwh} />
        <Source label="Expected (Satellite)" value={record.expected_kwh} highlight />
      </div>
      <div className="space-y-2">
        <Comparison
          label="Inverter vs Expected"
          pct={record.inv_vs_expected_pct}
          tolerance={TOL.inv_vs_expected}
        />
        <Comparison
          label="Inverter vs Utility"
          pct={record.inv_vs_utility_pct}
          tolerance={TOL.inv_vs_utility}
        />
        <Comparison
          label="Utility vs Expected"
          pct={record.util_vs_expected_pct}
          tolerance={TOL.util_vs_expected}
        />
      </div>
      {record.flag_reasons.length > 0 ? (
        <div className="mt-6 rounded-md bg-amber-50 border border-flagAmber/40 p-4">
          <div className="text-xs uppercase tracking-wide text-flagAmber font-semibold mb-2">
            Flag Reasons
          </div>
          <ul className="list-disc list-inside text-sm text-textDark space-y-1">
            {record.flag_reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

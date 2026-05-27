import { formatKwh, formatPct } from "../../utils/formatters.js";
import type { VerificationRecord } from "../../utils/types.js";

interface Props {
  records: VerificationRecord[];
}

export function EiaComparisonStats({ records }: Props) {
  const valid = records.filter((r) => r.expected_kwh > 0);
  const totalExpected = valid.reduce((s, r) => s + r.expected_kwh, 0);
  const totalActual = valid.reduce((s, r) => s + r.inverter_kwh, 0);
  const deviation =
    totalExpected > 0 ? ((totalActual - totalExpected) / totalExpected) * 100 : 0;
  const within10Months = valid.filter(
    (r) => Math.abs(r.inv_vs_expected_pct) <= 10,
  ).length;
  return (
    <div className="bg-white rounded-lg border border-paleGreen/60 p-5">
      <h2 className="font-heading text-lg text-darkBg mb-3">
        EIA-Reported vs Engine-Expected
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <Stat label="EIA Actual (annual)" value={formatKwh(totalActual)} />
        <Stat label="Engine Expected" value={formatKwh(totalExpected)} />
        <Stat
          label="Deviation"
          value={formatPct(deviation)}
          accent={Math.abs(deviation) <= 10 ? "good" : "warn"}
        />
        <Stat
          label="Months within ±10%"
          value={`${within10Months} / ${valid.length}`}
        />
      </div>
      <p className="text-xs text-textMuted mt-3">
        "Inverter" series for reference plants is EIA Form 923 metered net
        generation — the federal ground truth. The Production chart above
        plots EIA actuals (bars) against the engine's expected (dashed line).
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "good" | "warn";
}) {
  const color =
    accent === "good"
      ? "text-medGreen"
      : accent === "warn"
        ? "text-flagAmber"
        : "text-darkBg";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-textMuted">
        {label}
      </div>
      <div className={`mt-1 font-heading text-xl ${color}`}>{value}</div>
    </div>
  );
}

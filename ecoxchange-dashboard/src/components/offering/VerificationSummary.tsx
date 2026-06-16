import { Link } from "react-router-dom";
import { ArrowRight, Satellite, Gauge, Cpu } from "lucide-react";
import type { OfferingSummary } from "../../types/offerings.js";
import { VerificationBadge } from "../VerificationBadge.js";
import { pct, ratioPct } from "./format.js";

const DATA_SOURCES = [
  { icon: Cpu, label: "Inverter API" },
  { icon: Gauge, label: "Utility meter" },
  { icon: Satellite, label: "NASA POWER satellite" },
];

// Production verification panel: backtest accuracy, live engine status, and the
// three reconciliation data sources.
export function VerificationSummary({ offering }: { offering: OfferingSummary }) {
  const within = offering.backtest_months_within_10pct;
  const deviation = offering.backtest_mean_deviation;
  const summary = offering.verification_summary;

  return (
    <div className="rounded-xl border border-paleGreen/60 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-xl text-darkBg">Backtest Results</h3>
        {summary ? <VerificationBadge status={summary.latest_status} /> : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Metric
          label="Mean Deviation"
          value={deviation != null ? pct(deviation) : "—"}
        />
        <Metric
          label="Months Within ±10%"
          value={within != null ? ratioPct(within, 0) : "—"}
        />
        <Metric
          label="Months Verified"
          value={summary ? String(summary.total_months_verified) : "—"}
        />
      </div>

      <div className="mt-5 border-t border-paleGreen/50 pt-5">
        <div className="flex items-center gap-2 text-sm font-medium text-darkBg">
          <span className="h-2 w-2 rounded-full bg-accentBrt" />
          Verification engine: active · 3-source reconciliation
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {DATA_SOURCES.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full bg-paleGreen/40 px-3 py-1 text-xs font-medium text-darkBg"
            >
              <Icon className="h-3.5 w-3.5 text-medGreen" />
              {label}
            </span>
          ))}
        </div>
      </div>

      <Link
        to={`/investor/project/${offering.project_id}`}
        className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-medGreen hover:text-darkBg"
      >
        View 12-month backtest <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-cream/60 p-4">
      <div className="text-xs uppercase tracking-wide text-textMuted">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold text-darkBg tabular-nums">
        {value}
      </div>
    </div>
  );
}

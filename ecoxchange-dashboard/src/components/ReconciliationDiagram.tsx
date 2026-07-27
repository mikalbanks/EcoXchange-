import { Check, X } from "lucide-react";
import type { CSSProperties } from "react";
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
      <div className="flex flex-wrap items-center justify-between gap-2 bg-cream border border-paleGreen rounded-md px-3 py-2 text-sm">
        <span className="text-textMuted">{label}</span>
        <span className="text-textMuted">N/A · tolerance ±{tolerance}%</span>
      </div>
    );
  }
  const within = Math.abs(pct) <= tolerance;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-paleGreen rounded-md px-3 py-2 text-sm">
      <span className="text-textDark">{label}</span>
      <span className="flex items-center gap-2 tabular-nums">
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

/** Vertical connector shown between stacked source cards on mobile: a line
 *  with the pairwise deviation as a pill badge, colored by tolerance. */
function MobileConnector({
  pct,
  tolerance,
}: {
  pct: number | null | undefined;
  tolerance: number;
}) {
  const within = pct != null && Math.abs(pct) <= tolerance;
  return (
    <div className="sm:hidden flex flex-col items-center" aria-hidden>
      <span className="h-3 w-px bg-paleGreen" />
      <span
        className={`rounded-full border px-2.5 py-0.5 font-mono text-xs tabular-nums ${
          pct == null
            ? "border-paleGreen bg-cream text-textMuted"
            : within
              ? "border-medGreen/40 bg-paleGreen/50 text-medGreen"
              : "border-flagAmber/40 bg-amber-50 text-flagAmber"
        }`}
      >
        {pct == null ? "N/A" : `${formatPct(pct)} dev`}
      </span>
      <span className="h-3 w-px bg-paleGreen" />
    </div>
  );
}

/** Staggered CSS entrance (Spec 3): fade the source cards in one by one,
 *  slide the comparison rows down, pulse the flag box once. CSS-only per
 *  house style; animationFillMode backwards hides elements until their
 *  delayed animation starts. */
function staggerClass(animateOn: boolean): string {
  return animateOn ? " animate-fade-in" : "";
}

function staggerStyle(
  animateOn: boolean,
  delayMs: number,
): CSSProperties | undefined {
  if (!animateOn) return undefined;
  return {
    animationDelay: `${delayMs}ms`,
    animationFillMode: "backwards",
  };
}

export function ReconciliationDiagram({
  record,
  animate = false,
  showFlagReasons = true,
}: {
  record: VerificationRecord;
  /** Opt-in entrance animation for click-to-expand contexts (default off,
   *  so existing pages render exactly as before). */
  animate?: boolean;
  /** Set false when a FlagReasonCard is rendered alongside, to avoid
   *  repeating the same reasons twice. */
  showFlagReasons?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-paleGreen/60 p-4 sm:p-6">
      <h2 className="font-heading text-xl text-darkBg mb-4">
        Three-Way Reconciliation
      </h2>
      {/* Mobile: vertical Inverter -> Expected -> Utility stack with deviation
          connectors (DOM order = mobile order). Desktop (sm+): reordered via
          sm:order-* back to the original Inverter / Utility / Expected row. */}
      <div className="flex flex-col sm:flex-row gap-0 sm:gap-3 mb-6">
        <div
          className={`sm:order-1 flex-1 flex${staggerClass(animate)}`}
          style={staggerStyle(animate, 0)}
        >
          <Source label="Inverter" value={record.inverter_kwh} />
        </div>
        <MobileConnector
          pct={record.inv_vs_expected_pct}
          tolerance={TOL.inv_vs_expected}
        />
        <div
          className={`sm:order-3 flex-1 flex${staggerClass(animate)}`}
          style={staggerStyle(animate, 240)}
        >
          <Source label="Expected (Satellite)" value={record.expected_kwh} highlight />
        </div>
        <MobileConnector
          pct={record.util_vs_expected_pct}
          tolerance={TOL.util_vs_expected}
        />
        <div
          className={`sm:order-2 flex-1 flex${staggerClass(animate)}`}
          style={staggerStyle(animate, 120)}
        >
          <Source label="Utility Meter" value={record.utility_kwh} />
        </div>
      </div>
      <div className="space-y-2">
        {(
          [
            ["Inverter vs Expected", record.inv_vs_expected_pct, TOL.inv_vs_expected],
            ["Inverter vs Utility", record.inv_vs_utility_pct, TOL.inv_vs_utility],
            ["Utility vs Expected", record.util_vs_expected_pct, TOL.util_vs_expected],
          ] as const
        ).map(([label, pct, tolerance], i) => (
          <div
            key={label}
            className={animate ? "animate-slide-down" : undefined}
            style={staggerStyle(animate, 360 + i * 100)}
          >
            <Comparison label={label} pct={pct} tolerance={tolerance} />
          </div>
        ))}
      </div>
      {showFlagReasons && record.flag_reasons.length > 0 ? (
        <div
          className={`mt-6 rounded-md bg-amber-50 border border-flagAmber/40 p-4 ${
            animate ? "animate-badge-pulse" : ""
          }`}
          style={
            animate
              ? { animationDelay: "700ms", animationFillMode: "backwards" }
              : undefined
          }
        >
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

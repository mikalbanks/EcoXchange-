import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { formatMonthLong, formatPct } from "../../utils/formatters.js";
import type {
  ChainVerificationLink,
  ReconciliationStatus,
} from "../../types/chain.js";

/**
 * Spec 18 § 2.8 — the differentiating component.
 *
 * For each on-chain distribution, this shows the verification record it settles
 * against: the period, the VERIFIED/FLAGGED verdict, and the three-source
 * deviation percentages.
 *
 * "No other tokenized real-asset platform displays this. Every RWA platform can
 * show you a token. The claim that a specific payment traces to a specific month
 * of independently reconciled physical production, both halves publicly
 * checkable, is the thing that is actually novel here."
 *
 * The three states are not decorative:
 *   matched      — payment traces to a VERIFIED period. The claim holds.
 *   unmatched    — no verified period behind this payment. Not yet a claim.
 *   discrepancy  — money moved against production that was flagged, or the
 *                  amounts disagree. This is the state that must be loud.
 */

const STATUS_META: Record<
  ReconciliationStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    border: string;
    bg: string;
    text: string;
    dot: string;
  }
> = {
  matched: {
    label: "MATCHED",
    icon: CheckCircle2,
    border: "border-accentBrt/40",
    bg: "bg-paleGreen/40",
    text: "text-darkBg",
    dot: "bg-accentBrt",
  },
  unmatched: {
    label: "UNMATCHED",
    icon: HelpCircle,
    border: "border-flagAmber/40",
    bg: "bg-amber-50",
    text: "text-flagAmber",
    dot: "bg-flagAmber",
  },
  discrepancy: {
    label: "DISCREPANCY",
    icon: AlertTriangle,
    border: "border-statusError/40",
    bg: "bg-red-50",
    text: "text-statusError",
    dot: "bg-statusError",
  },
};

export function VerificationLinkBadge({
  status,
  verification,
  notes,
  projectId,
  compact = false,
}: {
  status: ReconciliationStatus;
  verification: ChainVerificationLink | null;
  notes: string | null;
  projectId: string;
  /** Table cells use the compact form; the detail panel uses the full one. */
  compact?: boolean;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  const pill = (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${meta.bg} ${meta.text}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );

  if (compact) {
    return (
      <span className="inline-flex flex-col items-start gap-1">
        {pill}
        {verification ? (
          <Link
            to={`/investor/project/${projectId}/verification/${verification.period_start}`}
            className="font-mono text-[10px] text-medGreen underline-offset-2 hover:text-darkBg hover:underline"
          >
            {formatMonthLong(verification.period_start)}
          </Link>
        ) : null}
      </span>
    );
  }

  return (
    <div className={`rounded-none border ${meta.border} ${meta.bg} p-4`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${meta.text}`} aria-hidden />
        <span
          className={`font-mono text-[11px] uppercase tracking-[0.08em] ${meta.text}`}
        >
          {meta.label}
        </span>
      </div>

      {verification ? (
        <>
          <p className="text-sm text-textDark">
            Settles{" "}
            <Link
              to={`/investor/project/${projectId}/verification/${verification.period_start}`}
              className="text-medGreen underline-offset-2 hover:text-darkBg hover:underline"
            >
              {formatMonthLong(verification.period_start)}
            </Link>{" "}
            — verdict{" "}
            <span className="font-mono font-semibold">
              {verification.status.toUpperCase()}
            </span>
          </p>

          <dl className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-3">
            <Deviation
              label="Inverter vs Expected"
              value={verification.inv_vs_expected_pct}
            />
            <Deviation
              label="Inverter vs Utility"
              value={verification.inv_vs_utility_pct}
            />
            <Deviation
              label="Utility vs Expected"
              value={verification.util_vs_expected_pct}
            />
          </dl>
        </>
      ) : (
        <p className="text-sm text-textDark">
          No verification record is linked to this payment.
        </p>
      )}

      {notes ? (
        <p className={`mt-3 border-t border-current/10 pt-2 text-xs ${meta.text}`}>
          {notes}
        </p>
      ) : null}
    </div>
  );
}

function Deviation({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:flex-col sm:items-start sm:justify-start sm:gap-0.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-olive">
        {label}
      </dt>
      <dd className="font-mono tabular-nums text-sm text-textDark">
        {value != null ? formatPct(value) : "—"}
      </dd>
    </div>
  );
}

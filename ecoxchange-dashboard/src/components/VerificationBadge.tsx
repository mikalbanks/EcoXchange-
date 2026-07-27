import { useState } from "react";
import type { VerificationStatus } from "../utils/types.js";
import { useHoverCapable } from "../hooks/useMediaQuery.js";
import { formatPct } from "../utils/formatters.js";

const styles: Record<
  VerificationStatus,
  { dot: string; bg: string; text: string; label: string }
> = {
  verified: {
    dot: "bg-accentBrt",
    bg: "bg-paleGreen/60",
    text: "text-darkBg",
    label: "VERIFIED",
  },
  flagged: {
    dot: "bg-flagAmber",
    bg: "bg-amber-50",
    text: "text-flagAmber",
    label: "FLAGGED",
  },
  pending: {
    dot: "bg-gray-400",
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: "PENDING",
  },
};

export interface BadgeDeviations {
  inv_vs_expected_pct: number;
  inv_vs_utility_pct?: number | null;
  util_vs_expected_pct?: number | null;
}

const SIZE_CLASSES: Record<"sm" | "md" | "lg", { pad: string; dot: string }> =
  {
    sm: { pad: "px-2 py-0.5 text-xs", dot: "h-2 w-2" },
    md: { pad: "px-3 py-1 text-sm", dot: "h-2 w-2" },
    lg: { pad: "px-4 py-1.5 text-base", dot: "h-2.5 w-2.5" },
  };

export function VerificationBadge({
  status,
  size = "md",
  deviations,
}: {
  status: VerificationStatus;
  size?: "sm" | "md" | "lg";
  /** When provided on a touch device, the badge becomes tap-to-expand and
   *  reveals the three-way deviation percentages. Omit for the classic badge. */
  deviations?: BadgeDeviations;
}) {
  const s = styles[status];
  const sizing = SIZE_CLASSES[size];
  const hoverCapable = useHoverCapable();
  const [expanded, setExpanded] = useState(false);

  const badge = (
    <span
      className={`inline-flex items-center gap-2 rounded-full ${sizing.pad} font-medium ${s.bg} ${s.text}`}
    >
      <span className={`${sizing.dot} rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );

  // Classic inline badge: no deviation data, or a hover-capable device where
  // the surrounding UI already exposes the detail on hover/click.
  if (!deviations || hoverCapable) {
    return badge;
  }

  // Touch devices: the badge itself is the (>=44px) tap target; tapping slides
  // down the three-way deviation detail.
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={`${s.label} — tap for deviation details`}
        onClick={() => setExpanded((v) => !v)}
        className="-m-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-end p-2"
      >
        {badge}
      </button>
      {expanded ? (
        <span className="animate-slide-down mt-1 block overflow-hidden rounded-md border border-paleGreen bg-white px-3 py-2 text-left text-xs text-textMuted shadow-sm">
          <DeviationRow label="Inverter vs Expected" value={deviations.inv_vs_expected_pct} />
          <DeviationRow label="Inverter vs Utility" value={deviations.inv_vs_utility_pct} />
          <DeviationRow label="Utility vs Expected" value={deviations.util_vs_expected_pct} />
        </span>
      ) : null}
    </span>
  );
}

function DeviationRow({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <span className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className="font-mono tabular-nums text-textDark">
        {value != null ? formatPct(value) : "—"}
      </span>
    </span>
  );
}

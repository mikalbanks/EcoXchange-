import type { VerificationStatus } from "../../data/types.js";
import { formatMonthShortMono } from "../../utils/formatters.js";

interface Props {
  status: VerificationStatus;
  obsCount: number;
  periodStart: string;
  /** Tail clause shown only on flagged. Default: "REVIEW PENDING". */
  flaggedTail?: string;
}

/**
 * Spec §2: "● VERIFIED · OBS. 12 · DEC 2024" or
 *          "▲ FLAGGED · OBS. 12 · DEC 2024 · REVIEW PENDING".
 */
export function VerificationBadge({
  status,
  obsCount,
  periodStart,
  flaggedTail = "REVIEW PENDING",
}: Props) {
  if (status === "data_required") {
    return (
      <span className="inline-flex items-center gap-2 font-mono text-[11px] sm:text-[12px] uppercase tracking-tag text-eco-text-muted">
        <span aria-hidden>?</span>
        <span>DATA REQUIRED</span>
      </span>
    );
  }

  if (status === "flagged") {
    return (
      <span className="inline-flex items-center gap-2 font-mono text-[11px] sm:text-[12px] uppercase tracking-tag text-eco-flagged">
        <span aria-hidden className="text-[10px]">
          ▲
        </span>
        <span>
          FLAGGED · OBS. {obsCount} · {formatMonthShortMono(periodStart)} · {flaggedTail}
        </span>
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-2 font-mono text-[11px] sm:text-[12px] uppercase tracking-tag text-eco-text-muted">
        <span aria-hidden>◯</span>
        <span>
          PENDING · OBS. {obsCount} · {formatMonthShortMono(periodStart)}
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] sm:text-[12px] uppercase tracking-tag text-eco-verified">
      <span aria-hidden className="text-[10px]">
        ●
      </span>
      <span>
        VERIFIED · OBS. {obsCount} · {formatMonthShortMono(periodStart)}
      </span>
    </span>
  );
}

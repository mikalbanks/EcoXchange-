/**
 * Spec 19 §3.3 — the provenance tag.
 *
 * Renders adjacent to a number, never as a footnote. A reviewer who reads a
 * production figure must see, in the same glance, whether the telemetry behind
 * it is real or simulated.
 *
 * `VERIFIED — live telemetry` is reserved: no record can carry
 * `live_telemetry` provenance until real inverter data is connected, so in
 * practice this component renders the simulated label everywhere today.
 */
import type { DataProvenance } from "../utils/types.js";
import {
  PROVENANCE_DETAIL,
  PROVENANCE_LABEL,
  PROVENANCE_LABEL_LONG,
} from "../config/provenance.js";

const STYLES: Record<DataProvenance, string> = {
  // Amber, not green: this is a caveat, and it should not read as a pass.
  simulated: "bg-amber-50 text-flagAmber ring-1 ring-flagAmber/30",
  live_telemetry: "bg-paleGreen/60 text-darkBg ring-1 ring-accentBrt/30",
};

const SIZES = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-xs",
} as const;

export function ProvenanceTag({
  provenance,
  variant = "short",
  size = "sm",
  className = "",
}: {
  provenance: DataProvenance;
  /** `long` is for report headers and page banners. */
  variant?: "short" | "long";
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const label =
    variant === "long"
      ? PROVENANCE_LABEL_LONG[provenance]
      : PROVENANCE_LABEL[provenance];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-semibold uppercase tracking-wide whitespace-nowrap ${STYLES[provenance]} ${SIZES[size]} ${className}`}
      title={PROVENANCE_DETAIL[provenance]}
      data-testid={`provenance-${provenance}`}
    >
      {label}
    </span>
  );
}

/**
 * Page- or section-level provenance statement. Use once above a block of
 * numbers; use {@link ProvenanceTag} for the numbers themselves.
 */
export function ProvenanceBanner({
  provenance,
  className = "",
}: {
  provenance: DataProvenance;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-md border border-flagAmber/30 bg-amber-50/60 px-3 py-2 sm:flex-row sm:items-center sm:gap-3 ${className}`}
      data-testid={`provenance-banner-${provenance}`}
    >
      <ProvenanceTag provenance={provenance} variant="long" size="md" />
      <p className="text-xs leading-snug text-gray-700">
        {PROVENANCE_DETAIL[provenance]}
      </p>
    </div>
  );
}

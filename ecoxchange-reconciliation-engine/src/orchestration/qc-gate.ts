import type { DataQuality, RawReading } from "../db/types.js";
import type { ToleranceConfig } from "../config/tolerances.js";
import type {
  ExpectedGenerationOutput,
  ReconciliationOutput,
} from "../utils/types.js";

/**
 * Spec 21 §6 — the one orchestration change the ingestion layer needs:
 * **a `qc_verdict` of `error` forces PENDING and skips reconciliation.**
 *
 * `reconcile()` is unchanged. It already refuses to score an inverter reading
 * whose `data_quality` is `missing` or `error`, but only that reading: a
 * time-misaligned SATELLITE or UTILITY leg still reaches the tolerance bands,
 * and a misaligned series is the one input that survives them. It keeps a
 * plausible daily shape and a plausible monthly total, so it lands inside ±15%
 * and is stamped VERIFIED. That is the failure spec 20 §2.1 paid for once.
 *
 * So the gate runs over EVERY leg, ahead of reconciliation, and it is the
 * orchestrator's first step rather than a check inside the pure function.
 */

export interface QcGateInput {
  inverter_reading: Pick<RawReading, "source" | "data_quality" | "quality_notes"> | null;
  utility_reading: Pick<RawReading, "source" | "data_quality" | "quality_notes"> | null;
  satellite_reading: Pick<RawReading, "source" | "data_quality" | "quality_notes"> | null;
}

/** A verdict of `error` on any leg blocks the period outright. */
const BLOCKING: readonly DataQuality[] = ["error"];

export function blockedLegs(
  input: QcGateInput,
): Array<{ source: string; data_quality: DataQuality; quality_notes: string | null }> {
  return [input.inverter_reading, input.utility_reading, input.satellite_reading]
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .filter((r) => BLOCKING.includes(r.data_quality))
    .map((r) => ({
      source: r.source,
      data_quality: r.data_quality,
      quality_notes: r.quality_notes ?? null,
    }));
}

/**
 * Returns a PENDING result when any leg failed QC, or `null` to proceed to
 * `reconcile()`.
 *
 * Deviations are deliberately left null rather than computed-and-ignored. A
 * number on a series we have just declared unusable would be read, charted and
 * quoted, whatever the status beside it says.
 */
export function qcGate(
  input: QcGateInput,
  expected: ExpectedGenerationOutput,
  tolerances: ToleranceConfig,
): ReconciliationOutput | null {
  const blocked = blockedLegs(input);
  if (blocked.length === 0) return null;

  return {
    status: "pending",
    inverter_kwh: null,
    utility_kwh: null,
    expected_kwh: expected.expected_kwh,
    inv_vs_expected_pct: null,
    inv_vs_utility_pct: null,
    util_vs_expected_pct: null,
    flag_reasons: blocked.map(
      (leg) =>
        `QC verdict '${leg.data_quality}' on the ${leg.source} leg — reconciliation ` +
        `skipped for this period. ${leg.quality_notes ?? "See reading_quality for the evidence."}`,
    ),
    tolerance_config: tolerances,
  };
}

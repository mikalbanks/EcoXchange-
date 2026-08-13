import { reconcile } from "../reconciliation/reconcile.js";
import { qcGate, type QcGateInput } from "./qc-gate.js";
import type { ToleranceConfig } from "../config/tolerances.js";
import type { RawReading } from "../db/types.js";
import type {
  ExpectedGenerationOutput,
  ProjectConfig,
  ReconciliationOutput,
} from "../utils/types.js";
import type { Bands } from "../reconciliation/thresholds.js";

/**
 * One project-period, from readings to verdict.
 *
 * This exists so the spec 21 §6 gate has a caller. A guard nobody invokes is a
 * comment — the same reason spec 19 had to add CI before its independence
 * assertion meant anything.
 *
 * Order is load-bearing: QC first, reconciliation second. Reversing them would
 * compute deviations against a series already known to be unusable, and those
 * numbers get read regardless of the status printed next to them.
 */

export interface VerifyPeriodInput {
  project: ProjectConfig;
  period_start: string;
  period_end: string;
  inverter_reading: RawReading | null;
  utility_reading: RawReading | null;
  /** The satellite leg's stored reading, when there is one. `reconcile()` takes
   *  expected generation directly and never sees this; the QC gate does, which
   *  is the whole point — a misaligned satellite series is invisible downstream. */
  satellite_reading?: RawReading | null;
  expected_generation: ExpectedGenerationOutput;
  tolerances: ToleranceConfig;
  /** Spec 23 per-plant bands for CHECK A. Resolve with `resolveBandsForPeriod`
   *  (which reads the database) and pass the result in, so this function and
   *  `reconcile()` below it both stay pure and testable without a connection. */
  bands?: Bands;
  /** Spec 23 §5 — whether the immediately prior period exceeded detect. */
  prior_detect_exceeded?: boolean;
}

export function verifyPeriod(input: VerifyPeriodInput): ReconciliationOutput {
  const gateInput: QcGateInput = {
    inverter_reading: input.inverter_reading,
    utility_reading: input.utility_reading,
    satellite_reading: input.satellite_reading ?? null,
  };

  const blocked = qcGate(gateInput, input.expected_generation, input.tolerances);
  if (blocked) return blocked;

  return reconcile({
    project: input.project,
    period_start: input.period_start,
    period_end: input.period_end,
    inverter_reading: input.inverter_reading,
    utility_reading: input.utility_reading,
    expected_generation: input.expected_generation,
    tolerances: input.tolerances,
    bands: input.bands,
    prior_detect_exceeded: input.prior_detect_exceeded,
  });
}

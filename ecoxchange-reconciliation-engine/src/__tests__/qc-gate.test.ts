import { describe, it, expect } from "vitest";
import { qcGate, blockedLegs } from "../orchestration/qc-gate.js";
import { verifyPeriod } from "../orchestration/verify-period.js";
import { DEFAULT_TOLERANCES } from "../config/tolerances.js";
import type { DataQuality, RawReading } from "../db/types.js";
import type {
  ExpectedGenerationOutput,
  ProjectConfig,
} from "../utils/types.js";

/**
 * Spec 21 §6: a `qc_verdict` of `error` forces PENDING and skips reconciliation.
 *
 * The interesting case is the satellite leg. `reconcile()` never sees a
 * satellite reading — it takes expected generation as a computed input — so a
 * time-misaligned satellite series reaches the tolerance bands unchallenged,
 * and a misaligned series is the one input those bands cannot catch: it keeps a
 * plausible shape and a plausible total. That is why the gate is upstream and
 * covers every leg.
 */

const project: ProjectConfig = {
  latitude: 39.7388,
  longitude: -105.1732,
  capacity_kw_dc: 1153.488,
  tilt_deg: 16.77,
  azimuth_deg: 180,
  module_efficiency: 0.2,
  system_losses: 0.14,
  degradation_rate: 0.0075,
  commissioning_date: "2013-03-29",
};

const expected: ExpectedGenerationOutput = {
  period_start: "2017-06-01",
  period_end: "2017-06-30",
  expected_kwh: 170_000,
  daily_breakdown: [],
  assumptions: {
    degradation_factor: 0.97,
    system_losses: 0.14,
    albedo: 0.2,
    transposition_model: "hay_davies",
  },
};

function reading(
  source: RawReading["source"],
  kwh: number,
  data_quality: DataQuality = "complete",
  quality_notes: string | null = null,
): RawReading {
  return {
    id: `${source}-1`,
    project_id: "p1",
    source,
    period_start: "2017-06-01",
    period_end: "2017-06-30",
    kwh_gross: kwh,
    kwh_net: kwh,
    ghi_kwh_m2: null,
    dni_kwh_m2: null,
    dhi_kwh_m2: null,
    raw_response: {},
    archive_path: null,
    data_quality,
    quality_notes,
    data_provenance: "pvdaq_real",
    fetched_at: "2026-08-12T00:00:00Z",
  };
}

describe("qcGate — spec 21 §6", () => {
  it("lets a clean period through to reconciliation", () => {
    const gated = qcGate(
      {
        inverter_reading: reading("inverter", 171_000),
        utility_reading: null,
        satellite_reading: reading("satellite", 170_000),
      },
      expected,
      DEFAULT_TOLERANCES,
    );
    expect(gated).toBeNull();
  });

  it("forces PENDING when the inverter leg failed QC", () => {
    const gated = qcGate(
      {
        inverter_reading: reading(
          "inverter",
          171_000,
          "error",
          "44.74% of positive energy falls below the horizon (limit 1.0%).",
        ),
        utility_reading: null,
        satellite_reading: null,
      },
      expected,
      DEFAULT_TOLERANCES,
    );
    expect(gated?.status).toBe("pending");
    expect(gated?.inv_vs_expected_pct).toBeNull();
    expect(gated?.flag_reasons[0]).toContain("below the horizon");
  });

  it("forces PENDING on a misaligned SATELLITE leg, which reconcile() cannot see", () => {
    // The deviation this would have produced is +0.6% — comfortably VERIFIED.
    const inverter = reading("inverter", 171_000);
    const satellite = reading("satellite", 170_000, "error", "time-misaligned");

    const throughReconcile = verifyPeriod({
      project,
      period_start: "2017-06-01",
      period_end: "2017-06-30",
      inverter_reading: inverter,
      utility_reading: null,
      satellite_reading: null, // no gate input: the old behaviour
      expected_generation: expected,
      tolerances: DEFAULT_TOLERANCES,
    });
    expect(throughReconcile.status).toBe("verified");

    const gated = verifyPeriod({
      project,
      period_start: "2017-06-01",
      period_end: "2017-06-30",
      inverter_reading: inverter,
      utility_reading: null,
      satellite_reading: satellite,
      expected_generation: expected,
      tolerances: DEFAULT_TOLERANCES,
    });
    expect(gated.status).toBe("pending");
    expect(gated.flag_reasons[0]).toContain("satellite");
  });

  it("does not block on partial or missing — only on error", () => {
    // `partial` is a usable period with a caveat, and `missing` is already
    // handled inside reconcile(). Widening the gate would turn every gappy
    // month into a manual review queue.
    for (const quality of ["complete", "partial", "missing"] as DataQuality[]) {
      expect(
        blockedLegs({
          inverter_reading: reading("inverter", 1, quality),
          utility_reading: null,
          satellite_reading: null,
        }),
      ).toHaveLength(0);
    }
    expect(
      blockedLegs({
        inverter_reading: reading("inverter", 1, "error"),
        utility_reading: null,
        satellite_reading: null,
      }),
    ).toHaveLength(1);
  });

  it("reports every failed leg, not just the first", () => {
    const gated = qcGate(
      {
        inverter_reading: reading("inverter", 1, "error", "misaligned"),
        utility_reading: reading("utility_meter", 1, "error", "misaligned"),
        satellite_reading: null,
      },
      expected,
      DEFAULT_TOLERANCES,
    );
    expect(gated?.flag_reasons).toHaveLength(2);
  });

  it("keeps expected_kwh so the period still renders, but no deviations", () => {
    const gated = qcGate(
      {
        inverter_reading: reading("inverter", 171_000, "error"),
        utility_reading: reading("utility_meter", 165_000),
        satellite_reading: null,
      },
      expected,
      DEFAULT_TOLERANCES,
    );
    expect(gated?.expected_kwh).toBe(170_000);
    expect(gated?.inverter_kwh).toBeNull();
    expect(gated?.utility_kwh).toBeNull();
    expect(gated?.util_vs_expected_pct).toBeNull();
  });
});

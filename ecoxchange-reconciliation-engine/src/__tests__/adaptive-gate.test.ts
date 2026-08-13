/**
 * Spec 23 §5 — gate, detect and the two-consecutive-month persistence rule,
 * exercised through `reconcile()` itself rather than through the band math.
 */
import { describe, it, expect } from "vitest";
import { reconcile } from "../reconciliation/reconcile.js";
import { resolveBands, type CalibrationBasis } from "../reconciliation/thresholds.js";
import { DEFAULT_TOLERANCES } from "../config/tolerances.js";
import type {
  ExpectedGenerationOutput,
  ProjectConfig,
  ReconciliationInput,
} from "../utils/types.js";

const project: ProjectConfig = {
  latitude: 32.08,
  longitude: -81.09,
  capacity_kw_dc: 5000,
  tilt_deg: 20,
  azimuth_deg: 180,
  module_efficiency: 0.2,
  system_losses: 0.14,
  degradation_rate: 0.0075,
  commissioning_date: "2023-01-01",
};

const EXPECTED_KWH = 700_000;

function expectedFor(period: string): ExpectedGenerationOutput {
  return {
    period_start: period,
    period_end: period,
    expected_kwh: EXPECTED_KWH,
    daily_breakdown: [],
    assumptions: {
      degradation_factor: 0.99,
      system_losses: 0.14,
      albedo: 0.2,
      transposition_model: "hay_davies",
    },
  };
}

/** MAD 3.0 -> gate ±18%, detect ±9% in a stable-season month. */
const CALIBRATION: CalibrationBasis = {
  id: "cal-abc",
  calibrationVersion: 2,
  residualMadPct: 3.0,
};

/**
 * A period whose inverter reading sits `deviationPct` from expected. The
 * utility leg is held in lockstep with the inverter so CHECK B and CHECK C
 * never fire — these tests are about CHECK A, and a B/C flag would mask it.
 */
function period(
  periodStart: string,
  deviationPct: number,
  opts: { priorDetectExceeded?: boolean; calibrated?: boolean } = {},
): ReconciliationInput {
  const inverter = EXPECTED_KWH * (1 + deviationPct / 100);
  const month = Number(periodStart.slice(5, 7));
  return {
    project,
    period_start: periodStart,
    period_end: periodStart,
    inverter_reading: { kwh_gross: inverter, data_quality: "complete" },
    // Within CHECK B's ±10% of the inverter, and CHECK C is given the same
    // slack as CHECK A by construction below.
    utility_reading: { kwh_net: inverter * 0.98, data_quality: "complete" },
    expected_generation: expectedFor(periodStart),
    tolerances: {
      ...DEFAULT_TOLERANCES,
      // Widen C well past anything these cases produce, so only A is under test.
      util_vs_expected_upper_pct: 500,
      util_vs_expected_lower_pct: -500,
    },
    bands:
      opts.calibrated === false
        ? undefined
        : resolveBands(CALIBRATION, month),
    prior_detect_exceeded: opts.priorDetectExceeded,
  };
}

describe("adaptive CHECK A — the gate band replaces flat ±15%", () => {
  it("verifies a deviation that flat ±15% would have flagged", () => {
    // 16% is outside the old flat band but inside this plant's ±18% gate.
    const out = reconcile(period("2024-06-01", -16));
    expect(out.status).toBe("verified");
    expect(out.gate_band_pct).toBeCloseTo(18, 10);
    expect(out.detect_band_pct).toBeCloseTo(9, 10);
  });

  it("blocks on a single-month gate breach regardless of persistence — AC 7", () => {
    const out = reconcile(period("2024-06-01", -22, { priorDetectExceeded: false }));
    expect(out.status).toBe("flagged");
    expect(out.persistence_triggered).toBe(false);
    expect(out.flag_reasons.some((r) => r.includes("BELOW expected"))).toBe(true);
  });

  it("names the band and calibration version in the flag — §6", () => {
    const out = reconcile(period("2024-06-01", -22));
    const reason = out.flag_reasons.find((r) => r.includes("BELOW expected"));
    expect(reason).toBeDefined();
    // "A generic message is not actionable for an owner."
    expect(reason).toContain("plant gate band: ±18.0%");
    expect(reason).toContain("calibration v2");
  });

  it("records the bands used in tolerance_config, not the defaults", () => {
    const out = reconcile(period("2024-06-01", -5));
    expect(out.tolerance_config.inv_vs_expected_upper_pct).toBeCloseTo(18, 10);
    expect(out.tolerance_config.inv_vs_expected_lower_pct).toBeCloseTo(-18, 10);
    // CHECK B is untouched by spec 23.
    expect(out.tolerance_config.inv_vs_utility_pct).toBe(
      DEFAULT_TOLERANCES.inv_vs_utility_pct,
    );
  });

  it("behaves exactly as before when no bands are supplied", () => {
    const out = reconcile(period("2024-06-01", -16, { calibrated: false }));
    expect(out.status).toBe("flagged"); // flat ±15%
    expect(out.gate_band_pct).toBeUndefined();
    expect(out.detect_exceeded).toBeUndefined();
    expect(out.persistence_triggered).toBeUndefined();
  });
});

describe("detect band and persistence — AC 7", () => {
  it("observes a detect breach without blocking on its own", () => {
    // 12% is past detect (9) but inside gate (18).
    const out = reconcile(period("2024-06-01", -12, { priorDetectExceeded: false }));
    expect(out.detect_exceeded).toBe(true);
    expect(out.persistence_triggered).toBe(false);
    expect(out.status).toBe("verified");
  });

  it("blocks when the detect band is breached two months running", () => {
    const out = reconcile(period("2024-07-01", -12, { priorDetectExceeded: true }));
    expect(out.detect_exceeded).toBe(true);
    expect(out.persistence_triggered).toBe(true);
    expect(out.status).toBe("flagged");
    expect(
      out.flag_reasons.some((r) => r.includes("two consecutive periods")),
    ).toBe(true);
  });

  it("resets when the chain is broken by a clean month", () => {
    // Month 1 breaches, month 2 is clean, month 3 breaches again. Month 3 must
    // not pair with month 1 — §5 says CONSECUTIVE.
    const first = reconcile(period("2024-06-01", -12, { priorDetectExceeded: false }));
    expect(first.detect_exceeded).toBe(true);

    const second = reconcile(
      period("2024-07-01", -2, { priorDetectExceeded: first.detect_exceeded }),
    );
    expect(second.detect_exceeded).toBe(false);
    expect(second.persistence_triggered).toBe(false);

    const third = reconcile(
      period("2024-08-01", -12, { priorDetectExceeded: second.detect_exceeded }),
    );
    expect(third.detect_exceeded).toBe(true);
    expect(third.persistence_triggered).toBe(false);
    expect(third.status).toBe("verified");
  });

  it("catches sustained moderate underperformance the wide gate never sees", () => {
    // This is the case the rule exists for: -13% every month is well inside the
    // ±18% gate and would never block, but it is what real degradation looks
    // like.
    let prior = false;
    const statuses: string[] = [];
    for (const month of ["2024-05-01", "2024-06-01", "2024-07-01"]) {
      const out = reconcile(period(month, -13, { priorDetectExceeded: prior }));
      prior = out.detect_exceeded === true;
      statuses.push(out.status);
    }
    expect(statuses).toEqual(["verified", "flagged", "flagged"]);
  });
});

describe("PENDING_CALIBRATION — AC 4", () => {
  it("runs at cap bands and marks itself pending", () => {
    const month = 6;
    const bands = resolveBands(null, month);
    const out = reconcile({
      ...period("2024-06-01", -25),
      bands,
    });
    expect(out.gate_band_pct).toBe(30);
    expect(out.pending_calibration).toBe(true);
    expect(out.calibration_id).toBeNull();
    // -25% is inside the 30% cap, so no gate breach...
    expect(out.flag_reasons.some((r) => r.includes("BELOW expected"))).toBe(false);
  });

  it("is not presented as a calibrated verdict", () => {
    const out = reconcile({ ...period("2024-06-01", -5), bands: resolveBands(null, 6) });
    // §4.1: "PENDING_CALIBRATION is not a verified state. Do not present it as
    // one on any investor surface." The flag carries that distinction; any
    // consumer rendering `status` alone must consult it.
    expect(out.pending_calibration).toBe(true);
    expect(out.calibration_id).toBeNull();
  });
});

describe("winter widening through reconcile — AC 6", () => {
  it("applies the multiplier to a January period", () => {
    const out = reconcile(period("2024-01-01", -30));
    expect(out.gate_band_pct).toBeCloseTo(36, 10); // 18 x 2.0
    expect(out.detect_band_pct).toBeCloseTo(16.2, 10); // 9 x 1.8
    // -30% would breach the summer gate of 18 and does not breach 36.
    expect(out.flag_reasons.some((r) => r.includes("BELOW expected"))).toBe(false);
  });
});

describe("CHECK B and C still block (deliberate divergence from the 11.4% figure)", () => {
  it("flags on a CHECK B breach even when CHECK A is comfortably inside its band", () => {
    // Spec 20's 11.4% is a CHECK A measurement. B and C retain their flat
    // tolerances AND their blocking behaviour, so the end-to-end rate is higher
    // by however often they fire. That is a decision, not an oversight.
    const inverter = EXPECTED_KWH;
    const out = reconcile({
      project,
      period_start: "2024-06-01",
      period_end: "2024-06-30",
      inverter_reading: { kwh_gross: inverter, data_quality: "complete" },
      utility_reading: { kwh_net: inverter * 0.5, data_quality: "complete" },
      expected_generation: expectedFor("2024-06-01"),
      tolerances: DEFAULT_TOLERANCES,
      bands: resolveBands(CALIBRATION, 6),
    });
    expect(out.status).toBe("flagged");
    expect(out.detect_exceeded).toBe(false);
    expect(out.persistence_triggered).toBe(false);
    expect(out.flag_reasons.some((r) => r.includes("diverge by"))).toBe(true);
  });
});

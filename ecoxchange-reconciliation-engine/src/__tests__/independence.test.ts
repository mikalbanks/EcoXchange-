import { describe, it, expect } from "vitest";
import {
  assertDeviationIndependence,
  IndependenceViolationError,
  MAX_CONSECUTIVE_ZERO_PERIODS,
} from "../reconciliation/independence.js";
import { reconcile } from "../reconciliation/reconcile.js";
import { DEFAULT_TOLERANCES } from "../config/tolerances.js";
import type { ProjectConfig } from "../utils/types.js";

// Spec 19 G1. The bug this guards against: twelve verification records where
// inverter_kwh was byte-identical to expected_kwh, produced by a backtest run
// at monthly_deviation_pct: 0 and served for two months as verification.
// See docs/spec-19-diagnostic.md.

const project = {
  latitude: 32.08,
  longitude: -81.09,
  capacity_kw_dc: 5000,
  tilt_deg: 20,
  azimuth_deg: 180,
  module_efficiency: 0.2,
  system_losses: 0.14,
  degradation_rate: 0.0075,
  commissioning_date: "2023-01-01",
} as unknown as ProjectConfig;

const at = (period_start: string, inv_vs_expected_pct: number | null) => ({
  period_start,
  inv_vs_expected_pct,
});

describe("assertDeviationIndependence", () => {
  it("throws when three consecutive periods are identically zero", () => {
    expect(() =>
      assertDeviationIndependence([
        at("2024-01-01", 0),
        at("2024-02-01", 0),
        at("2024-03-01", 0),
      ]),
    ).toThrow(IndependenceViolationError);
  });

  it("names the offending periods and refuses to emit records", () => {
    let err: IndependenceViolationError | undefined;
    try {
      assertDeviationIndependence([
        at("2024-05-01", 3.2),
        at("2024-06-01", 0),
        at("2024-07-01", 0),
        at("2024-08-01", 0),
      ]);
    } catch (e) {
      err = e as IndependenceViolationError;
    }
    expect(err).toBeInstanceOf(IndependenceViolationError);
    expect(err!.periods).toEqual(["2024-06-01", "2024-07-01", "2024-08-01"]);
    expect(err!.message).toContain("INV and EXP are not independent");
    expect(err!.message).toContain("Refusing to emit verification records");
  });

  it(`tolerates ${MAX_CONSECUTIVE_ZERO_PERIODS} — a coincidence is not a pipeline failure`, () => {
    expect(() =>
      assertDeviationIndependence([
        at("2024-01-01", 0),
        at("2024-02-01", 0),
        at("2024-03-01", -2.6),
        at("2024-04-01", 0),
        at("2024-05-01", 0),
      ]),
    ).not.toThrow();
  });

  it("treats near-zero below the epsilon as zero", () => {
    expect(() =>
      assertDeviationIndependence([
        at("2024-01-01", 0.0004),
        at("2024-02-01", -0.0002),
        at("2024-03-01", 0.0009),
      ]),
    ).toThrow(IndependenceViolationError);
  });

  it("does not fire on a realistic series, however small the deviations", () => {
    expect(() =>
      assertDeviationIndependence([
        at("2024-01-01", -0.11),
        at("2024-02-01", 2.57),
        at("2024-03-01", -0.13),
        at("2024-04-01", -1.16),
      ]),
    ).not.toThrow();
  });

  it("a null deviation breaks the run rather than extending it", () => {
    expect(() =>
      assertDeviationIndependence([
        at("2024-01-01", 0),
        at("2024-02-01", null),
        at("2024-03-01", 0),
        at("2024-04-01", 0),
      ]),
    ).not.toThrow();
  });

  it("passes an empty series", () => {
    expect(() => assertDeviationIndependence([])).not.toThrow();
  });
});

describe("fed identical INV/EXP input, as the fixture was", () => {
  // The exact shape of the void records: simulated_inverter_kwh collapsing to
  // expected_kwh because the deviation applied was 0.
  const EXPECTED = [516016, 546624, 667163, 836859, 796045, 858953];
  const periods = EXPECTED.map((expected_kwh, i) => {
    const period = `2024-0${i + 1}-01`;
    const out = reconcile({
      project,
      period_start: period,
      period_end: period,
      inverter_reading: {
        kwh_gross: expected_kwh, // identical to EXP — the defect
        data_quality: "complete",
        raw_response: {},
      },
      utility_reading: null,
      expected_generation: {
        period_start: period,
        period_end: period,
        expected_kwh,
        daily_breakdown: [],
        assumptions: {
          degradation_factor: 1,
          system_losses: 0.14,
          albedo: 0.2,
          transposition_model: "hay_davies",
        },
      },
      tolerances: DEFAULT_TOLERANCES,
    });
    return { period_start: period, inv_vs_expected_pct: out.inv_vs_expected_pct };
  });

  it("reconcile() itself reports every month as 0% and verified", () => {
    // reconcile() is a pure single-period function: it cannot see the pattern,
    // which is exactly why G1 lives at the series boundary instead.
    expect(periods.every((p) => p.inv_vs_expected_pct === 0)).toBe(true);
  });

  it("G1 fires and fails the run", () => {
    expect(() => assertDeviationIndependence(periods)).toThrow(
      /Deviation identically zero across 6 periods/,
    );
  });
});

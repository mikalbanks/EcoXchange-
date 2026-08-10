import { describe, expect, it } from "vitest";
import {
  FLAGGED_MONTH,
  UTILITY_MISSING_MONTH,
  FLAGGED_DEVIATION_PCT,
  assertDeviationIndependence,
  buildSummary,
  generateFlaggedVerificationData,
  generateRealisticVerificationData,
  reconcileMonth,
} from "./generate-realistic-seed.mjs";
import demoSavannah from "../src/data/demo-savannah.json";

// The committed JSON was produced by this generator; these tests pin the
// invariants so a regeneration (or a refactor of the generator) can't
// silently break the canonical dataset.

const BASE = demoSavannah.verification_records;

describe("generateRealisticVerificationData", () => {
  const records = generateRealisticVerificationData(BASE);

  it("is deterministic", () => {
    expect(generateRealisticVerificationData(BASE)).toEqual(records);
  });

  it("matches the committed demo-savannah.json exactly", () => {
    expect(records).toEqual(BASE);
  });

  it("preserves the canonical annual inverter total", () => {
    const sumInverter = records.reduce((s, r) => s + r.inverter_kwh, 0);
    const sumExpected = BASE.reduce((s, r) => s + r.expected_kwh, 0);
    expect(sumInverter).toBe(sumExpected);
    expect(sumInverter).toBe(8_102_755);
  });

  it("summary reproduces the canonical figures", () => {
    const summary = buildSummary(records, 5000);
    expect(summary.annual_production_mwh).toBe(8102.8);
    expect(summary.capacity_factor_pct).toBe(18.5);
  });

  // ── Spec 19 §3.2 — series composition ──────────────────────────────────
  it("ships 10 clean VERIFIED months, 1 FLAGGED, and 1 two-way month", () => {
    const summary = buildSummary(records, 5000);
    expect(summary.months_flagged).toBe(1);
    expect(summary.months_utility_missing).toBe(1);
    // 11 verified = 10 normal + the utility-missing month, which still passes.
    expect(summary.months_verified).toBe(11);
    expect(records).toHaveLength(12);
  });

  it("the FLAGGED month breaches -15% and renders the engine's own reasons", () => {
    const flagged = records.filter((r) => r.status === "flagged");
    expect(flagged).toHaveLength(1);
    expect(flagged[0].period_start).toBe(FLAGGED_MONTH);
    expect(flagged[0].inv_vs_expected_pct).toBe(FLAGGED_DEVIATION_PCT);
    expect(flagged[0].inv_vs_expected_pct).toBeLessThan(-15);
    expect(flagged[0].flag_reasons[0]).toMatch(
      /^Inverter production 18\.4% BELOW expected \(threshold: -15%\)\. Possible causes: panel degradation/,
    );
  });

  it("the two-way month verifies with the absence stated, not hidden", () => {
    const twoWay = records.filter((r) => r.utility_kwh === null);
    expect(twoWay).toHaveLength(1);
    expect(twoWay[0].period_start).toBe(UTILITY_MISSING_MONTH);
    expect(twoWay[0].status).toBe("verified");
    expect(twoWay[0].inv_vs_utility_pct).toBeNull();
    expect(twoWay[0].util_vs_expected_pct).toBeNull();
    expect(twoWay[0].flag_reasons).toEqual([
      "Utility meter data not available — verification based on inverter vs. satellite only (two-way check).",
    ]);
  });

  it("keeps every non-flagged month inside the engine tolerance bands", () => {
    for (const r of records) {
      if (r.status === "flagged") continue;
      expect(Math.abs(r.inv_vs_expected_pct)).toBeLessThanOrEqual(15);
      expect(Math.abs(r.util_vs_expected_pct ?? 0)).toBeLessThanOrEqual(20);
      expect(Math.abs(r.inv_vs_utility_pct ?? 0)).toBeLessThanOrEqual(10);
    }
  });

  it("produces realistic non-zero deviations with both signs", () => {
    const devs = records.map((r) => r.inv_vs_expected_pct);
    expect(devs.every((d) => d !== 0)).toBe(true);
    expect(devs.some((d) => d > 0)).toBe(true);
    expect(devs.some((d) => d < 0)).toBe(true);
  });

  // ── Spec 19 §3.3 / G2 — provenance ─────────────────────────────────────
  it("every record declares its provenance and none claims live telemetry", () => {
    for (const r of records) {
      expect(r.data_provenance).toBe("simulated");
    }
    expect(buildSummary(records, 5000).data_provenance).toBe("simulated");
  });
});

describe("generateFlaggedVerificationData", () => {
  const flagged = generateFlaggedVerificationData(BASE);

  it("every month breaches the -15% INV→EXP band with varied deviations", () => {
    const devs = flagged.map((r) => r.inv_vs_expected_pct);
    for (const d of devs) {
      expect(d).toBeLessThan(-15);
      expect(d).toBeGreaterThan(-25);
    }
    // Varied, not the old uniform -20.0 artifact.
    expect(new Set(devs).size).toBeGreaterThan(6);
    for (const r of flagged) {
      expect(r.status).toBe("flagged");
      expect(r.flag_reasons.length).toBeGreaterThanOrEqual(1);
      expect(r.flag_reasons[0]).toMatch(/BELOW expected \(threshold: -15%\)/);
      expect(r.data_provenance).toBe("simulated");
    }
  });
});

describe("reconcileMonth mirrors reconcile.ts", () => {
  it("expresses INV→UTL against the INVERTER reading (reconcile.ts:71)", () => {
    // 1000 vs 900: (1000-900)/1000 = 10%, NOT (1000-900)/900 = 11.1%.
    const v = reconcileMonth(1000, 900, 1000);
    expect(v.inv_vs_utility_pct).toBe(10);
  });

  it("degrades to a two-way check when the utility reading is absent", () => {
    const v = reconcileMonth(1000, null, 1000);
    expect(v.status).toBe("verified");
    expect(v.inv_vs_utility_pct).toBeNull();
    expect(v.util_vs_expected_pct).toBeNull();
    expect(v.flag_reasons).toHaveLength(1);
  });

  it("flags an inverter reading below the -15% band", () => {
    const v = reconcileMonth(800, 776, 1000);
    expect(v.status).toBe("flagged");
    expect(v.inv_vs_expected_pct).toBe(-20);
  });
});

describe("assertDeviationIndependence (Spec 19 G1)", () => {
  const at = (period_start, inv_vs_expected_pct) => ({
    period_start,
    inv_vs_expected_pct,
  });

  it("throws on three consecutive identically-zero deviations", () => {
    expect(() =>
      assertDeviationIndependence([
        at("2024-01-01", 0),
        at("2024-02-01", 0),
        at("2024-03-01", 0),
      ]),
    ).toThrow(/not independent/);
  });

  it("tolerates two — a rounding coincidence is not a broken pipeline", () => {
    expect(() =>
      assertDeviationIndependence([
        at("2024-01-01", 0),
        at("2024-02-01", 0),
        at("2024-03-01", 2.4),
      ]),
    ).not.toThrow();
  });

  it("passes the committed dataset", () => {
    expect(() => assertDeviationIndependence(BASE)).not.toThrow();
  });
});

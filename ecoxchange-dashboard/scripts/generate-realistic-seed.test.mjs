import { describe, expect, it } from "vitest";
import {
  generateRealisticVerificationData,
  generateFlaggedVerificationData,
  buildSummary,
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

  it("produces realistic non-zero deviations within ±5%", () => {
    const devs = records.map((r) => r.inv_vs_expected_pct);
    expect(devs.every((d) => d !== 0)).toBe(true);
    expect(Math.max(...devs.map(Math.abs))).toBeLessThanOrEqual(5);
    // Both signs appear (no systematic bias direction).
    expect(devs.some((d) => d > 0)).toBe(true);
    expect(devs.some((d) => d < 0)).toBe(true);
    // Most months land in the ±2% band.
    expect(devs.filter((d) => Math.abs(d) <= 2).length).toBeGreaterThanOrEqual(6);
  });

  it("keeps every month inside the engine tolerance bands (all verified)", () => {
    for (const r of records) {
      expect(Math.abs(r.inv_vs_expected_pct)).toBeLessThanOrEqual(15);
      expect(Math.abs(r.inv_vs_utility_pct)).toBeLessThanOrEqual(10);
      expect(Math.abs(r.util_vs_expected_pct)).toBeLessThanOrEqual(20);
      expect(r.status).toBe("verified");
      expect(r.flag_reasons).toEqual([]);
    }
  });

  it("summary reproduces the canonical figures", () => {
    const summary = buildSummary(records, 5000);
    expect(summary.annual_production_mwh).toBe(8102.8);
    expect(summary.capacity_factor_pct).toBe(18.5);
    expect(summary.months_verified).toBe(12);
    expect(summary.months_flagged).toBe(0);
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
    }
  });
});

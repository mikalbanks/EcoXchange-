import { describe, expect, it } from "vitest";
import {
  capacityBand,
  getEffectiveParameters,
  getModuleEfficiency,
} from "../src/backtest/parameters.js";

describe("parameters", () => {
  it("single-axis tracking returns 1.15 boost and 0° tilt", () => {
    const p = getEffectiveParameters({
      axis_type: "Single Axis Tracking",
      tilt_deg: 25,
      azimuth_deg: 200,
      latitude: 32,
    });
    expect(p.trackingBoost).toBeCloseTo(1.15);
    expect(p.tilt).toBe(0);
    expect(p.azimuth).toBe(180);
  });
  it("dual-axis tracking returns 1.25 boost", () => {
    const p = getEffectiveParameters({
      axis_type: "Dual Axis Tracking",
      tilt_deg: null,
      azimuth_deg: null,
      latitude: 32,
    });
    expect(p.trackingBoost).toBeCloseTo(1.25);
  });
  it("fixed falls back to latitude-rule-of-thumb tilt", () => {
    const p = getEffectiveParameters({
      axis_type: "Fixed",
      tilt_deg: null,
      azimuth_deg: null,
      latitude: 32.08,
    });
    expect(p.trackingBoost).toBe(1.0);
    expect(p.tilt).toBeGreaterThan(20); // 32.08 * 0.76 + 3.1 ≈ 27.5
    expect(p.tilt).toBeLessThan(35);
    expect(p.azimuth).toBe(180);
  });
  it("module efficiency by technology", () => {
    expect(getModuleEfficiency("Crystalline Silicon")).toBe(0.2);
    expect(getModuleEfficiency("Thin Film")).toBe(0.13);
    expect(getModuleEfficiency("Unknown")).toBe(0.19);
  });
  it("capacity band bucketing", () => {
    expect(capacityBand(1.5)).toBe("1-2 MW");
    expect(capacityBand(3)).toBe("2-5 MW");
    expect(capacityBand(7)).toBe("5-10 MW");
    expect(capacityBand(15)).toBe("10-20 MW");
  });
});

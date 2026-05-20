import { describe, it, expect } from "vitest";
import {
  declinationDeg,
  sunsetHourAngleRad,
  cosZenithNoon,
  cosIncidenceTiltedNoon,
  beamGeometricFactor,
  extraterrestrialDailyKwhPerM2,
  anisotropyIndex,
} from "../physics/solar-geometry.js";

describe("solar geometry", () => {
  it("declination at June solstice is ~+23.45°", () => {
    // Day 172 ≈ June 21 (Cooper's equation peak slightly later, ~day 173)
    expect(declinationDeg(172)).toBeCloseTo(23.45, 0);
  });

  it("declination at December solstice is ~-23.45°", () => {
    expect(declinationDeg(355)).toBeCloseTo(-23.45, 0);
  });

  it("declination at equinox is ~0°", () => {
    expect(Math.abs(declinationDeg(80))).toBeLessThan(1.5);
  });

  it("sunset hour angle at equator on equinox is π/2", () => {
    expect(sunsetHourAngleRad(0, 0)).toBeCloseTo(Math.PI / 2, 3);
  });

  it("cos(zenith) at noon equals 1 when sun is overhead (lat=decl)", () => {
    expect(cosZenithNoon(23.45, 23.45)).toBeCloseTo(1.0, 3);
  });

  it("cos(incidence) on tilted south-facing surface at noon is high when tilt~latitude", () => {
    // At Savannah (32°), equinox (decl=0), tilt = lat → cos(incidence) ≈ 1
    const cosI = cosIncidenceTiltedNoon(32, 0, 32, 180);
    expect(cosI).toBeCloseTo(1.0, 2);
  });

  it("beam factor R_b ≥ 0", () => {
    const r = beamGeometricFactor(32.08, declinationDeg(172), 20, 180);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(2);
  });

  it("extraterrestrial daily irradiance at Savannah in June is ~10-12 kWh/m²/day", () => {
    const h0 = extraterrestrialDailyKwhPerM2(32.08, "2024-06-21");
    expect(h0).toBeGreaterThan(10);
    expect(h0).toBeLessThan(12);
  });

  it("extraterrestrial daily irradiance at Savannah in December is ~5-7 kWh/m²/day", () => {
    const h0 = extraterrestrialDailyKwhPerM2(32.08, "2024-12-21");
    expect(h0).toBeGreaterThan(5);
    expect(h0).toBeLessThan(7);
  });

  it("anisotropy index clamps to [0, 1]", () => {
    expect(anisotropyIndex(5, 10)).toBeCloseTo(0.5, 5);
    expect(anisotropyIndex(15, 10)).toBe(1);
    expect(anisotropyIndex(-1, 10)).toBe(0);
    expect(anisotropyIndex(5, 0)).toBe(0);
  });
});

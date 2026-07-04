import { describe, expect, it } from "vitest";
import {
  daylightFractionElapsed,
  getCurrentProductionKw,
  getSolarElevation,
  minutesToSolarNoon,
  solarDeclination,
} from "./solar.js";

// Savannah, GA — the demo project site.
const LAT = 32.08;
const LON = -81.09;

// Savannah is UTC-5 (EST) / UTC-4 (EDT); local solar noon ≈ 17:24 UTC.
const SUMMER_NOON_UTC = new Date("2024-06-21T17:24:00Z");
const SUMMER_MIDNIGHT_UTC = new Date("2024-06-21T05:24:00Z");
const WINTER_NOON_UTC = new Date("2024-12-21T17:24:00Z");

describe("solar position", () => {
  it("declination peaks near the solstices", () => {
    expect(solarDeclination(new Date("2024-06-21T00:00:00Z"))).toBeGreaterThan(23);
    expect(solarDeclination(new Date("2024-12-21T00:00:00Z"))).toBeLessThan(-23);
    expect(Math.abs(solarDeclination(new Date("2024-03-21T00:00:00Z")))).toBeLessThan(2);
  });

  it("elevation is high at summer solar noon and negative at night", () => {
    const noon = getSolarElevation(LAT, LON, SUMMER_NOON_UTC);
    expect(noon).toBeGreaterThan(75); // 90 - 32.08 + 23.45 ≈ 81°
    expect(noon).toBeLessThanOrEqual(90);
    expect(getSolarElevation(LAT, LON, SUMMER_MIDNIGHT_UTC)).toBeLessThan(0);
  });

  it("winter noon elevation is much lower but still positive", () => {
    const noon = getSolarElevation(LAT, LON, WINTER_NOON_UTC);
    expect(noon).toBeGreaterThan(30);
    expect(noon).toBeLessThan(40); // 90 - 32.08 - 23.45 ≈ 34.5°
  });

  it("solar noon offset is ~0 at local solar noon", () => {
    expect(Math.abs(minutesToSolarNoon(LON, SUMMER_NOON_UTC))).toBeLessThan(15);
  });
});

describe("getCurrentProductionKw", () => {
  it("is 0 at night and positive at noon, clamped to capacity", () => {
    expect(getCurrentProductionKw(LAT, LON, 5000, SUMMER_MIDNIGHT_UTC)).toBe(0);
    const noon = getCurrentProductionKw(LAT, LON, 5000, SUMMER_NOON_UTC);
    expect(noon).toBeGreaterThan(3500); // ≈ 5000 × sin(81°) × 0.85 ≈ 4197
    expect(noon).toBeLessThanOrEqual(5000);
  });

  it("noise factor scales output but never exceeds capacity or drops below 0", () => {
    const base = getCurrentProductionKw(LAT, LON, 5000, SUMMER_NOON_UTC, 1);
    expect(getCurrentProductionKw(LAT, LON, 5000, SUMMER_NOON_UTC, 0.7)).toBeCloseTo(base * 0.7, 5);
    expect(getCurrentProductionKw(LAT, LON, 5000, SUMMER_NOON_UTC, 100)).toBe(5000);
    expect(getCurrentProductionKw(LAT, LON, 5000, SUMMER_NOON_UTC, -1)).toBe(0);
  });
});

describe("daylightFractionElapsed", () => {
  it("is 0 before sunrise, ~0.5 at solar noon, 1 after sunset", () => {
    // 09:30 UTC ≈ 04:05 solar — genuinely pre-sunrise (June sunrise ≈ 04:55 solar).
    expect(daylightFractionElapsed(LAT, LON, new Date("2024-06-21T09:30:00Z"))).toBe(0);
    expect(daylightFractionElapsed(LAT, LON, SUMMER_NOON_UTC)).toBeGreaterThan(0.45);
    expect(daylightFractionElapsed(LAT, LON, SUMMER_NOON_UTC)).toBeLessThan(0.55);
    expect(daylightFractionElapsed(LAT, LON, new Date("2024-06-22T02:00:00Z"))).toBe(1);
    // Just past civil midnight wraps to the evening side of the solar day —
    // the "Today" accumulator shows the completed day's total overnight.
    expect(daylightFractionElapsed(LAT, LON, SUMMER_MIDNIGHT_UTC)).toBe(1);
  });
});

import { clamp, degToRad } from "../utils/math.js";
import { dayOfYear } from "../utils/dates.js";
import { SOLAR_CONSTANT_W_M2 } from "../config/constants.js";

/**
 * Solar declination via Cooper's equation (degrees).
 */
export function declinationDeg(n: number): number {
  return 23.45 * Math.sin((2 * Math.PI * (284 + n)) / 365);
}

/**
 * Sunset hour angle (radians). Clipped for polar day/night.
 */
export function sunsetHourAngleRad(latDeg: number, declDeg: number): number {
  const arg = -Math.tan(degToRad(latDeg)) * Math.tan(degToRad(declDeg));
  if (arg <= -1) return Math.PI; // 24h sun
  if (arg >= 1) return 0; // polar night
  return Math.acos(arg);
}

/**
 * cos(zenith) at solar noon (hour angle = 0). Daily-average approximation
 * per spec §2.2 step 1.
 */
export function cosZenithNoon(latDeg: number, declDeg: number): number {
  const lat = degToRad(latDeg);
  const decl = degToRad(declDeg);
  return Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl);
}

/**
 * cos(incidence angle) on a tilted, south-facing surface at solar noon.
 * Surface tilt rotates the latitude reference: (lat - tilt) for north-hemisphere
 * south-facing arrays. Spec §2.2 step 1.
 */
export function cosIncidenceTiltedNoon(
  latDeg: number,
  declDeg: number,
  tiltDeg: number,
  azimuthDeg: number,
): number {
  const lat = degToRad(latDeg);
  const decl = degToRad(declDeg);
  const tilt = degToRad(tiltDeg);
  // South-facing reference (azimuth 180). If azimuth differs, apply a cosine
  // adjustment around the noon meridian. With hour_angle = 0 this collapses
  // to the standard form when azimuth = 180.
  const azimuthOffset = degToRad(azimuthDeg - 180);
  // Standard incidence formula at hour_angle = 0:
  // cosθ = sin(decl) sin(lat - tilt) + cos(decl) cos(lat - tilt)
  const base =
    Math.sin(decl) * Math.sin(lat - tilt) +
    Math.cos(decl) * Math.cos(lat - tilt);
  // Penalty for non-south azimuth (small at noon, exact at hour_angle=0 only
  // for azimuth=180; this approximation is acceptable per spec's noon model).
  return base * Math.cos(azimuthOffset);
}

/**
 * Geometric beam factor R_b = cos(θ_i) / cos(θ_z), clipped to ≥0.
 */
export function beamGeometricFactor(
  latDeg: number,
  declDeg: number,
  tiltDeg: number,
  azimuthDeg: number,
): number {
  const cosZ = cosZenithNoon(latDeg, declDeg);
  if (cosZ <= 1e-6) return 0;
  const cosI = cosIncidenceTiltedNoon(latDeg, declDeg, tiltDeg, azimuthDeg);
  return Math.max(0, cosI / cosZ);
}

/**
 * Daily extraterrestrial irradiance on a horizontal surface (kWh/m²/day).
 * Used as the reference for the Hay-Davies anisotropy index.
 *
 * H_0 = (24·3600 / π) · G_sc · (1 + 0.033 cos(360 n / 365))
 *       · (cos(φ) cos(δ) sin(ω_s) + ω_s sin(φ) sin(δ))
 * with output converted from J/m²/day to kWh/m²/day.
 */
export function extraterrestrialDailyKwhPerM2(
  latDeg: number,
  isoDate: string,
): number {
  const n = dayOfYear(isoDate);
  const decl = declinationDeg(n);
  const lat = degToRad(latDeg);
  const declRad = degToRad(decl);
  const omegaS = sunsetHourAngleRad(latDeg, decl);
  const eccentricity = 1 + 0.033 * Math.cos((2 * Math.PI * n) / 365);
  const energyTerm =
    Math.cos(lat) * Math.cos(declRad) * Math.sin(omegaS) +
    omegaS * Math.sin(lat) * Math.sin(declRad);
  // J/m²/day -> kWh/m²/day: divide by 3.6e6
  const jPerM2Day =
    ((24 * 3600) / Math.PI) * SOLAR_CONSTANT_W_M2 * eccentricity * energyTerm;
  return Math.max(0, jPerM2Day / 3.6e6);
}

/**
 * Hay-Davies anisotropy index A_i ∈ [0, 1].
 */
export function anisotropyIndex(
  beamHorizontalKwhM2: number,
  extraterrestrialHorizontalKwhM2: number,
): number {
  if (extraterrestrialHorizontalKwhM2 <= 0) return 0;
  return clamp(beamHorizontalKwhM2 / extraterrestrialHorizontalKwhM2, 0, 1);
}

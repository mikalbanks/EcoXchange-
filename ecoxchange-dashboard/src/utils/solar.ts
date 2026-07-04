// Lightweight solar-position math for the live production meter
// (differentiation spec §2.4). NOAA-style approximations — accurate to well
// under a degree, which is far more than a demo gauge needs. Pure functions
// so the simulation is unit-testable.

const DEG = Math.PI / 180;

/** Day of year (1–366) in UTC. */
function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

/** Solar declination in degrees (Cooper's equation). */
export function solarDeclination(date: Date): number {
  const n = dayOfYear(date);
  return 23.45 * Math.sin(DEG * ((360 / 365) * (n + 284)));
}

/** Equation of time in minutes (Spencer approximation). */
export function equationOfTime(date: Date): number {
  const n = dayOfYear(date);
  const b = DEG * ((360 / 365) * (n - 81));
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/** Local solar time in fractional hours at the given longitude. */
export function solarTimeHours(longitude: number, date: Date): number {
  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const solar = utcHours + longitude / 15 + equationOfTime(date) / 60;
  return ((solar % 24) + 24) % 24;
}

/** Solar elevation angle in degrees; <= 0 means the sun is below the horizon. */
export function getSolarElevation(latitude: number, longitude: number, date: Date): number {
  const decl = solarDeclination(date) * DEG;
  const lat = latitude * DEG;
  const hourAngle = (solarTimeHours(longitude, date) - 12) * 15 * DEG;
  const sinElevation =
    Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
  return Math.asin(Math.max(-1, Math.min(1, sinElevation))) / DEG;
}

/** Minutes until (positive) or since (negative) local solar noon. */
export function minutesToSolarNoon(longitude: number, date: Date): number {
  const solar = solarTimeHours(longitude, date);
  return Math.round((12 - solar) * 60);
}

/**
 * Simulated instantaneous AC output (spec §2.4): capacity × sin(elevation) ×
 * 0.85 system efficiency, with caller-supplied noise (deterministic in tests,
 * Math.random-driven in the live meter). Clamped to [0, capacity]; 0 at night.
 */
export function getCurrentProductionKw(
  latitude: number,
  longitude: number,
  capacityKw: number,
  date: Date,
  noiseFactor = 1,
): number {
  const elevation = getSolarElevation(latitude, longitude, date);
  if (elevation <= 0) return 0;
  const base = capacityKw * Math.sin(elevation * DEG) * 0.85;
  return Math.min(capacityKw, Math.max(0, base * noiseFactor));
}

/**
 * Fraction of the daylight window already elapsed (0 before sunrise, 1 after
 * sunset) — drives the "Today" kWh accumulator without integrating.
 */
export function daylightFractionElapsed(
  latitude: number,
  longitude: number,
  date: Date,
): number {
  const decl = solarDeclination(date) * DEG;
  const lat = latitude * DEG;
  const cosH = -Math.tan(lat) * Math.tan(decl);
  if (cosH >= 1) return 0; // polar night
  if (cosH <= -1) return 1; // midnight sun — treat as fully elapsed
  const halfDayHours = Math.acos(cosH) / DEG / 15;
  const solar = solarTimeHours(longitude, date);
  const sinceSunrise = solar - (12 - halfDayHours);
  return Math.max(0, Math.min(1, sinceSunrise / (2 * halfDayHours)));
}

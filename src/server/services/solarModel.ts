/**
 * Solar Energy Model (pvlib-equivalent in TypeScript)
 * ===================================================
 * Implements the core pvlib computation chain in pure TypeScript:
 *
 *   1. Solar position (NREL SPA approximation)
 *   2. Perez transposition model (satellite-to-irradiance)
 *   3. Single-axis tracker orientation
 *   4. Sandia cell temperature model
 *   5. Single-diode DC model (simplified CEC)
 *   6. Sandia inverter model → P_ac
 *
 * Reference: Perez, R. et al. (1990). "Modeling daylight availability and
 * irradiance components from direct and global irradiance."
 * Solar Energy, 44(5), 271-289.
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ─── System Configuration: 4.7 MW Single-Axis Tracker ───────────────────────
export interface SystemConfig {
  capacityKw: number;          // Nameplate DC capacity (kW)
  modulePowerW: number;        // Per-module STC rating (W)
  numModules: number;
  inverterEfficiencyPeak: number; // η_inv at rated load
  inverterPacMaxKw: number;    // AC clipping limit (kW)
  dcAcRatio: number;           // DC/AC ratio (typ. 1.2–1.4)
  trackerMaxAngle: number;     // Single-axis tracker max rotation (°)
  gammaPmp: number;            // Temperature coefficient of P_mp (%/°C)
  tNoct: number;               // Nominal Operating Cell Temperature (°C)
  albedo: number;
}

export const DEFAULT_SYSTEM: SystemConfig = {
  capacityKw: 4700,
  modulePowerW: 580,           // Modern bifacial TOPCon module
  numModules: Math.ceil(4700000 / 580),
  inverterEfficiencyPeak: 0.984,
  inverterPacMaxKw: 4700 / 1.3, // ~3615 kW AC
  dcAcRatio: 1.3,
  trackerMaxAngle: 60,
  gammaPmp: -0.34,             // %/°C (typical for TOPCon)
  tNoct: 44,                   // °C
  albedo: 0.2,
};

export interface SolarPosition {
  zenith: number;   // degrees
  azimuth: number;  // degrees (N=0, E=90)
  apparent_elevation: number;
}

export interface PowerResult {
  poaGlobalWm2: number;
  cellTemperatureC: number;
  dcPowerKw: number;
  acPowerKw: number;
  inverterEfficiency: number;
  capacityFactor: number;
}

// ─── 1. Solar Position (simplified NREL SPA) ────────────────────────────────
export function solarPosition(
  timestamp: Date,
  latitude: number,
  longitude: number
): SolarPosition {
  const jd = julianDay(timestamp);
  const n = jd - 2451545.0; // Days from J2000.0

  // Mean longitude and anomaly
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * DEG2RAD;

  // Ecliptic longitude
  const lambda =
    (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG2RAD;

  // Obliquity of the ecliptic
  const epsilon = (23.439 - 0.0000004 * n) * DEG2RAD;

  // Right ascension and declination
  const sinLambda = Math.sin(lambda);
  const cosLambda = Math.cos(lambda);
  const ra = Math.atan2(
    Math.cos(epsilon) * sinLambda,
    cosLambda
  );
  const declination = Math.asin(Math.sin(epsilon) * sinLambda);

  // Hour angle
  const utcHours =
    timestamp.getUTCHours() +
    timestamp.getUTCMinutes() / 60 +
    timestamp.getUTCSeconds() / 3600;
  const gmst = (6.697375 + 0.0657098242 * n + utcHours) % 24;
  const lst = gmst + longitude / 15;
  const ha = ((lst * 15 - ra * RAD2DEG) % 360) * DEG2RAD;

  // Zenith and azimuth
  const latRad = latitude * DEG2RAD;
  const cosZenith =
    Math.sin(latRad) * Math.sin(declination) +
    Math.cos(latRad) * Math.cos(declination) * Math.cos(ha);
  const zenith = Math.acos(Math.max(-1, Math.min(1, cosZenith))) * RAD2DEG;

  const sinAz =
    (-Math.cos(declination) * Math.sin(ha)) /
    Math.sin(zenith * DEG2RAD);
  const cosAz =
    (Math.sin(declination) - Math.sin(latRad) * cosZenith) /
    (Math.cos(latRad) * Math.sin(zenith * DEG2RAD));
  let azimuth = Math.atan2(sinAz, cosAz) * RAD2DEG;
  azimuth = (azimuth + 360) % 360;

  // Atmospheric refraction correction
  const elevTrue = 90 - zenith;
  const refractionCorrection =
    elevTrue > 5
      ? 58.1 / Math.tan(elevTrue * DEG2RAD) / 3600
      : elevTrue > -0.575
        ? (1735 + elevTrue * (-518.2 + elevTrue * (103.4 + elevTrue * (-12.79 + elevTrue * 0.711)))) / 3600
        : 0;

  return {
    zenith,
    azimuth,
    apparent_elevation: elevTrue + refractionCorrection,
  };
}

function julianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h =
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;

  let yr = y;
  let mo = m;
  if (mo <= 2) {
    yr -= 1;
    mo += 12;
  }
  const A = Math.floor(yr / 100);
  const B = 2 - A + Math.floor(A / 4);

  return (
    Math.floor(365.25 * (yr + 4716)) +
    Math.floor(30.6001 * (mo + 1)) +
    d +
    h +
    B -
    1524.5
  );
}

// ─── 2. Single-Axis Tracker Orientation ─────────────────────────────────────
function singleAxisTrackerAngle(
  solarZenith: number,
  solarAzimuth: number,
  maxAngle: number
): { surfaceTilt: number; surfaceAzimuth: number } {
  // Tracker axis oriented N-S (azimuth = 180° in pvlib convention).
  // Rotation angle ρ = arctan( sin(az_s - 180) * tan(90 - zen_s) )
  const zenRad = solarZenith * DEG2RAD;
  const azRad = (solarAzimuth - 180) * DEG2RAD;
  const projectionAngle = Math.atan2(
    Math.sin(azRad),
    Math.cos(azRad) * Math.cos(zenRad)
  );
  let rotation = projectionAngle * RAD2DEG;
  rotation = Math.max(-maxAngle, Math.min(maxAngle, rotation));

  return {
    surfaceTilt: Math.abs(rotation),
    surfaceAzimuth: rotation >= 0 ? 90 : 270,
  };
}

// ─── 3. Perez Transposition Model ──────────────────────────────────────────
/**
 * Perez et al. (1990) anisotropic diffuse sky model.
 * Computes plane-of-array (POA) irradiance from GHI/DNI/DHI components.
 */
function perezTransposition(
  ghi: number,
  dni: number,
  dhi: number,
  solarZenith: number,
  surfaceTilt: number,
  surfaceAzimuth: number,
  solarAzimuth: number,
  albedo: number
): number {
  if (solarZenith >= 90 || ghi <= 0) return 0;

  const zenRad = solarZenith * DEG2RAD;
  const tiltRad = surfaceTilt * DEG2RAD;

  // Angle of incidence (AOI)
  const cosAOI =
    Math.cos(zenRad) * Math.cos(tiltRad) +
    Math.sin(zenRad) *
      Math.sin(tiltRad) *
      Math.cos((solarAzimuth - surfaceAzimuth) * DEG2RAD);
  const aoi = Math.acos(Math.max(-1, Math.min(1, cosAOI)));

  // Beam on tilted surface
  const beamPoa = Math.max(0, dni * Math.cos(aoi));

  // Perez sky clearness ε
  const am = 1 / (Math.cos(zenRad) + 0.50572 * Math.pow(96.07995 - solarZenith, -1.6364));
  const kappa = 1.041; // for zenith in radians
  const denom = Math.max(dhi, 0.001);
  const epsilon =
    ((dhi + dni) / denom + kappa * Math.pow(zenRad, 3)) /
    (1 + kappa * Math.pow(zenRad, 3));

  // Perez sky brightness Δ
  const delta = (dhi * am) / 1367; // Extraterrestrial irradiance ≈ 1367 W/m²

  // Perez coefficients (simplified 8-bin discrete model)
  const { f11, f12, f13, f21, f22, f23 } = perezCoefficients(epsilon);

  const a = Math.max(0, Math.cos(aoi));
  const b = Math.max(0.087, Math.cos(zenRad));

  const F1 = Math.max(0, f11 + f12 * delta + f13 * zenRad);
  const F2 = f21 + f22 * delta + f23 * zenRad;

  // Diffuse POA (Perez model)
  const diffusePoa =
    dhi *
    ((1 - F1) * (1 + Math.cos(tiltRad)) / 2 +
      F1 * (a / b) +
      F2 * Math.sin(tiltRad));

  // Ground-reflected component
  const groundReflected = ghi * albedo * (1 - Math.cos(tiltRad)) / 2;

  return Math.max(0, beamPoa + Math.max(0, diffusePoa) + groundReflected);
}

interface PerezCoeffs {
  f11: number; f12: number; f13: number;
  f21: number; f22: number; f23: number;
}

function perezCoefficients(epsilon: number): PerezCoeffs {
  // Perez et al. (1990) Table 1 — 8 sky clearness bins
  const bins: [number, PerezCoeffs][] = [
    [1.065, { f11: -0.008, f12: 0.588, f13: -0.062, f21: -0.060, f22: 0.072, f23: -0.022 }],
    [1.230, { f11: 0.130, f12: 0.683, f13: -0.151, f21: -0.019, f22: 0.066, f23: -0.029 }],
    [1.500, { f11: 0.330, f12: 0.487, f13: -0.221, f21: 0.055, f22: -0.064, f23: -0.026 }],
    [1.950, { f11: 0.568, f12: 0.187, f13: -0.295, f21: 0.109, f22: -0.152, f23: -0.014 }],
    [2.800, { f11: 0.873, f12: -0.392, f13: -0.362, f21: 0.226, f22: -0.462, f23: 0.001 }],
    [4.500, { f11: 1.132, f12: -1.237, f13: -0.412, f21: 0.288, f22: -0.823, f23: 0.056 }],
    [6.200, { f11: 1.060, f12: -1.600, f13: -0.359, f21: 0.264, f22: -1.127, f23: 0.131 }],
    [Infinity, { f11: 0.678, f12: -0.327, f13: -0.250, f21: 0.156, f22: -1.377, f23: 0.251 }],
  ];

  for (const [threshold, coeffs] of bins) {
    if (epsilon < threshold) return coeffs;
  }
  return bins[bins.length - 1][1];
}

// ─── 4. Cell Temperature (Sandia model) ─────────────────────────────────────
function cellTemperature(
  poaGlobal: number,
  airTemp: number,
  windSpeed: number,
  tNoct: number
): number {
  // Sandia open-rack glass/cell/glass model
  // T_cell = T_air + POA * exp(a + b * WS) + POA * ΔT / E₀
  // Simplified NOCT-based: T_cell = T_air + (NOCT - 20) * (POA / 800)
  const deltaT = (tNoct - 20) * (poaGlobal / 800);
  // Wind correction: ~1°C reduction per m/s above 1 m/s
  const windCorrection = Math.max(0, (windSpeed - 1) * 1.0);
  return airTemp + deltaT - windCorrection;
}

// ─── 5. DC Power (simplified single-diode CEC model) ────────────────────────
function dcPower(
  poaGlobal: number,
  cellTemp: number,
  config: SystemConfig
): number {
  // P_dc = P_stc * (G / G_stc) * [1 + γ_pmp * (T_cell - T_stc)]
  // where G_stc = 1000 W/m², T_stc = 25°C
  const gRatio = poaGlobal / 1000;
  const tempCoeff = 1 + (config.gammaPmp / 100) * (cellTemp - 25);
  const pDcTotal = config.capacityKw * gRatio * tempCoeff;
  return Math.max(0, pDcTotal);
}

// ─── 6. Inverter Model (Sandia) → P_ac ─────────────────────────────────────
function acPower(
  pDcKw: number,
  config: SystemConfig
): { pacKw: number; efficiency: number } {
  // Sandia inverter model (simplified):
  // η = η_peak * (1 - 0.04 * |P_dc/P_rated - 1|)  (derating at part/over load)
  // P_ac = min(P_dc * η, P_ac_max)
  const pRated = config.capacityKw;
  const loadFraction = pDcKw / pRated;

  let efficiency: number;
  if (loadFraction <= 0.01) {
    efficiency = 0;
  } else if (loadFraction < 0.1) {
    // Low-light derating
    efficiency = config.inverterEfficiencyPeak * (loadFraction / 0.1) * 0.95;
  } else {
    // Main operating range with parabolic derating
    efficiency =
      config.inverterEfficiencyPeak *
      (1 - 0.04 * Math.pow(loadFraction - 1, 2));
  }

  efficiency = Math.max(0, Math.min(config.inverterEfficiencyPeak, efficiency));
  const pac = Math.min(pDcKw * efficiency, config.inverterPacMaxKw);

  return { pacKw: Math.max(0, pac), efficiency };
}

// ─── Public API: Full Computation Chain ─────────────────────────────────────
export function computePower(
  timestamp: Date,
  latitude: number,
  longitude: number,
  ghi: number,
  dni: number,
  dhi: number,
  airTemp: number,
  windSpeed: number,
  config: SystemConfig = DEFAULT_SYSTEM
): PowerResult {
  // Step 1: Solar position
  const sunPos = solarPosition(timestamp, latitude, longitude);

  // Nighttime → zero output
  if (sunPos.apparent_elevation <= 0) {
    return {
      poaGlobalWm2: 0,
      cellTemperatureC: airTemp,
      dcPowerKw: 0,
      acPowerKw: 0,
      inverterEfficiency: 0,
      capacityFactor: 0,
    };
  }

  // Step 2: Tracker orientation
  const tracker = singleAxisTrackerAngle(
    sunPos.zenith,
    sunPos.azimuth,
    config.trackerMaxAngle
  );

  // Step 3: Perez transposition → POA irradiance
  const poaGlobal = perezTransposition(
    ghi,
    dni,
    dhi,
    sunPos.zenith,
    tracker.surfaceTilt,
    tracker.surfaceAzimuth,
    sunPos.azimuth,
    config.albedo
  );

  // Step 4: Cell temperature
  const tCell = cellTemperature(poaGlobal, airTemp, windSpeed, config.tNoct);

  // Step 5: DC power
  const pDc = dcPower(poaGlobal, tCell, config);

  // Step 6: AC power
  const { pacKw, efficiency } = acPower(pDc, config);

  return {
    poaGlobalWm2: poaGlobal,
    cellTemperatureC: tCell,
    dcPowerKw: pDc,
    acPowerKw: pacKw,
    inverterEfficiency: efficiency,
    capacityFactor: pacKw / config.inverterPacMaxKw,
  };
}

export { singleAxisTrackerAngle, perezTransposition, cellTemperature };

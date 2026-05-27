// Source of truth: /ecoxchange-reconciliation-engine/src/physics/expected-generation.ts
// Faithful copy. Keep in sync with that file.

const ALBEDO = 0.2;
const SOLAR_CONSTANT_W_M2 = 1367;
const STC_IRRADIANCE_KW_M2 = 1.0;

export interface DailyIrradiance {
  date: string;
  ghi_kwh_m2: number;
  dni_kwh_m2: number;
  dhi_kwh_m2: number;
}

export interface ExpectedGenerationInput {
  capacity_kw_dc: number;
  tilt_deg: number;
  azimuth_deg: number;
  module_efficiency: number;
  system_losses: number;
  degradation_rate: number;
  commissioning_date: string;
  latitude: number;
  longitude: number;
  period_start: string;
  period_end: string;
  daily_irradiance: DailyIrradiance[];
}

export interface ExpectedGenerationOutput {
  period_start: string;
  period_end: string;
  expected_kwh: number;
  daily_breakdown: Array<{
    date: string;
    ghi_kwh_m2: number;
    poa_kwh_m2: number;
    expected_kwh: number;
  }>;
}

const degToRad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));

function dayOfYear(iso: string): number {
  const d = new Date(iso + "T00:00:00Z");
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / (24 * 3600 * 1000)) + 1;
}
function declinationDeg(n: number) {
  return 23.45 * Math.sin((2 * Math.PI * (284 + n)) / 365);
}
function sunsetHourAngle(latDeg: number, declDeg: number) {
  const arg = -Math.tan(degToRad(latDeg)) * Math.tan(degToRad(declDeg));
  if (arg <= -1) return Math.PI;
  if (arg >= 1) return 0;
  return Math.acos(arg);
}
function cosZenithNoon(latDeg: number, declDeg: number) {
  return (
    Math.sin(degToRad(latDeg)) * Math.sin(degToRad(declDeg)) +
    Math.cos(degToRad(latDeg)) * Math.cos(degToRad(declDeg))
  );
}
function cosIncidenceTiltedNoon(
  latDeg: number,
  declDeg: number,
  tiltDeg: number,
  azimuthDeg: number,
) {
  const lat = degToRad(latDeg);
  const decl = degToRad(declDeg);
  const tilt = degToRad(tiltDeg);
  const azOff = degToRad(azimuthDeg - 180);
  const base =
    Math.sin(decl) * Math.sin(lat - tilt) +
    Math.cos(decl) * Math.cos(lat - tilt);
  return base * Math.cos(azOff);
}
function beamGeomR_b(
  latDeg: number,
  declDeg: number,
  tiltDeg: number,
  azimuthDeg: number,
) {
  const cosZ = cosZenithNoon(latDeg, declDeg);
  if (cosZ <= 1e-6) return 0;
  return Math.max(
    0,
    cosIncidenceTiltedNoon(latDeg, declDeg, tiltDeg, azimuthDeg) / cosZ,
  );
}
function extraterrestrialDailyKwhPerM2(latDeg: number, iso: string) {
  const n = dayOfYear(iso);
  const decl = declinationDeg(n);
  const omegaS = sunsetHourAngle(latDeg, decl);
  const lat = degToRad(latDeg);
  const declR = degToRad(decl);
  const ecc = 1 + 0.033 * Math.cos((2 * Math.PI * n) / 365);
  const energy =
    Math.cos(lat) * Math.cos(declR) * Math.sin(omegaS) +
    omegaS * Math.sin(lat) * Math.sin(declR);
  const jPerM2 =
    ((24 * 3600) / Math.PI) * SOLAR_CONSTANT_W_M2 * ecc * energy;
  return Math.max(0, jPerM2 / 3.6e6);
}

function transposeDay(
  day: DailyIrradiance,
  latDeg: number,
  tiltDeg: number,
  azimuthDeg: number,
): number {
  const n = dayOfYear(day.date);
  const decl = declinationDeg(n);
  const r_b = beamGeomR_b(latDeg, decl, tiltDeg, azimuthDeg);
  const beamH = Math.max(0, day.ghi_kwh_m2 - day.dhi_kwh_m2);
  const h0 = extraterrestrialDailyKwhPerM2(latDeg, day.date);
  const ai = h0 > 0 ? clamp(beamH / h0, 0, 1) : 0;
  const cosTilt = Math.cos(degToRad(tiltDeg));
  const beamPoa = beamH * r_b;
  const diffusePoa =
    day.dhi_kwh_m2 * (ai * r_b + (1 - ai) * ((1 + cosTilt) / 2));
  const groundPoa = day.ghi_kwh_m2 * ALBEDO * ((1 - cosTilt) / 2);
  return beamPoa + diffusePoa + groundPoa;
}

export function calculateExpectedGeneration(
  input: ExpectedGenerationInput,
): ExpectedGenerationOutput {
  const moduleAreaM2 = input.capacity_kw_dc / input.module_efficiency;
  const periodStart = new Date(input.period_start + "T00:00:00Z");
  const periodEnd = new Date(input.period_end + "T00:00:00Z");
  const commissioning = new Date(
    input.commissioning_date + "T00:00:00Z",
  );
  const midPeriod = new Date(
    (periodStart.getTime() + periodEnd.getTime()) / 2,
  );
  const yearsOperating = Math.max(
    0,
    (midPeriod.getTime() - commissioning.getTime()) /
      (365.25 * 24 * 3600 * 1000),
  );
  const degradationFactor = Math.max(
    0,
    1 - input.degradation_rate * yearsOperating,
  );
  const lossFactor = 1 - input.system_losses;

  const daily = input.daily_irradiance.map((d) => {
    const poa = transposeDay(
      d,
      input.latitude,
      input.tilt_deg,
      input.azimuth_deg,
    );
    const dc = poa * moduleAreaM2 * input.module_efficiency * STC_IRRADIANCE_KW_M2;
    const ac = dc * lossFactor;
    return {
      date: d.date,
      ghi_kwh_m2: d.ghi_kwh_m2,
      poa_kwh_m2: poa,
      expected_kwh: ac * degradationFactor,
    };
  });

  return {
    period_start: input.period_start,
    period_end: input.period_end,
    expected_kwh: daily.reduce((s, d) => s + d.expected_kwh, 0),
    daily_breakdown: daily,
  };
}

import { degToRad } from "../utils/math.js";
import { ALBEDO } from "../config/constants.js";
import {
  anisotropyIndex,
  beamGeometricFactor,
  cosZenithNoon,
  declinationDeg,
  extraterrestrialDailyKwhPerM2,
} from "./solar-geometry.js";
import { dayOfYear } from "../utils/dates.js";

export interface TranspositionDailyInput {
  date: string;
  ghi_kwh_m2: number;
  dni_kwh_m2: number;
  dhi_kwh_m2: number;
}

export interface TranspositionDailyOutput {
  date: string;
  poa_kwh_m2: number;
  beam_poa: number;
  diffuse_poa: number;
  ground_poa: number;
  r_b: number;
  anisotropy_index: number;
}

/**
 * Hay-Davies GHI/DNI/DHI → POA (kWh/m²/day).
 *
 * POA = beam + diffuse(anisotropic + isotropic) + ground-reflected
 *
 *   beam_poa     = DNI · R_b
 *   diffuse_poa  = DHI · ( A_i · R_b + (1 - A_i) · (1 + cos(tilt)) / 2 )
 *   ground_poa   = GHI · albedo · (1 - cos(tilt)) / 2
 */
export function transposeDay(
  input: TranspositionDailyInput,
  latDeg: number,
  tiltDeg: number,
  azimuthDeg: number,
): TranspositionDailyOutput {
  const n = dayOfYear(input.date);
  const decl = declinationDeg(n);
  const r_b = beamGeometricFactor(latDeg, decl, tiltDeg, azimuthDeg);

  // Canonical Hay-Davies uses beam-on-horizontal (= GHI − DHI) transposed via
  // R_b, NOT direct-normal DNI · R_b (which would double-count). DNI is kept
  // for the anisotropy index reference.
  const beamHorizontal = Math.max(0, input.ghi_kwh_m2 - input.dhi_kwh_m2);
  const h0 = extraterrestrialDailyKwhPerM2(latDeg, input.date);
  const ai = anisotropyIndex(beamHorizontal, h0);

  const tiltRad = degToRad(tiltDeg);
  const cosTilt = Math.cos(tiltRad);

  const beam_poa = beamHorizontal * r_b;
  const diffuse_poa =
    input.dhi_kwh_m2 * (ai * r_b + (1 - ai) * ((1 + cosTilt) / 2));
  const ground_poa = input.ghi_kwh_m2 * ALBEDO * ((1 - cosTilt) / 2);

  return {
    date: input.date,
    poa_kwh_m2: beam_poa + diffuse_poa + ground_poa,
    beam_poa,
    diffuse_poa,
    ground_poa,
    r_b,
    anisotropy_index: ai,
  };
}

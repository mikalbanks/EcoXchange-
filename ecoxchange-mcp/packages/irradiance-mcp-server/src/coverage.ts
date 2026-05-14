import type { IrradianceSourceName } from "@ecoxchange/shared";

export interface CoverageProfile {
  isContiguousUS: boolean;
  isHawaii: boolean;
  isPuertoRico: boolean;
  nrelAvailable: boolean;
  solargisAvailable: boolean;
  available: IrradianceSourceName[];
  recommended: IrradianceSourceName;
}

export function computeCoverage(
  lat: number,
  lon: number,
  hasSolargisKey: boolean,
  hasNrelKey: boolean,
): CoverageProfile {
  const isContiguousUS =
    lat >= 24.5 && lat <= 49.5 && lon >= -125 && lon <= -66.5;
  const isHawaii = lat >= 18.9 && lat <= 22.2 && lon >= -160.3 && lon <= -154.8;
  const isPuertoRico =
    lat >= 17.9 && lat <= 18.5 && lon >= -67.3 && lon <= -65.6;

  const nrelAvailable =
    hasNrelKey && (isContiguousUS || isHawaii || isPuertoRico);
  const solargisAvailable = hasSolargisKey;

  const available: IrradianceSourceName[] = ["nasa_power"];
  if (nrelAvailable) available.unshift("nrel_nsrdb");
  if (solargisAvailable) available.push("solargis");

  let recommended: IrradianceSourceName;
  if (nrelAvailable) recommended = "nrel_nsrdb";
  else if (solargisAvailable) recommended = "solargis";
  else recommended = "nasa_power";

  return {
    isContiguousUS,
    isHawaii,
    isPuertoRico,
    nrelAvailable,
    solargisAvailable,
    available,
    recommended,
  };
}

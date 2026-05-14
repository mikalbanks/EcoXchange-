import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type { IrradianceSourceName } from "@ecoxchange/shared";
import type { IrradianceSource } from "./base.js";
import { NasaPowerSource } from "./nasa_power.js";
import { NrelNsrdbSource } from "./nrel_nsrdb.js";
import { SolargisSource } from "./solargis.js";
import { computeCoverage } from "../coverage.js";

export function getSource(name: IrradianceSourceName): IrradianceSource {
  switch (name) {
    case "nasa_power":
      return new NasaPowerSource();
    case "nrel_nsrdb":
      return new NrelNsrdbSource();
    case "solargis":
      return new SolargisSource();
    default:
      throw new McpError(
        ErrorCode.InvalidParams,
        `Unknown irradiance source: ${name}`,
      );
  }
}

export function resolveAutoSource(
  lat: number,
  lon: number,
): IrradianceSourceName {
  const hasSolargis = Boolean(process.env.SOLARGIS_API_KEY);
  const hasNrel = Boolean(process.env.NREL_API_KEY);
  const cov = computeCoverage(lat, lon, hasSolargis, hasNrel);
  return cov.recommended;
}

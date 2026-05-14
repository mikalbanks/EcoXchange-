import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type { IrradianceRecord } from "@ecoxchange/shared";
import type { IrradianceSource } from "./base.js";
import type { GetDailyParams, CoverageResult } from "../types.js";
import { sourceRequest } from "./http.js";
import { SOLARGIS_BASE_URL, SOLARGIS_EARLIEST } from "../constants.js";
import { isoYesterdayUtc } from "../dates.js";

interface SolargisResponse {
  data?: Array<{
    date: string;
    GHI?: number;
    GTI?: number;
    TEMP?: number;
  }>;
  version?: string;
}

export class SolargisSource implements IrradianceSource {
  readonly name = "solargis";

  async getDailyRecords(
    params: GetDailyParams,
  ): Promise<IrradianceRecord[]> {
    const apiKey = process.env.SOLARGIS_API_KEY;
    if (!apiKey) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `source='solargis' requires SOLARGIS_API_KEY environment variable.`,
      );
    }
    const includePoa =
      params.tilt_deg !== undefined && params.azimuth_deg !== undefined;
    const data = await sourceRequest<SolargisResponse>("Solargis", {
      method: "POST",
      url: `${SOLARGIS_BASE_URL}/timeseries`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: {
        site: { latitude: params.lat, longitude: params.lon },
        fromDate: params.start_date,
        toDate: params.end_date,
        resolution: "DAILY",
        parameters: includePoa ? ["GHI", "GTI", "TEMP"] : ["GHI", "TEMP"],
        tilt: includePoa ? params.tilt_deg : undefined,
        azimuth: includePoa ? params.azimuth_deg : undefined,
      },
    });

    return (data.data ?? []).map<IrradianceRecord>((row) => {
      const rec: IrradianceRecord = {
        lat: params.lat,
        lon: params.lon,
        date: row.date.slice(0, 10),
        ghi_kwh_m2: row.GHI ?? 0,
        source: "solargis",
        data_version: data.version,
      };
      if (row.GTI !== undefined) rec.poa_kwh_m2 = row.GTI;
      if (row.TEMP !== undefined) rec.air_temp_c = row.TEMP;
      return rec;
    });
  }

  async checkCoverage(_lat: number, _lon: number): Promise<CoverageResult> {
    return {
      available: true,
      earliest_date: SOLARGIS_EARLIEST,
      latest_date: isoYesterdayUtc(),
      resolution: "daily",
    };
  }
}

import type { IrradianceRecord } from "@ecoxchange/shared";
import type { IrradianceSource } from "./base.js";
import type { GetDailyParams, CoverageResult } from "../types.js";
import { sourceRequest } from "./http.js";
import {
  NASA_POWER_BASE_URL,
  NASA_POWER_EARLIEST,
  NASA_POWER_MISSING_SENTINEL,
} from "../constants.js";
import { isoYesterdayUtc, yyyymmdd } from "../dates.js";
import { ghiToPoa } from "../poa.js";

interface NasaPowerResponse {
  properties?: {
    parameter?: {
      ALLSKY_SFC_SW_DWN?: Record<string, number>;
      T2M?: Record<string, number>;
      WS10M?: Record<string, number>;
    };
  };
}

export class NasaPowerSource implements IrradianceSource {
  readonly name = "nasa_power";

  async getDailyRecords(
    params: GetDailyParams,
  ): Promise<IrradianceRecord[]> {
    const data = await sourceRequest<NasaPowerResponse>("NASA POWER", {
      method: "GET",
      url: `${NASA_POWER_BASE_URL}/daily/point`,
      params: {
        parameters: "ALLSKY_SFC_SW_DWN,T2M,WS10M",
        community: "RE",
        longitude: params.lon,
        latitude: params.lat,
        start: yyyymmdd(params.start_date),
        end: yyyymmdd(params.end_date),
        format: "JSON",
      },
    });

    const ghiBucket = data.properties?.parameter?.ALLSKY_SFC_SW_DWN ?? {};
    const tempBucket = data.properties?.parameter?.T2M ?? {};
    const windBucket = data.properties?.parameter?.WS10M ?? {};
    const usePoa =
      params.tilt_deg !== undefined && params.azimuth_deg !== undefined;

    const records: IrradianceRecord[] = [];
    for (const [key, rawGhi] of Object.entries(ghiBucket)) {
      const date = formatNasaDate(key);
      const missing = rawGhi === NASA_POWER_MISSING_SENTINEL;
      const ghi = missing ? 0 : rawGhi;
      const rawTemp = tempBucket[key];
      const temp =
        rawTemp === undefined || rawTemp === NASA_POWER_MISSING_SENTINEL
          ? undefined
          : rawTemp;
      const rawWind = windBucket[key];
      const wind =
        rawWind === undefined || rawWind === NASA_POWER_MISSING_SENTINEL
          ? undefined
          : rawWind;

      const record: IrradianceRecord = {
        lat: params.lat,
        lon: params.lon,
        date,
        ghi_kwh_m2: ghi,
        source: "nasa_power",
        data_version: "POWER/daily",
      };
      if (temp !== undefined) record.air_temp_c = temp;
      if (wind !== undefined) record.wind_speed_m_s = wind;
      if (usePoa && !missing) {
        record.poa_kwh_m2 = ghiToPoa({
          ghi_kwh_m2: ghi,
          lat: params.lat,
          lon: params.lon,
          date,
          tilt_deg: params.tilt_deg!,
          azimuth_deg: params.azimuth_deg!,
        });
      } else if (usePoa) {
        record.poa_kwh_m2 = 0;
      }
      records.push(record);
    }

    records.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return records;
  }

  async checkCoverage(_lat: number, _lon: number): Promise<CoverageResult> {
    return {
      available: true,
      earliest_date: NASA_POWER_EARLIEST,
      latest_date: isoYesterdayUtc(),
      resolution: "daily",
    };
  }
}

function formatNasaDate(key: string): string {
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
}

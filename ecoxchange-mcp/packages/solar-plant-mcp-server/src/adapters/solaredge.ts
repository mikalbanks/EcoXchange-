import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type {
  IntervalResolution,
  PlantProductionRecord,
  PlantSystemInfo,
} from "@ecoxchange/shared";
import type { InverterAdapter } from "./base.js";
import type {
  CheckCredentialsParams,
  CheckCredentialsResult,
  GetProductionParams,
  GetSystemInfoParams,
} from "../types.js";
import { brandRequest } from "./http.js";
import { assertDateRange } from "./dates.js";
import { SOLAREDGE_BASE_URL } from "../constants.js";

const SOURCE = "solaredge_monitoring_api_v1";

const TIME_UNIT: Record<IntervalResolution, string> = {
  "15min": "QUARTER_OF_AN_HOUR",
  "30min": "HOUR",
  hourly: "HOUR",
  daily: "DAY",
};

const INTERVAL_MIN: Record<IntervalResolution, number> = {
  "15min": 15,
  "30min": 30,
  hourly: 60,
  daily: 1440,
};

interface SolarEdgeEnergyResponse {
  energy?: {
    timeUnit?: string;
    unit?: string;
    values?: Array<{ date: string; value: number | null }>;
  };
}

interface SolarEdgeDetailsResponse {
  details?: {
    id?: number;
    name?: string;
    status?: string;
    peakPower?: number;
    installationDate?: string;
    location?: {
      latitude?: number;
      longitude?: number;
      timeZone?: string;
    };
    primaryModule?: { modelName?: string };
  };
}

function parseSolarEdgeDate(raw: string): string {
  return raw.replace(" ", "T") + "Z";
}

export class SolarEdgeAdapter implements InverterAdapter {
  async getProduction(
    params: GetProductionParams,
  ): Promise<PlantProductionRecord[]> {
    assertDateRange(params.start_date, params.end_date);

    if (params.resolution === "30min") {
      throw new McpError(
        ErrorCode.InvalidParams,
        `SolarEdge does not support 30min resolution. Use 15min, hourly, or daily.`,
      );
    }

    const timeUnit = TIME_UNIT[params.resolution];
    const data = await brandRequest<SolarEdgeEnergyResponse>(
      "solaredge",
      params.plant_id,
      {
        method: "GET",
        url: `${SOLAREDGE_BASE_URL}/site/${encodeURIComponent(params.plant_id)}/energy`,
        params: {
          api_key: params.api_key,
          timeUnit,
          startDate: params.start_date,
          endDate: params.end_date,
        },
      },
    );

    const values = data.energy?.values ?? [];
    const intervalMin = INTERVAL_MIN[params.resolution];

    return values.map<PlantProductionRecord>((v) => {
      const missing = v.value === null || v.value === undefined;
      return {
        plant_id: params.plant_id,
        timestamp_utc: parseSolarEdgeDate(v.date),
        interval_minutes: intervalMin,
        energy_kwh: missing ? 0 : (v.value as number) / 1000,
        brand: "solaredge",
        data_source: SOURCE,
        quality_flag: missing ? "MISSING" : "GOOD",
      };
    });
  }

  async getSystemInfo(params: GetSystemInfoParams): Promise<PlantSystemInfo> {
    const data = await brandRequest<SolarEdgeDetailsResponse>(
      "solaredge",
      params.plant_id,
      {
        method: "GET",
        url: `${SOLAREDGE_BASE_URL}/site/${encodeURIComponent(params.plant_id)}/details`,
        params: { api_key: params.api_key },
      },
    );

    const d = data.details ?? {};
    if (d.peakPower === undefined) {
      throw new McpError(
        ErrorCode.InternalError,
        `SolarEdge site ${params.plant_id} returned no peakPower (capacity). Cannot build PlantSystemInfo.`,
      );
    }

    return {
      plant_id: params.plant_id,
      brand: "solaredge",
      capacity_kwdc: d.peakPower,
      tilt_deg: -1,
      azimuth_deg: -1,
      lat: d.location?.latitude ?? 0,
      lon: d.location?.longitude ?? 0,
      timezone: d.location?.timeZone ?? "UTC",
      commission_date: d.installationDate ?? "1970-01-01",
      inverter_model: d.primaryModule?.modelName,
    };
  }

  async checkCredentials(
    params: CheckCredentialsParams,
  ): Promise<CheckCredentialsResult> {
    const data = await brandRequest<SolarEdgeDetailsResponse>(
      "solaredge",
      params.plant_id,
      {
        method: "GET",
        url: `${SOLAREDGE_BASE_URL}/site/${encodeURIComponent(params.plant_id)}/details`,
        params: { api_key: params.api_key },
      },
    );
    const d = data.details ?? {};
    return {
      valid: true,
      plant_name: d.name ?? `SolarEdge ${params.plant_id}`,
      status: d.status ?? "Unknown",
    };
  }
}

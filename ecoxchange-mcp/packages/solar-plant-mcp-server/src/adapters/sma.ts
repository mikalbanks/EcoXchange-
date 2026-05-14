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
import { SMA_BASE_URL } from "../constants.js";

const SOURCE = "sma_ennexos_api_v1";

const SMA_INTERVAL: Record<IntervalResolution, string> = {
  "15min": "fifteenMinute",
  "30min": "thirtyMinute",
  hourly: "hour",
  daily: "day",
};

const INTERVAL_MIN: Record<IntervalResolution, number> = {
  "15min": 15,
  "30min": 30,
  hourly: 60,
  daily: 1440,
};

interface SmaMeasurementsResponse {
  measurements?: Array<{
    timestamp?: string;
    values?: Record<string, number | null>;
  }>;
}

interface SmaPlantResponse {
  plantKey?: string;
  name?: string;
  operationalStatus?: string;
  ratedPowerKwp?: number;
  commissioningDate?: string;
  timezone?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}

function requirePlantKey(params: { credentials?: Record<string, string> }): string {
  const key = params.credentials?.plant_key;
  if (!key) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `SMA requires credentials.plant_key (Ennexos plant identifier).`,
    );
  }
  return key;
}

export class SmaAdapter implements InverterAdapter {
  async getProduction(
    params: GetProductionParams,
  ): Promise<PlantProductionRecord[]> {
    assertDateRange(params.start_date, params.end_date);

    if (params.resolution === "30min") {
      throw new McpError(
        ErrorCode.InvalidParams,
        `SMA Ennexos does not currently expose 30min resolution.`,
      );
    }

    const plantKey = requirePlantKey(params);
    const interval = SMA_INTERVAL[params.resolution];
    const intervalMin = INTERVAL_MIN[params.resolution];

    const data = await brandRequest<SmaMeasurementsResponse>(
      "sma",
      params.plant_id,
      {
        method: "GET",
        url: `${SMA_BASE_URL}/plants/${encodeURIComponent(plantKey)}/measurements`,
        params: {
          measurementGroup: "EnergyAndPower",
          from: params.start_date,
          to: params.end_date,
          interval,
        },
        headers: { Authorization: `Bearer ${params.api_key}` },
      },
    );

    const rows = data.measurements ?? [];
    return rows.map<PlantProductionRecord>((row) => {
      const raw = row.values?.E_Total;
      const missing = raw === null || raw === undefined;
      return {
        plant_id: params.plant_id,
        timestamp_utc: row.timestamp ?? new Date(0).toISOString(),
        interval_minutes: intervalMin,
        energy_kwh: missing ? 0 : (raw as number) / 1000,
        brand: "sma",
        data_source: SOURCE,
        quality_flag: missing ? "MISSING" : "GOOD",
      };
    });
  }

  async getSystemInfo(params: GetSystemInfoParams): Promise<PlantSystemInfo> {
    const plantKey = requirePlantKey(params);
    const data = await brandRequest<SmaPlantResponse>(
      "sma",
      params.plant_id,
      {
        method: "GET",
        url: `${SMA_BASE_URL}/plants/${encodeURIComponent(plantKey)}`,
        headers: { Authorization: `Bearer ${params.api_key}` },
      },
    );

    if (data.ratedPowerKwp === undefined) {
      throw new McpError(
        ErrorCode.InternalError,
        `SMA plant ${plantKey} returned no ratedPowerKwp. Cannot build PlantSystemInfo.`,
      );
    }

    return {
      plant_id: params.plant_id,
      brand: "sma",
      capacity_kwdc: data.ratedPowerKwp,
      tilt_deg: -1,
      azimuth_deg: -1,
      lat: data.coordinates?.latitude ?? 0,
      lon: data.coordinates?.longitude ?? 0,
      timezone: data.timezone ?? "UTC",
      commission_date: data.commissioningDate?.slice(0, 10) ?? "1970-01-01",
    };
  }

  async checkCredentials(
    params: CheckCredentialsParams,
  ): Promise<CheckCredentialsResult> {
    const plantKey = requirePlantKey(params);
    const data = await brandRequest<SmaPlantResponse>(
      "sma",
      params.plant_id,
      {
        method: "GET",
        url: `${SMA_BASE_URL}/plants/${encodeURIComponent(plantKey)}`,
        headers: { Authorization: `Bearer ${params.api_key}` },
      },
    );
    return {
      valid: true,
      plant_name: data.name ?? `SMA ${plantKey}`,
      status: data.operationalStatus ?? "Unknown",
    };
  }
}

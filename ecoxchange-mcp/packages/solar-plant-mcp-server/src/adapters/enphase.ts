import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type {
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
import { ENPHASE_BASE_URL } from "../constants.js";

const SOURCE = "enphase_enlighten_api_v4";

interface EnphaseTelemetryResponse {
  intervals?: Array<{
    end_at: number; // unix seconds, end of interval
    devices_reporting?: number;
    powr?: number;
    enwh?: number;
  }>;
  granularity?: string;
}

interface EnphaseSystemResponse {
  system_id?: number;
  name?: string;
  status?: string;
  size_w?: number;
  timezone?: string;
  operational_at?: number; // unix seconds
  location?: {
    latitude?: number;
    longitude?: number;
  };
}

function requireSystemId(params: { credentials?: Record<string, string> }): string {
  const sys = params.credentials?.system_id;
  if (!sys) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Enphase requires credentials.system_id (Enphase system ID).`,
    );
  }
  return sys;
}

export class EnphaseAdapter implements InverterAdapter {
  async getProduction(
    params: GetProductionParams,
  ): Promise<PlantProductionRecord[]> {
    assertDateRange(params.start_date, params.end_date);

    if (params.resolution === "30min" || params.resolution === "hourly") {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Enphase supports 15min and daily resolutions only.`,
      );
    }

    const systemId = requireSystemId(params);
    const startAt = Math.floor(
      Date.parse(params.start_date + "T00:00:00Z") / 1000,
    );
    const granularity = params.resolution === "daily" ? "day" : "week";

    const data = await brandRequest<EnphaseTelemetryResponse>(
      "enphase",
      params.plant_id,
      {
        method: "GET",
        url: `${ENPHASE_BASE_URL}/systems/${encodeURIComponent(systemId)}/telemetry/production_micro`,
        params: { start_at: startAt, granularity },
        headers: {
          Authorization: `Bearer ${params.api_key}`,
          "key": process.env.ENPHASE_CLIENT_ID ?? "",
        },
      },
    );

    const intervals = data.intervals ?? [];
    const endLimit = Date.parse(params.end_date + "T23:59:59Z");
    const intervalMin = params.resolution === "daily" ? 1440 : 15;

    return intervals
      .filter((iv) => iv.end_at * 1000 <= endLimit)
      .map<PlantProductionRecord>((iv) => {
        const wh = iv.enwh ?? 0;
        const reporting = iv.devices_reporting ?? 0;
        return {
          plant_id: params.plant_id,
          timestamp_utc: new Date(
            (iv.end_at - intervalMin * 60) * 1000,
          ).toISOString(),
          interval_minutes: intervalMin,
          energy_kwh: wh / 1000,
          brand: "enphase",
          data_source: SOURCE,
          quality_flag: reporting > 0 ? "GOOD" : "ESTIMATED",
        };
      });
  }

  async getSystemInfo(params: GetSystemInfoParams): Promise<PlantSystemInfo> {
    const systemId = requireSystemId(params);
    const data = await brandRequest<EnphaseSystemResponse>(
      "enphase",
      params.plant_id,
      {
        method: "GET",
        url: `${ENPHASE_BASE_URL}/systems/${encodeURIComponent(systemId)}`,
        headers: {
          Authorization: `Bearer ${params.api_key}`,
          "key": process.env.ENPHASE_CLIENT_ID ?? "",
        },
      },
    );

    if (data.size_w === undefined) {
      throw new McpError(
        ErrorCode.InternalError,
        `Enphase system ${systemId} returned no size_w. Cannot build PlantSystemInfo.`,
      );
    }

    return {
      plant_id: params.plant_id,
      brand: "enphase",
      capacity_kwdc: data.size_w / 1000,
      tilt_deg: -1,
      azimuth_deg: -1,
      lat: data.location?.latitude ?? 0,
      lon: data.location?.longitude ?? 0,
      timezone: data.timezone ?? "UTC",
      commission_date: data.operational_at
        ? new Date(data.operational_at * 1000).toISOString().slice(0, 10)
        : "1970-01-01",
    };
  }

  async checkCredentials(
    params: CheckCredentialsParams,
  ): Promise<CheckCredentialsResult> {
    const systemId = requireSystemId(params);
    const data = await brandRequest<EnphaseSystemResponse>(
      "enphase",
      params.plant_id,
      {
        method: "GET",
        url: `${ENPHASE_BASE_URL}/systems/${encodeURIComponent(systemId)}`,
        headers: {
          Authorization: `Bearer ${params.api_key}`,
          "key": process.env.ENPHASE_CLIENT_ID ?? "",
        },
      },
    );
    return {
      valid: true,
      plant_name: data.name ?? `Enphase ${systemId}`,
      status: data.status ?? "Unknown",
    };
  }
}

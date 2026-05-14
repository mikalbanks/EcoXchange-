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
import { FRONIUS_BASE_URL } from "../constants.js";

const SOURCE = "fronius_solarweb_api_v1";

interface FroniusAggSensorsResponse {
  data?: Array<{
    logDateTime?: string;
    channels?: Array<{
      channelName: string;
      value: number | null;
    }>;
  }>;
}

interface FroniusSystemResponse {
  pvSystemId?: string;
  name?: string;
  status?: { isOnline?: boolean };
  peakPower?: number; // Wp
  installationDate?: string;
  timeZone?: string;
  address?: {
    latitude?: number;
    longitude?: number;
  };
}

function requireSiteId(params: { credentials?: Record<string, string> }): string {
  const site = params.credentials?.site_id;
  if (!site) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Fronius requires credentials.site_id (PV system ID UUID).`,
    );
  }
  return site;
}

export class FroniusAdapter implements InverterAdapter {
  async getProduction(
    params: GetProductionParams,
  ): Promise<PlantProductionRecord[]> {
    assertDateRange(params.start_date, params.end_date);

    if (params.resolution === "15min" || params.resolution === "30min") {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Fronius supports hourly and daily resolutions only.`,
      );
    }

    const siteId = requireSiteId(params);
    const intervalMin = params.resolution === "daily" ? 1440 : 60;

    const data = await brandRequest<FroniusAggSensorsResponse>(
      "fronius",
      params.plant_id,
      {
        method: "GET",
        url: `${FRONIUS_BASE_URL}/pvsystems/${encodeURIComponent(siteId)}/aggsensors`,
        params: {
          sensorId: "EnergyAndPower",
          abbreviated: "TRUE",
          from: params.start_date,
          to: params.end_date,
        },
        headers: { Authorization: `Bearer ${params.api_key}` },
      },
    );

    const rows = data.data ?? [];
    return rows.map<PlantProductionRecord>((row) => {
      const ch = row.channels?.find(
        (c) => c.channelName === "EnergyReal_WAC_Sum_Produced",
      );
      const missing = !ch || ch.value === null || ch.value === undefined;
      return {
        plant_id: params.plant_id,
        timestamp_utc: row.logDateTime
          ? new Date(row.logDateTime).toISOString()
          : new Date(0).toISOString(),
        interval_minutes: intervalMin,
        energy_kwh: missing ? 0 : (ch!.value as number) / 1000,
        brand: "fronius",
        data_source: SOURCE,
        quality_flag: missing ? "MISSING" : "GOOD",
      };
    });
  }

  async getSystemInfo(params: GetSystemInfoParams): Promise<PlantSystemInfo> {
    const siteId = requireSiteId(params);
    const data = await brandRequest<FroniusSystemResponse>(
      "fronius",
      params.plant_id,
      {
        method: "GET",
        url: `${FRONIUS_BASE_URL}/pvsystems/${encodeURIComponent(siteId)}`,
        headers: { Authorization: `Bearer ${params.api_key}` },
      },
    );

    if (data.peakPower === undefined) {
      throw new McpError(
        ErrorCode.InternalError,
        `Fronius PV system ${siteId} returned no peakPower. Cannot build PlantSystemInfo.`,
      );
    }

    return {
      plant_id: params.plant_id,
      brand: "fronius",
      capacity_kwdc: data.peakPower / 1000,
      tilt_deg: -1,
      azimuth_deg: -1,
      lat: data.address?.latitude ?? 0,
      lon: data.address?.longitude ?? 0,
      timezone: data.timeZone ?? "UTC",
      commission_date: data.installationDate?.slice(0, 10) ?? "1970-01-01",
    };
  }

  async checkCredentials(
    params: CheckCredentialsParams,
  ): Promise<CheckCredentialsResult> {
    const siteId = requireSiteId(params);
    const data = await brandRequest<FroniusSystemResponse>(
      "fronius",
      params.plant_id,
      {
        method: "GET",
        url: `${FRONIUS_BASE_URL}/pvsystems/${encodeURIComponent(siteId)}`,
        headers: { Authorization: `Bearer ${params.api_key}` },
      },
    );
    return {
      valid: true,
      plant_name: data.name ?? `Fronius ${siteId}`,
      status: data.status?.isOnline ? "Active" : "Inactive",
    };
  }
}

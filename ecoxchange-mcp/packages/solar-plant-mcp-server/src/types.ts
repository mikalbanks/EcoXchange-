import type {
  IntervalResolution,
  PlantProductionRecord,
  PlantSystemInfo,
} from "@ecoxchange/shared";

export interface GetProductionParams {
  plant_id: string;
  api_key: string;
  start_date: string;
  end_date: string;
  resolution: IntervalResolution;
  credentials?: Record<string, string>;
}

export interface GetSystemInfoParams {
  plant_id: string;
  api_key: string;
  credentials?: Record<string, string>;
}

export interface CheckCredentialsParams {
  plant_id: string;
  api_key: string;
  credentials?: Record<string, string>;
}

export interface CheckCredentialsResult {
  valid: boolean;
  plant_name: string;
  status: string;
}

export type { PlantProductionRecord, PlantSystemInfo };

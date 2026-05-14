import type { IrradianceRecord, IrradianceSourceName } from "@ecoxchange/shared";

export interface GetDailyParams {
  lat: number;
  lon: number;
  start_date: string;
  end_date: string;
  tilt_deg?: number;
  azimuth_deg?: number;
}

export interface CoverageResult {
  available: boolean;
  earliest_date: string;
  latest_date: string;
  resolution: string;
}

export type IrradianceSourceSelector = IrradianceSourceName | "auto";

export type { IrradianceRecord, IrradianceSourceName };

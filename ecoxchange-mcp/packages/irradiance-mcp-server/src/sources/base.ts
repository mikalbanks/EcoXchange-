import type { IrradianceRecord } from "@ecoxchange/shared";
import type { GetDailyParams, CoverageResult } from "../types.js";

export interface IrradianceSource {
  readonly name: string;
  getDailyRecords(params: GetDailyParams): Promise<IrradianceRecord[]>;
  checkCoverage(lat: number, lon: number): Promise<CoverageResult>;
}

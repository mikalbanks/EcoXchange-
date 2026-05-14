import type {
  CheckCredentialsParams,
  CheckCredentialsResult,
  GetProductionParams,
  GetSystemInfoParams,
} from "../types.js";
import type {
  PlantProductionRecord,
  PlantSystemInfo,
} from "@ecoxchange/shared";

export interface InverterAdapter {
  getProduction(params: GetProductionParams): Promise<PlantProductionRecord[]>;
  getSystemInfo(params: GetSystemInfoParams): Promise<PlantSystemInfo>;
  checkCredentials(
    params: CheckCredentialsParams,
  ): Promise<CheckCredentialsResult>;
}

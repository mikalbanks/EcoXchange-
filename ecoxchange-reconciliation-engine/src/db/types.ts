import type { ProjectConfig, VerificationStatus } from "../utils/types.js";
import type { ToleranceConfig } from "../config/tolerances.js";

export type InverterBrand = "solaredge" | "enphase" | "fronius" | "sma";
export type OfftakeType = "ppa" | "community_solar" | "net_metering" | "merchant";
export type ProjectStatus = "onboarding" | "active" | "suspended" | "decommissioned";
export type DataSource = "inverter" | "utility_meter" | "satellite";
export type DataQuality = "complete" | "partial" | "missing" | "error";
export type TriggerType = "manual" | "scheduled" | "backtest";
export type RunStatus = VerificationStatus | "errored";

export interface Project extends ProjectConfig {
  id: string;
  name: string;
  timezone: string;
  inverter_brand: InverterBrand;
  inverter_api_key_ref: string;
  inverter_plant_id: string;
  utility_provider: string | null;
  utility_account_ref: string | null;
  offtake_type: OfftakeType | null;
  ppa_rate_per_kwh: number | null;
  ppa_escalator: number | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface RawReading {
  id: string;
  project_id: string;
  source: DataSource;
  period_start: string;
  period_end: string;
  kwh_gross: number | null;
  kwh_net: number | null;
  ghi_kwh_m2: number | null;
  dni_kwh_m2: number | null;
  dhi_kwh_m2: number | null;
  raw_response: unknown;
  archive_path: string | null;
  data_quality: DataQuality;
  quality_notes: string | null;
  fetched_at: string;
}

export interface VerificationRecord {
  id: string;
  project_id: string;
  period_start: string;
  period_end: string;
  inverter_kwh: number | null;
  utility_kwh: number | null;
  expected_kwh: number;
  inv_vs_expected_pct: number | null;
  inv_vs_utility_pct: number | null;
  util_vs_expected_pct: number | null;
  status: VerificationStatus;
  flag_reasons: string[] | null;
  tolerance_config: ToleranceConfig;
  estimated_revenue: number | null;
  engine_version: string;
  verified_at: string;
  reviewed_by: string | null;
  review_notes: string | null;
  review_resolved_at: string | null;
}

export interface EngineRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  engine_version: string;
  target_period: string;
  projects_attempted: number;
  projects_verified: number;
  projects_flagged: number;
  projects_pending: number;
  projects_errored: number;
  errors: Array<{ project_id: string; error_message: string }> | null;
  trigger_type: TriggerType;
}

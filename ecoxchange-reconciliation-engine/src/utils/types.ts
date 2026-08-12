import type { ToleranceConfig } from "../config/tolerances.js";
import type {
  AnomalyClassification,
  ClassificationContext,
} from "../reconciliation/classify.js";

export interface ProjectConfig {
  name?: string;
  latitude: number;
  longitude: number;
  capacity_kw_dc: number;
  tilt_deg: number;
  azimuth_deg: number;
  module_efficiency: number;
  system_losses: number;
  degradation_rate: number;
  commissioning_date: string;
}

export interface DailyIrradiance {
  date: string;
  ghi_kwh_m2: number;
  dni_kwh_m2: number;
  dhi_kwh_m2: number;
  // Required by the pvlib expected-generation service (temperature model).
  // Optional here so older callers / cached records remain valid; the pvlib
  // client supplies defaults (20°C / 1 m/s) when absent.
  temp_air_c?: number;
  wind_speed_m_s?: number;
}

export interface ExpectedGenerationInput extends ProjectConfig {
  period_start: string;
  period_end: string;
  daily_irradiance: DailyIrradiance[];
}

export interface DailyExpected {
  date: string;
  ghi_kwh_m2: number;
  poa_kwh_m2: number;
  expected_kwh: number;
}

export interface ExpectedGenerationOutput {
  period_start: string;
  period_end: string;
  expected_kwh: number;
  daily_breakdown: DailyExpected[];
  assumptions: {
    degradation_factor: number;
    system_losses: number;
    albedo: number;
    // "hay_davies" for the in-process model, "perez" for the pvlib service.
    transposition_model: string;
  };
}

export type DataQuality = "complete" | "partial" | "missing" | "error";

export interface RawReading {
  kwh_gross?: number | null;
  kwh_net?: number | null;
  data_quality?: DataQuality;
  /** `null` as well as absent: the column is nullable in `raw_readings`, and
   *  narrowing it here forced every DB row through a cast. */
  quality_notes?: string | null;
  raw_response?: unknown;
}

export interface ReconciliationInput {
  project: ProjectConfig;
  period_start: string;
  period_end: string;
  inverter_reading: RawReading | null;
  utility_reading: RawReading | null;
  expected_generation: ExpectedGenerationOutput;
  tolerances: ToleranceConfig;
  /** Optional monthly context for anomaly classification (upgrade spec 7).
   *  Absent context degrades gracefully — deviation-only rules still run. */
  classification_context?: ClassificationContext;
}

export type VerificationStatus = "verified" | "flagged" | "pending";

export interface ReconciliationOutput {
  status: VerificationStatus;
  inverter_kwh: number | null;
  utility_kwh: number | null;
  expected_kwh: number;
  inv_vs_expected_pct: number | null;
  inv_vs_utility_pct: number | null;
  util_vs_expected_pct: number | null;
  flag_reasons: string[];
  tolerance_config: ToleranceConfig;
  /** Present only when status is "flagged" (upgrade spec 7). Additive:
   *  adds diagnosis context, never changes the verdict. */
  classification?: AnomalyClassification;
}

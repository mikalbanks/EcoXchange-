import type { ProjectConfig, VerificationStatus } from "../utils/types.js";
import type { ToleranceConfig } from "../config/tolerances.js";

export type InverterBrand = "solaredge" | "enphase" | "fronius" | "sma";

/** Spec 21 §2: the source kinds an ingestion adapter can be registered under.
 *  Generalizes `InverterBrand` — `telemetry_source` + `telemetry_external_id`
 *  replaces the `inverter_brand` / `inverter_plant_id` pair, so spec 24 adds
 *  vendors without another migration. Mirrors `SourceKind` in
 *  `verification-engine/src/ingestion/base.py`; the two lists must agree. */
export type TelemetrySource =
  | "pvdaq"
  | "solaredge"
  | "enphase"
  | "fronius"
  | "sma"
  | "manual_csv";

/** Where a reading came from. `demo_seed` is synthetic and must never be
 *  described as measurement. Mirrors the CHECK in migration 013. */
export type DataProvenance =
  | "demo_seed"
  | "pvdaq_real"
  | "solaredge_api"
  | "enphase_api"
  | "fronius_api"
  | "sma_api"
  | "manual_csv"
  | "eia_923"
  | "bayou";
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
  /** Real Olson zone for this site (migration 013). `timezone` above defaults to
   *  'America/New_York' on every row and is not site-specific — bucket months on
   *  this one. Null until the project's telemetry binding is set. */
  iana_timezone: string | null;
  telemetry_source: TelemetrySource | null;
  telemetry_external_id: string | null;
  /** Superseded by `telemetry_source` (spec 21 §4); nullable since 013. */
  inverter_brand: InverterBrand | null;
  inverter_api_key_ref: string | null;
  inverter_plant_id: string | null;
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
  data_provenance: DataProvenance;
  fetched_at: string;
}

/** One row of `reading_quality` (migration 013) — the evidence behind a
 *  reading's `data_quality`. Produced by
 *  `verification-engine/src/ingestion/quality.py::assess`. */
export interface ReadingQuality {
  id: string;
  raw_reading_id: string;
  completeness_pct: number;
  clipped_frac: number | null;
  stale_frac: number | null;
  outlier_frac: number | null;
  /** PERCENT of positive energy below the horizon, on real solar geometry.
   *  Above 1.0 the series is time-misaligned — always `error`, never a
   *  tolerance question. */
  night_energy_frac: number;
  shift_detected: boolean;
  interval_minutes: number;
  qc_verdict: DataQuality;
  qc_notes: string[] | null;
  pvanalytics_version: string;
  evaluated_at: string;
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

  // ── Spec 23 (migration 015) ────────────────────────────────────────────────
  // Nullable because rows written before spec 23 have no calibration and never
  // will. Back-filling them with today's bands would invent a history.
  /** The calibration in force when this period was judged. */
  calibration_id?: string | null;
  /** Inverter-vs-expected band whose breach blocks distribution, percent. */
  gate_band_pct?: number | null;
  /** Narrower observation band, percent. */
  detect_band_pct?: number | null;
  /** Whether the detect band was breached. Read by the NEXT period. */
  detect_exceeded?: boolean | null;
  /** This period and the prior one both exceeded detect. */
  persistence_triggered?: boolean | null;
}

/** Spec 23 §1 — a frozen per-plant threshold calibration. Immutable once written. */
export interface ProjectCalibration {
  id: string;
  project_id: string;
  calibration_version: number;
  residual_mad_pct: number;
  plant_factor: number;
  seasonal_factors: Record<string, number>;
  window_start: string;
  window_end: string;
  n_months_used: number;
  frozen_at: string;
  frozen_by: string;
  supersedes_id: string | null;
  refit_reason: string | null;
  engine_version: string;
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

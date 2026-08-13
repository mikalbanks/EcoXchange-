export type ProjectStatus =
  | "onboarding"
  | "active"
  | "suspended"
  | "decommissioned";
export type OfftakeType =
  | "ppa"
  | "community_solar"
  | "net_metering"
  | "merchant";
export type VerificationStatus = "verified" | "flagged" | "pending";

export interface DbProject {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  capacity_kw_dc: number;
  tilt_deg: number;
  azimuth_deg: number;
  module_efficiency: number;
  system_losses: number;
  degradation_rate: number;
  commissioning_date: string;
  inverter_brand: string;
  offtake_type: OfftakeType | null;
  ppa_rate_per_kwh: number | null;
  ppa_escalator: number | null;
  status: ProjectStatus;
  created_at: string;
}

export interface DbVerificationRecord {
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
  tolerance_config: Record<string, number>;
  estimated_revenue: number | null;
  engine_version: string;
  /** Spec 23 — the per-plant bands this period was judged against. Null on
   *  pre-spec-23 rows. */
  gate_band_pct?: number | null;
  detect_band_pct?: number | null;
  detect_exceeded?: boolean | null;
  persistence_triggered?: boolean | null;
}

export interface DbSatelliteReading {
  project_id: string;
  period_start: string;
  ghi_kwh_m2: number | null;
}

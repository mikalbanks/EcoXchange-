export interface Project {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  capacity_kw: number;
  tilt_deg: number;
  azimuth_deg: number;
  module_efficiency: number;
  system_losses: number;
  commissioning_date: string;
  offtake_type: string;
  ppa_rate_per_kwh: number;
  status: string;
}

export type VerificationStatus = "verified" | "flagged" | "pending";

export interface VerificationRecord {
  period_start: string;
  inverter_kwh: number;
  expected_kwh: number;
  utility_kwh: number;
  inv_vs_expected_pct: number;
  inv_vs_utility_pct: number;
  util_vs_expected_pct: number;
  status: VerificationStatus;
  flag_reasons: string[];
  estimated_revenue: number;
  ghi_kwh_m2: number;
}

export interface ProjectSummary {
  annual_production_mwh: number;
  capacity_factor_pct: number;
  months_verified: number;
  months_flagged: number;
  total_revenue_estimate: number;
  ppa_rate: number;
}

export interface ProjectBundle {
  project: Project;
  verification_records: VerificationRecord[];
  summary: ProjectSummary;
}

export type DemoMode = "verified" | "flagged";

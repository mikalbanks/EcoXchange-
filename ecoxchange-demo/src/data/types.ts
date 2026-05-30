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
  state_code?: string | null;
  state_name?: string | null;
  availability_status?: AvailabilityStatus;
  target_irr_pct?: number | null;
}

export type VerificationStatus =
  | "verified"
  | "flagged"
  | "pending"
  | "data_required";

export type AvailabilityStatus =
  | "available"
  | "coming_soon"
  | "closed"
  | "not_connected";

export interface ToleranceConfig {
  inv_vs_expected_upper_pct: number;
  inv_vs_expected_lower_pct: number;
  inv_vs_utility_pct: number;
  util_vs_expected_upper_pct: number;
  util_vs_expected_lower_pct: number;
  min_data_completeness_pct: number;
}

export interface VerificationRecord {
  period_start: string;
  inverter_kwh: number | null;
  expected_kwh: number | null;
  utility_kwh: number | null;
  inv_vs_expected_pct: number | null;
  inv_vs_utility_pct: number | null;
  util_vs_expected_pct: number | null;
  status: VerificationStatus;
  persisted_status?: Exclude<VerificationStatus, "data_required">;
  flag_reasons: string[];
  estimated_revenue: number | null;
  ghi_kwh_m2?: number | null;
  tolerance_config?: ToleranceConfig;
  engine_version?: string;
  verification_mismatch?: boolean;
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

export interface DistributionPoint {
  project_id: string;
  project_name: string;
  period_start: string;
  amount_usd: number;
  status: VerificationStatus;
}

export interface PortfolioSummary {
  total_invested: number;
  latest_monthly_distributions: number;
  ytd_distributions: number;
  weighted_average_target_irr_pct: number | null;
  verified_projects: number;
  months_reconciled: number;
  distribution_history: DistributionPoint[];
  allocation_note: string;
}

export interface PortfolioProject {
  id: string;
  name: string;
  location: string;
  capacity_kw: number;
  status: string;
  latest_verification: VerificationStatus;
  latest_period: string;
  ytd_production_mwh: number;
  investor_share_pct: number;
  latest_distribution_usd: number;
  ytd_distribution_usd: number;
  months_reconciled: number;
  state_code: string | null;
  state_name: string | null;
  revenue_type: string | null;
  availability_status: AvailabilityStatus;
  target_irr_pct: number | null;
  has_required_data: boolean;
  verification_mismatch: boolean;
}

export interface Portfolio {
  portfolio: PortfolioSummary;
  projects: PortfolioProject[];
}

export type DemoMode = "verified" | "flagged";

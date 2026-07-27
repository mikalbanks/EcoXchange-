export type VerificationStatus = "verified" | "flagged" | "pending";

export type AnomalyCategory =
  | "weather_anomaly"
  | "inverter_fault"
  | "soiling"
  | "curtailment"
  | "meter_error"
  | "degradation"
  | "unknown";

/** Heuristic classification of a FLAGGED month (Spec 7). Additive context
 *  only — never changes the verified/flagged/pending verdict. */
export interface AnomalyClassification {
  category: AnomalyCategory;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  recommended_action: string;
}

export interface PortfolioSummary {
  total_invested: number;
  monthly_yield_usd: number;
  lifetime_yield_usd: number;
  active_projects: number;
}

export interface PortfolioProject {
  id: string;
  name: string;
  location: string;
  capacity_kw: number;
  status: "active" | "suspended" | "onboarding" | "decommissioned";
  latest_verification: VerificationStatus;
  latest_period: string;
  ytd_production_mwh: number;
  monthly_yield_usd: number;
  investor_share_pct: number;
}

export interface Portfolio {
  portfolio: PortfolioSummary;
  projects: PortfolioProject[];
}

export interface ProjectMeta {
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
  status: "active" | "suspended" | "onboarding" | "decommissioned";
}

export interface VerificationRecord {
  period_start: string;
  inverter_kwh: number;
  expected_kwh: number;
  utility_kwh: number | null;
  inv_vs_expected_pct: number;
  inv_vs_utility_pct?: number | null;
  util_vs_expected_pct?: number | null;
  status: VerificationStatus;
  flag_reasons: string[];
  estimated_revenue: number;
  ghi_kwh_m2?: number;
  /** Present only on flagged records when the classifier has run (Spec 7). */
  classification?: AnomalyClassification;
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
  project: ProjectMeta;
  verification_records: VerificationRecord[];
  summary: ProjectSummary;
}

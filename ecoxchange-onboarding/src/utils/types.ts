export type SubmissionStatus =
  | "submitted"
  | "validating"
  | "backtesting"
  | "reconciling"
  | "report_ready"
  | "reviewed"
  | "loi_sent"
  | "loi_signed"
  | "rejected"
  | "expired";

export type InverterBrand =
  | "solaredge"
  | "enphase"
  | "fronius"
  | "sma"
  | "other";
export type OfftakeType =
  | "ppa"
  | "community_solar"
  | "net_metering"
  | "merchant";

export interface StatusHistoryEntry {
  status: SubmissionStatus;
  ts: string;
  note: string | null;
}

export interface SubmissionInput {
  developer_name: string;
  developer_email: string;
  developer_company?: string;
  developer_phone?: string;
  project_name: string;
  latitude: number;
  longitude: number;
  capacity_kw_dc: number;
  tilt_deg: number;
  azimuth_deg: number;
  module_efficiency: number;
  system_losses: number;
  degradation_rate: number;
  commissioning_date: string;
  inverter_brand: InverterBrand;
  inverter_api_key?: string;
  inverter_plant_id?: string;
  utility_provider?: string;
  utility_account_ref?: string;
  offtake_type?: OfftakeType;
  ppa_rate_per_kwh?: number;
  ppa_escalator?: number;
  ppa_tenor_years?: number;
  equity_raise_target?: number;
  equity_raise_min?: number;
}

export interface SubmissionRow extends SubmissionInput {
  id: string;
  state_code: string | null;
  has_inverter_creds: boolean;
  status: SubmissionStatus;
  status_history: StatusHistoryEntry[];
  backtest_report_id: string | null;
  backtest_report_path: string | null;
  project_id: string | null;
  submitted_at: string;
  updated_at: string;
  expires_at: string;
  notes: string | null;
}

export interface MonthlyResult {
  month: string; // "YYYY-MM"
  ghi_kwh_m2: number;
  expected_kwh: number;
  poa_kwh_m2: number;
}

export interface ReconciledMonthly extends MonthlyResult {
  inverter_kwh: number | null;
  inv_vs_expected_pct: number | null;
  status: "verified" | "flagged" | "pending" | null;
  flag_reasons: string[];
  estimated_revenue_usd: number | null;
}

export interface DeveloperBacktestReport {
  title: string;
  generated_at: string;
  engine_version: string;
  developer: {
    name: string;
    company: string | null;
    email: string;
  };
  system: {
    name: string;
    location: string;
    capacity_kw_dc: number;
    configuration: string;
    commissioning_date: string;
    system_age_years: number;
  };
  summary: {
    period_tested: string;
    months_tested: number;
    irradiance_source: string;
    has_real_inverter_data: boolean;
    annual_expected_mwh: number;
    capacity_factor_pct: number;
    best_month: { month: string; kwh: number };
    worst_month: { month: string; kwh: number };
    seasonal_ratio: number;
    months_verified: number | null;
    months_flagged: number | null;
    mean_deviation_pct: number | null;
    max_deviation_pct: number | null;
    verification_pass_rate_pct: number | null;
  };
  financials: {
    ppa_rate_per_kwh: number | null;
    estimated_annual_revenue_usd: number | null;
    estimated_monthly_distribution_usd: number | null;
    equity_raise_target_usd: number | null;
    estimated_yield_on_equity_pct: number | null;
    developer_cost_comparison: {
      traditional_all_in_cost_usd: string;
      ecoxchange_estimated_cost_usd: string;
      savings_pct: string;
      time_to_capital_traditional: string;
      time_to_capital_ecoxchange: string;
    };
  };
  monthly: ReconciledMonthly[];
  next_steps: {
    step_1: string;
    step_2: string;
    step_3: string;
    step_4: string;
    contact_email: string;
    contact_name: string;
  };
}

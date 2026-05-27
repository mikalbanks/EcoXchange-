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

export interface IntakeForm {
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

  offtake_type?: OfftakeType;
  ppa_rate_per_kwh?: number;
  ppa_escalator?: number;
  ppa_tenor_years?: number;
  equity_raise_target?: number;
  equity_raise_min?: number;
}

export const DEFAULT_INTAKE: IntakeForm = {
  developer_name: "",
  developer_email: "",
  developer_company: "",
  developer_phone: "",
  project_name: "",
  latitude: 32.08,
  longitude: -81.09,
  capacity_kw_dc: 1000,
  tilt_deg: 20,
  azimuth_deg: 180,
  module_efficiency: 0.2,
  system_losses: 0.14,
  degradation_rate: 0.0075,
  commissioning_date: "2023-01-01",
  inverter_brand: "solaredge",
  inverter_api_key: "",
  inverter_plant_id: "",
  utility_provider: "",
  offtake_type: "community_solar",
  ppa_rate_per_kwh: 0.085,
  ppa_escalator: 0.02,
  ppa_tenor_years: 20,
  equity_raise_target: 2_500_000,
  equity_raise_min: 1_000_000,
};

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

export interface StatusResponse {
  submission_id: string;
  status: SubmissionStatus;
  status_history: Array<{
    status: SubmissionStatus;
    ts: string;
    note: string | null;
  }>;
  updated_at: string;
  notes: string | null;
  backtest_report_id: string | null;
  project_id: string | null;
}

export interface BacktestReportResponse {
  submission_id: string;
  report_meta: {
    id: string;
    generated_at: string;
    engine_version: string;
    irradiance_source: string;
    has_real_inverter_data: boolean;
    json_signed_url: string;
  };
  report: BacktestReport;
}

export interface BacktestReport {
  title: string;
  generated_at: string;
  engine_version: string;
  developer: { name: string; company: string | null; email: string };
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
  monthly: Array<{
    month: string;
    ghi_kwh_m2: number;
    expected_kwh: number;
    inverter_kwh: number | null;
    inv_vs_expected_pct: number | null;
    status: "verified" | "flagged" | "pending" | null;
    flag_reasons: string[];
    estimated_revenue_usd: number | null;
  }>;
  next_steps: {
    step_1: string;
    step_2: string;
    step_3: string;
    step_4: string;
    contact_email: string;
    contact_name: string;
  };
}

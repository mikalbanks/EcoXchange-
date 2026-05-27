export type PanelTechnology =
  | "Crystalline Silicon"
  | "Thin Film"
  | "Unknown";

export type AxisType =
  | "Fixed"
  | "Single Axis Tracking"
  | "Dual Axis Tracking";

export type Provenance = "pvdaq" | "eia860" | "estimated" | "default";

export interface USPVDBRecord {
  uspvdb_id: string;
  name: string;
  state: string;
  county: string | null;
  latitude: number;
  longitude: number;
  capacity_ac_mw: number | null;
  capacity_dc_mw: number;
  panel_technology: PanelTechnology;
  axis_type: AxisType;
  commissioning_year: number;
  eia_plant_id: string | null;
}

export interface EIA860Record {
  eia_plant_id: string;
  name_eia: string;
  capacity_mw_860: number;
  technology: string;
  prime_mover: string;
  latitude_eia: number | null;
  longitude_eia: number | null;
  operating_year: number | null;
  azimuth_deg: number | null;
  tilt_deg: number | null;
}

export interface EIA923PlantTotals {
  eia_plant_id: string;
  name_923: string;
  annual_mwh: number;
  monthly_mwh: number[]; // length 12, Jan→Dec
  year: number;
}

export interface PVDAQSite {
  system_id: string;
  latitude: number;
  longitude: number;
  array_tilt: number | null;
  array_azimuth: number | null;
}

export interface JoinedPlantRecord {
  eia_plant_id: string;
  uspvdb_id: string | null;
  name: string;
  latitude: number;
  longitude: number;
  state: string;
  county: string | null;
  capacity_dc_mw: number;
  capacity_ac_mw: number | null;
  panel_technology: PanelTechnology;
  axis_type: AxisType;
  commissioning_year: number;
  tilt_deg: number | null;
  azimuth_deg: number | null;
  tilt_source: Provenance;
  azimuth_source: Provenance;
  pvdaq_system_id: string | null;
  pvdaq_distance_km: number | null;
  actual_annual_mwh: number;
  actual_monthly_mwh: number[];
  production_year: number;
  actual_capacity_factor_pct: number;
}

export interface MonthResult {
  month: string; // YYYY-MM-DD (first day)
  expected_kwh: number;
  expected_mwh: number;
  actual_mwh: number | null;
}

export interface PlantBacktestResult {
  plant: JoinedPlantRecord;
  monthlyExpected: MonthResult[];
  annualExpectedMwh: number;
  annualActualMwh: number;
  deviationPct: number;
  expectedCapacityFactor: number;
  actualCapacityFactor: number;
  irradianceSource: string;
  trackingBoostApplied: number;
  withinTenPercent: boolean;
  withinFifteenPercent: boolean;
}

export interface BatchBacktestError {
  plant: JoinedPlantRecord;
  error: string;
}

export interface BatchBacktestReport {
  title: string;
  generated_at: string;
  engine_version: string;
  sources: {
    uspvdb_version: string;
    eia860_year: number;
    eia923_year: number;
    irradiance: string;
  };
  fleet: {
    total_plants_in_uspvdb: number;
    plants_in_1_20mw_band: number;
    plants_with_eia923_data: number;
    plants_successfully_backtested: number;
    plants_errored: number;
    total_capacity_mw: number;
    states_represented: number;
    technology_breakdown: { crystalline: number; thin_film: number; other: number };
    axis_breakdown: { fixed: number; single_tracking: number; dual_tracking: number };
    pvdaq_refined: number;
  };
  validation: {
    mean_deviation_pct: number;
    median_deviation_pct: number;
    mean_absolute_deviation_pct: number;
    std_dev_deviation_pct: number;
    plants_within_5pct: number;
    plants_within_10pct: number;
    plants_within_15pct: number;
    pct_within_5: number;
    pct_within_10: number;
    pct_within_15: number;
    overestimate_count: number;
    underestimate_count: number;
    mean_overestimate_pct: number;
    mean_underestimate_pct: number;
    mean_expected_cf: number;
    mean_actual_cf: number;
    cf_correlation: number;
  };
  by_state: Array<{
    state: string;
    count: number;
    mean_deviation_pct: number;
    pct_within_10: number;
  }>;
  by_capacity_band: Array<{
    band: string;
    count: number;
    mean_deviation_pct: number;
    pct_within_10: number;
  }>;
  by_technology: Array<{
    technology: string;
    count: number;
    mean_deviation_pct: number;
    pct_within_10: number;
  }>;
  by_axis: Array<{
    axis_type: string;
    count: number;
    mean_deviation_pct: number;
    pct_within_10: number;
  }>;
  plants: Array<{
    eia_plant_id: string;
    name: string;
    state: string;
    capacity_mw: number;
    technology: string;
    axis_type: string;
    expected_mwh: number;
    actual_mwh: number;
    deviation_pct: number;
    expected_cf: number;
    actual_cf: number;
    within_10pct: boolean;
  }>;
  outliers: {
    worst_overestimates: Array<{
      name: string;
      state: string;
      deviation_pct: number;
      likely_cause: string;
    }>;
    worst_underestimates: Array<{
      name: string;
      state: string;
      deviation_pct: number;
      likely_cause: string;
    }>;
  };
  errors: Array<{ name: string; eia_id: string; error: string }>;
}

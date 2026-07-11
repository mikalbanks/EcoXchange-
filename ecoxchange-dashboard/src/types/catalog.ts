export interface EiaCatalogEntry {
  eia_plant_id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  capacity_mw: number;
  capacity_ac_mw: number | null;
  tilt_deg: number;
  azimuth_deg: number;
  axis_type: string;
  panel_technology: string;
  commissioning_year: number;
  actual_mwh: number;
  expected_mwh: number;
  actual_cf_pct: number;
  expected_cf_pct: number;
  deviation_pct: number;
  absolute_deviation_pct: number;
  within_10pct: boolean;
  within_5pct: boolean;
  indicative_value_usd: number;
  implied_annual_revenue_usd: number;
}

export interface CatalogStats {
  total_plants: number;
  mean_absolute_deviation_pct: number;
  median_absolute_deviation_pct: number;
  mode_absolute_deviation_pct: number | null;
  std_deviation_pct: number;
  within_5_pct_rate: number;
  within_10_pct_rate: number;
}

export interface CatalogData {
  generated_at: string;
  engine_version: string;
  benchmark_year: number;
  stats: CatalogStats;
  plants: EiaCatalogEntry[];
}

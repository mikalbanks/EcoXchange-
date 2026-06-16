// Impact dashboard types (Spec 08).

export interface ImpactMetrics {
  // Source data
  verified_kwh: number;
  unverified_kwh: number;
  period_start: string;
  period_end: string;
  months_verified: number;
  months_flagged: number;

  // Computed equivalencies
  co2_avoided_kg: number;
  co2_avoided_metric_tons: number;
  homes_powered_years: number;
  trees_equivalent: number;
  smartphone_charges: number;
  gallons_gas_avoided: number;
  miles_driving_avoided: number;
  acres_forest_equivalent: number;

  // Verification trust signal
  data_source: "production_verified";
  egrid_region: string;
  egrid_factor_used: number;
}

export interface ProjectImpact {
  project_id: string;
  project_name: string;
  location: string;
  verified_kwh: number;
  co2_avoided_metric_tons: number;
  homes_powered_years: number;
  pct_of_portfolio_impact: number;
}

export interface PortfolioImpact {
  total_verified_kwh: number;
  total_co2_avoided_metric_tons: number;
  total_homes_powered_years: number;
  total_trees_equivalent: number;
  projects: ProjectImpact[];
}

export interface MonthlyImpactPoint {
  period: string; // "2024-01"
  verified_kwh: number;
  co2_kg: number;
}

// What the impact page consumes: aggregate metrics + a monthly timeline.
export interface ImpactView extends ImpactMetrics {
  monthly_breakdown: MonthlyImpactPoint[];
}

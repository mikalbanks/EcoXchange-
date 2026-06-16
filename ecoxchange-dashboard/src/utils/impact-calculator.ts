import { EPA_CONSTANTS, STATE_TO_EGRID } from "../config/epa-constants.js";
import type { ImpactMetrics, PortfolioImpact } from "../types/impact.js";

export interface ImpactInput {
  verified_kwh: number;
  unverified_kwh: number;
  state_code: string;
  months_verified: number;
  months_flagged: number;
  period_start: string;
  period_end: string;
}

export function computeImpact(input: ImpactInput): ImpactMetrics {
  const egrid_region = STATE_TO_EGRID[input.state_code] || "NATIONAL";
  const egrid_factor =
    EPA_CONSTANTS.EGRID_REGIONS[egrid_region] || EPA_CONSTANTS.CO2_KG_PER_KWH;

  const co2_avoided_kg = input.verified_kwh * egrid_factor;
  const co2_avoided_metric_tons = co2_avoided_kg / 1000;

  return {
    verified_kwh: input.verified_kwh,
    unverified_kwh: input.unverified_kwh,
    period_start: input.period_start,
    period_end: input.period_end,
    months_verified: input.months_verified,
    months_flagged: input.months_flagged,

    co2_avoided_kg,
    co2_avoided_metric_tons,
    homes_powered_years: input.verified_kwh / EPA_CONSTANTS.KWH_PER_HOME_YEAR,
    trees_equivalent:
      co2_avoided_metric_tons / EPA_CONSTANTS.CO2_METRIC_TONS_PER_TREE_YEAR,
    smartphone_charges:
      input.verified_kwh / EPA_CONSTANTS.KWH_PER_SMARTPHONE_CHARGE,
    gallons_gas_avoided: co2_avoided_kg / EPA_CONSTANTS.CO2_KG_PER_GALLON_GAS,
    miles_driving_avoided: co2_avoided_kg / EPA_CONSTANTS.CO2_KG_PER_MILE_DRIVEN,
    acres_forest_equivalent:
      co2_avoided_metric_tons /
      EPA_CONSTANTS.CO2_METRIC_TONS_PER_ACRE_FOREST_YEAR,

    data_source: "production_verified",
    egrid_region,
    egrid_factor_used: egrid_factor,
  };
}

// Aggregate impact across multiple projects (for portfolio view).
export function computePortfolioImpact(
  projects: Array<{
    project_id: string;
    name: string;
    location: string;
    input: ImpactInput;
  }>,
): PortfolioImpact {
  const projectImpacts = projects.map((p) => {
    const metrics = computeImpact(p.input);
    return {
      project_id: p.project_id,
      project_name: p.name,
      location: p.location,
      verified_kwh: metrics.verified_kwh,
      co2_avoided_metric_tons: metrics.co2_avoided_metric_tons,
      homes_powered_years: metrics.homes_powered_years,
      pct_of_portfolio_impact: 0, // computed below
    };
  });

  const totals = projectImpacts.reduce(
    (acc, p) => ({
      kwh: acc.kwh + p.verified_kwh,
      co2: acc.co2 + p.co2_avoided_metric_tons,
      homes: acc.homes + p.homes_powered_years,
      trees:
        acc.trees +
        p.co2_avoided_metric_tons / EPA_CONSTANTS.CO2_METRIC_TONS_PER_TREE_YEAR,
    }),
    { kwh: 0, co2: 0, homes: 0, trees: 0 },
  );

  projectImpacts.forEach((p) => {
    p.pct_of_portfolio_impact =
      totals.kwh > 0 ? (p.verified_kwh / totals.kwh) * 100 : 0;
  });

  return {
    total_verified_kwh: totals.kwh,
    total_co2_avoided_metric_tons: totals.co2,
    total_homes_powered_years: totals.homes,
    total_trees_equivalent: totals.trees,
    projects: projectImpacts,
  };
}

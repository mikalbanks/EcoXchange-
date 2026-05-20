import type { ProjectConfig } from "../utils/types.js";

export interface ReferenceScenario {
  key: string;
  project: ProjectConfig;
  start_month: string;
  end_month: string;
  pvwatts_annual_mwh_low: number;
  pvwatts_annual_mwh_high: number;
  capacity_factor_low_pct: number;
  capacity_factor_high_pct: number;
}

export const SAVANNAH: ReferenceScenario = {
  key: "savannah",
  project: {
    name: "Savannah Community Solar 5MW",
    latitude: 32.08,
    longitude: -81.09,
    capacity_kw_dc: 5000,
    tilt_deg: 20,
    azimuth_deg: 180,
    module_efficiency: 0.2,
    system_losses: 0.14,
    degradation_rate: 0.0075,
    commissioning_date: "2023-01-01",
  },
  start_month: "2024-01-01",
  end_month: "2024-12-01",
  pvwatts_annual_mwh_low: 8200,
  pvwatts_annual_mwh_high: 8800,
  capacity_factor_low_pct: 16,
  capacity_factor_high_pct: 20,
};

export const BILLERICA: ReferenceScenario = {
  key: "billerica",
  project: {
    name: "Billerica MA Community Solar 2MW",
    latitude: 42.56,
    longitude: -71.27,
    capacity_kw_dc: 2000,
    tilt_deg: 25,
    azimuth_deg: 180,
    module_efficiency: 0.2,
    system_losses: 0.14,
    degradation_rate: 0.0075,
    commissioning_date: "2022-06-01",
  },
  start_month: "2024-01-01",
  end_month: "2024-12-01",
  pvwatts_annual_mwh_low: 2800,
  pvwatts_annual_mwh_high: 3200,
  capacity_factor_low_pct: 14,
  capacity_factor_high_pct: 17,
};

export const PHOENIX: ReferenceScenario = {
  key: "phoenix",
  project: {
    name: "Phoenix AZ Commercial 1MW",
    latitude: 33.45,
    longitude: -112.07,
    capacity_kw_dc: 1000,
    tilt_deg: 15,
    azimuth_deg: 180,
    module_efficiency: 0.2,
    system_losses: 0.14,
    degradation_rate: 0.0075,
    commissioning_date: "2023-07-01",
  },
  start_month: "2024-01-01",
  end_month: "2024-12-01",
  pvwatts_annual_mwh_low: 1800,
  pvwatts_annual_mwh_high: 2000,
  capacity_factor_low_pct: 20,
  capacity_factor_high_pct: 25,
};

export const SCENARIOS: Record<string, ReferenceScenario> = {
  savannah: SAVANNAH,
  billerica: BILLERICA,
  phoenix: PHOENIX,
};

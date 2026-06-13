import type { DeveloperIntakeData } from "@shared/developer-backtest";

/**
 * Pre-loaded demo project for live developer-portal demonstrations.
 * Savannah Community Solar 5MW — a representative 1–20 MW community solar site.
 */
export const DEMO_DEVELOPER_PROJECT: DeveloperIntakeData = {
  name: "Savannah Community Solar 5MW",
  latitude: 32.08,
  longitude: -81.09,
  timezone: "America/New_York",
  capacity_kw_dc: 5000,
  tilt_deg: 20,
  azimuth_deg: 180,
  module_type: "monocrystalline",
  module_efficiency: 0.2,
  racking_type: "open_rack",
  dc_ac_ratio: 1.2,
  commissioning_date: "2023-01-01",
  system_losses: 0.14,
  degradation_rate: 0.0075,
  inverter_brand: "solaredge",
  has_monitoring_access: false,
  offtake_type: "community_solar",
  ppa_rate_per_kwh: 0.08,
  ppa_escalator: 0.02,
};

export interface ToleranceConfig {
  inv_vs_expected_upper_pct: number;
  inv_vs_expected_lower_pct: number;
  inv_vs_utility_pct: number;
  util_vs_expected_upper_pct: number;
  util_vs_expected_lower_pct: number;
  min_data_completeness_pct: number;
}

export const DEFAULT_TOLERANCES: ToleranceConfig = {
  inv_vs_expected_upper_pct: 15,
  inv_vs_expected_lower_pct: -15,
  inv_vs_utility_pct: 10,
  util_vs_expected_upper_pct: 20,
  util_vs_expected_lower_pct: -20,
  min_data_completeness_pct: 90,
};

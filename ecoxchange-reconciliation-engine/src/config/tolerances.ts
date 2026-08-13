export interface ToleranceConfig {
  inv_vs_expected_upper_pct: number;
  inv_vs_expected_lower_pct: number;
  inv_vs_utility_pct: number;
  util_vs_expected_upper_pct: number;
  util_vs_expected_lower_pct: number;
  min_data_completeness_pct: number;
}

/**
 * ⚠️ `inv_vs_expected_*` (CHECK A) is NO LONGER the live band for a calibrated
 * plant. Spec 23 replaced it with a per-plant adaptive band — see
 * `../reconciliation/thresholds.ts`. These ±15% values remain the base config
 * and the fallback for an uncalibrated plant, and CHECK B (`inv_vs_utility_pct`)
 * and CHECK C (`util_vs_expected_*`) are still governed entirely from here.
 *
 * Do not read 15 as "the threshold" — read `verification_records.gate_band_pct`
 * for what a given month was actually judged against.
 */
export const DEFAULT_TOLERANCES: ToleranceConfig = {
  inv_vs_expected_upper_pct: 15,
  inv_vs_expected_lower_pct: -15,
  inv_vs_utility_pct: 10,
  util_vs_expected_upper_pct: 20,
  util_vs_expected_lower_pct: -20,
  min_data_completeness_pct: 90,
};

import { differenceInCalendarDays, parseISO } from "date-fns";
import type { ToleranceConfig } from "../config/tolerances.js";

const NEW_SYSTEM_THRESHOLD_DAYS = 90;
const NEW_SYSTEM_WIDEN_PCT = 5;

/**
 * For the first 3 months after commissioning, widen the inverter-vs-expected
 * tolerance band by ±5% (spec §3.4 edge case 1).
 */
export function widenTolerancesForNewSystem(
  commissioning_date: string,
  period_start: string,
  base: ToleranceConfig,
): ToleranceConfig {
  const ageDays = differenceInCalendarDays(
    parseISO(period_start),
    parseISO(commissioning_date),
  );
  if (ageDays >= NEW_SYSTEM_THRESHOLD_DAYS) return base;
  return {
    ...base,
    inv_vs_expected_upper_pct:
      base.inv_vs_expected_upper_pct + NEW_SYSTEM_WIDEN_PCT,
    inv_vs_expected_lower_pct:
      base.inv_vs_expected_lower_pct - NEW_SYSTEM_WIDEN_PCT,
  };
}

export interface IrradianceContext {
  period_ghi_kwh_m2: number;
  historical_mean_ghi_kwh_m2: number;
  historical_std_ghi_kwh_m2: number;
}

/**
 * Informational note when satellite irradiance is more than 2 standard
 * deviations below the historical monthly average (spec §3.4 edge case 2).
 */
export function extremeWeatherNote(ctx: IrradianceContext): string | null {
  if (ctx.historical_std_ghi_kwh_m2 <= 0) return null;
  const z =
    (ctx.period_ghi_kwh_m2 - ctx.historical_mean_ghi_kwh_m2) /
    ctx.historical_std_ghi_kwh_m2;
  if (z >= -2) return null;
  return (
    `Satellite irradiance for this period was unusually low ` +
    `(${ctx.period_ghi_kwh_m2.toFixed(1)} kWh/m² vs. ` +
    `${ctx.historical_mean_ghi_kwh_m2.toFixed(1)} kWh/m² historical average). ` +
    `Expected generation may be less reliable.`
  );
}

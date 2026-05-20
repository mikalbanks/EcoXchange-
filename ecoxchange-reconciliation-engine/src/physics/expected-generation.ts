import { transposeDay } from "./transposition.js";
import { ALBEDO, TRANSPOSITION_MODEL } from "../config/constants.js";
import { midDate, yearsBetween } from "../utils/dates.js";
import type {
  ExpectedGenerationInput,
  ExpectedGenerationOutput,
} from "../utils/types.js";

/**
 * Full expected-generation pipeline per spec §2.2:
 *   irradiance → POA (Hay-Davies) → DC → AC (system losses) → degradation → kWh
 *
 * All daily inputs are integrated kWh/m²/day. Output is kWh per day and
 * summed for the period.
 */
export function calculateExpectedGeneration(
  input: ExpectedGenerationInput,
): ExpectedGenerationOutput {
  const {
    capacity_kw_dc,
    tilt_deg,
    azimuth_deg,
    module_efficiency,
    system_losses,
    degradation_rate,
    commissioning_date,
    latitude,
    daily_irradiance,
    period_start,
    period_end,
  } = input;

  // module_area_m2 derived from STC: capacity = area · efficiency · 1 kW/m²
  const module_area_m2 = capacity_kw_dc / module_efficiency;

  // Degradation evaluated at the mid-point of the period.
  const years_operating = Math.max(
    0,
    yearsBetween(commissioning_date, midDate(period_start, period_end)),
  );
  const degradation_factor = Math.max(0, 1 - degradation_rate * years_operating);

  const loss_factor = 1 - system_losses;

  const daily_breakdown = daily_irradiance.map((day) => {
    const t = transposeDay(day, latitude, tilt_deg, azimuth_deg);
    const dc_energy = t.poa_kwh_m2 * module_area_m2 * module_efficiency;
    const ac_energy = dc_energy * loss_factor;
    const expected_kwh = ac_energy * degradation_factor;
    return {
      date: day.date,
      ghi_kwh_m2: day.ghi_kwh_m2,
      poa_kwh_m2: t.poa_kwh_m2,
      expected_kwh,
    };
  });

  const expected_kwh = daily_breakdown.reduce((s, d) => s + d.expected_kwh, 0);

  return {
    period_start,
    period_end,
    expected_kwh,
    daily_breakdown,
    assumptions: {
      degradation_factor,
      system_losses,
      albedo: ALBEDO,
      transposition_model: TRANSPOSITION_MODEL,
    },
  };
}

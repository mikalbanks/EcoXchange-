import type { PlantBacktestResult } from "../utils/types.js";

/**
 * Spec §3.2 — Plausible-cause string for plants outside ±15%.
 */
export function inferOutlierCause(r: PlantBacktestResult): string {
  const dev = r.deviationPct;
  if (dev > 15) {
    if (
      r.plant.axis_type === "Fixed" &&
      r.actualCapacityFactor < 12
    )
      return "Possible: heavy shading, suboptimal orientation, or partial-year operation";
    if (r.plant.commissioning_year === r.plant.production_year)
      return "Likely: partial-year operation (commissioned mid-year)";
    return "Possible: curtailment, equipment issues, or inaccurate specs in EIA data";
  }
  if (dev < -15) {
    if (
      r.plant.axis_type === "Single Axis Tracking" &&
      r.trackingBoostApplied === 1.0
    )
      return "Likely: tracking system not reflected in model (axis_type may be misclassified)";
    return "Possible: conservative model assumptions, higher-than-average irradiance year, or EIA data includes non-PV generation";
  }
  return "Within normal model tolerance";
}

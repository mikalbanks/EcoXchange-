import { haversineKm } from "../utils/geo.js";
import type { JoinedPlantRecord, PVDAQSite } from "../utils/types.js";

const MAX_MATCH_KM = 5;

export interface RefinementStats {
  considered: number;
  refined: number;
  tilt_overrides: number;
  azimuth_overrides: number;
}

/**
 * Overlay PVDAQ site metadata onto joined plants where lat/lon match within
 * MAX_MATCH_KM. PVDAQ tilt/azimuth (when present) replace the prior value
 * and the provenance tag flips to 'pvdaq'. Mutates `plants` in place and
 * returns a refinement summary.
 */
export function refineWithPvdaq(
  plants: JoinedPlantRecord[],
  pvdaqSites: PVDAQSite[],
): RefinementStats {
  let refined = 0;
  let tiltOverrides = 0;
  let azimuthOverrides = 0;

  for (const plant of plants) {
    let best: { site: PVDAQSite; km: number } | null = null;
    for (const site of pvdaqSites) {
      const km = haversineKm(
        plant.latitude,
        plant.longitude,
        site.latitude,
        site.longitude,
      );
      if (km > MAX_MATCH_KM) continue;
      if (best === null || km < best.km) best = { site, km };
    }
    if (!best) continue;

    plant.pvdaq_system_id = best.site.system_id;
    plant.pvdaq_distance_km = Math.round(best.km * 100) / 100;
    let anyOverride = false;
    if (best.site.array_tilt !== null) {
      plant.tilt_deg = best.site.array_tilt;
      plant.tilt_source = "pvdaq";
      tiltOverrides += 1;
      anyOverride = true;
    }
    if (best.site.array_azimuth !== null) {
      plant.azimuth_deg = best.site.array_azimuth;
      plant.azimuth_source = "pvdaq";
      azimuthOverrides += 1;
      anyOverride = true;
    }
    if (anyOverride) refined += 1;
  }

  return {
    considered: plants.length,
    refined,
    tilt_overrides: tiltOverrides,
    azimuth_overrides: azimuthOverrides,
  };
}

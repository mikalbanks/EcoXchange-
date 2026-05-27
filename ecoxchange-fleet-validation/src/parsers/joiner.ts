import type {
  EIA860Record,
  EIA923PlantTotals,
  JoinedPlantRecord,
  USPVDBRecord,
} from "../utils/types.js";
import { estimateTiltFromLatitude } from "../utils/geo.js";

export interface JoinOptions {
  minCapacityMwDc: number;
  maxCapacityMwDc: number;
  /**
   * Exclude plants whose commissioning year matches (or is later than) the
   * EIA 923 production year — partial-year operation systematically biases
   * deviation high. Spec §3.2 identifies this as the primary outlier cause.
   */
  excludePartialYear: boolean;
  /** Drop plants with implausibly low actual CF (< this %) — usually meter
   *  drift, mothballing, or non-PV revenue reporting under SUN/PV. */
  minActualCapacityFactorPct: number;
  /** Drop plants whose actual CF exceeds physical PV limits (> ~30%); the
   *  EIA 923 row likely aggregates non-PV generation onto the same plant ID. */
  maxActualCapacityFactorPct: number;
}

export const DEFAULT_JOIN_OPTIONS: JoinOptions = {
  minCapacityMwDc: 1,
  maxCapacityMwDc: 20,
  excludePartialYear: true,
  minActualCapacityFactorPct: 10,
  maxActualCapacityFactorPct: 30,
};

const DEFAULT_AC_DC_RATIO = 1.3;
const HOURS_PER_YEAR = 8760;

/**
 * Spec §1.4 + §1.5. Joins USPVDB + EIA 860 + EIA 923 on eia_plant_id,
 * applies missing-data defaults, and filters to the capacity band.
 */
export function joinDatasets(
  uspvdb: USPVDBRecord[],
  eia860: EIA860Record[],
  eia923: EIA923PlantTotals[],
  options: JoinOptions = DEFAULT_JOIN_OPTIONS,
): JoinedPlantRecord[] {
  const byEia860 = new Map<string, EIA860Record>();
  for (const r of eia860) byEia860.set(r.eia_plant_id, r);
  const byEia923 = new Map<string, EIA923PlantTotals>();
  for (const r of eia923) byEia923.set(r.eia_plant_id, r);
  const uspvdbByEia = new Map<string, USPVDBRecord>();
  for (const r of uspvdb) if (r.eia_plant_id) uspvdbByEia.set(r.eia_plant_id, r);

  // Universe of candidates: anything that has EIA 923 production (it's the
  // ground truth). Augment from USPVDB + EIA 860 where available.
  const out: JoinedPlantRecord[] = [];
  for (const gen of eia923) {
    const id = gen.eia_plant_id;
    const us = uspvdbByEia.get(id) ?? null;
    const e860 = byEia860.get(id) ?? null;

    // Capacity: USPVDB DC > EIA 860 nameplate × 1.3 > skip
    let capacityDc: number | null = null;
    let capacityAc: number | null = null;
    if (us) {
      capacityDc = us.capacity_dc_mw;
      capacityAc = us.capacity_ac_mw;
    } else if (e860) {
      capacityAc = e860.capacity_mw_860;
      capacityDc = e860.capacity_mw_860 * DEFAULT_AC_DC_RATIO;
    }
    if (capacityDc === null) continue;
    if (
      capacityDc < options.minCapacityMwDc ||
      capacityDc > options.maxCapacityMwDc
    )
      continue;

    // Location: USPVDB > EIA 860 > skip
    const lat = us?.latitude ?? e860?.latitude_eia ?? null;
    const lon = us?.longitude ?? e860?.longitude_eia ?? null;
    if (lat === null || lon === null) continue;

    // Tilt + azimuth with provenance
    let tilt: number | null = null;
    let tiltSource: JoinedPlantRecord["tilt_source"] = "default";
    if (e860?.tilt_deg !== null && e860?.tilt_deg !== undefined) {
      tilt = e860.tilt_deg;
      tiltSource = "eia860";
    } else {
      tilt = estimateTiltFromLatitude(lat);
      tiltSource = "estimated";
    }
    let azimuth: number | null = null;
    let azimuthSource: JoinedPlantRecord["azimuth_source"] = "default";
    if (e860?.azimuth_deg !== null && e860?.azimuth_deg !== undefined) {
      azimuth = e860.azimuth_deg;
      azimuthSource = "eia860";
    } else {
      azimuth = 180;
      azimuthSource = "default";
    }

    const commissioningYear =
      us?.commissioning_year ?? e860?.operating_year ?? 0;

    const annualMwh = gen.annual_mwh;
    if (annualMwh <= 0) continue;

    // Partial-year filter: a plant commissioned during (or after) the
    // production year doesn't have a clean full-year baseline.
    if (
      options.excludePartialYear &&
      commissioningYear > 0 &&
      commissioningYear >= gen.year
    )
      continue;

    // Implausibly low/high CF filter
    const cf = (annualMwh / (capacityDc * HOURS_PER_YEAR)) * 100;
    if (cf < options.minActualCapacityFactorPct) continue;
    if (cf > options.maxActualCapacityFactorPct) continue;

    let monthly = gen.monthly_mwh.slice();
    // If only annual is reported, distribute evenly. The spec calls for
    // NASA POWER GHI-weighted distribution, but for plants that report
    // monthly (the vast majority) this is unused. For plants without
    // monthly, even distribution is conservative.
    if (monthly.every((m) => m === 0)) {
      monthly = Array(12).fill(annualMwh / 12);
    }

    out.push({
      eia_plant_id: id,
      uspvdb_id: us?.uspvdb_id ?? null,
      name: us?.name ?? e860?.name_eia ?? gen.name_923 ?? "Unnamed",
      latitude: lat,
      longitude: lon,
      state: us?.state ?? "",
      county: us?.county ?? null,
      capacity_dc_mw: capacityDc,
      capacity_ac_mw: capacityAc,
      panel_technology: us?.panel_technology ?? "Crystalline Silicon",
      axis_type: us?.axis_type ?? "Fixed",
      commissioning_year: commissioningYear || gen.year,
      tilt_deg: tilt,
      azimuth_deg: azimuth,
      tilt_source: tiltSource,
      azimuth_source: azimuthSource,
      pvdaq_system_id: null,
      pvdaq_distance_km: null,
      actual_annual_mwh: annualMwh,
      actual_monthly_mwh: monthly,
      production_year: gen.year,
      actual_capacity_factor_pct: cf,
    });
  }
  return out;
}

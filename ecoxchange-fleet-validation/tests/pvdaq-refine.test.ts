import { describe, expect, it } from "vitest";
import { refineWithPvdaq } from "../src/parsers/pvdaq-refine.js";
import type { JoinedPlantRecord, PVDAQSite } from "../src/utils/types.js";

function plant(
  lat: number,
  lon: number,
  overrides: Partial<JoinedPlantRecord> = {},
): JoinedPlantRecord {
  return {
    eia_plant_id: "x",
    uspvdb_id: null,
    name: "P",
    latitude: lat,
    longitude: lon,
    state: "GA",
    county: null,
    capacity_dc_mw: 5,
    capacity_ac_mw: 4,
    panel_technology: "Crystalline Silicon",
    axis_type: "Fixed",
    commissioning_year: 2022,
    tilt_deg: 27,
    azimuth_deg: 180,
    tilt_source: "estimated",
    azimuth_source: "default",
    pvdaq_system_id: null,
    pvdaq_distance_km: null,
    actual_annual_mwh: 9000,
    actual_monthly_mwh: Array(12).fill(750),
    production_year: 2023,
    actual_capacity_factor_pct: 18,
    ...overrides,
  };
}

describe("refineWithPvdaq", () => {
  it("overrides tilt+azimuth when a PVDAQ site is within 5 km", () => {
    const p = plant(32.08, -81.09);
    const sites: PVDAQSite[] = [
      {
        system_id: "42",
        latitude: 32.085,
        longitude: -81.095,
        array_tilt: 30,
        array_azimuth: 175,
      },
    ];
    const stats = refineWithPvdaq([p], sites);
    expect(stats.refined).toBe(1);
    expect(p.tilt_deg).toBe(30);
    expect(p.tilt_source).toBe("pvdaq");
    expect(p.azimuth_deg).toBe(175);
    expect(p.azimuth_source).toBe("pvdaq");
    expect(p.pvdaq_system_id).toBe("42");
  });

  it("does NOT match a far-away PVDAQ site", () => {
    const p = plant(32.08, -81.09);
    const sites: PVDAQSite[] = [
      {
        system_id: "100",
        latitude: 40.0, // ~900 km away
        longitude: -90.0,
        array_tilt: 30,
        array_azimuth: 175,
      },
    ];
    const stats = refineWithPvdaq([p], sites);
    expect(stats.refined).toBe(0);
    expect(p.tilt_deg).toBe(27);
    expect(p.tilt_source).toBe("estimated");
  });

  it("keeps prior values when PVDAQ has nulls", () => {
    const p = plant(32.08, -81.09);
    const sites: PVDAQSite[] = [
      {
        system_id: "42",
        latitude: 32.08,
        longitude: -81.09,
        array_tilt: null,
        array_azimuth: null,
      },
    ];
    const stats = refineWithPvdaq([p], sites);
    // It's a neighbor, but no fields override
    expect(stats.refined).toBe(0);
    expect(p.tilt_deg).toBe(27);
    expect(p.pvdaq_system_id).toBe("42"); // still attaches the neighbor reference
  });

  it("picks the nearest site when multiple PVDAQ are in range", () => {
    const p = plant(32.08, -81.09);
    const sites: PVDAQSite[] = [
      {
        system_id: "close",
        latitude: 32.081,
        longitude: -81.091,
        array_tilt: 30,
        array_azimuth: null,
      },
      {
        system_id: "closer",
        latitude: 32.0805,
        longitude: -81.0905,
        array_tilt: 25,
        array_azimuth: null,
      },
    ];
    refineWithPvdaq([p], sites);
    expect(p.pvdaq_system_id).toBe("closer");
    expect(p.tilt_deg).toBe(25);
  });
});

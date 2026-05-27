import { describe, expect, it } from "vitest";
import { joinDatasets } from "../src/parsers/joiner.js";
import type {
  EIA860Record,
  EIA923PlantTotals,
  USPVDBRecord,
} from "../src/utils/types.js";

const uspvdb: USPVDBRecord[] = [
  {
    uspvdb_id: "us-1",
    name: "Savannah Solar",
    state: "GA",
    county: "Chatham",
    latitude: 32.08,
    longitude: -81.09,
    capacity_ac_mw: 5,
    capacity_dc_mw: 5.5,
    panel_technology: "Crystalline Silicon",
    axis_type: "Fixed",
    commissioning_year: 2022,
    eia_plant_id: "12345",
  },
  {
    uspvdb_id: "us-2",
    name: "Mega Solar",
    state: "TX",
    county: "Harris",
    latitude: 30.0,
    longitude: -95.0,
    capacity_ac_mw: 25,
    capacity_dc_mw: 30, // out of 1–20 band
    panel_technology: "Crystalline Silicon",
    axis_type: "Single Axis Tracking",
    commissioning_year: 2020,
    eia_plant_id: "99999",
  },
];

const eia860: EIA860Record[] = [
  {
    eia_plant_id: "12345",
    name_eia: "Savannah",
    capacity_mw_860: 5,
    technology: "Solar Photovoltaic",
    prime_mover: "PV",
    latitude_eia: 32.08,
    longitude_eia: -81.09,
    operating_year: 2022,
    azimuth_deg: 180,
    tilt_deg: 22,
  },
];

const eia923: EIA923PlantTotals[] = [
  {
    eia_plant_id: "12345",
    name_923: "Savannah",
    annual_mwh: 9000,
    monthly_mwh: [600, 650, 750, 800, 850, 900, 880, 870, 770, 720, 600, 610],
    year: 2023,
  },
  {
    eia_plant_id: "99999",
    name_923: "Mega",
    annual_mwh: 50000,
    monthly_mwh: Array(12).fill(50000 / 12),
    year: 2023,
  },
];

describe("joinDatasets", () => {
  it("includes the Savannah plant and excludes the 30 MW plant", () => {
    const joined = joinDatasets(uspvdb, eia860, eia923);
    expect(joined.length).toBe(1);
    const p = joined[0]!;
    expect(p.eia_plant_id).toBe("12345");
    expect(p.capacity_dc_mw).toBeCloseTo(5.5);
    expect(p.latitude).toBeCloseTo(32.08);
    expect(p.tilt_deg).toBe(22);
    expect(p.tilt_source).toBe("eia860");
    expect(p.azimuth_deg).toBe(180);
    expect(p.actual_annual_mwh).toBe(9000);
    expect(p.actual_monthly_mwh.length).toBe(12);
  });

  it("falls back to latitude rule-of-thumb when EIA 860 tilt is missing", () => {
    const e = [{ ...eia860[0]!, tilt_deg: null }];
    const joined = joinDatasets(uspvdb, e, eia923);
    expect(joined[0]!.tilt_source).toBe("estimated");
    expect(joined[0]!.tilt_deg).toBeGreaterThan(20);
    expect(joined[0]!.tilt_deg).toBeLessThan(35);
  });

  it("uses EIA 860 capacity × 1.3 when USPVDB has no entry", () => {
    const joined = joinDatasets([], eia860, eia923);
    expect(joined.length).toBe(1);
    expect(joined[0]!.capacity_dc_mw).toBeCloseTo(6.5); // 5 × 1.3
  });

  it("computes capacity factor", () => {
    const joined = joinDatasets(uspvdb, eia860, eia923);
    const expectedCf = (9000 / (5.5 * 8760)) * 100;
    expect(joined[0]!.actual_capacity_factor_pct).toBeCloseTo(expectedCf, 2);
  });
});

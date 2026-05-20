import { describe, it, expect } from "vitest";
import { transposeDay } from "../physics/transposition.js";

describe("Hay-Davies transposition", () => {
  it("POA on horizontal surface (tilt=0) has zero ground-reflected component", () => {
    const out = transposeDay(
      {
        date: "2024-06-21",
        ghi_kwh_m2: 7.0,
        dni_kwh_m2: 8.0,
        dhi_kwh_m2: 1.5,
      },
      32.08,
      0,
      180,
    );
    expect(out.ground_poa).toBeCloseTo(0, 6);
    // At tilt=0 the isotropic-diffuse weight (1+cos(0))/2 = 1, so full DHI goes
    // into diffuse_poa via the (1-A_i) term.
    expect(out.diffuse_poa).toBeGreaterThanOrEqual(1.5 * 0.5);
  });

  it("POA on south-tilted surface > POA on horizontal in winter at mid-latitude", () => {
    const input = {
      date: "2024-12-21",
      ghi_kwh_m2: 2.5,
      dni_kwh_m2: 5.0,
      dhi_kwh_m2: 0.7,
    };
    const horizontal = transposeDay(input, 42.56, 0, 180);
    const tilted = transposeDay(input, 42.56, 25, 180);
    expect(tilted.poa_kwh_m2).toBeGreaterThan(horizontal.poa_kwh_m2);
  });

  it("ground-reflected component grows with tilt", () => {
    const input = {
      date: "2024-06-21",
      ghi_kwh_m2: 6.5,
      dni_kwh_m2: 7.0,
      dhi_kwh_m2: 1.5,
    };
    const low = transposeDay(input, 33.45, 15, 180);
    const high = transposeDay(input, 33.45, 45, 180);
    expect(high.ground_poa).toBeGreaterThan(low.ground_poa);
  });

  it("output has consistent decomposition", () => {
    const out = transposeDay(
      {
        date: "2024-06-21",
        ghi_kwh_m2: 6.5,
        dni_kwh_m2: 7.0,
        dhi_kwh_m2: 1.5,
      },
      32.08,
      20,
      180,
    );
    expect(out.poa_kwh_m2).toBeCloseTo(
      out.beam_poa + out.diffuse_poa + out.ground_poa,
      5,
    );
  });
});

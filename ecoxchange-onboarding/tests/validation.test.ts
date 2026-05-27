import { describe, expect, it } from "vitest";
import { SubmissionSchema } from "../src/utils/validation.js";

const validBase = {
  developer_name: "Mikal Banks",
  developer_email: "mikal@ecoxchange.net",
  project_name: "Savannah Community Solar 5MW",
  latitude: 32.08,
  longitude: -81.09,
  capacity_kw_dc: 5000,
  tilt_deg: 20,
  azimuth_deg: 180,
  module_efficiency: 0.2,
  system_losses: 0.14,
  degradation_rate: 0.0075,
  commissioning_date: "2023-01-01",
  inverter_brand: "solaredge" as const,
  offtake_type: "community_solar" as const,
  ppa_rate_per_kwh: 0.085,
  ppa_escalator: 0.02,
};

describe("SubmissionSchema", () => {
  it("accepts a complete valid intake", () => {
    expect(() => SubmissionSchema.parse(validBase)).not.toThrow();
  });

  it("rejects out-of-range latitude (non-US)", () => {
    expect(() =>
      SubmissionSchema.parse({ ...validBase, latitude: 51.5 }),
    ).toThrow();
  });

  it("rejects capacity below 100 kW", () => {
    expect(() =>
      SubmissionSchema.parse({ ...validBase, capacity_kw_dc: 50 }),
    ).toThrow();
  });

  it("rejects bad date format", () => {
    expect(() =>
      SubmissionSchema.parse({ ...validBase, commissioning_date: "Jan 2023" }),
    ).toThrow();
  });

  it("rejects bad email", () => {
    expect(() =>
      SubmissionSchema.parse({ ...validBase, developer_email: "not-an-email" }),
    ).toThrow();
  });

  it("rejects unknown inverter brand", () => {
    expect(() =>
      SubmissionSchema.parse({ ...validBase, inverter_brand: "fakebrand" }),
    ).toThrow();
  });
});

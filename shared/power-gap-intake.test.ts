import { describe, expect, it } from "vitest";
import { powerGapIntakeRequestSchema } from "./power-gap-intake";

const validIntake = {
  contactName: "Alex Morgan",
  workEmail: "alex@example.com",
  company: "Example Data Centers",
  role: "VP Infrastructure",
  siteName: "Project North",
  siteLocation: "Columbus, OH",
  utility: "Example Utility",
  isoRto: "PJM",
  requiredFirmMw: 120,
  firmSupplyMw: 80,
  targetPowerTiming: "Q4 2028",
  permanentPowerTiming: "H1 2029",
  constraintType: "TIMING_MISMATCH",
  bridgeDuration: "MULTI_MONTH",
  existingResources: ["BESS / battery storage"],
  reliabilityNotes: "N+1 required",
  notes: "",
  consent: true,
  website: "",
};

describe("powerGapIntakeRequestSchema", () => {
  it("accepts a complete power-gap intake with milestone timing", () => {
    const result = powerGapIntakeRequestSchema.safeParse(validIntake);
    expect(result.success).toBe(true);
  });

  it("accepts an unknown firm-supply value", () => {
    const result = powerGapIntakeRequestSchema.safeParse({
      ...validIntake,
      firmSupplyMw: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.firmSupplyMw).toBeUndefined();
  });

  it("accepts an exact target date when one is known", () => {
    const result = powerGapIntakeRequestSchema.safeParse({
      ...validIntake,
      targetPowerTiming: "2028-10-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-positive required MW", () => {
    const result = powerGapIntakeRequestSchema.safeParse({
      ...validIntake,
      requiredFirmMw: 0,
    });
    expect(result.success).toBe(false);
  });

  it("requires affirmative contact consent", () => {
    const result = powerGapIntakeRequestSchema.safeParse({
      ...validIntake,
      consent: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing target timing", () => {
    const result = powerGapIntakeRequestSchema.safeParse({
      ...validIntake,
      targetPowerTiming: "",
    });
    expect(result.success).toBe(false);
  });
});

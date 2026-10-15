import { describe, expect, it } from "vitest";
import { screenSite, type ScoutInputs } from "./site-scout";

const base: ScoutInputs = {
  requiredMw: 30,
  confirmedSupplyMw: null,
  isSupplyDocumented: false,
  utility: "",
  targetDate: "Q3 2028",
  siteStatus: "EXPLORING",
};

describe("Site Scout preliminary screening", () => {
  it("does not claim capacity when documentation is missing", () => {
    const result = screenSite(base);
    expect(result.bridgeMw).toBeNull();
    expect(result.checks.find((check) => check.label === "Firm usable supply")?.status).toBe("TO_VERIFY");
  });
  it("ignores an unconfirmed MW number", () => {
    expect(screenSite({ ...base, confirmedSupplyMw: 15 }).bridgeMw).toBeNull();
  });
  it("calculates only visitor-reported documented supply", () => {
    const result = screenSite({ ...base, isSupplyDocumented: true, confirmedSupplyMw: 11.5 });
    expect(result.bridgeMw).toBe(18.5);
    expect(result.headline).toContain("below");
  });
  it("does not report a negative MW shortfall", () => {
    expect(screenSite({ ...base, isSupplyDocumented: true, confirmedSupplyMw: 45 }).bridgeMw).toBe(0);
  });
  it("can correctly calculate a zero-supply shortfall", () => {
    expect(screenSite({ ...base, isSupplyDocumented: true, confirmedSupplyMw: 0 }).bridgeMw).toBe(30);
  });
});

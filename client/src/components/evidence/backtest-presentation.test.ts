import { describe, expect, it } from "vitest";
import {
  describeMeterPresentation,
  describeSatelliteSource,
} from "./backtest-presentation";

describe("describeSatelliteSource", () => {
  it.each([
    ["SOLCAST_HISTORICAL", "Solcast Historical (Coverage Unreported)"],
    ["SOLCAST_ESTIMATED_ACTUALS", "Solcast Estimated Actuals (Coverage Unreported)"],
    ["SYNTHETIC_FALLBACK", "Irradiance-Model Fallback"],
  ] as const)("uses one consistent label set for %s", (source, label) => {
    const result = describeSatelliteSource(source);
    expect(result.displayLabel).toBe(label);
    expect(result.badgeLabel).toContain(label.replace(" (Coverage Unreported)", ""));
    expect(result.seriesLabel).not.toContain("Oracle");
  });

  it("treats an unknown source as unclassified", () => {
    const result = describeSatelliteSource("NEW_UNATTESTED_SOURCE");
    expect(result.displayLabel).toBe("Unknown Comparison Source");
    expect(result.documentation).toContain("no independent-source claim");
  });
});

describe("describeMeterPresentation", () => {
  const site = { siteId: "proj1", siteName: "Imperial Valley Solar I" };

  it("does not label generic stored project records as PVDAQ", () => {
    const result = describeMeterPresentation({ meterDataSource: "stored", site });
    expect(result.seriesLabel).toBe("Stored Production Records (Origin Unstated)");
    expect(result.siteIdentifier).toBe("Imperial Valley Solar I (proj1)");
    expect(result.methodology).toContain("origin and utility provenance are not encoded");
  });

  it("labels a modeled series as synthesized", () => {
    const result = describeMeterPresentation({ meterDataSource: "synthetic", site });
    expect(result.seriesLabel).toBe("Synthesized Meter Baseline");
  });

  it("keeps the PVDAQ identifier only for the actual 9068 synthetic baseline", () => {
    const result = describeMeterPresentation({
      meterDataSource: "synthetic",
      site: { siteId: "9068", siteName: "NREL PVDAQ Site 9068" },
    });
    expect(result.siteIdentifier).toBe("PVDAQ 9068");
  });
});

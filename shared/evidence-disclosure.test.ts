import { describe, expect, it } from "vitest";
import {
  describeBacktestEvidence,
  describePerformanceEvidence,
} from "./evidence-disclosure";

describe("describePerformanceEvidence", () => {
  it.each([
    ["VERIFIED", "verified", "SGT ENGINE STATUS: VERIFIED"],
    ["AUTOMATED", "partial", "CONNECTED SOURCE"],
    ["SELF_REPORTED", "demonstration", "SELF-REPORTED DATA"],
    ["UNVERIFIED", "demonstration", "EVIDENCE NOT VERIFIED"],
    [undefined, "demonstration", "EVIDENCE NOT VERIFIED"],
  ] as const)("classifies %s without overstating evidence", (status, level, badge) => {
    const result = describePerformanceEvidence(status);
    expect(result.level).toBe(level);
    expect(result.badge).toBe(badge);
  });
});

describe("describeBacktestEvidence", () => {
  it("treats a synthesized meter baseline as a model replay", () => {
    const result = describeBacktestEvidence("synthetic", "SOLCAST_HISTORICAL");
    expect(result.level).toBe("demonstration");
    expect(result.badge).toBe("MODEL REPLAY");
  });

  it("calls out a dependent fallback comparison", () => {
    const result = describeBacktestEvidence("stored", "SYNTHETIC_FALLBACK");
    expect(result.level).toBe("demonstration");
    expect(result.badge).toBe("DEPENDENT COMPARISON");
    expect(result.description).toContain("ingestion origin is not encoded");
  });

  it("fails closed for an unrecognized comparison source", () => {
    const result = describeBacktestEvidence("stored", "NEW_UNATTESTED_SOURCE");
    expect(result.level).toBe("demonstration");
    expect(result.badge).toBe("DEPENDENT COMPARISON");
    expect(result.title).toContain("unverified comparison source");
  });

  it("does not promote uploaded records to verified meter data", () => {
    const result = describeBacktestEvidence("stored", "SOLCAST_ESTIMATED_ACTUALS");
    expect(result.level).toBe("partial");
    expect(result.badge).toBe("PARTIAL EVIDENCE");
    expect(result.description).toContain("does not report source-interval coverage");
  });
});

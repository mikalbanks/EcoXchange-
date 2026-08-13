// The dashboard's benchmark selectors carry the same contract as
// shared/benchmark/index.ts, because this package cannot import that module —
// see the header comment in benchmark.ts for why. The root suite asserts the
// JSON copies stay byte-identical; this asserts the *logic* over them agrees,
// which a file comparison cannot catch.

import { describe, expect, it } from "vitest";
import {
  BENCHMARK,
  FULL_FLEET_MAD_PCT,
  PLANTS_TESTED,
  PUBLICATION,
  PUBLICATION_MAD_PCT,
  PUBLICATION_N,
  PUBLICATION_WITHIN_10_RATE,
  TARGET_BUCKETS,
  isTargetCapacity,
  targetSegment,
  targetSegmentRange,
  targetSegmentWeightedMad,
} from "./benchmark.js";

describe("target segment", () => {
  // The regression this suite was written for: the /benchmark target-segment
  // cards rendered ±0.0%. A zero here is never a real result.
  it("reports both 1–20 MW buckets with finite, non-zero deviations", () => {
    const segment = targetSegment();
    expect(segment.map((b) => b.bucket)).toEqual([...TARGET_BUCKETS]);
    for (const bucket of segment) {
      expect(Number.isFinite(bucket.meanAbsDeviationPct)).toBe(true);
      expect(bucket.meanAbsDeviationPct).toBeGreaterThan(0);
      expect(bucket.count).toBeGreaterThan(0);
    }
  });

  // These two figures are rendered on the page and in the exported PDF, and
  // both must match the by-project-size table on the same page.
  it("pins the published target-segment figures", () => {
    expect(targetSegment()).toEqual([
      { bucket: "1–5 MW", count: 2094, meanAbsDeviationPct: 9.7 },
      { bucket: "5–20 MW", count: 1190, meanAbsDeviationPct: 9.2 },
    ]);
  });

  it("holds mean absolute deviation under the ±10% claim we publish", () => {
    const range = targetSegmentRange();
    expect(range).not.toBeNull();
    expect(range!.high).toBeLessThan(10);
    expect(range!.low).toBeLessThanOrEqual(range!.high);
    expect(targetSegmentWeightedMad()!).toBeLessThan(10);
  });

  it("scopes the 1–20 MW band by capacity", () => {
    expect(isTargetCapacity(999)).toBe(false);
    expect(isTargetCapacity(1_000)).toBe(true);
    expect(isTargetCapacity(20_000)).toBe(true);
    expect(isTargetCapacity(20_001)).toBe(false);
  });
});

describe("cohort integrity", () => {
  it("sums the publication capacity buckets to the cohort size", () => {
    const total = PUBLICATION.by_capacity.reduce((n, b) => n + b.count, 0);
    expect(total).toBe(PUBLICATION_N);
  });

  // The publication cohort is a strict subset with a strictly better headline.
  // If these ever coincide, a label swap has gone unnoticed.
  it("keeps the two cohorts distinguishable", () => {
    expect(PUBLICATION_N).toBeLessThan(PLANTS_TESTED);
    expect(PUBLICATION_MAD_PCT).toBeLessThan(FULL_FLEET_MAD_PCT);
  });

  it("pins the headline figures both sites publish", () => {
    expect(PLANTS_TESTED).toBe(5065);
    expect(PUBLICATION_N).toBe(3882);
    expect(PUBLICATION_MAD_PCT).toBeCloseTo(9.77, 2);
    expect(FULL_FLEET_MAD_PCT).toBeCloseTo(12.96, 2);
    expect(PUBLICATION_WITHIN_10_RATE).toBeCloseTo(66.3, 1);
    expect(BENCHMARK.validated).toBe(true);
  });
});

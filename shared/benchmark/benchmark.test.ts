// Guards on the canonical benchmark artifact.
//
// These exist because the benchmark figures are published claims: they appear
// on the public homepage, the /benchmark page and the exported PDF. A silently
// wrong statistic there is worse than a crash. Each check below corresponds to
// a way the numbers have gone wrong or could go wrong when the artifact is
// regenerated.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BENCHMARK,
  FULL_FLEET_MAD_PCT,
  PLANTS_TESTED,
  PUBLICATION,
  PUBLICATION_MAD_PCT,
  PUBLICATION_N,
  PUBLICATION_WITHIN_10_COUNT,
  PUBLICATION_WITHIN_10_RATE,
  TARGET_BUCKETS,
  isTargetCapacity,
  targetSegment,
  targetSegmentRange,
} from "./index.js";

describe("target segment", () => {
  it("reports both 1–20 MW buckets", () => {
    const segment = targetSegment();
    expect(segment.map((b) => b.bucket)).toEqual([...TARGET_BUCKETS]);
  });

  // The regression this suite was written for: the target-segment cards
  // rendered ±0.0%. A zero here is never a real result.
  it("has finite, non-zero deviations for both buckets", () => {
    for (const bucket of targetSegment()) {
      expect(Number.isFinite(bucket.meanAbsDeviationPct)).toBe(true);
      expect(bucket.meanAbsDeviationPct).toBeGreaterThan(0);
      expect(bucket.count).toBeGreaterThan(0);
    }
  });

  it("holds mean absolute deviation under the ±10% claim we publish", () => {
    const range = targetSegmentRange();
    expect(range).not.toBeNull();
    expect(range!.high).toBeLessThan(10);
    expect(range!.low).toBeLessThanOrEqual(range!.high);
  });

  it("scopes the 1–20 MW band by capacity", () => {
    expect(isTargetCapacity(999)).toBe(false);
    expect(isTargetCapacity(1_000)).toBe(true);
    expect(isTargetCapacity(5_000)).toBe(true);
    expect(isTargetCapacity(20_000)).toBe(true);
    expect(isTargetCapacity(20_001)).toBe(false);
  });
});

describe("cohort integrity", () => {
  it("sums the publication capacity buckets to the cohort size", () => {
    const total = PUBLICATION.by_capacity.reduce((n, b) => n + b.count, 0);
    expect(total).toBe(PUBLICATION_N);
  });

  it("sums the full-fleet capacity buckets to the plants tested", () => {
    const total = BENCHMARK.by_capacity.reduce((n, b) => n + b.count, 0);
    expect(total).toBe(PLANTS_TESTED);
  });

  it("accounts for every excluded plant", () => {
    expect(PUBLICATION_N + PUBLICATION.excluded_total).toBe(PLANTS_TESTED);
  });

  // The publication cohort is a strict subset with a strictly better headline.
  // If these two ever coincide, a label swap has gone unnoticed.
  it("keeps the two cohorts distinguishable", () => {
    expect(PUBLICATION_N).toBeLessThan(PLANTS_TESTED);
    expect(PUBLICATION_MAD_PCT).not.toBe(FULL_FLEET_MAD_PCT);
    expect(PUBLICATION_MAD_PCT).toBeLessThan(FULL_FLEET_MAD_PCT);
  });

  it("derives the within-±10% rate from the cohort it is labelled with", () => {
    const implied = (PUBLICATION_WITHIN_10_COUNT / PUBLICATION_N) * 100;
    expect(implied).toBeCloseTo(PUBLICATION_WITHIN_10_RATE, 1);

    const fleetImplied = (BENCHMARK.within_10_pct / PLANTS_TESTED) * 100;
    expect(fleetImplied).toBeCloseTo(BENCHMARK.within_10_pct_rate, 1);
  });

  it("only publishes a validated run", () => {
    expect(BENCHMARK.validated).toBe(true);
    expect(PUBLICATION_MAD_PCT).toBeLessThanOrEqual(
      BENCHMARK.validation_gate_pct,
    );
  });
});

describe("served mirror", () => {
  // ecoxchange-dashboard serves a copy at /benchmark-results.json for anyone
  // who wants the raw artifact. It has to be the same file.
  it("matches the canonical artifact byte for byte", () => {
    const canonical = fileURLToPath(
      new URL("./benchmark-results.json", import.meta.url),
    );
    const mirror = fileURLToPath(
      new URL(
        "../../ecoxchange-dashboard/public/benchmark-results.json",
        import.meta.url,
      ),
    );
    expect(readFileSync(mirror, "utf8")).toBe(readFileSync(canonical, "utf8"));
  });
});

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

describe("artifact copies", () => {
  // There are three copies of this artifact on disk, and that is deliberate.
  //
  // `shared/benchmark/` is canonical and serves client/ (www), which builds
  // from the repo root. `ecoxchange-dashboard/src/data/` is the demo app's
  // own copy: that package must not read anything outside its own directory,
  // because the Cloudflare build that deploys demo.ecoxchange.net fails when
  // it does (see the header comment in ecoxchange-dashboard/src/data/
  // benchmark.ts). `public/` is what the demo serves to anyone who wants the
  // raw JSON.
  //
  // Duplication on disk is only safe while it is duplication in name alone.
  // These are the assertions that make that true — if any copy drifts, the
  // root suite goes red before the two sites can disagree in public.
  const canonical = readFileSync(
    fileURLToPath(new URL("./benchmark-results.json", import.meta.url)),
    "utf8",
  );

  const copyOf = (relative: string) =>
    readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

  it("keeps the dashboard's copy byte-identical", () => {
    expect(
      copyOf("../../ecoxchange-dashboard/src/data/benchmark-results.json"),
    ).toBe(canonical);
  });

  it("keeps the served mirror byte-identical", () => {
    expect(
      copyOf("../../ecoxchange-dashboard/public/benchmark-results.json"),
    ).toBe(canonical);
  });

  // The headline figures are the ones both sites publish. Pin them against the
  // canonical artifact so a regenerated run that moves them has to be a
  // deliberate, reviewed change rather than a silent one.
  it("still reports the figures both sites publish", () => {
    expect(PLANTS_TESTED).toBe(5065);
    expect(PUBLICATION_N).toBe(3882);
    expect(PUBLICATION_MAD_PCT).toBeCloseTo(9.77, 2);
    expect(FULL_FLEET_MAD_PCT).toBeCloseTo(12.96, 2);
    expect(PUBLICATION_WITHIN_10_RATE).toBeCloseTo(66.3, 1);
    expect(targetSegment().map((b) => [b.bucket, b.meanAbsDeviationPct])).toEqual(
      [
        ["1–5 MW", 9.7],
        ["5–20 MW", 9.2],
      ],
    );
  });
});

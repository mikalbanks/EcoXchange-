import { ENGINE_VERSION } from "../../config/engine.js";
import benchmark from "../../data/benchmark-results.json";

export interface BenchmarkDisplayProps {
  engineVersion?: string;
  /** e.g. "EIA-923 Fleet (4,407 plants)" */
  benchmarkSource?: string;
  /** null until the clean fleet validation completes. */
  meanDeviation?: number | null;
  status?: "pending" | "in_progress" | "validated";
  benchmarkDate?: string | null;
}

// Defaults come from the committed benchmark artifact
// (src/data/benchmark-results.json, produced by the engine repo's
// run_eia_benchmark and mirrored to public/benchmark-results.json).
// "validated" is asserted by the artifact itself only when the run met the
// ≥80% success floor AND mean absolute deviation ≤ 10%.
const FLEET_STATUS: BenchmarkDisplayProps["status"] = benchmark.validated
  ? "validated"
  : "pending";
const FLEET_SOURCE = `EIA-923 Fleet (${benchmark.plants_succeeded.toLocaleString("en-US")} plants, ${benchmark.benchmark_year} data)`;

/**
 * EIA fleet benchmark framing for engine v2.0.0 (polish spec §A.2).
 *
 * v2.0.0 is the first benchmark run on the canonical pvlib ModelChain physics
 * — the FIRST CLEAN BASELINE. It must always be stated in absolute terms and
 * never framed relative to any earlier harness's output.
 */
export function EngineBenchmark({
  engineVersion = ENGINE_VERSION,
  benchmarkSource = FLEET_SOURCE,
  meanDeviation = benchmark.mean_absolute_deviation_pct,
  status = FLEET_STATUS,
  benchmarkDate = benchmark.benchmark_date,
}: BenchmarkDisplayProps) {
  return (
    <div
      className="border border-darkBg/10 bg-white px-4 py-3"
      data-testid="engine-benchmark"
    >
      <p className="font-mono text-xs text-darkBg">
        {status === "validated" && meanDeviation !== null ? (
          <>
            Mean deviation: ±{Math.abs(meanDeviation).toFixed(1)}% · {benchmarkSource} ·
            Engine {engineVersion}
          </>
        ) : status === "in_progress" ? (
          <>EIA fleet validation in progress · Engine {engineVersion} · pvlib ModelChain</>
        ) : (
          <>EIA fleet validation pending · Engine {engineVersion} · pvlib ModelChain</>
        )}
      </p>
      <p className="mt-1 text-xs text-textMuted">
        {status === "validated"
          ? `Validated against pvlib ModelChain with NASA POWER irradiance data${
              benchmarkDate ? ` · Benchmarked ${benchmarkDate}` : ""
            }.`
          : "This is the first benchmark run using the canonical pvlib physics model."}
      </p>
    </div>
  );
}

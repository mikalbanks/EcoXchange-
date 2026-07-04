import { ENGINE_VERSION } from "../../config/engine.js";

export interface BenchmarkDisplayProps {
  engineVersion?: string;
  /** e.g. "EIA-923 Fleet (4,407 plants)" */
  benchmarkSource?: string;
  /** null until the clean fleet validation completes. */
  meanDeviation?: number | null;
  status?: "pending" | "in_progress" | "validated";
}

/**
 * EIA fleet benchmark framing for engine v2.0.0 (polish spec §A.2).
 *
 * v2.0.0 is the first benchmark run on the canonical pvlib ModelChain physics
 * — the FIRST CLEAN BASELINE. It must always be stated in absolute terms and
 * never framed relative to any earlier harness's output.
 */
export function EngineBenchmark({
  engineVersion = ENGINE_VERSION,
  benchmarkSource = "EIA-923 Fleet (4,407 plants)",
  meanDeviation = null,
  status = "pending",
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
          ? "Validated against pvlib ModelChain with NASA POWER irradiance data."
          : "This is the first benchmark run using the canonical pvlib physics model."}
      </p>
    </div>
  );
}

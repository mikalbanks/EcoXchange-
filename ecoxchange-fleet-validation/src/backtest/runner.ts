import { backtestPlant } from "./plant-backtest.js";
import type {
  BatchBacktestError,
  JoinedPlantRecord,
  PlantBacktestResult,
} from "../utils/types.js";

export interface BatchOptions {
  irradianceMcpUrl: string;
  concurrency: number;
  delayMs: number;
  maxPlants: number | null;
  systemLosses?: number;
  onProgress?: (processed: number, total: number) => void;
}

export interface BatchOutcome {
  results: PlantBacktestResult[];
  errors: BatchBacktestError[];
}

export async function runBatchBacktest(
  plants: JoinedPlantRecord[],
  opts: BatchOptions,
): Promise<BatchOutcome> {
  const results: PlantBacktestResult[] = [];
  const errors: BatchBacktestError[] = [];
  const toProcess = opts.maxPlants
    ? plants.slice(0, opts.maxPlants)
    : plants;

  for (let i = 0; i < toProcess.length; i += opts.concurrency) {
    const batch = toProcess.slice(i, i + opts.concurrency);
    const settled = await Promise.allSettled(
      batch.map((p) =>
        backtestPlant(p, {
          irradianceMcpUrl: opts.irradianceMcpUrl,
          systemLosses: opts.systemLosses,
        }),
      ),
    );
    for (let j = 0; j < settled.length; j++) {
      const s = settled[j];
      if (s.status === "fulfilled") {
        results.push(s.value);
      } else {
        errors.push({
          plant: batch[j]!,
          error: (s.reason as Error)?.message ?? String(s.reason),
        });
      }
    }
    if (opts.onProgress)
      opts.onProgress(
        Math.min(i + opts.concurrency, toProcess.length),
        toProcess.length,
      );
    if (i + opts.concurrency < toProcess.length && opts.delayMs > 0) {
      await new Promise((r) => setTimeout(r, opts.delayMs));
    }
  }
  return { results, errors };
}

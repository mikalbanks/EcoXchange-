// Simulated execution path: no contracts deployed yet. Produces step results
// with realistic Base Sepolia characteristics — the block number is fetched
// from the real chain when the RPC is reachable — but tx hashes are
// pseudo-hashes that MUST always be labeled SIMULATED in the UI and never
// linked to BaseScan (they do not exist on-chain).

import { activeNetwork } from "../../config/contracts.js";
import { sleep } from "./executor.js";

// Realistic per-step characteristics for Base Sepolia (2s block time).
const STEP_PROFILE = {
  oracle: { latencyMs: 2200, gasUsed: 118_244 },
  distribution: { latencyMs: 2800, gasUsed: 471_386 },
} as const;

/** Pseudo tx hash: valid 32-byte hex format, deterministic-per-call seed. */
function pseudoTxHash(seed: number): string {
  let state = seed >>> 0;
  const next = () => {
    // xorshift32 — cheap deterministic hex stream from the seed.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0).toString(16).padStart(8, "0");
  };
  return `0x${next()}${next()}${next()}${next()}${next()}${next()}${next()}${next()}`;
}

/** Latest real block number, or a plausible fallback when RPC is unreachable. */
async function latestBlockNumber(): Promise<number> {
  try {
    const res = await fetch(activeNetwork.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      signal: AbortSignal.timeout(4000),
    });
    const json = (await res.json()) as { result?: string };
    if (json.result) return parseInt(json.result, 16);
  } catch {
    // Sandboxed/offline demo: fall through to the plausible fallback.
  }
  // Plausible Base Sepolia height if the chain can't be reached.
  return 14_523_891 + Math.floor((Date.now() / 1000 / 2) % 100_000);
}

export async function runSimulatedStep(
  step: "oracle" | "distribution",
): Promise<{ txHash: string; blockNumber: number; gasUsed: string }> {
  const profile = STEP_PROFILE[step];
  const [blockNumber] = await Promise.all([latestBlockNumber(), sleep(profile.latencyMs)]);
  return {
    txHash: pseudoTxHash(Date.now() + (step === "oracle" ? 1 : 2)),
    // The distribution lands a block after the oracle write.
    blockNumber: step === "oracle" ? blockNumber : blockNumber + 1,
    gasUsed: profile.gasUsed.toLocaleString("en-US"),
  };
}

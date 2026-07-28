// Dual-mode distribution simulation engine.
//
// The 3-step flow (verification -> oracle write -> USDC distribution) runs in
// one of two modes:
//   - "simulated" (default): no contracts deployed. Steps run with realistic
//     latencies; block numbers come from a real Base Sepolia RPC call when
//     reachable; tx hashes are pseudo-hashes clearly labeled SIMULATED and
//     never linked to BaseScan.
//   - "live": real viem walletClient transactions against the deployed
//     DemoOracleBridge/DemoDistributor (contracts/ package). Activates only
//     when isLiveDistributionEnabled() — real addresses + build-time
//     testnet-only signer key.
//
// This module (and everything it imports) must stay inside the lazy
// distribution chunk so viem never reaches the entry bundle.

import { isLiveDistributionEnabled } from "../../config/contracts.js";
import { ENGINE_VERSION } from "../../config/engine.js";
import { DEMO_OFFERING } from "../../data/demo-offering.js";
import { DEMO_HOLDERS, holderAmountUsd } from "../../data/demo-wallets.js";
import demoSavannah from "../../data/demo-savannah.json";
import { runSimulatedStep } from "./simulated-run.js";
import { runLiveOracleWrite, runLiveDistribution } from "./live-run.js";

export type SimStepId = "verification" | "oracle" | "distribution";
export type StepStatus = "pending" | "active" | "complete" | "error";
export type ExecutionMode = "simulated" | "live";

export interface StepState {
  status: StepStatus;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

/** A completed run, persisted so the Distributions history can show it. */
export interface DistributionRun {
  id: string;
  mode: ExecutionMode;
  period: string; // "2024-12"
  totalUsd: number;
  recipientCount: number;
  userShareUsd: number; // "Your Wallet" (0.4%) amount
  oracleTxHash: string;
  distributionTxHash: string;
  blockNumber: number;
  completedAt: string; // ISO timestamp
}

// Latest verified month from the canonical dataset — derived, not hardcoded,
// so regenerating the seed data can never leave this scenario stale.
const latestRecord =
  demoSavannah.verification_records[demoSavannah.verification_records.length - 1];

/** Canonical demo scenario: the latest verified Savannah month (Dec 2024). */
export const DEMO_DISTRIBUTION = {
  period: latestRecord.period_start.slice(0, 7),
  periodStartUnix: Math.floor(Date.parse(`${latestRecord.period_start}T00:00:00Z`) / 1000),
  /**
   * Monthly pool for the whole project — the 7.0% target cash yield on the
   * $2.5M raise. The demo investor persona holds 0.4% (40 bps), receiving
   * $58.33, consistent with Portfolio's Monthly Yield (data/demo-offering.ts).
   */
  totalPoolUsd: DEMO_OFFERING.offering_distributions.monthly_total_usd,
  verifiedKwh: latestRecord.inverter_kwh,
  expectedKwh: latestRecord.expected_kwh,
  utilityKwh: latestRecord.utility_kwh,
  invVsExpectedPct: latestRecord.inv_vs_expected_pct,
  invVsUtilityPct: latestRecord.inv_vs_utility_pct,
  deviationBps: Math.round(latestRecord.inv_vs_expected_pct * 100),
  engineVersion: ENGINE_VERSION,
  verdict: "VERIFIED" as const,
};

export function getExecutionMode(): ExecutionMode {
  return isLiveDistributionEnabled() ? "live" : "simulated";
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RUNS_STORAGE_KEY = "distribution-sim:runs";

export function loadStoredRuns(): DistributionRun[] {
  try {
    const raw = localStorage.getItem(RUNS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DistributionRun[]) : [];
  } catch {
    return [];
  }
}

function storeRun(run: DistributionRun): void {
  try {
    localStorage.setItem(RUNS_STORAGE_KEY, JSON.stringify([run, ...loadStoredRuns()]));
  } catch {
    // Storage unavailable (private mode) — the run still completes in-page.
  }
}

export interface RunCallbacks {
  onStep: (step: SimStepId, state: StepState) => void;
}

/**
 * Execute the full 3-step flow. Resolves with the persisted run record, or
 * rejects after marking the failing step's state as "error".
 */
export async function runDistribution(callbacks: RunCallbacks): Promise<DistributionRun> {
  const mode = getExecutionMode();
  const { onStep } = callbacks;

  // Step 1 — verification: reads the cached engine verdict (no chain call in
  // either mode; the engine already ran). Short pause so the check reads as
  // a real gate rather than an instant flash.
  onStep("verification", { status: "active", startedAt: Date.now() });
  await sleep(1500);
  onStep("verification", { status: "complete", completedAt: Date.now() });

  // Step 2 — oracle write.
  onStep("oracle", { status: "active", startedAt: Date.now() });
  let oracle: { txHash: string; blockNumber: number; gasUsed: string };
  try {
    oracle =
      mode === "live"
        ? await runLiveOracleWrite(DEMO_DISTRIBUTION)
        : await runSimulatedStep("oracle");
  } catch (err) {
    onStep("oracle", { status: "error", error: String(err).slice(0, 160) });
    throw err;
  }
  onStep("oracle", { status: "complete", completedAt: Date.now(), ...oracle });

  // Step 3 — USDC distribution.
  onStep("distribution", { status: "active", startedAt: Date.now() });
  let dist: { txHash: string; blockNumber: number; gasUsed: string };
  try {
    dist =
      mode === "live"
        ? await runLiveDistribution(DEMO_DISTRIBUTION)
        : await runSimulatedStep("distribution");
  } catch (err) {
    onStep("distribution", { status: "error", error: String(err).slice(0, 160) });
    throw err;
  }
  onStep("distribution", { status: "complete", completedAt: Date.now(), ...dist });

  const run: DistributionRun = {
    id: `run-${Date.now().toString(36)}`,
    mode,
    period: DEMO_DISTRIBUTION.period,
    totalUsd: DEMO_DISTRIBUTION.totalPoolUsd,
    recipientCount: DEMO_HOLDERS.length,
    userShareUsd: holderAmountUsd(DEMO_DISTRIBUTION.totalPoolUsd, DEMO_HOLDERS[0].shareBps),
    oracleTxHash: oracle.txHash,
    distributionTxHash: dist.txHash,
    blockNumber: dist.blockNumber,
    completedAt: new Date().toISOString(),
  };
  storeRun(run);
  return run;
}

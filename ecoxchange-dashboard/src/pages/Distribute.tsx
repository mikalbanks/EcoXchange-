import { useCallback, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { SectionTag } from "../components/ui/SectionTag.js";
import { Button } from "../components/ui/Button.js";
import { NetworkStatus } from "../components/explorer/NetworkStatus.js";
import { SimulationStepCard } from "../components/distribution/SimulationStepCard.js";
import {
  USDCFlowAnimation,
  USDCFlowList,
} from "../components/distribution/USDCFlowAnimation.js";
import { YieldCalculator } from "../components/distribution/YieldCalculator.js";
import { DataSourceAttribution } from "../compliance/components/DataSourceAttribution.js";
import { YieldDisclosure } from "../compliance/components/YieldDisclosure.js";
import {
  DEMO_DISTRIBUTION,
  getExecutionMode,
  runDistribution,
  type SimStepId,
  type StepState,
} from "../lib/distribution/executor.js";
import { DEMO_OFFERING } from "../data/demo-offering.js";
import { DEMO_HOLDERS, holderAmountUsd } from "../data/demo-wallets.js";
import { activeNetwork, shortAddress } from "../config/contracts.js";
import { useNotifications } from "../context/NotificationContext.js";
import { useMediaQuery, useIsMobile } from "../hooks/useMediaQuery.js";
import { formatUsd, formatKwh } from "../utils/formatters.js";

const formatSignedPct = (pct: number) => `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;

const INITIAL_STEPS: Record<SimStepId, StepState> = {
  verification: { status: "pending" },
  oracle: { status: "pending" },
  distribution: { status: "pending" },
};

/**
 * Distribution Simulation (/distribute): the full verification -> oracle ->
 * USDC settlement loop, executed step by step. Runs in simulated mode until
 * the demo contracts (contracts/ package) are deployed to Base Sepolia, at
 * which point the exact same flow executes real testnet transactions.
 */
export function Distribute() {
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [running, setRunning] = useState(false);
  const [completedRuns, setCompletedRuns] = useState(0);
  const { showDistributionBanner } = useNotifications();
  const isMobile = useIsMobile();
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const mode = useMemo(() => getExecutionMode(), []);
  const isLive = mode === "live";
  const userShare = holderAmountUsd(DEMO_DISTRIBUTION.totalPoolUsd, DEMO_HOLDERS[0].shareBps);

  const onStep = useCallback((step: SimStepId, state: StepState) => {
    setSteps((prev) => ({ ...prev, [step]: { ...prev[step], ...state } }));
  }, []);

  const simulate = async () => {
    setRunning(true);
    setSteps(INITIAL_STEPS);
    try {
      const run = await runDistribution({ onStep });
      setCompletedRuns((n) => n + 1);
      showDistributionBanner({ amountUsd: run.userShareUsd, to: "/investor/distributions" });
    } catch {
      // The failing step already carries its error state.
    } finally {
      setRunning(false);
    }
  };

  const allComplete = steps.distribution.status === "complete";
  const flowPlaying = steps.distribution.status === "active" || allComplete;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <SectionTag>Distribution Simulation</SectionTag>
        <h1 className="font-heading text-3xl text-darkBg">Verification to Settlement</h1>
        <p className="mt-1 text-textMuted">
          Experience the full verification-to-distribution cycle
          {isLive ? " — executing real testnet transactions" : ""}
        </p>
      </div>

      <NetworkStatus />

      {!isLive ? (
        <p
          className="border border-flagAmber/40 bg-flagAmber/10 px-4 py-3 text-sm text-darkBg"
          data-testid="simulated-mode-notice"
        >
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-flagAmber">
            Simulated run
          </span>{" "}
          — the demo contracts are not yet deployed, so no on-chain transactions occur and
          transaction hashes are illustrative. Once deployed (see contracts/README.md), this
          same flow executes real Base Sepolia transactions with live BaseScan links.
        </p>
      ) : null}

      {/* Step 1: verification engine */}
      <SimulationStepCard stepNumber={1} title="Verification Engine" state={steps.verification} isLive={isLive}>
        <p className="text-sm font-medium text-darkBg">
          Savannah Community Solar 5MW · December 2024
        </p>
        <dl className="mt-3 grid max-w-md grid-cols-2 gap-y-1.5 font-mono text-sm text-darkBg">
          <dt className="text-textMuted">Inverter</dt>
          <dd className="text-right tabular-nums">{formatKwh(DEMO_DISTRIBUTION.verifiedKwh)}</dd>
          <dt className="text-textMuted">Expected</dt>
          <dd className="text-right tabular-nums">{formatKwh(DEMO_DISTRIBUTION.expectedKwh)}</dd>
          <dt className="text-textMuted">Utility</dt>
          <dd className="text-right tabular-nums">{formatKwh(DEMO_DISTRIBUTION.utilityKwh)}</dd>
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accentBrt/15 px-2.5 py-0.5 text-xs font-medium text-medGreen">
            <span className="h-1.5 w-1.5 rounded-full bg-accentBrt" aria-hidden />
            {DEMO_DISTRIBUTION.verdict}
          </span>
          <span className="font-mono text-xs text-textMuted">
            INV→EXP {formatSignedPct(DEMO_DISTRIBUTION.invVsExpectedPct)} · INV→UTL{" "}
            {formatSignedPct(DEMO_DISTRIBUTION.invVsUtilityPct)} · Engine{" "}
            {DEMO_DISTRIBUTION.engineVersion}
          </span>
        </div>
      </SimulationStepCard>

      {/* Step 2: oracle write */}
      <SimulationStepCard stepNumber={2} title="Oracle Write" state={steps.oracle} isLive={isLive}>
        <p className="text-sm text-textMuted">
          {steps.oracle.status === "active"
            ? `Writing verified production to ${activeNetwork.name}…`
            : steps.oracle.status === "complete"
              ? `Verified production recorded on ${activeNetwork.name}.`
              : `Writes the verification verdict (${formatKwh(DEMO_DISTRIBUTION.verifiedKwh)}, ${DEMO_DISTRIBUTION.verdict}) to the DemoOracleBridge contract.`}
        </p>
      </SimulationStepCard>

      {/* Step 3: distribution */}
      <SimulationStepCard stepNumber={3} title="USDC Distribution" state={steps.distribution} isLive={isLive}>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="font-mono text-lg font-semibold tabular-nums text-darkBg">
            <YieldDisclosure
              value={`${formatUsd(DEMO_DISTRIBUTION.totalPoolUsd, true)} USDC`}
              type="cash_distribution"
              basis="modeled"
            />
          </p>
          <p className="text-sm text-textMuted">
            Recipients: {DEMO_HOLDERS.length} verified holders · Your share (
            {DEMO_OFFERING.demo_investor.ownership_pct}%):{" "}
            <YieldDisclosure value={formatUsd(userShare, true)} type="cash_distribution" basis="modeled" />
          </p>
        </div>

        {flowPlaying ? (
          <div className="mt-4">
            {isMobile || prefersReducedMotion ? (
              <USDCFlowList holders={DEMO_HOLDERS} poolUsd={DEMO_DISTRIBUTION.totalPoolUsd} />
            ) : (
              <USDCFlowAnimation
                holders={DEMO_HOLDERS}
                poolUsd={DEMO_DISTRIBUTION.totalPoolUsd}
                playing={flowPlaying}
              />
            )}
          </div>
        ) : null}

        {allComplete ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-darkBg/10 font-mono text-[11px] uppercase tracking-wider text-textMuted">
                  <th className="py-2 pr-3 font-medium">Holder</th>
                  <th className="py-2 pr-3 font-medium">Share</th>
                  <th className="py-2 pr-3 text-right font-medium">Amount</th>
                  <th className="py-2 text-right font-medium">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-darkBg/5">
                {DEMO_HOLDERS.map((holder) => (
                  <tr
                    key={holder.address}
                    className={holder.label === "Your Wallet" ? "bg-accentBrt/10" : undefined}
                  >
                    <td className="py-2 pr-3">
                      <span className="block text-darkBg">{holder.label}</span>
                      <span className="font-mono text-[11px] text-textMuted">
                        {shortAddress(holder.address)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-textMuted">
                      {(holder.shareBps / 100).toFixed(1)}%
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums text-darkBg">
                      {formatUsd(
                        holderAmountUsd(DEMO_DISTRIBUTION.totalPoolUsd, holder.shareBps),
                        true,
                      )}
                    </td>
                    <td className="py-2 text-right font-mono text-[11px]">
                      {isLive && steps.distribution.txHash ? (
                        <a
                          href={`${activeNetwork.explorerUrl}/tx/${steps.distribution.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-medGreen underline-offset-2 hover:underline"
                        >
                          {steps.distribution.txHash.slice(0, 8)}…
                        </a>
                      ) : (
                        <span className="uppercase tracking-wider text-flagAmber">Simulated</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SimulationStepCard>

      {/* CTA */}
      <div className="border border-darkBg/10 bg-white p-5 text-center">
        <Button
          variant="accent"
          size="lg"
          loading={running}
          onClick={() => void simulate()}
          data-testid="simulate-distribution-cta"
        >
          {allComplete && !running ? "Simulate Again" : "Simulate Distribution"}
        </Button>
        <p className="mt-3 text-xs text-textMuted">
          {isLive
            ? `Executes real testnet transactions on ${activeNetwork.name}. Test tokens only — zero real value.`
            : "Runs the full flow in simulated mode — no on-chain transactions until the demo contracts are deployed."}
        </p>
        {allComplete ? (
          <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-medGreen" data-testid="run-complete-note">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Distribution recorded — view it on the Distributions page
          </p>
        ) : null}
        {completedRuns > 1 ? (
          <p className="mt-1 font-mono text-[11px] text-textMuted">
            {completedRuns} runs this session
          </p>
        ) : null}
      </div>

      <DataSourceAttribution
        sources={[
          { name: "Verification engine (cached Savannah backtest)", type: "model" },
          { name: `${activeNetwork.name} RPC`, type: "public_data" },
          ...(isLive
            ? []
            : [{ name: "Simulated transactions (pre-deployment)", type: "model" as const }]),
        ]}
        engineVersion={DEMO_DISTRIBUTION.engineVersion}
      />

      {/* Pro-forma calculator for the same project the simulation pays out on */}
      <YieldCalculator />
    </div>
  );
}

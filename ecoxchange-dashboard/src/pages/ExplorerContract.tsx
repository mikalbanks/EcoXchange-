import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { NetworkStatus } from "../components/explorer/NetworkStatus.js";
import { ActivityFeed } from "../components/explorer/ActivityFeed.js";
import { EmptyState } from "../components/shared/EmptyState.js";
import { Shimmer } from "../components/shared/LoadingState.js";
import { OwnershipVisualization } from "../components/token/OwnershipVisualization.js";
import { DataSourceAttribution } from "../compliance/components/DataSourceAttribution.js";
import { useContractRead } from "../hooks/useContractRead.js";
import { activeNetwork } from "../config/contracts.js";
import { ENGINE_VERSION } from "../config/engine.js";
import { getExplorerContract } from "../data/explorer-contracts.js";
import { demoActivity } from "../data/explorer-activity.js";
import { demoContractState } from "../data/demo-contract-state.js";

function StateRow({ address, fn }: { address: string; fn: string }) {
  const { result, isLoading } = useContractRead(address, fn);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-darkBg/5 px-4 py-2.5 last:border-0">
      <code className="font-mono text-xs text-textMuted">{fn}</code>
      {isLoading ? (
        <Shimmer className="h-3.5 w-20" />
      ) : (
        <span className="font-mono text-xs text-textDark tabular-nums">{result}</span>
      )}
    </div>
  );
}

/**
 * Focused view of one EcoXchange contract: metadata, read-only state
 * (demo-simulated until deployment), and filtered recent events.
 */
export function ExplorerContract() {
  const { contractType = "" } = useParams();
  const contract = getExplorerContract(contractType);
  const [copied, setCopied] = useState(false);

  if (!contract) {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          title="Contract not found"
          message="This contract type does not exist in the EcoXchange system."
          cta={{ label: "Back to Explorer", to: "/explorer" }}
        />
      </div>
    );
  }

  const stateFns = Object.keys(demoContractState[contract.address] ?? {});
  const events = demoActivity.filter((a) => a.contracts.includes(contract.id));
  const Icon = contract.icon;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(contract.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — no-op.
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <BackLink />

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-paleGreen">
          <Icon className="h-6 w-6 text-darkBg" />
        </div>
        <div>
          <h1 className="font-heading text-3xl text-darkBg">{contract.title}</h1>
          <p className="font-mono text-xs uppercase tracking-wider text-textMuted">
            {contract.standard} · {activeNetwork.name}
          </p>
        </div>
      </div>

      <NetworkStatus />

      {/* Contract metadata */}
      <div className="rounded-xl border border-paleGreen/60 bg-white p-5">
        <h2 className="mb-3 font-heading text-lg text-darkBg">Contract Metadata</h2>
        <p className="mb-3 text-sm leading-relaxed text-textMuted">
          {contract.description}
        </p>
        {contract.status === "deployed" ? (
          <>
            <div className="flex items-center gap-2 rounded border border-darkBg/10 bg-cream p-2">
              <code className="flex-1 truncate font-mono text-[11px] text-textDark">
                {contract.address}
              </code>
              <button
                type="button"
                onClick={copyAddress}
                aria-label="Copy contract address"
                className="min-h-[44px] px-2 text-xs font-medium text-medGreen hover:text-darkBg"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <a
              href={`${activeNetwork.explorerUrl}/address/${contract.address}#code`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-[44px] items-center font-mono text-xs uppercase tracking-[0.06em] text-medGreen hover:text-darkBg"
            >
              Verified source on BaseScan →
            </a>
          </>
        ) : (
          <p className="font-mono text-xs uppercase tracking-wider text-textMuted">
            Not yet deployed on {activeNetwork.name}
          </p>
        )}
      </div>

      {/* Token cap table (differentiation spec §4) — token contract only. */}
      {contract.id === "token" ? (
        <div>
          <h2 className="mb-3 font-heading text-lg text-darkBg">Token Holders</h2>
          <OwnershipVisualization />
        </div>
      ) : null}

      {/* Read-only contract state */}
      {stateFns.length > 0 ? (
        <div>
          <h2 className="mb-3 font-heading text-lg text-darkBg">Contract State</h2>
          <div className="overflow-hidden rounded-xl border border-paleGreen/60 bg-white">
            {stateFns.map((fn) => (
              <StateRow key={fn} address={contract.address} fn={fn} />
            ))}
          </div>
          <DataSourceAttribution
            sources={[
              { name: "Simulated contract state (pre-deployment)", type: "model" },
            ]}
            engineVersion={ENGINE_VERSION}
          />
        </div>
      ) : null}

      {/* Recent events for this contract */}
      <div>
        <h2 className="mb-3 font-heading text-lg text-darkBg">Recent Events</h2>
        <ActivityFeed activity={events} />
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/explorer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-medGreen hover:text-darkBg"
    >
      <ArrowLeft className="h-4 w-4" /> Back to Explorer
    </Link>
  );
}

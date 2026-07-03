import { useState } from "react";
import { Link } from "react-router-dom";
import { activeNetwork } from "../../config/contracts.js";
import type { ExplorerContract } from "../../data/explorer-contracts.js";

const STATUS_META = {
  deployed: { dot: "bg-accentBrt", label: "DEPLOYED", text: "text-medGreen" },
  pending: { dot: "bg-flagAmber animate-pulse", label: "PENDING", text: "text-textMuted" },
  not_deployed: { dot: "bg-gray-300", label: "NOT YET", text: "text-textMuted" },
} as const;

/**
 * One EcoXchange contract: standard, status, address (copy), demo stats,
 * BaseScan link, and an internal link to the /explorer/:id detail view.
 */
export function ContractCard({ contract }: { contract: ExplorerContract }) {
  const [copied, setCopied] = useState(false);
  const status = STATUS_META[contract.status];
  const Icon = contract.icon;
  const deployed = contract.status === "deployed";

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(contract.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — no-op.
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-paleGreen/60 bg-white p-5 transition-shadow duration-150 hover:shadow-md">
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-paleGreen">
            <Icon className="h-5 w-5 text-darkBg" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold text-textDark">
              {contract.title}
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-wider text-textMuted">
              {contract.standard}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span aria-hidden className={`h-2 w-2 rounded-full ${status.dot}`} />
          <span className={`font-mono text-[10px] uppercase tracking-wider ${status.text}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="mb-3 text-xs leading-relaxed text-textMuted">
        {contract.description}
      </p>

      {/* Contract address (mono, truncated, copy) */}
      {deployed ? (
        <div className="mb-3 flex items-center gap-2 rounded border border-darkBg/10 bg-cream p-2">
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
      ) : null}

      {/* Stats grid */}
      {contract.stats.length > 0 ? (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {contract.stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-mono text-[10px] uppercase tracking-wider text-textMuted">
                {stat.label}
              </p>
              <p className="text-sm font-medium text-textDark">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Links */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {deployed ? (
          <a
            href={`${activeNetwork.explorerUrl}/address/${contract.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs uppercase tracking-[0.06em] text-medGreen hover:text-darkBg"
          >
            View on BaseScan →
          </a>
        ) : (
          <span className="font-mono text-xs uppercase tracking-[0.06em] text-textMuted">
            Not yet deployed
          </span>
        )}
        <Link
          to={`/explorer/${contract.id}`}
          className="min-h-[44px] inline-flex items-center px-2 text-sm font-medium text-medGreen hover:text-darkBg"
        >
          View →
        </Link>
      </div>
    </div>
  );
}

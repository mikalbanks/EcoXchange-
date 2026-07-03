import { ExternalLink } from "lucide-react";
import { activeNetwork } from "../../config/contracts.js";
import type { ActivityType, ChainActivity } from "../../data/explorer-activity.js";
import { palette } from "../../config/palette.js";
import { formatTimeAgo } from "../../utils/formatters.js";

const TYPE_CONFIG: Record<ActivityType, { label: string; color: string }> = {
  distribution: { label: "DISTRIBUTION", color: palette.accentBrt },
  oracle_write: { label: "ORACLE WRITE", color: palette.medGreen },
  token_issue: { label: "TOKEN ISSUE", color: palette.lightGreen },
  identity_add: { label: "IDENTITY ADD", color: "#7A9B6D" },
  transfer: { label: "TRANSFER", color: palette.textMuted },
};

function TypeBadge({ type }: { type: ActivityType }) {
  const config = TYPE_CONFIG[type];
  return (
    <span
      className="rounded px-2 py-0.5 text-center font-mono text-[9px] uppercase tracking-[0.06em]"
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      {config.label}
    </span>
  );
}

function txUrl(hash: string): string {
  return `${activeNetwork.explorerUrl}/tx/${hash}`;
}

/**
 * Recent on-chain activity. Desktop: table rows. Mobile (<md): stacked cards
 * (same responsive precedent as DistributionHistory). Demo data is simulated;
 * swaps to eth_getLogs once contracts are deployed.
 */
export function ActivityFeed({ activity }: { activity: ChainActivity[] }) {
  if (activity.length === 0) {
    return (
      <p className="rounded-xl border border-paleGreen/60 bg-white p-5 text-sm text-textMuted">
        No on-chain activity yet.
      </p>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-3 md:hidden">
        {activity.map((a) => (
          <div key={a.txHash} className="rounded-xl border border-paleGreen/60 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <TypeBadge type={a.type} />
              <span className="font-mono text-[10px] text-textMuted">
                {formatTimeAgo(a.timestamp)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <code className="font-mono text-[11px] text-medGreen">
                {a.txHash.slice(0, 10)}…
              </code>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-textMuted">
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${
                    a.status === "confirmed" ? "bg-accentBrt" : "bg-flagAmber"
                  }`}
                />
                {a.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-textMuted">
              <span className="font-mono">{a.from}</span>
              <span className="mx-1.5 text-paleGreen">→</span>
              <span className="font-mono">{a.to}</span>
            </p>
            {a.value ? (
              <p className="mt-1 font-mono text-sm tabular-nums text-textDark">{a.value}</p>
            ) : null}
            <a
              href={txUrl(a.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-[44px] items-center gap-1 font-mono text-xs uppercase tracking-[0.06em] text-medGreen"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View on BaseScan →
            </a>
          </div>
        ))}
      </div>

      {/* Desktop: table rows */}
      <div className="hidden overflow-hidden rounded-xl border border-paleGreen/60 bg-white md:block">
        {activity.map((a) => (
          <div
            key={a.txHash}
            className="flex items-center gap-4 border-b border-darkBg/5 px-4 py-3 last:border-0 hover:bg-cream/50"
          >
            <a
              href={txUrl(a.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-[90px] font-mono text-[11px] text-medGreen hover:underline"
            >
              {a.txHash.slice(0, 8)}…
            </a>
            <div className="min-w-[110px]">
              <TypeBadge type={a.type} />
            </div>
            <div className="flex flex-1 items-center gap-2 text-xs text-textMuted">
              <span className="max-w-[160px] truncate font-mono">{a.from}</span>
              <span className="text-paleGreen">→</span>
              <span className="max-w-[160px] truncate font-mono">{a.to}</span>
            </div>
            {a.value ? (
              <span className="min-w-[140px] text-right font-mono text-xs tabular-nums text-textDark">
                {a.value}
              </span>
            ) : null}
            <span className="min-w-[56px] text-right font-mono text-[10px] text-textMuted">
              {formatTimeAgo(a.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

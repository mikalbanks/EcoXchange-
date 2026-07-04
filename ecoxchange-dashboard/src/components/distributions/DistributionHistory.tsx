import { CheckCircle2, Clock, ExternalLink, XCircle } from "lucide-react";
import { SwipeActionRow } from "../shared/SwipeActionRow.js";
import { DataSourceAttribution } from "../../compliance/components/DataSourceAttribution.js";
import { YieldDisclosure } from "../../compliance/components/YieldDisclosure.js";
import { formatUsd } from "../../utils/formatters.js";
import { activeNetwork } from "../../config/contracts.js";
import type { DistributionRecord } from "../../types/distributions.js";

// Pre-deployment simulation runs carry pseudo tx hashes: label them and never
// link to BaseScan (the hash does not exist on-chain).
function SimulatedTag() {
  return (
    <span
      className="ml-2 border border-flagAmber/40 bg-flagAmber/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-flagAmber"
      title="Produced by the distribution simulation before contract deployment — not an on-chain transaction"
    >
      Simulated
    </span>
  );
}

function periodLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function StatusPill({ status }: { status: DistributionRecord["status"] }) {
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 text-medGreen">
        <CheckCircle2 className="h-4 w-4" /> Done
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 text-red-600">
        <XCircle className="h-4 w-4" /> Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-textMuted">
      <Clock className="h-4 w-4" /> {status === "processing" ? "Processing" : "Pending"}
    </span>
  );
}

export function DistributionHistory({
  records,
}: {
  records: DistributionRecord[];
}) {
  if (records.length === 0) {
    return (
      <p className="rounded-xl border border-paleGreen/60 bg-white p-5 text-sm text-textMuted">
        No distributions yet. Your first payout will appear here.
      </p>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards (the 5-column table is unreadable at 375px).
          Swipe a card left to reveal View-on-Explorer when a tx hash exists. */}
      <div className="space-y-3 md:hidden">
        {records.map((r) => {
          const card = (
            <div className="rounded-xl border border-paleGreen/60 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-darkBg">
                    {periodLabel(r.period_start)}
                    {r.simulated ? <SimulatedTag /> : null}
                  </div>
                  <div className="mt-0.5 text-xs text-textMuted">
                    {r.offering_name ?? "—"} ·{" "}
                    {r.action_taken === "reinvest" ? "Reinvest" : "Cash Out"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono tabular-nums text-darkBg">
                    <YieldDisclosure
                      value={formatUsd(r.net_distribution, true)}
                      type="cash_distribution"
                      basis="modeled"
                    />
                  </div>
                  <div className="mt-0.5 text-xs">
                    <StatusPill status={r.status} />
                  </div>
                </div>
              </div>
            </div>
          );
          return r.tx_hash && !r.simulated ? (
            <SwipeActionRow
              key={r.id}
              action={
                <a
                  href={`${activeNetwork.explorerUrl}/tx/${r.tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full flex-col items-center justify-center gap-1 bg-darkBg px-2 text-center text-[10px] font-medium uppercase tracking-wide text-paleGreen"
                >
                  <ExternalLink className="h-4 w-4" />
                  Explorer
                </a>
              }
            >
              {card}
            </SwipeActionRow>
          ) : (
            <div key={r.id}>{card}</div>
          );
        })}
      </div>

      {/* Desktop / tablet: the original table. */}
      <div className="hidden overflow-x-auto rounded-xl border border-paleGreen/60 bg-white md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-paleGreen/50 text-left text-xs uppercase tracking-wide text-textMuted">
            <th className="px-4 py-3 font-medium">Period</th>
            <th className="px-4 py-3 font-medium">Offering</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-paleGreen/30 last:border-0">
              <td className="px-4 py-3 text-darkBg">
                {periodLabel(r.period_start)}
                {r.simulated ? <SimulatedTag /> : null}
              </td>
              <td className="px-4 py-3 text-textMuted">
                {r.offering_name ?? "—"}
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-darkBg">
                <YieldDisclosure
                  value={formatUsd(r.net_distribution, true)}
                  type="cash_distribution"
                  basis="modeled"
                />
              </td>
              <td className="px-4 py-3 text-darkBg">
                {r.action_taken === "reinvest" ? "Reinvest" : "Cash Out"}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        <div className="px-4 pb-3">
          <DataSourceAttribution
            sources={[
              { name: "EcoXchange Distribution Ledger", type: "model" },
              { name: "Base Network", type: "public_data" },
            ]}
            isEstimate
          />
        </div>
      </div>
    </>
  );
}

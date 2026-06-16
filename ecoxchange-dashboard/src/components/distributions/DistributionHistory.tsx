import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatUsd } from "../../utils/formatters.js";
import type { DistributionRecord } from "../../types/distributions.js";

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
    <div className="overflow-x-auto rounded-xl border border-paleGreen/60 bg-white">
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
              <td className="px-4 py-3 text-darkBg">{periodLabel(r.period_start)}</td>
              <td className="px-4 py-3 text-textMuted">
                {r.offering_name ?? "—"}
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-darkBg">
                {formatUsd(r.net_distribution, true)}
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
    </div>
  );
}

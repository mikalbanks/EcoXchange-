import { ExternalLink } from "lucide-react";
import { blockUrl } from "./did.js";
import { VerificationLinkBadge } from "./VerificationLinkBadge.js";
import type { ChainDistribution, PolymeshNetwork } from "../../types/chain.js";

/**
 * Spec 18 § 2.8 — every on-chain payment, with block number and hash linked to
 * the Polymesh explorer.
 *
 * The spec asks for an extrinsic hash. Polymesh's `Distribution` entity does
 * not carry one — only `DistributionPayment` does, via `createdEvent`. What is
 * stored is the creating block's hash, so the column is labelled BLOCK and
 * links to the block. Labelling it "extrinsic" would be a small lie on a
 * surface whose entire purpose is verifiability.
 */
export function DistributionHistoryTable({
  distributions,
  network,
  projectId,
}: {
  distributions: ChainDistribution[];
  network: PolymeshNetwork;
  projectId: string;
}) {
  if (distributions.length === 0) {
    return (
      <p className="border border-darkBg/10 bg-white p-5 text-sm text-textMuted">
        No distributions recorded on chain yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-darkBg/10 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-paleGreen/40">
          <tr className="font-mono text-[10px] uppercase tracking-[0.08em] text-olive">
            <th className="px-4 py-3 text-left font-normal">Paid</th>
            <th className="px-4 py-3 text-right font-normal">Per Share</th>
            <th className="px-4 py-3 text-right font-normal">Total</th>
            <th className="px-4 py-3 text-left font-normal">Block</th>
            <th className="px-4 py-3 text-left font-normal">Verification</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-paleGreen/40">
          {distributions.map((d) => (
            <tr key={d.distribution_id} className="hover:bg-cream/50">
              <td className="px-4 py-3">
                <span className="font-mono tabular-nums text-textDark">
                  {d.payment_at ? d.payment_at.slice(0, 10) : "—"}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-textMuted">
                  {d.distribution_id}
                </span>
              </td>
              {/* Both figures render verbatim from their decimal strings —
                  these are ledger values a reader may check against an explorer,
                  so they must not be reformatted through a float. */}
              <td className="px-4 py-3 text-right font-mono tabular-nums text-textDark">
                {d.amount_per_share ?? "—"}
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-textDark">
                {d.total_amount ?? "—"}
                {d.currency ? (
                  <span className="ml-1 text-[10px] text-textMuted">{d.currency}</span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                {d.block_number != null ? (
                  <a
                    href={blockUrl(network, d.block_number)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 font-mono tabular-nums text-xs text-medGreen underline-offset-2 hover:text-darkBg hover:underline"
                  >
                    #{d.block_number.toLocaleString()}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  <span className="font-mono text-xs text-textMuted">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <VerificationLinkBadge
                  status={d.reconciliation_status}
                  verification={d.verification}
                  notes={d.reconciliation_notes}
                  projectId={projectId}
                  compact
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

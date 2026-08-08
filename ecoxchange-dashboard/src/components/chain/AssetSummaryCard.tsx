import { CopyableDid } from "./CopyableDid.js";
import { identityUrl } from "./did.js";
import type { ChainAssetSummary } from "../../types/chain.js";

/**
 * Spec 18 § 2.8 — ticker, total supply, holder count, issuer DID, network badge.
 *
 * "Monospace throughout; this is a technical artifact and should read as one."
 */
export function AssetSummaryCard({
  asset,
  holderCount,
}: {
  asset: ChainAssetSummary;
  holderCount: number;
}) {
  const testnet = asset.network === "testnet";

  return (
    <div className="rounded-none border border-darkBg/10 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-lg font-semibold tracking-wide text-darkBg">
            {asset.ticker ?? asset.asset_id}
          </h2>
          <p className="mt-0.5 text-sm text-textMuted">
            {asset.asset_name ?? "Polymesh asset"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NetworkBadge network={asset.network} />
          <SyncBadge status={asset.sync_status} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Total Supply">
          {/* Rendered verbatim from the decimal string. Passing it through
              toLocaleString would mean parsing to a float first, which is the
              precision loss this column exists to avoid. */}
          {asset.total_supply ?? "—"}
        </Field>
        <Field label="Holders">{holderCount.toLocaleString()}</Field>
        <Field label="Divisible">
          {asset.is_divisible == null ? "—" : asset.is_divisible ? "Yes" : "No"}
        </Field>
        <Field label="Decimals">{asset.decimals ?? 6}</Field>
      </dl>

      <div className="mt-4 border-t border-paleGreen/60 pt-4">
        <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-olive">
          Issuer DID
        </dt>
        <dd className="mt-1">
          {asset.issuer_did ? (
            <span className="inline-flex items-center gap-3">
              <CopyableDid did={asset.issuer_did} />
              <a
                href={identityUrl(asset.network, asset.issuer_did)}
                target="_blank"
                rel="noreferrer noopener"
                className="font-mono text-[11px] text-medGreen underline-offset-2 hover:text-darkBg hover:underline"
              >
                View on Polymesh explorer
              </a>
            </span>
          ) : (
            <span className="font-mono text-[11px] text-textMuted">—</span>
          )}
        </dd>
      </div>

      {testnet ? (
        <p className="mt-4 border-t border-paleGreen/60 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-flagAmber">
          § Testnet asset — not a live security
        </p>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-olive">
        {label}
      </dt>
      <dd className="mt-1 font-mono tabular-nums text-textDark">{children}</dd>
    </div>
  );
}

function NetworkBadge({ network }: { network: "testnet" | "mainnet" }) {
  const testnet = network === "testnet";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${
        testnet ? "bg-amber-50 text-flagAmber" : "bg-paleGreen/60 text-darkBg"
      }`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${testnet ? "bg-flagAmber" : "bg-accentBrt"}`}
      />
      Polymesh {network}
    </span>
  );
}

function SyncBadge({ status }: { status: ChainAssetSummary["sync_status"] }) {
  const meta = {
    ok: { text: "text-medGreen", dot: "bg-accentBrt", label: "Synced" },
    pending: { text: "text-textMuted", dot: "bg-gray-400", label: "Pending" },
    error: { text: "text-statusError", dot: "bg-statusError", label: "Sync error" },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] ${meta.text}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

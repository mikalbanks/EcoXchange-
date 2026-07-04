import { useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, ExternalLink } from "lucide-react";
import { activeNetwork } from "../../config/contracts.js";

// Demo wallet state (Spec 03 §3.1). When Privy lands, this becomes real wallet
// state; the visual contract stays identical. Balances mirror the canonical
// demo dataset (100 ESN Savannah Solar I holding, $10,000 cost basis).
const DEMO_WALLET = {
  address: "0xDe302026a11B04D35C0FfEE00000000000001234",
  shortLabel: "0xDemo…1234",
  esnBalance: "100 ESN · Savannah Solar I",
  usdcBalance: "$4,248.00 USDC",
};

/**
 * Header wallet status chip: green dot + truncated address (mono). Click opens
 * a dropdown with the full address (copy), network, token balances, and a
 * BaseScan link. Demo mode is clearly labeled — no wallet connection exists
 * or is requested (the explorer/platform is read-only).
 */
export function WalletIndicator() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
    };
  }, [open]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_WALLET.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — no-op.
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Wallet status"
        className="inline-flex min-h-[36px] items-center gap-2 rounded-full bg-paleGreen/20 px-2.5 py-0.5 text-xs font-medium text-paleGreen hover:bg-paleGreen/30"
      >
        <span aria-hidden className="h-2 w-2 rounded-full bg-accentBrt" />
        <span className="font-mono">{DEMO_WALLET.shortLabel}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 border border-paleGreen/40 bg-white p-4 shadow-lg">
          <p className="font-mono text-[10px] uppercase tracking-wider text-textMuted">
            Demo Wallet
          </p>
          <div className="mt-2 flex items-center gap-2 border border-darkBg/10 bg-cream p-2">
            <code className="flex-1 truncate font-mono text-[11px] text-textDark">
              {DEMO_WALLET.address}
            </code>
            <button
              type="button"
              onClick={copyAddress}
              aria-label="Copy wallet address"
              className="inline-flex min-h-[32px] items-center gap-1 px-1.5 text-xs font-medium text-medGreen hover:text-darkBg"
            >
              <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-textMuted">Network</dt>
              <dd className="font-mono text-textDark">{activeNetwork.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-textMuted">ESN balance</dt>
              <dd className="font-mono tabular-nums text-textDark">
                {DEMO_WALLET.esnBalance}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-textMuted">USDC received</dt>
              <dd className="font-mono tabular-nums text-textDark">
                {DEMO_WALLET.usdcBalance}
              </dd>
            </div>
          </dl>

          <a
            href={`${activeNetwork.explorerUrl}/address/${DEMO_WALLET.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-[0.06em] text-medGreen hover:text-darkBg"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View on BaseScan
          </a>
        </div>
      ) : null}
    </div>
  );
}

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { shortDid } from "./did.js";

/**
 * A truncated DID with copy-to-clipboard, following the address treatment in
 * `explorer/ContractCard.tsx`. The full DID is always available via the title
 * attribute and the clipboard — truncation is a display concern only.
 */
export function CopyableDid({
  did,
  className = "",
}: {
  did: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(did);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — no-op.
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <code
        title={did}
        className="font-mono text-[11px] tabular-nums text-textDark"
      >
        {shortDid(did)}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "DID copied" : `Copy DID ${did}`}
        className="text-textMuted transition-colors duration-150 hover:text-darkBg"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-accentBrt" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </span>
  );
}

import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { activeNetwork } from "../../config/contracts.js";
import { formatTimeAgo } from "../../utils/formatters.js";

const POLL_MS = 30_000;
const LAG_MS = 60_000;

type Health = "connected" | "lagging" | "disconnected";

/**
 * Tiny settlement-chain liveness indicator for the page footer (Spec 03 §3.2):
 * "⚡ Base Sepolia · Block 14,523,891 · 2s ago". Plain JSON-RPC fetch (no viem)
 * so it adds nothing to the entry bundle. Green when fresh, amber when the
 * last successful poll is >60s old, red when unreachable.
 */
export function ChainHeartbeat() {
  const [block, setBlock] = useState<number | null>(null);
  const [lastSuccess, setLastSuccess] = useState<Date | null>(null);
  const [health, setHealth] = useState<Health>("disconnected");
  const [pulse, setPulse] = useState(0);
  const prevBlock = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(activeNetwork.rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1,
          }),
        });
        const data = await res.json();
        if (cancelled || !data.result) throw new Error("no result");
        const next = parseInt(data.result, 16);
        if (prevBlock.current !== null && next > prevBlock.current) {
          setPulse((n) => n + 1); // re-trigger the ⚡ pulse animation
        }
        prevBlock.current = next;
        setBlock(next);
        setLastSuccess(new Date());
        setHealth("connected");
      } catch {
        if (!cancelled) {
          setHealth((prev) => (prev === "disconnected" ? "disconnected" : "lagging"));
        }
      }
    }

    void poll();
    const interval = setInterval(poll, POLL_MS);
    const lagCheck = setInterval(() => {
      setLastSuccess((last) => {
        if (last && Date.now() - last.getTime() > LAG_MS) {
          setHealth((prev) => (prev === "connected" ? "lagging" : prev));
        }
        return last;
      });
    }, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(lagCheck);
    };
  }, []);

  const color =
    health === "connected"
      ? "text-accentBrt"
      : health === "lagging"
        ? "text-statusFlagged"
        : "text-statusError";

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-textMuted">
      <Zap
        key={pulse}
        className={`h-3 w-3 ${color} ${pulse > 0 ? "animate-heartbeat-pulse" : ""}`}
        aria-hidden
      />
      {activeNetwork.name.replace(" (Testnet)", "")}
      <span aria-hidden>·</span>
      Block {block !== null ? block.toLocaleString() : "—"}
      {lastSuccess ? (
        <>
          <span aria-hidden>·</span>
          {formatTimeAgo(lastSuccess)}
        </>
      ) : null}
      {activeNetwork.isTestnet ? (
        <span className="text-flagAmber uppercase tracking-wider">Testnet</span>
      ) : null}
    </span>
  );
}

import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { activeNetwork } from "../../config/contracts.js";
import { formatTimeAgo } from "../../utils/formatters.js";

const POLL_MS = 30_000;

const client = createPublicClient({
  transport: http(activeNetwork.rpcUrl),
});

/**
 * Live network liveness bar: chain name + ID, latest block (30s poll via
 * public RPC), and an unmissable TESTNET badge. Degrades to a red
 * "disconnected" state when the RPC is unreachable — never breaks the page.
 */
export function NetworkStatus() {
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchBlock() {
      try {
        const block = await client.getBlockNumber();
        if (cancelled) return;
        setBlockNumber(block);
        setLastUpdated(new Date());
        setIsConnected(true);
      } catch {
        if (!cancelled) setIsConnected(false);
      }
    }

    void fetchBlock();
    const interval = setInterval(fetchBlock, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accentBrt/20 bg-darkBg p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`h-2.5 w-2.5 rounded-full ${
            isConnected ? "bg-accentBrt animate-pulse" : "bg-red-400"
          }`}
        />
        <div>
          <p className="font-mono text-xs font-medium text-paleGreen">
            {activeNetwork.name}
          </p>
          <p className="font-mono text-[10px] text-lightGreen">
            Chain ID: {activeNetwork.chainId}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-mono text-xs text-paleGreen tabular-nums">
          Block: {blockNumber !== null ? blockNumber.toLocaleString() : "—"}
        </p>
        <p className="flex items-center justify-end gap-1.5 font-mono text-[10px] text-lightGreen">
          {isConnected && lastUpdated ? (
            `Updated ${formatTimeAgo(lastUpdated)}`
          ) : isConnected ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-paleGreen animate-pulse" aria-hidden />
              Connecting
            </>
          ) : (
            "RPC unreachable"
          )}
        </p>
      </div>

      {activeNetwork.isTestnet ? (
        <div className="border border-flagAmber/40 bg-flagAmber/15 px-3 py-1 rounded">
          <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-flagAmber">
            Testnet
          </span>
        </div>
      ) : null}
    </div>
  );
}

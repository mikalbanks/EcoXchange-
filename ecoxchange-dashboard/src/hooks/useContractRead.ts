import { useEffect, useState } from "react";
import { useCompliance } from "../compliance/ComplianceProvider.js";
import { activeNetwork, isDeployed } from "../config/contracts.js";
import { demoContractState } from "../data/demo-contract-state.js";

export interface ContractReadResult {
  functionName: string;
  result: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Read-only contract state. Demo compliance mode resolves against the
 * simulated demoContractState map; live mode calls the chain via viem
 * readContract (only meaningful once real contracts are deployed — until
 * then live reads degrade gracefully to an em dash).
 */
export function useContractRead(
  contractAddress: string,
  functionName: string,
): ContractReadResult {
  const { isDemo } = useCompliance();
  const [live, setLive] = useState<{ result: string; isLoading: boolean; error: string | null }>({
    result: "—",
    isLoading: !isDemo,
    error: null,
  });

  useEffect(() => {
    if (isDemo || !isDeployed(contractAddress)) return;
    let cancelled = false;

    (async () => {
      try {
        const { createPublicClient, http, parseAbi } = await import("viem");
        const client = createPublicClient({ transport: http(activeNetwork.rpcUrl) });
        // Zero-arg view functions only (name(), totalSupply(), …); anything
        // else stays demo-state-driven until the live ABI wiring lands.
        const bare = functionName.replace(/\(\)$/, "");
        if (bare === functionName) {
          if (!cancelled) setLive({ result: "—", isLoading: false, error: null });
          return;
        }
        const abi = parseAbi([`function ${bare}() view returns (string)`]);
        const value = await client.readContract({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: bare,
        });
        if (!cancelled) setLive({ result: String(value), isLoading: false, error: null });
      } catch (err) {
        if (!cancelled) {
          setLive({ result: "—", isLoading: false, error: String(err).slice(0, 120) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isDemo, contractAddress, functionName]);

  if (isDemo) {
    return {
      functionName,
      result: demoContractState[contractAddress]?.[functionName] ?? "—",
      isLoading: false,
      error: null,
    };
  }

  return { functionName, ...live };
}

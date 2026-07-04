// Live execution path: real Base Sepolia transactions against the deployed
// DemoOracleBridge / DemoDistributor (contracts/ package at the repo root).
//
// Only reachable when isLiveDistributionEnabled() — i.e. real contract
// addresses in config AND VITE_DISTRIBUTION_SIGNER_KEY set at build time.
// That key is baked into the bundle: it must ONLY ever be a throwaway
// zero-value testnet key (see contracts/README.md). viem is dynamically
// imported so it stays out of the entry bundle.

import { activeNetwork } from "../../config/contracts.js";
import { DEMO_ORACLE_BRIDGE_ABI, DEMO_DISTRIBUTOR_ABI } from "../../config/abis.js";
import { DEMO_HOLDERS } from "../../data/demo-wallets.js";
import type { DEMO_DISTRIBUTION } from "./executor.js";

type DemoScenario = typeof DEMO_DISTRIBUTION;

async function getClients() {
  const [{ createPublicClient, createWalletClient, http, defineChain }, { privateKeyToAccount }] =
    await Promise.all([import("viem"), import("viem/accounts")]);

  const key = import.meta.env.VITE_DISTRIBUTION_SIGNER_KEY;
  if (!key) throw new Error("VITE_DISTRIBUTION_SIGNER_KEY not configured");

  const chain = defineChain({
    id: activeNetwork.chainId,
    name: activeNetwork.name,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [activeNetwork.rpcUrl] } },
    blockExplorers: { default: { name: "BaseScan", url: activeNetwork.explorerUrl } },
    testnet: activeNetwork.isTestnet,
  });

  const account = privateKeyToAccount(key as `0x${string}`);
  const publicClient = createPublicClient({ chain, transport: http() });
  const walletClient = createWalletClient({ account, chain, transport: http() });
  return { publicClient, walletClient, account };
}

async function executeWrite(
  address: string,
  abiStrings: readonly string[],
  functionName: string,
  args: unknown[],
): Promise<{ txHash: string; blockNumber: number; gasUsed: string }> {
  const { parseAbi } = await import("viem");
  const { publicClient, walletClient, account } = await getClients();

  const hash = await walletClient.writeContract({
    address: address as `0x${string}`,
    abi: parseAbi(abiStrings as string[]),
    functionName,
    args,
    account,
    chain: walletClient.chain,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`Transaction reverted: ${hash}`);
  }
  return {
    txHash: hash,
    blockNumber: Number(receipt.blockNumber),
    gasUsed: receipt.gasUsed.toLocaleString("en-US"),
  };
}

export async function runLiveOracleWrite(scenario: DemoScenario) {
  return executeWrite(
    activeNetwork.contracts.oracleBridge,
    DEMO_ORACLE_BRIDGE_ABI,
    "writeVerifiedProduction",
    [
      BigInt(scenario.periodStartUnix),
      BigInt(scenario.verifiedKwh),
      BigInt(scenario.expectedKwh),
      BigInt(scenario.deviationBps),
      scenario.engineVersion,
      scenario.verdict,
    ],
  );
}

export async function runLiveDistribution(scenario: DemoScenario) {
  const { parseUnits } = await import("viem");
  return executeWrite(
    activeNetwork.contracts.distributionContract,
    DEMO_DISTRIBUTOR_ABI,
    "distribute",
    [
      DEMO_HOLDERS.map((h) => h.address as `0x${string}`),
      DEMO_HOLDERS.map((h) => BigInt(h.shareBps)),
      parseUnits(String(scenario.totalPoolUsd), 6),
      BigInt(scenario.periodStartUnix),
    ],
  );
}

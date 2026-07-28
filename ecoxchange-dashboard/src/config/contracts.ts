// Smart Contract Explorer network configuration (Spec 08).
//
// LEGACY, PENDING POLYMATH MIGRATION. Product copy now describes ST-20 tokens
// on Polymesh via the Polymath Capital Platform, but this module and the live
// plumbing it feeds (ChainHeartbeat, the distribution simulation's block reads,
// the BaseScan links) still talk to Base Sepolia over EVM JSON-RPC. Polymesh is
// not EVM-compatible, so renaming the chain here would leave an integration
// claiming Polymesh while calling Base RPC. Anything reading this config
// therefore keeps saying "Base Sepolia", because that is where it is actually
// pointed. Migrate the integration first, then the labels.
//
// The demo runs against Base Sepolia (testnet). Switching to mainnet when
// contracts deploy is a single env change: VITE_NETWORK=base-mainnet.
//
// NOTE: the Base Sepolia contract addresses below are SIMULATED placeholders —
// realistic-format addresses so copy/links/truncation demo correctly, clearly
// labeled as simulated in the explorer UI. No EcoXchange contracts are deployed
// yet; when they are, replace the addresses here and nothing else changes.
// The USDC addresses are the real Circle deployments.

export type NetworkConfig = {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  isTestnet: boolean;
  contracts: {
    token: string;
    identityRegistry: string;
    complianceModule: string;
    distributionContract: string;
    oracleBridge: string;
    usdc: string;
  };
};

export const networks: Record<string, NetworkConfig> = {
  "base-sepolia": {
    name: "Base Sepolia (Testnet)",
    chainId: 84532,
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    isTestnet: true,
    contracts: {
      // SIMULATED demo addresses (valid hex format, not deployed) — see note above.
      token: "0xE5C0000000000000000000000000000000000001",
      identityRegistry: "0xE5C0000000000000000000000000000000000002",
      complianceModule: "0xE5C0000000000000000000000000000000000003",
      distributionContract: "0xE5C0000000000000000000000000000000000004",
      oracleBridge: "0xE5C0000000000000000000000000000000000005",
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC (Circle)
    },
  },
  "base-mainnet": {
    name: "Base (Mainnet)",
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    isTestnet: false,
    contracts: {
      token: "", // NOT YET DEPLOYED
      identityRegistry: "",
      complianceModule: "",
      distributionContract: "",
      oracleBridge: "",
      usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet USDC
    },
  },
};

export const activeNetwork: NetworkConfig =
  networks[import.meta.env.VITE_NETWORK || "base-sepolia"] ??
  networks["base-sepolia"];

/** A contract counts as deployed when the config carries a non-empty address. */
export function isDeployed(address: string): boolean {
  return address.length > 0;
}

/**
 * The Spec-08 placeholder convention: pre-deployment addresses use the
 * 0xE5C0… sentinel prefix so they format/copy/link realistically while being
 * distinguishable from real deployments. Anything with this prefix must never
 * be the target of a real transaction.
 */
export function isSimulatedAddress(address: string): boolean {
  return address.toLowerCase().startsWith("0xe5c0");
}

/**
 * Live on-chain execution for the distribution simulation requires BOTH real
 * (non-sentinel) contract addresses AND a build-time signer key. The key is
 * baked into the shipped bundle, so it must only ever be a throwaway
 * zero-value Base Sepolia demo key — see contracts/README.md.
 */
export function isLiveDistributionEnabled(): boolean {
  const { oracleBridge, distributionContract } = activeNetwork.contracts;
  return (
    isDeployed(oracleBridge) &&
    isDeployed(distributionContract) &&
    !isSimulatedAddress(oracleBridge) &&
    !isSimulatedAddress(distributionContract) &&
    Boolean(import.meta.env.VITE_DISTRIBUTION_SIGNER_KEY)
  );
}

/** Truncate an address for display: 0x1234…abcd */
export function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 8)}…${address.slice(-4)}`;
}

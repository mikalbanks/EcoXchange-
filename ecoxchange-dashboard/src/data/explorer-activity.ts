// Demo on-chain activity for the Smart Contract Explorer (Spec 08).
// SIMULATED transactions — replace with eth_getLogs queries once the
// EcoXchange contracts are actually deployed to Base Sepolia.

export type ActivityType =
  | "distribution"
  | "oracle_write"
  | "token_issue"
  | "identity_add"
  | "transfer";

export interface ChainActivity {
  txHash: string;
  type: ActivityType;
  from: string;
  to: string;
  value?: string;
  timestamp: Date;
  blockNumber: number;
  status: "confirmed" | "pending";
  /** Which explorer contracts this activity is relevant to (detail-page filter). */
  contracts: string[];
}

export const demoActivity: ChainActivity[] = [
  {
    txHash:
      "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
    type: "distribution",
    from: "Distribution Contract",
    to: "12 verified holders",
    value: "4,248.00 USDC",
    timestamp: new Date(Date.now() - 2 * 3600 * 1000),
    blockNumber: 14523891,
    status: "confirmed",
    contracts: ["distribution", "token"],
  },
  {
    txHash:
      "0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
    type: "oracle_write",
    from: "Chainlink Functions",
    to: "Oracle Bridge",
    value: "489,823 kWh (verified)",
    timestamp: new Date(Date.now() - 26 * 3600 * 1000),
    blockNumber: 14520142,
    status: "confirmed",
    contracts: ["oracle", "distribution"],
  },
  {
    txHash:
      "0x5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
    type: "token_issue",
    from: "SPV Admin",
    to: "Investor #12",
    value: "10 ESN ($1,000)",
    timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000),
    blockNumber: 14498721,
    status: "confirmed",
    contracts: ["token", "identity"],
  },
  {
    // Spec's sample hash contained non-hex characters; corrected to valid hex.
    txHash:
      "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    type: "identity_add",
    from: "Registry Admin",
    to: "Identity Registry",
    value: "Investor #12 verified",
    timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    blockNumber: 14472893,
    status: "confirmed",
    contracts: ["identity"],
  },
];

// Contract card definitions for the Smart Contract Explorer (Spec 08).
// Stats echo the canonical demo world (data/demo-offering.ts): 25,000 ESN at
// $100 (the demo investor's 100 ESN = 0.4%), 12 verified holders, the 12-month
// distribution total, engine v2.0.0.
import type { LucideIcon } from "lucide-react";
import { ArrowRightLeft, Coins, Radio, ShieldCheck } from "lucide-react";
import { activeNetwork, isDeployed } from "../config/contracts.js";
import { DEMO_OFFERING } from "./demo-offering.js";
import { formatUsd } from "../utils/formatters.js";

export type ContractStatus = "deployed" | "pending" | "not_deployed";

export interface ExplorerContract {
  id: string;
  title: string;
  standard: string;
  address: string;
  description: string;
  status: ContractStatus;
  icon: LucideIcon;
  stats: Array<{ label: string; value: string }>;
}

function statusOf(address: string): ContractStatus {
  return isDeployed(address) ? "deployed" : "not_deployed";
}

export const explorerContracts: ExplorerContract[] = [
  {
    id: "token",
    title: "ESN Token Contract",
    standard: "ERC-3643 (T-REX)",
    address: activeNetwork.contracts.token,
    description:
      "Fractional LLC membership interest token with compliance-enforced transfer restrictions. Each token represents a proportional ownership share in the project SPV.",
    status: statusOf(activeNetwork.contracts.token),
    icon: Coins,
    stats: [
      { label: "Total Supply", value: `${DEMO_OFFERING.total_tokens.toLocaleString("en-US")} ESN` },
      { label: "Holders", value: "12" },
      { label: "Min Investment", value: formatUsd(DEMO_OFFERING.minimum_investment_usd) },
      { label: "Token Price", value: formatUsd(DEMO_OFFERING.token_price_usd, true) },
    ],
  },
  {
    id: "identity",
    title: "Identity Registry",
    standard: "ONCHAINID",
    address: activeNetwork.contracts.identityRegistry,
    description:
      "On-chain registry of verified accredited investors. Only wallets with valid identity claims (KYC, accreditation, AML) can hold or receive ESN tokens. Enforced at the smart contract level.",
    status: statusOf(activeNetwork.contracts.identityRegistry),
    icon: ShieldCheck,
    stats: [
      { label: "Verified Investors", value: "12" },
      { label: "Claim Topics", value: "3" },
      { label: "KYC Provider", value: "Parallel Markets" },
      { label: "Last Verified", value: "Jun 28, 2026" },
    ],
  },
  {
    id: "distribution",
    title: "Distribution Contract",
    standard: "USDC / ERC-20",
    address: activeNetwork.contracts.distributionContract,
    description:
      "Automated pro-rata USDC distribution to all verified token holders. Triggered by oracle write confirming monthly verified production. Distributions execute simultaneously to all holder wallets.",
    status: statusOf(activeNetwork.contracts.distributionContract),
    icon: ArrowRightLeft,
    stats: [
      // Contract-wide totals across all 12 holders, not the demo investor's
      // position — 12 monthly pools at the canonical rate.
      { label: "Total Distributed", value: `${formatUsd(DEMO_OFFERING.offering_distributions.annual_total_usd)} USDC` },
      { label: "Distribution Count", value: "12" },
      { label: "Avg Monthly", value: `${formatUsd(DEMO_OFFERING.offering_distributions.monthly_total_usd)} USDC` },
      { label: "Settlement", value: "USDC on Base" },
    ],
  },
  {
    id: "oracle",
    title: "Oracle Bridge",
    standard: "CHAINLINK FUNCTIONS",
    address: activeNetwork.contracts.oracleBridge,
    description:
      "Writes production-verified kWh data on-chain via Chainlink Functions. Bridges the off-chain verification engine verdict to the on-chain distribution trigger. Each write is independently verifiable.",
    status: statusOf(activeNetwork.contracts.oracleBridge),
    icon: Radio,
    stats: [
      { label: "Oracle Writes", value: "12" },
      { label: "Engine Version", value: "v2.0.0" },
      { label: "Data Source", value: "3-source verified" },
      { label: "Last Write", value: "Jun 30, 2026" },
    ],
  },
];

export function getExplorerContract(id: string): ExplorerContract | undefined {
  return explorerContracts.find((c) => c.id === id);
}

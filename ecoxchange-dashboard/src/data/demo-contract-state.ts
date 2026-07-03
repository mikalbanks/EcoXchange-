// Simulated read-only contract state for the explorer detail views (Spec 08).
// In demo compliance mode useContractRead resolves against this map; in live
// mode (once contracts deploy) it calls the chain via viem readContract.
import { activeNetwork, shortAddress } from "../config/contracts.js";

export const demoContractState: Record<string, Record<string, string>> = {
  // Token contract
  [activeNetwork.contracts.token]: {
    "name()": "EcoXchange Solar Note — Savannah 5MW",
    "symbol()": "ESN-SAV-5MW",
    "totalSupply()": "500",
    "decimals()": "0",
    "owner()": "0xABCD…1234 (SPV Admin)",
    "paused()": "false",
    "frozen()": "false",
    "compliance()": shortAddress(activeNetwork.contracts.complianceModule),
    "identityRegistry()": shortAddress(activeNetwork.contracts.identityRegistry),
  },
  // Identity registry
  [activeNetwork.contracts.identityRegistry]: {
    "isVerified(0xInv1)": "true",
    "investorCount()": "12",
    "claimTopicsRequired()": "[KYC, ACCREDITATION, AML]",
    "isAgent(SPV Admin)": "true",
  },
  // Distribution contract
  [activeNetwork.contracts.distributionContract]: {
    "totalDistributed()": "4,248.00 USDC",
    "distributionCount()": "12",
    "lastDistribution()": "Jun 30, 2026",
    "pendingDistribution()": "0.00 USDC",
    "usdcToken()": shortAddress(activeNetwork.contracts.usdc),
    "tokenContract()": shortAddress(activeNetwork.contracts.token),
  },
  // Oracle bridge
  [activeNetwork.contracts.oracleBridge]: {
    "lastVerifiedPeriod()": "2024-12",
    "lastVerifiedKwh()": "489,823",
    "oracleWriteCount()": "12",
    "engineVersion()": "v2.0.0",
    "verificationStatus()": "VERIFIED",
  },
};

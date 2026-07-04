import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";

// DEPLOYER_PRIVATE_KEY must be a throwaway TESTNET-ONLY key with Base Sepolia
// ETH for gas. Never a key that holds real value; never committed (.env is
// gitignored at the repo root).
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
};

export default config;

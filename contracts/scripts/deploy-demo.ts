/**
 * Deploys the EcoXchange demo distribution stack to Base Sepolia.
 *
 * Sequence:
 *   1. Deploy DemoOracleBridge
 *   2. Deploy DemoDistributor(USDC, oracleBridge)
 *   3. Optionally fund the distributor with test USDC (FUND_USDC env, whole
 *      USDC units — the deployer must hold Circle faucet USDC)
 *   4. Write 12 months of verified 2024 production records (mirrors
 *      ecoxchange-dashboard/src/data/demo-savannah.json) to the oracle bridge
 *   5. Print the patch block for ecoxchange-dashboard/src/config/contracts.ts
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... npm run deploy:base-sepolia
 *
 * TESTNET ONLY. The deployer key must be a throwaway key holding only Base
 * Sepolia ETH (gas) and Circle test USDC. Faucets:
 *   ETH:  https://www.alchemy.com/faucets/base-sepolia
 *   USDC: https://faucet.circle.com (select Base Sepolia)
 */
import hre from "hardhat";
import { parseUnits, getAddress } from "viem";

// Circle test USDC on Base Sepolia (real deployment, 6 decimals).
const USDC_ADDRESS = getAddress("0x036CbD53842c5426634e7929541eC2318f3dCF7e");

// 12 months of verified Savannah 5MW production (2024), identical to the
// dashboard's canonical demo dataset. deviationBps is inverter-vs-expected.
const PRODUCTION_2024: Array<{ period: string; verifiedKwh: number; expectedKwh: number }> = [
  { period: "2024-01-01", verifiedKwh: 516016, expectedKwh: 516016 },
  { period: "2024-02-01", verifiedKwh: 546624, expectedKwh: 546624 },
  { period: "2024-03-01", verifiedKwh: 667163, expectedKwh: 667163 },
  { period: "2024-04-01", verifiedKwh: 836859, expectedKwh: 836859 },
  { period: "2024-05-01", verifiedKwh: 796045, expectedKwh: 796045 },
  { period: "2024-06-01", verifiedKwh: 858953, expectedKwh: 858953 },
  { period: "2024-07-01", verifiedKwh: 795158, expectedKwh: 795158 },
  { period: "2024-08-01", verifiedKwh: 776243, expectedKwh: 776243 },
  { period: "2024-09-01", verifiedKwh: 611196, expectedKwh: 611196 },
  { period: "2024-10-01", verifiedKwh: 721974, expectedKwh: 721974 },
  { period: "2024-11-01", verifiedKwh: 486701, expectedKwh: 486701 },
  { period: "2024-12-01", verifiedKwh: 489823, expectedKwh: 489823 },
];

const ENGINE_VERSION = "v2.0.0";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  if (!deployer) {
    throw new Error(
      "No deployer account. Set DEPLOYER_PRIVATE_KEY (throwaway testnet key) and retry."
    );
  }
  const publicClient = await hre.viem.getPublicClient();
  console.log(`Deployer: ${deployer.account.address}`);
  console.log(`Network:  ${hre.network.name} (chainId ${publicClient.chain?.id})`);

  // 1. Oracle bridge
  const oracleBridge = await hre.viem.deployContract("DemoOracleBridge");
  console.log(`DemoOracleBridge:  ${oracleBridge.address}`);

  // 2. Distributor
  const distributor = await hre.viem.deployContract("DemoDistributor", [
    USDC_ADDRESS,
    oracleBridge.address,
  ]);
  console.log(`DemoDistributor:   ${distributor.address}`);

  // 3. Optional USDC funding
  const fundUsdc = process.env.FUND_USDC;
  if (fundUsdc) {
    const usdc = await hre.viem.getContractAt("MockUSDC", USDC_ADDRESS); // ERC-20 ABI superset
    const amount = parseUnits(fundUsdc, 6);
    const hash = await usdc.write.transfer([distributor.address, amount]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Funded distributor with ${fundUsdc} USDC (tx ${hash})`);
  } else {
    console.log("FUND_USDC not set — skipping funding (transfer test USDC manually).");
  }

  // 4. Seed 12 months of oracle records
  for (const row of PRODUCTION_2024) {
    const periodStart = BigInt(Math.floor(Date.parse(`${row.period}T00:00:00Z`) / 1000));
    const hash = await oracleBridge.write.writeVerifiedProduction([
      periodStart,
      BigInt(row.verifiedKwh),
      BigInt(row.expectedKwh),
      0n, // inverter-vs-expected deviation: 0.0% across the verified demo year
      ENGINE_VERSION,
      "VERIFIED",
    ]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Oracle record ${row.period}: ${row.verifiedKwh} kWh (tx ${hash})`);
  }

  // 5. contracts.ts patch block
  console.log(`
── Paste into ecoxchange-dashboard/src/config/contracts.ts (base-sepolia) ──
      oracleBridge: "${oracleBridge.address}",
      distributionContract: "${distributor.address}",
────────────────────────────────────────────────────────────────────────────
Then set VITE_DISTRIBUTION_SIGNER_KEY (same throwaway testnet key) at build
time to enable live-mode execution in the dashboard.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

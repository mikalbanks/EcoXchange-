# EcoXchange Demo Distribution Contracts

**TESTNET ONLY.** Simplified demo contracts for the EcoXchange distribution
simulation on **Base Sepolia** (chain id 84532). These are *not* the
production ERC-3643 distribution mechanism — they exist so the demo can show
the verification → oracle → USDC-settlement loop with real testnet
transactions and real BaseScan links.

| Contract | Purpose |
|---|---|
| `DemoOracleBridge` | Owner writes verification-engine output (verified kWh, deviation, verdict) on-chain. Production equivalent: Chainlink Functions consumer. |
| `DemoDistributor` | Holds Circle test USDC; `distribute()` pays it pro-rata (basis-point shares summing to 10000) to holder wallets. |
| `mocks/MockUSDC` | 6-decimal ERC-20 used only by the local test suite. |

USDC on Base Sepolia is Circle's real test deployment:
`0x036CbD53842c5426634e7929541eC2318f3dCF7e`.

## Setup

```bash
cd contracts
npm install
npm run compile
npm test
```

## Deploy to Base Sepolia

Prerequisites — a **throwaway, testnet-only** deployer key holding:

- Base Sepolia ETH for gas — https://www.alchemy.com/faucets/base-sepolia
- Circle test USDC — https://faucet.circle.com (select Base Sepolia)

```bash
DEPLOYER_PRIVATE_KEY=0x... FUND_USDC=17700 npm run deploy:base-sepolia
```

The script deploys both contracts, optionally funds the distributor, seeds
12 months of verified 2024 Savannah production records, and prints the
address block to paste into
`ecoxchange-dashboard/src/config/contracts.ts`. After that, build the
dashboard with `VITE_DISTRIBUTION_SIGNER_KEY` set (same throwaway key) and
the `/distribute` simulation executes real testnet transactions instead of
simulated ones.

## Security posture

- `DEPLOYER_PRIVATE_KEY` / `VITE_DISTRIBUTION_SIGNER_KEY` must **never** hold
  real value and must never be committed. A Vite env var is baked into the
  shipped JS bundle — that is acceptable only because the key is a
  zero-value testnet demo key. The production-shaped replacement is a
  server-side relayer.
- Both contracts are `Ownable` with owner-only writes; `withdraw()` lets the
  owner recover leftover test USDC.

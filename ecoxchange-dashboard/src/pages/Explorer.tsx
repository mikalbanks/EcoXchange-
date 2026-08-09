import { NetworkStatus } from "../components/explorer/NetworkStatus.js";
import { ContractCard } from "../components/explorer/ContractCard.js";
import { ActivityFeed } from "../components/explorer/ActivityFeed.js";
import { DataSourceAttribution } from "../compliance/components/DataSourceAttribution.js";
import { SectionTag } from "../components/ui/SectionTag.js";
import { explorerContracts } from "../data/explorer-contracts.js";
import { demoActivity } from "../data/explorer-activity.js";
import { ENGINE_VERSION } from "../config/engine.js";

/**
 * Smart Contract Explorer (Spec 08).
 *
 * Superseded for Polymesh by Spec 18 § 2.8 (src/pages/ChainView.tsx), which
 * reads the public Polymesh ledger. This page is unchanged and still works: it
 * describes the Base Sepolia demo contracts, which are real testnet artifacts
 * and remain useful demo material. Two chains, two pages, each labelled with the
 * one it actually talks to.
 *
 * A read-only, purpose-built view of
 * EcoXchange's ST-20 contract system (demo contracts still on Base Sepolia —
 * see config/contracts.ts). Not a block explorer — a
 * transparency tool. No wallet connection required or requested.
 */
export function Explorer() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <SectionTag>Smart Contract Infrastructure</SectionTag>
        <h1 className="font-heading text-3xl text-darkBg">
          On-Chain Infrastructure
        </h1>
        <p className="mt-1 text-textMuted">
          On-chain transparency for EcoXchange Solar Notes
        </p>
      </div>

      <NetworkStatus />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {explorerContracts.map((contract) => (
          <ContractCard key={contract.id} contract={contract} />
        ))}
      </div>

      <div>
        <h2 className="mb-3 font-heading text-xl text-darkBg">
          Recent On-Chain Activity
        </h2>
        <ActivityFeed activity={demoActivity} />
        <DataSourceAttribution
          sources={[
            { name: "Base Sepolia RPC", type: "public_data" },
            { name: "Simulated contract activity (pre-deployment)", type: "model" },
          ]}
          engineVersion={ENGINE_VERSION}
        />
      </div>
    </div>
  );
}

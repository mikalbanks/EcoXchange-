import { NetworkStatus } from "../components/explorer/NetworkStatus.js";
import { ContractCard } from "../components/explorer/ContractCard.js";
import { ActivityFeed } from "../components/explorer/ActivityFeed.js";
import { DataSourceAttribution } from "../compliance/components/DataSourceAttribution.js";
import { SectionTag } from "../components/ui/SectionTag.js";
import { explorerContracts } from "../data/explorer-contracts.js";
import { demoActivity } from "../data/explorer-activity.js";

/**
 * Smart Contract Explorer (Spec 08): a read-only, purpose-built view of
 * EcoXchange's ERC-3643 contract system on Base. Not a block explorer — a
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
          engineVersion="v2.0.0"
        />
      </div>
    </div>
  );
}

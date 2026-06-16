import { ImpactStatCard } from "./ImpactStatCard.js";
import { fmtInt, fmtHomes, fmtTrees } from "./format.js";
import type { ImpactMetrics } from "../../types/impact.js";

// Four headline equivalencies: CO2 avoided, homes powered, trees, phone charges.
export function ImpactStatGrid({ impact }: { impact: ImpactMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ImpactStatCard
        icon="🌍"
        value={impact.co2_avoided_kg}
        format={(n) => fmtInt(n)}
        label="kg CO₂"
        unit="avoided"
      />
      <ImpactStatCard
        icon="🏠"
        value={impact.homes_powered_years}
        format={fmtHomes}
        label="Homes Powered"
        unit="for 1 year"
      />
      <ImpactStatCard
        icon="🌳"
        value={impact.trees_equivalent}
        format={fmtTrees}
        label="Trees Planted"
        unit="equivalent"
      />
      <ImpactStatCard
        icon="📱"
        value={impact.smartphone_charges}
        format={(n) => fmtInt(n)}
        label="Phone Charges"
        unit="equivalent"
      />
    </div>
  );
}

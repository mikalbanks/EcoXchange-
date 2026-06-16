import { StatCard } from "../StatCard.js";
import { AnimatedNumber } from "../shared/AnimatedNumber.js";
import { formatUsd } from "../../utils/formatters.js";
import type { DistributionSummary as Summary } from "../../types/distributions.js";

export function DistributionSummary({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Total Received"
        value={
          <AnimatedNumber
            value={summary.total_distributions_received}
            format={(n) => formatUsd(n, true)}
          />
        }
        sublabel="USDC, lifetime"
      />
      <StatCard
        label="Cashed Out"
        value={
          <AnimatedNumber
            value={summary.total_cashed_out}
            format={(n) => formatUsd(n, true)}
          />
        }
      />
      <StatCard
        label="Reinvested (DRIP)"
        value={
          <AnimatedNumber
            value={summary.total_reinvested}
            format={(n) => formatUsd(n, true)}
          />
        }
      />
    </div>
  );
}

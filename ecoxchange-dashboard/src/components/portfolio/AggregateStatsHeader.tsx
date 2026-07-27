// Platform-scale header stats for the multi-project overview (Spec 5):
// AUA, project count, investors, weighted yield, verification rate — all
// derived from the seed rows so the header can never contradict the cards.

import { StatCard } from "../StatCard.js";
import { AnimatedNumber } from "../shared/AnimatedNumber.js";
import type { PORTFOLIO_AGGREGATE } from "../../data/demo-projects.js";

type Aggregate = typeof PORTFOLIO_AGGREGATE;

export function AggregateStatsHeader({ aggregate }: { aggregate: Aggregate }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard
        label="Total AUA"
        value={
          <AnimatedNumber
            value={aggregate.aua_usd / 1_000_000}
            format={(n) => `$${n.toFixed(1)}M`}
            startOnView
          />
        }
        sublabel="assets under administration"
      />
      <StatCard
        label="Projects"
        value={
          <AnimatedNumber
            value={aggregate.active_projects}
            format={(n) => `${Math.round(n)}`}
            startOnView
          />
        }
        sublabel={
          aggregate.onboarding_projects > 0
            ? `active · ${aggregate.onboarding_projects} onboarding`
            : "active"
        }
      />
      <StatCard
        label="Investors"
        value={
          <AnimatedNumber
            value={aggregate.investors}
            format={(n) => `${Math.round(n)}`}
            startOnView
          />
        }
        sublabel="across all offerings"
      />
      <StatCard
        label="Verification Rate"
        value={
          <AnimatedNumber
            value={aggregate.verification_rate_pct}
            format={(n) => `${n.toFixed(1)}%`}
            startOnView
          />
        }
        sublabel={`${aggregate.months_verified}/${aggregate.months_total} months · ${aggregate.avg_yield_pct.toFixed(1)}% avg yield`}
      />
    </div>
  );
}

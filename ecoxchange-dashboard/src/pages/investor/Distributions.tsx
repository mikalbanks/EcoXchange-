import { useCallback, useEffect, useState } from "react";
import {
  getDistributionSummary,
  getInvestorHoldings,
  DEMO_INVESTOR_ID,
} from "../../data/distributions.js";
import { DistributionSummary } from "../../components/distributions/DistributionSummary.js";
import { NextDistribution } from "../../components/distributions/NextDistribution.js";
import { DistributionCard } from "../../components/distributions/DistributionCard.js";
import { DistributionHistory } from "../../components/distributions/DistributionHistory.js";
import { ErrorState } from "../../components/shared/ErrorState.js";
import { CardSkeleton } from "../../components/shared/LoadingState.js";
import type {
  DistributionSummary as Summary,
  InvestorHolding,
} from "../../types/distributions.js";

function receivedForOffering(summary: Summary, offeringId: string): number {
  return summary.distribution_history
    .filter((r) => r.offering_id === offeringId && r.status === "completed")
    .reduce((s, r) => s + r.net_distribution, 0);
}

export function Distributions() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [holdings, setHoldings] = useState<InvestorHolding[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(() => {
    setStatus("loading");
    Promise.all([
      getDistributionSummary(DEMO_INVESTOR_ID),
      getInvestorHoldings(DEMO_INVESTOR_ID),
    ])
      .then(([s, h]) => {
        setSummary(s);
        setHoldings(h);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(load, [load]);

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }
  if (status === "error" || !summary) return <ErrorState onRetry={load} />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl text-darkBg">Distribution History</h1>
        <p className="mt-1 text-textMuted">
          Your monthly USDC distributions and reinvestment preferences.
        </p>
      </header>

      <DistributionSummary summary={summary} />
      <NextDistribution
        amount={summary.next_estimated_distribution}
        date={summary.next_distribution_date}
      />

      {holdings.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-heading text-xl text-darkBg">
            Preferences by Holding
          </h2>
          {holdings.map((h) => (
            <DistributionCard
              key={h.id}
              holding={h}
              totalReceived={receivedForOffering(summary, h.offering_id)}
            />
          ))}
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-heading text-xl text-darkBg">All Distributions</h2>
        <DistributionHistory records={summary.distribution_history} />
      </section>
    </div>
  );
}

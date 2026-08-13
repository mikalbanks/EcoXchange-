import { useEffect, useState } from "react";
import {
  getDistributionSummary,
  getInvestorHoldings,
  DEMO_INVESTOR_ID,
} from "../../data/distributions.js";
import { DistributionCard } from "./DistributionCard.js";
import type {
  DistributionSummary,
  InvestorHolding,
} from "../../types/distributions.js";

// Self-loading "Holdings & Distributions" section embedded on the Portfolio page.
export function PortfolioDistributions() {
  const [holdings, setHoldings] = useState<InvestorHolding[]>([]);
  const [summary, setSummary] = useState<DistributionSummary | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getInvestorHoldings(DEMO_INVESTOR_ID),
      getDistributionSummary(DEMO_INVESTOR_ID),
    ])
      .then(([h, s]) => {
        if (!active) return;
        setHoldings(h);
        setSummary(s);
      })
      .catch(() => {
        /* non-critical section — stay quiet on the portfolio */
      });
    return () => {
      active = false;
    };
  }, []);

  if (holdings.length === 0 || !summary) return null;

  const received = (offeringId: string) =>
    summary.distribution_history
      .filter((r) => r.offering_id === offeringId && r.status === "completed")
      .reduce((s, r) => s + r.net_distribution, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl text-darkBg">Distributions</h2>
        <p className="mt-1 max-w-3xl text-sm text-textMuted">
          Distribution amounts are calculated after the monthly production
          determination is verified and all offering requirements are satisfied.
        </p>
      </div>
      {holdings.map((h) => (
        <DistributionCard
          key={h.id}
          holding={h}
          totalReceived={received(h.offering_id)}
        />
      ))}
    </div>
  );
}

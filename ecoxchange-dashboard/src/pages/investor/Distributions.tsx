import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDistributionSummary,
  getInvestorHoldings,
  DEMO_INVESTOR_ID,
} from "../../data/distributions.js";
import { DistributionSummary } from "../../components/distributions/DistributionSummary.js";
import { NextDistribution } from "../../components/distributions/NextDistribution.js";
import { DistributionCard } from "../../components/distributions/DistributionCard.js";
import { DistributionHistory } from "../../components/distributions/DistributionHistory.js";
import { CumulativeYieldChart } from "../../components/distributions/CumulativeYieldChart.js";
import { ErrorState } from "../../components/shared/ErrorState.js";
import { CardSkeleton } from "../../components/shared/LoadingState.js";
import { Button } from "../../components/ui/Button.js";
import {
  loadStoredRuns,
  type DistributionRun,
} from "../../lib/distribution/executor.js";
import { nextDistributionDate } from "../../utils/distributions-summary.js";
import type {
  DistributionRecord,
  DistributionSummary as Summary,
  InvestorHolding,
} from "../../types/distributions.js";

// Runs recorded by the /distribute simulation surface in the history table,
// labeled SIMULATED (their tx hashes are pre-deployment pseudo-hashes).
function runToRecord(run: DistributionRun): DistributionRecord {
  return {
    id: run.id,
    investor_id: DEMO_INVESTOR_ID,
    offering_id: "demo-offering-savannah-solar-i",
    offering_name: "Savannah Solar I ESN",
    period_start: `${run.period}-01`,
    period_end: `${run.period}-28`,
    gross_distribution: run.userShareUsd,
    platform_fee: 0,
    net_distribution: run.userShareUsd,
    action_taken: "cash_out",
    tokens_acquired: null,
    reinvest_price: null,
    tx_hash: run.distributionTxHash,
    status: "completed",
    created_at: run.completedAt.slice(0, 10),
    simulated: run.mode === "simulated",
  };
}

function daysUntilNextDistribution(): number {
  const next = new Date(`${nextDistributionDate()}T00:00:00`);
  return Math.max(0, Math.ceil((next.getTime() - Date.now()) / 86_400_000));
}

function receivedForOffering(summary: Summary, offeringId: string): number {
  return summary.distribution_history
    .filter((r) => r.offering_id === offeringId && r.status === "completed")
    .reduce((s, r) => s + r.net_distribution, 0);
}

export function Distributions() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [holdings, setHoldings] = useState<InvestorHolding[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [simRecords] = useState<DistributionRecord[]>(() =>
    loadStoredRuns().map(runToRecord),
  );

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

      {/* Countdown + live-loop CTA into the distribution simulation. */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border border-darkBg/10 bg-white px-5 py-4"
        data-testid="simulate-next-cta"
      >
        <p className="font-mono text-sm text-darkBg">
          Next distribution in{" "}
          <span className="font-semibold tabular-nums">{daysUntilNextDistribution()}</span>{" "}
          days — or run the full cycle now.
        </p>
        <Link to="/distribute">
          <Button variant="accent" size="sm">
            Simulate Next Distribution
          </Button>
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-darkBg">Cumulative Yield</h2>
        <div className="border border-darkBg/10 bg-white p-4">
          <CumulativeYieldChart
            records={[...simRecords, ...summary.distribution_history]}
          />
        </div>
      </section>

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
        <DistributionHistory
          records={[...simRecords, ...summary.distribution_history]}
        />
      </section>
    </div>
  );
}

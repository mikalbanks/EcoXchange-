/**
 * Smoke test for prospect waterfall (no test runner required).
 *   npx tsx scripts/test-queue-analytics.ts
 */
import assert from "node:assert/strict";
import { simulateProspectWaterfall, resolveQueuePpa } from "../server/services/queue-analytics-engine";

const wf = simulateProspectWaterfall({
  annualGrossRevenueUsd: 1_200_000,
  monthlyDebtServiceUsd: 30_000,
  monthlyOpexUsd: 10_000,
  reserveRate: 0.05,
});
assert.equal(Object.keys(wf.waterfallSummary).length, 5);
assert(wf.annualInvestorYieldUsd > 0);

const ppa = resolveQueuePpa("California", 34, -118, null);
assert(ppa.source === "CAISO_SP15_SPOT_PROXY" || ppa.source === "CAISO_NP15_SPOT_PROXY");
assert(ppa.usdPerKwh > 0);

const ppaTable = resolveQueuePpa("TX", 31, -100, { benchmarkUsdPerMwh: 70 });
assert(ppaTable.tableBenchmarkUsdPerMwh === 70);

console.log("queue-analytics smoke OK");

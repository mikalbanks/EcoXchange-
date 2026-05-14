/**
 * Pre-compute NSRDB-based production, market/jurisdiction PPA, and prospect waterfall
 * for interconnection queue rows (no ledger accounts required).
 */
import { randomUUID } from "crypto";
import {
  computeAnnualKwhNsrdb,
  computeFinancialApy,
  integrateIrradianceKwhPerM2,
  fetchNsrdbTimeSeries4km,
  type NsrdbTimeSeriesRow,
} from "../lib/nrel-engine";
import { resolveMarketPpaUsdPerKwh, type MarketPpaResolution } from "../lib/market-rates";
import { runBacktest, type BacktestSiteConfig } from "./backtest-engine";

const ENGINE_VERSION = "queue-analytics-1";
const DEFAULT_PR = 0.2;
const PLATFORM_FEE_RATE = 0.015;

export type ProspectWaterfallTier = {
  accountType: string;
  amount: number;
};

export interface ProspectWaterfallInput {
  annualGrossRevenueUsd: number;
  monthlyDebtServiceUsd: number;
  monthlyOpexUsd: number;
  reserveRate: number; // 0..1 of daily revenue
}

function monthLength(m: number): number {
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m] ?? 30;
}

/**
 * Same economic order as waterfall-engine computeWaterfall: debt, opex, reserves, platform fee, investor yield.
 * Returns 12 monthly rows with tier breakdown in USD.
 */
export function simulateProspectWaterfall(input: ProspectWaterfallInput): {
  waterfallSummary: Record<string, number>;
  monthlySeries: Array<{
    monthIndex: number;
    label: string;
    dailyRevenueUsd: number;
    days: number;
    grossRevenueUsd: number;
    tiers: ProspectWaterfallTier[];
  }>;
  annualInvestorYieldUsd: number;
} {
  const annual = input.annualGrossRevenueUsd;
  if (!Number.isFinite(annual) || annual <= 0) {
    return { waterfallSummary: {}, monthlySeries: [], annualInvestorYieldUsd: 0 };
  }

  const monthlyGross = annual / 12;
  const waterfallSummary: Record<string, number> = {
    DEBT_SERVICE: 0,
    OPEX_FUND: 0,
    RESERVES: 0,
    PLATFORM_FEE: 0,
    INVESTOR_YIELD: 0,
  };

  const monthlySeries: Array<{
    monthIndex: number;
    label: string;
    dailyRevenueUsd: number;
    days: number;
    grossRevenueUsd: number;
    tiers: ProspectWaterfallTier[];
  }> = [];

  for (let m = 0; m < 12; m++) {
    const days = monthLength(m);
    const dailyRevenue = monthlyGross / days;
    const gross = dailyRevenue * days;
    let remaining = gross;

    const dailyDebt = input.monthlyDebtServiceUsd / 30;
    const debtAmount = Math.min(remaining, dailyDebt * days);
    remaining -= debtAmount;
    const dailyOpex = input.monthlyOpexUsd / 30;
    const opexAmount = Math.min(remaining, dailyOpex * days);
    remaining -= opexAmount;
    const reserveTarget = dailyRevenue * input.reserveRate * days;
    const reserveAmount = Math.min(remaining, reserveTarget);
    remaining -= reserveAmount;
    const platformFee = Math.min(remaining, remaining * PLATFORM_FEE_RATE);
    remaining -= platformFee;
    const inv = Math.max(0, remaining);

    waterfallSummary.DEBT_SERVICE += debtAmount;
    waterfallSummary.OPEX_FUND += opexAmount;
    waterfallSummary.RESERVES += reserveAmount;
    waterfallSummary.PLATFORM_FEE += platformFee;
    waterfallSummary.INVESTOR_YIELD += inv;

    const label = new Date(Date.UTC(2024, m, 1)).toLocaleString("en-US", { month: "short" });
    monthlySeries.push({
      monthIndex: m,
      label,
      dailyRevenueUsd: Number(dailyRevenue.toFixed(4)),
      days,
      grossRevenueUsd: Number(gross.toFixed(2)),
      tiers: [
        { accountType: "DEBT_SERVICE", amount: Number(debtAmount.toFixed(2)) },
        { accountType: "OPEX_FUND", amount: Number(opexAmount.toFixed(2)) },
        { accountType: "RESERVES", amount: Number(reserveAmount.toFixed(2)) },
        { accountType: "PLATFORM_FEE", amount: Number(platformFee.toFixed(2)) },
        { accountType: "INVESTOR_YIELD", amount: Number(inv.toFixed(2)) },
      ],
    });
  }

  return {
    waterfallSummary,
    monthlySeries,
    annualInvestorYieldUsd: waterfallSummary.INVESTOR_YIELD,
  };
}

function defaultCapexAndOpex(capacityMw: number): { totalCapexUsd: number; monthlyOpexUsd: number; monthlyDebtUsd: number; reserveRate: number } {
  const capexPerW = 1.12;
  const totalCapexUsd = capacityMw * 1_000_000 * capexPerW;
  const monthlyOpexUsd = Math.max(500, capacityMw * 650);
  const debtRatio = 0.6;
  const years = 20;
  const annualDebtService = (totalCapexUsd * debtRatio) / years;
  const monthlyDebtUsd = annualDebtService / 12;
  return { totalCapexUsd, monthlyOpexUsd, monthlyDebtUsd, reserveRate: 0.05 };
}

export interface QueueEntryLike {
  id: string;
  state: string;
  capacityMW: string | null;
  latitude: string | null;
  longitude: string | null;
  isoCode: string;
}

export interface JurisdictionPpaRow {
  benchmarkUsdPerMwh: string | number;
  regionLabel?: string | null;
  sourceNote?: string | null;
}

/**
 * Pick benchmark: optional DB row by state+iso, else resolveMarketPpaUsdPerKwh.
 */
export function resolveQueuePpa(
  state: string,
  latitude: number | null,
  longitude: number | null,
  jurisdictionRow: JurisdictionPpaRow | null,
): MarketPpaResolution & { tableBenchmarkUsdPerMwh?: number } {
  if (jurisdictionRow) {
    const mwh = Number(jurisdictionRow.benchmarkUsdPerMwh);
    if (Number.isFinite(mwh) && mwh > 0) {
      return {
        usdPerKwh: mwh / 1000,
        source: "LEVELTEN_P25_PROXY",
        benchmarkUsdPerMwh: mwh,
        tableBenchmarkUsdPerMwh: mwh,
      };
    }
  }
  return resolveMarketPpaUsdPerKwh({
    state: state || "TX",
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
    fixedPpaRatePerKwh: null,
  });
}

export interface QueueAnalyticsResult {
  engineVersion: string;
  backtestSummary: Record<string, unknown>;
  annualKwhNsrdb: number;
  annualMwhModeled: number;
  ppaScenario: MarketPpaResolution & { annualGrossRevenueUsd: number; jurisdictionNote?: string | null };
  irrProxyPct: number | null;
  moicProxy: number | null;
  waterfallSummary: Record<string, number>;
  monthlyWaterfallSeries: ReturnType<typeof simulateProspectWaterfall>["monthlySeries"];
}

export async function computeQueueEntryAnalytics(
  entry: QueueEntryLike,
  options: { jurisdictionPpa?: JurisdictionPpaRow | null; skipSolcastBacktest?: boolean } = {},
): Promise<QueueAnalyticsResult> {
  const capMw = Number(entry.capacityMW ?? 0);
  if (!Number.isFinite(capMw) || capMw <= 0) {
    throw new Error("capacity_mw required for analytics");
  }
  const lat = entry.latitude != null ? Number(entry.latitude) : NaN;
  const lon = entry.longitude != null ? Number(entry.longitude) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("latitude/longitude required for NSRDB analytics");
  }

  const ppa = resolveQueuePpa(entry.state, lat, lon, options.jurisdictionPpa ?? null);
  const annualKwhNsrdb = await computeAnnualKwhNsrdb(lat, lon, capMw, DEFAULT_PR);
  const annualMwhModeled = annualKwhNsrdb / 1000;

  const { totalCapexUsd, monthlyOpexUsd, monthlyDebtUsd, reserveRate } = defaultCapexAndOpex(capMw);
  const annualGross = annualKwhNsrdb * ppa.usdPerKwh;

  const finApy = computeFinancialApy({
    annualKwh: annualKwhNsrdb,
    marketPpaUsdPerKwh: ppa.usdPerKwh,
    annualOmUsd: monthlyOpexUsd * 12,
    assetCapexUsd: totalCapexUsd,
  });
  const irrProxy = finApy != null ? finApy * 100 : null;
  const moic =
    finApy != null && finApy > 0
      ? 1 + finApy * 7
      : null;

  const wf = simulateProspectWaterfall({
    annualGrossRevenueUsd: annualGross,
    monthlyDebtServiceUsd: monthlyDebtUsd,
    monthlyOpexUsd,
    reserveRate,
  });

  let backtestSummary: Record<string, unknown> = {
    nsrdbAnnualKwh: annualKwhNsrdb,
    performanceRatio: DEFAULT_PR,
    capacityMw: capMw,
  };

  if (!options.skipSolcastBacktest && process.env.SOLCAST_API_KEY) {
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 30);
    const cfg: BacktestSiteConfig = {
      siteId: `queue-${entry.id}`,
      siteName: "Queue prospect",
      latitude: lat,
      longitude: lon,
      capacityKw: capMw * 1000,
      arrayType: "horizontal_single_axis",
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
    try {
      const report = await runBacktest(cfg);
      backtestSummary = {
        ...backtestSummary,
        backtestMae: report.statistics.mae,
        backtestRmse: report.statistics.rmse,
        backtestPassRate2Pct: report.statistics.passRate2Pct,
        backtestTotalEnergyMwh: report.statistics.totalEnergyMwh,
        satelliteSource: report.satelliteSource,
        confidenceScore: report.statistics.confidenceScore,
      };
    } catch {
      backtestSummary.solcastNote = "Solcast backtest skipped or failed";
    }
  } else {
    try {
      const ts = await fetchNsrdbTimeSeries4km(lat, lon, { year: new Date().getUTCFullYear() - 1 });
      const ghiKwhM2Yr = integrateIrradianceKwhPerM2(ts.rows as NsrdbTimeSeriesRow[], ts.intervalMinutes, "ghiWm2");
      backtestSummary = { ...backtestSummary, nsrdbGhiKwhPerM2Year: ghiKwhM2Yr, nsrdbYear: ts.year };
    } catch {
      backtestSummary.nsrdbGhiNote = "NSRDB GHI integration optional step failed";
    }
  }

  return {
    engineVersion: ENGINE_VERSION,
    backtestSummary,
    annualKwhNsrdb,
    annualMwhModeled: Number(annualMwhModeled.toFixed(3)),
    ppaScenario: {
      ...ppa,
      annualGrossRevenueUsd: Number(annualGross.toFixed(2)),
      jurisdictionNote: options.jurisdictionPpa?.sourceNote ?? null,
    },
    irrProxyPct: irrProxy,
    moicProxy: moic,
    waterfallSummary: wf.waterfallSummary,
    monthlyWaterfallSeries: wf.monthlySeries,
  };
}

export { ENGINE_VERSION as QUEUE_ANALYTICS_ENGINE_VERSION };

/** For tests: stable id */
export function newQueueAnalyticsCorrelationId(): string {
  return randomUUID();
}

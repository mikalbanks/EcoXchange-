import { storage } from "../storage";
import {
  resolvePpaForInterval,
  inferOfftakerClassFromProject,
  inferPlantUseFromProject,
} from "../lib/market-rates";
import { simulateProspectWaterfall } from "./queue-analytics-engine";
import type {
  InterconnectionQueueEntry,
  MarketplaceExternalLink,
  Project,
  QueueEntryAnalytics,
} from "@shared/schema";

export type FinancialConfidenceCode = "KNOWN" | "ESTIMATED" | "MARKET_PROXY";

export interface FinancialField<T> {
  value: T;
  confidence: FinancialConfidenceCode;
  source: string;
  asOf: string;
}

export interface MarketplaceListing {
  id: string;
  source: "PROJECT" | "QUEUE";
  name: string;
  state: string;
  county: string | null;
  technology: string | null;
  stage: string | null;
  capacityMW: number;
  capacityKw: FinancialField<number>;
  ppaPriceUsdPerKwh: FinancialField<number>;
  annualKwh: FinancialField<number>;
  annualGrossRevenueUsd: FinancialField<number>;
  monthlyDebtServiceUsd: FinancialField<number>;
  monthlyOpexUsd: FinancialField<number>;
  capexUsd: FinancialField<number>;
  irrProxyPct: FinancialField<number>;
  moicProxy: FinancialField<number>;
  annualInvestorYieldUsd: FinancialField<number>;
  externalLinks: MarketplaceExternalLink[];
  detailHref: string;
  evidenceHash?: string;
}

export interface MarketplaceListingDetail extends MarketplaceListing {
  summary: string | null;
  monthlySeries?: Array<{
    monthIndex: number;
    label: string;
    grossRevenueUsd: number;
    investorYieldUsd: number;
  }>;
}

const DEFAULT_OPEX_USD_PER_MW_MONTH = 1_250;
const DEFAULT_CAPEX_USD_PER_MW = 1_120_000;
const DEFAULT_RESERVE_RATE = 0.05;

function field<T>(
  value: T,
  confidence: FinancialConfidenceCode,
  source: string,
): FinancialField<T> {
  return { value, confidence, source, asOf: new Date().toISOString() };
}

function projectCapexUsd(
  totalCapex: string | null | undefined,
  capacityMW: number,
): FinancialField<number> {
  const known = Number(totalCapex ?? 0);
  if (known > 0) return field(known, "KNOWN", "capitalStacks.totalCapex");
  return field(capacityMW * DEFAULT_CAPEX_USD_PER_MW, "ESTIMATED", `industry_avg_${DEFAULT_CAPEX_USD_PER_MW}_per_MW`);
}

function projectMonthlyOpex(
  monthlyOpex: string | null | undefined,
  capacityMW: number,
): FinancialField<number> {
  const known = Number(monthlyOpex ?? 0);
  if (known > 0) return field(known, "KNOWN", "project.monthlyOpex");
  return field(
    capacityMW * DEFAULT_OPEX_USD_PER_MW_MONTH,
    "ESTIMATED",
    `industry_avg_${DEFAULT_OPEX_USD_PER_MW_MONTH}_per_MW_month`,
  );
}

function projectMonthlyDebt(monthlyDebtService: string | null | undefined): FinancialField<number> {
  const known = Number(monthlyDebtService ?? 0);
  if (known > 0) return field(known, "KNOWN", "project.monthlyDebtService");
  return field(0, "ESTIMATED", "no_debt_structure_known");
}

async function projectAnnualKwh(project: Project): Promise<FinancialField<number>> {
  // Prefer last 12 months of actual production records.
  const production = await storage.getProductionByProject(project.id);
  if (production.length > 0) {
    const since = new Date();
    since.setMonth(since.getMonth() - 12);
    const recent = production.filter((p) => p.periodEnd && new Date(p.periodEnd) >= since);
    if (recent.length > 0) {
      const mwh = recent.reduce((s, r) => s + Number(r.productionMwh ?? 0), 0);
      if (mwh > 0) return field(mwh * 1000, "KNOWN", "energyProduction_trailing_12m");
    }
  }
  // Fallback: very rough 4 sun-hours/day × 365 × derate(0.78).
  const capacityKw = Number(project.capacityKw ?? 0);
  const estimated = capacityKw * 4 * 365 * 0.78;
  return field(estimated, "ESTIMATED", "derated_capacity_4sunhrs_365d");
}

async function projectAnnualGrossRevenueUsd(
  project: Project,
  annualKwh: FinancialField<number>,
  ppa: FinancialField<number>,
): Promise<FinancialField<number>> {
  const revenues = await storage.getRevenueByProject(project.id);
  if (revenues.length > 0) {
    const since = new Date();
    since.setMonth(since.getMonth() - 12);
    const recent = revenues.filter((r) => r.periodEnd && new Date(r.periodEnd) >= since);
    if (recent.length > 0) {
      const total = recent.reduce((s, r) => s + Number(r.grossRevenue ?? 0), 0);
      if (total > 0) return field(total, "KNOWN", "revenueRecords_trailing_12m");
    }
  }
  const computed = annualKwh.value * ppa.value;
  const confidence: FinancialConfidenceCode =
    annualKwh.confidence === "KNOWN" && ppa.confidence === "KNOWN" ? "KNOWN" : "ESTIMATED";
  return field(computed, confidence, `${annualKwh.source}_x_${ppa.source}`);
}

async function projectPpaPrice(project: Project): Promise<FinancialField<number>> {
  // A non-zero project.ppaRate is an admin-curated KNOWN price.
  const fixedRate = Number(project.ppaRate ?? 0);
  if (fixedRate > 0) {
    return field(fixedRate, "KNOWN", "project.ppaRate");
  }
  const ppas = await storage.getPpasByProject(project.id);
  const resolution = resolvePpaForInterval({
    project,
    intervalStart: new Date(),
    ppas,
    jurisdictionBenchmarks: [],
    offtakerClass: inferOfftakerClassFromProject(project),
    plantUse: inferPlantUseFromProject(project),
  });
  const confidence: FinancialConfidenceCode =
    resolution.source === "FIXED_PPA" ? "KNOWN" : "MARKET_PROXY";
  return field(resolution.usdPerKwh, confidence, resolution.source);
}

async function buildProjectListing(project: Project): Promise<MarketplaceListing> {
  const capacityMW = Number(project.capacityMW ?? 0);
  const capacityKw = Number(project.capacityKw ?? capacityMW * 1000);
  const capitalStack = await storage.getCapitalStack(project.id);

  const ppaPrice = await projectPpaPrice(project);
  const annualKwh = await projectAnnualKwh(project);
  const annualRevenue = await projectAnnualGrossRevenueUsd(project, annualKwh, ppaPrice);
  const monthlyDebt = projectMonthlyDebt(project.monthlyDebtService);
  const monthlyOpex = projectMonthlyOpex(project.monthlyOpex, capacityMW);
  const capex = projectCapexUsd(capitalStack?.totalCapex, capacityMW);

  const reserveRate = Math.max(0, Math.min(1, Number(project.reserveRate ?? DEFAULT_RESERVE_RATE)));
  const wf = simulateProspectWaterfall({
    annualGrossRevenueUsd: annualRevenue.value,
    monthlyDebtServiceUsd: monthlyDebt.value,
    monthlyOpexUsd: monthlyOpex.value,
    reserveRate,
  });
  const investorYield = wf.annualInvestorYieldUsd;
  const moic = capex.value > 0 ? (investorYield * 20) / capex.value : 0; // 20yr horizon proxy
  const irrPctValue = capex.value > 0 ? (investorYield / capex.value) * 100 : 0;

  return {
    id: project.id,
    source: "PROJECT",
    name: project.name,
    state: project.state,
    county: project.county ?? null,
    technology: project.technology ?? null,
    stage: project.stage ?? null,
    capacityMW,
    capacityKw: field(capacityKw, "KNOWN", "project.capacityKw"),
    ppaPriceUsdPerKwh: ppaPrice,
    annualKwh,
    annualGrossRevenueUsd: annualRevenue,
    monthlyDebtServiceUsd: monthlyDebt,
    monthlyOpexUsd: monthlyOpex,
    capexUsd: capex,
    irrProxyPct: field(irrPctValue, annualRevenue.confidence === "KNOWN" ? "ESTIMATED" : "ESTIMATED", "annual_yield_over_capex"),
    moicProxy: field(moic, "ESTIMATED", "investor_yield_x20_over_capex"),
    annualInvestorYieldUsd: field(investorYield, annualRevenue.confidence, "waterfall_simulation"),
    externalLinks: (project.externalLinks as MarketplaceExternalLink[] | null) ?? [],
    detailHref: `/market/${project.id}`,
  };
}

async function buildQueueListing(
  entry: InterconnectionQueueEntry,
  analytics: QueueEntryAnalytics | undefined,
): Promise<MarketplaceListing> {
  const capacityMW = Number(entry.capacityMW ?? 0);
  const capacityKw = capacityMW * 1000;

  const ppaScenario = (analytics?.ppaScenario as any) ?? null;
  const ppaUsdPerKwh = Number(ppaScenario?.usdPerKwh ?? 0);
  const ppaSource = String(ppaScenario?.source ?? "LEVELTEN_P25_PROXY");

  const annualKwhValue = Number(analytics?.annualKwhNsrdb ?? 0);
  const annualRevenueValue = ppaUsdPerKwh > 0 ? annualKwhValue * ppaUsdPerKwh : 0;
  const wfSummary = (analytics?.waterfallSummary as Record<string, number> | null) ?? {};
  const investorYield = Number(wfSummary.INVESTOR_YIELD ?? 0);
  const capexValue = capacityMW * DEFAULT_CAPEX_USD_PER_MW;

  return {
    id: entry.id,
    source: "QUEUE",
    name: entry.projectName || `Queue ${entry.externalId}`,
    state: entry.state,
    county: entry.county ?? null,
    technology: entry.resourceType ?? null,
    stage: entry.queueStatus ?? null,
    capacityMW,
    capacityKw: field(capacityKw, "KNOWN", "interconnectionQueueEntries.capacityMW"),
    ppaPriceUsdPerKwh: field(ppaUsdPerKwh, "MARKET_PROXY", ppaSource),
    annualKwh: field(annualKwhValue, "ESTIMATED", "NSRDB_4km"),
    annualGrossRevenueUsd: field(annualRevenueValue, "ESTIMATED", "NSRDB_x_marketRate"),
    monthlyDebtServiceUsd: field(0, "ESTIMATED", "no_debt_structure_for_queue_entry"),
    monthlyOpexUsd: field(
      capacityMW * DEFAULT_OPEX_USD_PER_MW_MONTH,
      "ESTIMATED",
      `industry_avg_${DEFAULT_OPEX_USD_PER_MW_MONTH}_per_MW_month`,
    ),
    capexUsd: field(capexValue, "ESTIMATED", `industry_avg_${DEFAULT_CAPEX_USD_PER_MW}_per_MW`),
    irrProxyPct: field(Number(analytics?.irrProxyPct ?? 0), "ESTIMATED", "queue_analytics_engine"),
    moicProxy: field(Number(analytics?.moicProxy ?? 0), "ESTIMATED", "queue_analytics_engine"),
    annualInvestorYieldUsd: field(investorYield, "ESTIMATED", "waterfall_simulation"),
    externalLinks: [],
    detailHref: `/market/${entry.id}`,
  };
}

export interface ListOptions {
  limit?: number;
  state?: string;
  iso?: string;
  technology?: string;
  source?: "PROJECT" | "QUEUE";
}

export async function listMarketplaceListings(opts: ListOptions = {}): Promise<{
  listings: MarketplaceListing[];
  refreshedAt: string | null;
  total: number;
}> {
  const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
  const out: MarketplaceListing[] = [];

  if (!opts.source || opts.source === "PROJECT") {
    const projects = await storage.getProjectsByStatus("APPROVED");
    for (const p of projects) {
      if (opts.state && p.state.toLowerCase() !== opts.state.toLowerCase()) continue;
      if (opts.technology && (p.technology ?? "").toLowerCase() !== opts.technology.toLowerCase()) continue;
      out.push(await buildProjectListing(p));
    }
  }

  if (!opts.source || opts.source === "QUEUE") {
    const entries = await storage.getAllInterconnectionQueueEntries();
    for (const entry of entries) {
      if (opts.state && entry.state.toLowerCase() !== opts.state.toLowerCase()) continue;
      if (opts.iso && entry.isoCode.toLowerCase() !== opts.iso.toLowerCase()) continue;
      if (opts.technology && (entry.resourceType ?? "").toLowerCase() !== opts.technology.toLowerCase()) continue;
      const analytics = await storage.getQueueEntryAnalyticsByEntryId(entry.id);
      if (analytics && analytics.computeStatus !== "READY") continue;
      out.push(await buildQueueListing(entry, analytics));
    }
  }

  out.sort((a, b) => b.capacityMW - a.capacityMW || a.name.localeCompare(b.name));
  const sliced = out.slice(0, limit);

  const meta = await storage.getMarketplaceMeta("global");
  return {
    listings: sliced,
    refreshedAt: meta?.refreshedAt ? meta.refreshedAt.toISOString() : null,
    total: out.length,
  };
}

export async function getMarketplaceListing(id: string): Promise<MarketplaceListingDetail | null> {
  const project = await storage.getProject(id);
  if (project) {
    const base = await buildProjectListing(project);
    return { ...base, summary: project.summary ?? null };
  }
  const entry = await storage.getInterconnectionQueueEntry(id);
  if (entry) {
    const analytics = await storage.getQueueEntryAnalyticsByEntryId(entry.id);
    const base = await buildQueueListing(entry, analytics);
    const monthlySeries = (analytics?.monthlyWaterfallSeries as any[] | null)?.map((m, i) => ({
      monthIndex: i,
      label: m.label ?? `M${i + 1}`,
      grossRevenueUsd: Number(m.grossRevenueUsd ?? 0),
      investorYieldUsd: Number(
        (m.tiers ?? []).find((t: any) => t.accountType === "INVESTOR_YIELD")?.amount ?? 0,
      ),
    }));
    return { ...base, summary: null, monthlySeries };
  }
  return null;
}

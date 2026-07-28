import { storage } from "../storage";
import {
  resolvePpaForInterval,
  inferOfftakerClassFromProject,
  inferPlantUseFromProject,
} from "../lib/market-rates";
import {
  computeCashYields,
  deriveCapitalStructure,
  estimateAnnualKwh,
  resolveCapacityFactor,
  type CapitalStructure,
} from "../lib/project-economics";
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
  /**
   * Unlevered cash-on-cash: CFADS over total capex. Retains the historical
   * meaning of this field so authenticated deal views keep working unchanged.
   * NOT an IRR despite the name.
   */
  irrProxyPct: FinancialField<number>;
  moicProxy: FinancialField<number>;
  annualInvestorYieldUsd: FinancialField<number>;
  /** Headline metric: distributable cash over the equity the investor funds. */
  cashYieldOnEquityPct: FinancialField<number>;
  /** Same number as irrProxyPct, under an honest name. */
  unleveredCashYieldPct: FinancialField<number>;
  capacityFactorPct: FinancialField<number>;
  seniorDebtUsd: FinancialField<number>;
  itcTransferProceedsUsd: FinancialField<number>;
  investorEquityUsd: FinancialField<number>;
  dscrX: FinancialField<number>;
  /** Physical mounting, drives both the yield model and the site-card drawing. */
  arrayType: string | null;
  /** Photograph of the system when one exists; null renders a generated site card. */
  image: {
    url: string | null;
    alt: string | null;
    credit: string | null;
    license: string | null;
  };
  /** True once the asset is operating and distributing; false while pre-COD. */
  isOperating: boolean;
  commercialOperationDate: string | null;
  contractTermRemainingYears: number | null;
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
/** Platform fee applied to a queue prospect's distributable cash. */
const QUEUE_PLATFORM_FEE_RATE = 0.015;

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

async function projectAnnualKwh(
  project: Project,
): Promise<{ annualKwh: FinancialField<number>; capacityFactorPct: FinancialField<number> }> {
  const capacityKw = Number(project.capacityKw ?? 0);
  const cf = resolveCapacityFactor({
    state: project.state,
    latitude: project.latitude,
    technology: project.technology,
    arrayType: project.arrayType,
    offtakerType: project.offtakerType,
  });

  // Prefer last 12 months of actual production records.
  const production = await storage.getProductionByProject(project.id);
  if (production.length > 0) {
    const since = new Date();
    since.setMonth(since.getMonth() - 12);
    const recent = production.filter((p) => p.periodEnd && new Date(p.periodEnd) >= since);
    if (recent.length > 0) {
      const mwh = recent.reduce((s, r) => s + Number(r.productionMwh ?? 0), 0);
      if (mwh > 0) {
        const meteredKwh = mwh * 1000;
        const meteredCf = capacityKw > 0 ? meteredKwh / (capacityKw * 8760) : cf.capacityFactor;
        return {
          annualKwh: field(meteredKwh, "KNOWN", "energyProduction_trailing_12m"),
          capacityFactorPct: field(meteredCf * 100, "KNOWN", "metered_trailing_12m"),
        };
      }
    }
  }

  // Fallback: nameplate x 8760 x a region- and mounting-appropriate capacity
  // factor. The prior 4-sun-hour heuristic implied a 13% CF everywhere, which is
  // roughly half of what US utility-scale PV actually delivers.
  return {
    annualKwh: field(estimateAnnualKwh(capacityKw, cf.capacityFactor), "ESTIMATED", cf.basis),
    capacityFactorPct: field(cf.capacityFactor * 100, "ESTIMATED", cf.basis),
  };
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

/**
 * Cash available for debt service: gross revenue less operating expense and the
 * reserve sweep, before any financing cost. This is the unlevered numerator and
 * the basis a lender sizes debt against.
 */
function cfadsUsd(annualGrossRevenueUsd: number, annualOpexUsd: number, reserveRate: number): number {
  return Math.max(0, annualGrossRevenueUsd - annualOpexUsd - annualGrossRevenueUsd * reserveRate);
}

function structureFields(structure: CapitalStructure) {
  return {
    seniorDebtUsd: field(structure.seniorDebtUsd, structure.debtConfidence, structure.basis),
    itcTransferProceedsUsd: field(
      structure.itcTransferProceedsUsd,
      "ESTIMATED",
      "itc_transfer_at_0.92",
    ),
    investorEquityUsd: field(
      structure.investorEquityUsd,
      structure.equityConfidence,
      structure.equityConfidence === "KNOWN"
        ? "capitalStacks.equityNeeded"
        : "capex_less_debt_less_itc",
    ),
    dscrX: field(
      Number.isFinite(structure.dscr) ? structure.dscr : 0,
      structure.debtConfidence,
      "cfads_over_debt_service",
    ),
  };
}

async function buildProjectListing(project: Project): Promise<MarketplaceListing> {
  const capacityMW = Number(project.capacityMW ?? 0);
  const capacityKw = Number(project.capacityKw ?? capacityMW * 1000);
  const capitalStack = await storage.getCapitalStack(project.id);

  const ppaPrice = await projectPpaPrice(project);
  const { annualKwh, capacityFactorPct } = await projectAnnualKwh(project);
  const annualRevenue = await projectAnnualGrossRevenueUsd(project, annualKwh, ppaPrice);
  const monthlyOpex = projectMonthlyOpex(project.monthlyOpex, capacityMW);
  const capex = projectCapexUsd(capitalStack?.totalCapex, capacityMW);
  const reserveRate = Math.max(0, Math.min(1, Number(project.reserveRate ?? DEFAULT_RESERVE_RATE)));

  // Size the capital structure off CFADS before running the waterfall, so the
  // debt service the waterfall subtracts is the same debt the investor's equity
  // slice is computed net of.
  const annualCfads = cfadsUsd(annualRevenue.value, monthlyOpex.value * 12, reserveRate);
  const structure = deriveCapitalStructure({
    capexUsd: capex.value,
    annualCfadsUsd: annualCfads,
    capitalStack: capitalStack ?? null,
    knownMonthlyDebtServiceUsd: Number(project.monthlyDebtService ?? 0),
  });

  const monthlyDebt = field(
    structure.annualDebtServiceUsd / 12,
    structure.debtConfidence,
    structure.debtConfidence === "KNOWN" ? "project.monthlyDebtService" : structure.basis,
  );

  const wf = simulateProspectWaterfall({
    annualGrossRevenueUsd: annualRevenue.value,
    monthlyDebtServiceUsd: monthlyDebt.value,
    monthlyOpexUsd: monthlyOpex.value,
    reserveRate,
  });
  const investorYield = wf.annualInvestorYieldUsd;
  const moic = capex.value > 0 ? (investorYield * 20) / capex.value : 0; // 20yr horizon proxy

  const yields = computeCashYields({
    annualInvestorCashUsd: investorYield,
    annualCfadsUsd: annualCfads,
    capexUsd: capex.value,
    investorEquityUsd: structure.investorEquityUsd,
  });

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
    irrProxyPct: field(yields.unleveredCashYieldPct, "ESTIMATED", "cfads_over_capex"),
    unleveredCashYieldPct: field(yields.unleveredCashYieldPct, "ESTIMATED", "cfads_over_capex"),
    cashYieldOnEquityPct: field(
      yields.cashYieldOnEquityPct,
      annualRevenue.confidence === "KNOWN" && structure.equityConfidence === "KNOWN"
        ? "KNOWN"
        : "ESTIMATED",
      "investor_cash_over_equity",
    ),
    capacityFactorPct,
    moicProxy: field(moic, "ESTIMATED", "investor_yield_x20_over_capex"),
    annualInvestorYieldUsd: field(investorYield, annualRevenue.confidence, "waterfall_simulation"),
    ...structureFields(structure),
    arrayType: project.arrayType ?? null,
    image: {
      url: project.imageUrl ?? null,
      alt: project.imageAlt ?? null,
      credit: project.imageCredit ?? null,
      license: project.imageLicense ?? null,
    },
    isOperating: project.stage === "COD",
    commercialOperationDate: project.commercialOperationDate
      ? new Date(project.commercialOperationDate).toISOString()
      : null,
    contractTermRemainingYears:
      project.contractTermRemainingYears != null
        ? Number(project.contractTermRemainingYears)
        : null,
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
  const capexValue = capacityMW * DEFAULT_CAPEX_USD_PER_MW;

  // Reconstruct CFADS from the recorded waterfall tiers so a queue row reports
  // the same two yields as a curated project rather than a different metric.
  const annualOpexValue = Number(wfSummary.OPEX_FUND ?? capacityMW * DEFAULT_OPEX_USD_PER_MW_MONTH * 12);
  const annualReserves = Number(wfSummary.RESERVES ?? annualRevenueValue * DEFAULT_RESERVE_RATE);
  const annualCfads = Math.max(0, annualRevenueValue - annualOpexValue - annualReserves);

  // A queue position is modeled unlevered and without an ITC. There is no
  // lender on an unbuilt project and no tax basis to monetize, so pretending
  // otherwise would inflate the yield on a residual equity slice that does not
  // exist yet. Equity equals the modeled build cost, and the two yields agree.
  const structure = deriveCapitalStructure({
    capexUsd: capexValue,
    annualCfadsUsd: annualCfads,
    capitalStack: {
      id: "",
      projectId: entry.id,
      totalCapex: String(capexValue),
      taxCreditType: "NONE",
      taxCreditEstimated: "0",
      taxCreditTransferabilityReady: false,
      equityNeeded: String(capexValue),
      debtPlaceholder: "0",
      notes: null,
    },
  });

  // Distributable cash on the same unlevered basis, so a reader who divides the
  // two figures on the card lands on the yield the card prints.
  const investorYield = annualCfads * (1 - QUEUE_PLATFORM_FEE_RATE);

  const yields = computeCashYields({
    annualInvestorCashUsd: investorYield,
    annualCfadsUsd: annualCfads,
    capexUsd: capexValue,
    investorEquityUsd: structure.investorEquityUsd,
  });

  const capacityFactor =
    capacityKw > 0 && annualKwhValue > 0 ? annualKwhValue / (capacityKw * 8760) : 0;

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
    monthlyDebtServiceUsd: field(
      structure.annualDebtServiceUsd / 12,
      structure.debtConfidence,
      structure.basis,
    ),
    monthlyOpexUsd: field(
      annualOpexValue / 12,
      "ESTIMATED",
      `industry_avg_${DEFAULT_OPEX_USD_PER_MW_MONTH}_per_MW_month`,
    ),
    capexUsd: field(capexValue, "ESTIMATED", `industry_avg_${DEFAULT_CAPEX_USD_PER_MW}_per_MW`),
    irrProxyPct: field(yields.unleveredCashYieldPct, "ESTIMATED", "cfads_over_capex_unlevered"),
    unleveredCashYieldPct: field(yields.unleveredCashYieldPct, "ESTIMATED", "cfads_over_capex"),
    cashYieldOnEquityPct: field(
      yields.cashYieldOnEquityPct,
      "ESTIMATED",
      "investor_cash_over_equity",
    ),
    capacityFactorPct: field(capacityFactor * 100, "ESTIMATED", "NSRDB_modeled_cf"),
    moicProxy: field(Number(analytics?.moicProxy ?? 0), "ESTIMATED", "queue_analytics_engine"),
    annualInvestorYieldUsd: field(investorYield, "ESTIMATED", "waterfall_simulation"),
    ...structureFields(structure),
    arrayType: null,
    image: { url: null, alt: null, credit: null, license: null },
    isOperating: false,
    commercialOperationDate: null,
    contractTermRemainingYears: null,
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

import { storage } from "../storage";
import { computeRevenue, computeDistribution } from "../scoring-engine";
import { buildSeasonalForecast } from "./yieldForecast";
import type { EnergyProduction, Ppa, RevenueRecord, Distribution, ScadaDataSource } from "@shared/schema";

export interface ScadaProvenance {
  sourceType: string;
  providerName: string | null;
  dataQuality: string;
  lastSyncAt: string | null;
  verificationStatus: string;
  recordCount: number;
}

export interface ScadaSummary {
  totalProductionMwh: number;
  totalGrossRevenue: number;
  totalNetRevenue: number;
  totalDistributed: number;
  avgCapacityFactor: number;
  periodsReported: number;
  annualizedProductionMwh: number;
  trailing12MonthRevenue: number;
  provenance: ScadaProvenance;
}

export interface ScadaMonthlyRecord {
  period: string;
  periodStart: string;
  periodEnd: string;
  productionMwh: number;
  capacityFactor: number;
  grossRevenue: number;
  operatingExpenses: number;
  netRevenue: number;
  source: string;
}

export interface ScadaMonthlyHistory {
  records: ScadaMonthlyRecord[];
  provenance: ScadaProvenance;
}

export interface ScadaForecastMonth {
  month: string;
  forecastMwh: number;
  forecastRevenue: number;
}

export interface ScadaForecast {
  months: ScadaForecastMonth[];
  assumptions: {
    ppaRatePerKwh: number;
    degradationRateAnnual: number;
    monthsForward: number;
  };
  totalForecastMwh: number;
  totalForecastRevenue: number;
  provenance: ScadaProvenance;
}

export interface ScadaHealthStatus {
  overall: "HEALTHY" | "WARNING" | "CRITICAL" | "NO_DATA";
  dataSource: {
    status: string;
    sourceType: string;
    providerName: string | null;
    lastSyncAt: string | null;
    dataQuality: string;
  };
  checks: Array<{
    name: string;
    status: "PASS" | "WARN" | "FAIL";
    message: string;
  }>;
}

export interface ScadaIngestionStatus {
  dataSources: ScadaDataSource[];
  connectors: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    description: string | null;
  }>;
  lastIngestion: string | null;
  totalRecords: number;
}

export interface RevenueBridgeStep {
  label: string;
  amount: number;
  type: "add" | "subtract" | "total";
}

export interface ScadaRevenueBridge {
  steps: RevenueBridgeStep[];
  summary: {
    totalProductionMwh: number;
    ppaRatePerMwh: number;
    grossRevenue: number;
    operatingExpenses: number;
    opexRate: number;
    netRevenue: number;
    platformFee: number;
    platformFeeRate: number;
    distributableCash: number;
  };
  provenance: ScadaProvenance;
}

function buildProvenance(dataSources: ScadaDataSource[]): ScadaProvenance {
  const primary = dataSources[0];
  if (!primary) {
    return {
      sourceType: "UNKNOWN",
      providerName: null,
      dataQuality: "UNKNOWN",
      lastSyncAt: null,
      verificationStatus: "UNVERIFIED",
      recordCount: 0,
    };
  }

  let verificationStatus = "UNVERIFIED";
  if (primary.sourceType === "PVDAQ_VERIFIED") verificationStatus = "VERIFIED";
  else if (primary.sourceType === "CONNECTOR" && primary.dataQuality === "HIGH") verificationStatus = "AUTOMATED";
  else if (primary.sourceType === "MANUAL" || primary.sourceType === "CSV_UPLOAD") verificationStatus = "SELF_REPORTED";

  return {
    sourceType: primary.sourceType,
    providerName: primary.providerName,
    dataQuality: primary.dataQuality,
    lastSyncAt: primary.lastSyncAt?.toISOString() || null,
    verificationStatus,
    recordCount: primary.recordCount || 0,
  };
}

export async function getProjectSummary(projectId: string): Promise<ScadaSummary | null> {
  const project = await storage.getProject(projectId);
  if (!project) return null;

  const [production, revenue, distributions, dataSources] = await Promise.all([
    storage.getProductionByProject(projectId),
    storage.getRevenueByProject(projectId),
    storage.getDistributionsByProject(projectId),
    storage.getScadaDataSourcesByProject(projectId),
  ]);

  if (production.length === 0) {
    return {
      totalProductionMwh: 0,
      totalGrossRevenue: 0,
      totalNetRevenue: 0,
      totalDistributed: 0,
      avgCapacityFactor: 0,
      periodsReported: 0,
      annualizedProductionMwh: 0,
      trailing12MonthRevenue: 0,
      provenance: buildProvenance(dataSources),
    };
  }

  const totalProduction = production.reduce((s, p) => s + parseFloat(p.productionMwh), 0);
  const totalGrossRevenue = revenue.reduce((s, r) => s + parseFloat(r.grossRevenue), 0);
  const totalNetRevenue = revenue.reduce((s, r) => s + parseFloat(r.netRevenue), 0);
  const totalDistributed = distributions
    .filter(d => d.status === "DISTRIBUTED")
    .reduce((s, d) => s + parseFloat(d.investorShare), 0);
  const avgCapacityFactor = production.reduce((s, p) => s + parseFloat(p.capacityFactor || "0"), 0) / production.length;

  const sortedRev = [...revenue].sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime());
  const trailing12 = sortedRev.slice(0, 12).reduce((s, r) => s + parseFloat(r.netRevenue), 0);

  const annualized = production.length >= 12
    ? totalProduction
    : (totalProduction / production.length) * 12;

  return {
    totalProductionMwh: Math.round(totalProduction * 100) / 100,
    totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
    totalNetRevenue: Math.round(totalNetRevenue * 100) / 100,
    totalDistributed: Math.round(totalDistributed * 100) / 100,
    avgCapacityFactor: Math.round(avgCapacityFactor * 10000) / 10000,
    periodsReported: production.length,
    annualizedProductionMwh: Math.round(annualized * 100) / 100,
    trailing12MonthRevenue: Math.round(trailing12 * 100) / 100,
    provenance: buildProvenance(dataSources),
  };
}

export async function getMonthlyHistory(projectId: string): Promise<ScadaMonthlyHistory | null> {
  const project = await storage.getProject(projectId);
  if (!project) return null;

  const [production, revenue, dataSources] = await Promise.all([
    storage.getProductionByProject(projectId),
    storage.getRevenueByProject(projectId),
    storage.getScadaDataSourcesByProject(projectId),
  ]);

  const revenueByPeriod = new Map<string, RevenueRecord>();
  for (const r of revenue) {
    const key = r.periodStart.toISOString();
    revenueByPeriod.set(key, r);
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const records: ScadaMonthlyRecord[] = production.map((p) => {
    const rev = revenueByPeriod.get(p.periodStart.toISOString());
    const month = p.periodStart.getMonth();
    const year = p.periodStart.getFullYear();
    return {
      period: `${months[month]} ${year}`,
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
      productionMwh: parseFloat(p.productionMwh),
      capacityFactor: parseFloat(p.capacityFactor || "0"),
      grossRevenue: rev ? parseFloat(rev.grossRevenue) : 0,
      operatingExpenses: rev ? parseFloat(rev.operatingExpenses) : 0,
      netRevenue: rev ? parseFloat(rev.netRevenue) : 0,
      source: p.source,
    };
  });

  return {
    records,
    provenance: buildProvenance(dataSources),
  };
}

export async function getForecast(
  projectId: string,
  ppaRatePerKwh: number = 0.085,
  degradationRate: number = 0.005,
  monthsForward: number = 12
): Promise<ScadaForecast | null> {
  const project = await storage.getProject(projectId);
  if (!project) return null;

  const [production, dataSources, ppas] = await Promise.all([
    storage.getProductionByProject(projectId),
    storage.getScadaDataSourcesByProject(projectId),
    storage.getPpasByProject(projectId),
  ]);

  if (production.length === 0) return null;

  const ppa = ppas[0];
  const effectivePpaRate = ppa ? parseFloat(ppa.pricePerMwh) / 1000 : ppaRatePerKwh;

  const historyRows = production.map(p => ({
    month: `${p.periodStart.getFullYear()}-${String(p.periodStart.getMonth() + 1).padStart(2, "0")}`,
    monthly_energy_kwh: parseFloat(p.productionMwh) * 1000,
  }));

  const forecastRows = buildSeasonalForecast(historyRows, effectivePpaRate, degradationRate, monthsForward);

  const months: ScadaForecastMonth[] = forecastRows.map(f => ({
    month: f.forecast_month,
    forecastMwh: Math.round(f.forecast_energy_kwh / 1000 * 100) / 100,
    forecastRevenue: Math.round(f.forecast_revenue_usd * 100) / 100,
  }));

  const totalForecastMwh = months.reduce((s, m) => s + m.forecastMwh, 0);
  const totalForecastRevenue = months.reduce((s, m) => s + m.forecastRevenue, 0);

  return {
    months,
    assumptions: {
      ppaRatePerKwh: effectivePpaRate,
      degradationRateAnnual: degradationRate,
      monthsForward,
    },
    totalForecastMwh: Math.round(totalForecastMwh * 100) / 100,
    totalForecastRevenue: Math.round(totalForecastRevenue * 100) / 100,
    provenance: buildProvenance(dataSources),
  };
}

export async function getHealthStatus(projectId: string): Promise<ScadaHealthStatus | null> {
  const project = await storage.getProject(projectId);
  if (!project) return null;

  const [dataSources, production] = await Promise.all([
    storage.getScadaDataSourcesByProject(projectId),
    storage.getProductionByProject(projectId),
  ]);

  const primary = dataSources[0];
  const checks: ScadaHealthStatus["checks"] = [];

  if (!primary) {
    return {
      overall: "NO_DATA",
      dataSource: { status: "NONE", sourceType: "NONE", providerName: null, lastSyncAt: null, dataQuality: "UNKNOWN" },
      checks: [{ name: "Data Source", status: "FAIL", message: "No SCADA data source configured for this project." }],
    };
  }

  if (primary.status === "ACTIVE") {
    checks.push({ name: "Connection Status", status: "PASS", message: "Data source is active and connected." });
  } else if (primary.status === "PENDING") {
    checks.push({ name: "Connection Status", status: "WARN", message: "Data source is pending initial sync." });
  } else {
    checks.push({ name: "Connection Status", status: "FAIL", message: `Data source status: ${primary.status}` });
  }

  if (primary.lastSyncAt) {
    const hoursSinceSync = (Date.now() - primary.lastSyncAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceSync < 48) {
      checks.push({ name: "Data Freshness", status: "PASS", message: "Data synced within last 48 hours." });
    } else if (hoursSinceSync < 168) {
      checks.push({ name: "Data Freshness", status: "WARN", message: "Data not synced in over 48 hours." });
    } else {
      checks.push({ name: "Data Freshness", status: "FAIL", message: "Data not synced in over 7 days." });
    }
  } else {
    checks.push({ name: "Data Freshness", status: "WARN", message: "No sync timestamp recorded." });
  }

  if (primary.dataQuality === "HIGH") {
    checks.push({ name: "Data Quality", status: "PASS", message: "Data quality rated HIGH." });
  } else if (primary.dataQuality === "MEDIUM") {
    checks.push({ name: "Data Quality", status: "WARN", message: "Data quality rated MEDIUM. Consider verified data source." });
  } else {
    checks.push({ name: "Data Quality", status: "FAIL", message: `Data quality: ${primary.dataQuality}` });
  }

  if (production.length >= 12) {
    checks.push({ name: "Coverage", status: "PASS", message: `${production.length} months of production data available.` });
  } else if (production.length > 0) {
    checks.push({ name: "Coverage", status: "WARN", message: `Only ${production.length} months of data. 12+ months recommended.` });
  } else {
    checks.push({ name: "Coverage", status: "FAIL", message: "No production data available." });
  }

  const failCount = checks.filter(c => c.status === "FAIL").length;
  const warnCount = checks.filter(c => c.status === "WARN").length;

  let overall: ScadaHealthStatus["overall"] = "HEALTHY";
  if (failCount > 0) overall = "CRITICAL";
  else if (warnCount > 0) overall = "WARNING";

  return {
    overall,
    dataSource: {
      status: primary.status,
      sourceType: primary.sourceType,
      providerName: primary.providerName,
      lastSyncAt: primary.lastSyncAt?.toISOString() || null,
      dataQuality: primary.dataQuality,
    },
    checks,
  };
}

export async function getIngestionStatus(projectId: string): Promise<ScadaIngestionStatus | null> {
  const project = await storage.getProject(projectId);
  if (!project) return null;

  const [dataSources, connectors] = await Promise.all([
    storage.getScadaDataSourcesByProject(projectId),
    storage.getAllScadaConnectors(),
  ]);

  const totalRecords = dataSources.reduce((s, ds) => s + (ds.recordCount || 0), 0);
  const lastIngestion = dataSources
    .filter(ds => ds.lastSyncAt)
    .sort((a, b) => (b.lastSyncAt!.getTime()) - (a.lastSyncAt!.getTime()))[0]
    ?.lastSyncAt?.toISOString() || null;

  return {
    dataSources,
    connectors: connectors.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      description: c.description,
    })),
    lastIngestion,
    totalRecords,
  };
}

export async function getRevenueBridge(projectId: string): Promise<ScadaRevenueBridge | null> {
  const project = await storage.getProject(projectId);
  if (!project) return null;

  const [production, revenue, distributions, ppas, dataSources] = await Promise.all([
    storage.getProductionByProject(projectId),
    storage.getRevenueByProject(projectId),
    storage.getDistributionsByProject(projectId),
    storage.getPpasByProject(projectId),
    storage.getScadaDataSourcesByProject(projectId),
  ]);

  if (production.length === 0 || revenue.length === 0) {
    return {
      steps: [],
      summary: {
        totalProductionMwh: 0,
        ppaRatePerMwh: 0,
        grossRevenue: 0,
        operatingExpenses: 0,
        opexRate: 0.15,
        netRevenue: 0,
        platformFee: 0,
        platformFeeRate: 0.0075,
        distributableCash: 0,
      },
      provenance: buildProvenance(dataSources),
    };
  }

  const totalProductionMwh = production.reduce((s, p) => s + parseFloat(p.productionMwh), 0);
  const totalGrossRevenue = revenue.reduce((s, r) => s + parseFloat(r.grossRevenue), 0);
  const totalOpex = revenue.reduce((s, r) => s + parseFloat(r.operatingExpenses), 0);
  const totalNetRevenue = revenue.reduce((s, r) => s + parseFloat(r.netRevenue), 0);
  const totalPlatformFee = distributions.reduce((s, d) => s + parseFloat(d.platformFee), 0);
  const totalDistributable = distributions.reduce((s, d) => s + parseFloat(d.investorShare), 0);

  const ppa = ppas[0];
  const ppaRate = ppa ? parseFloat(ppa.pricePerMwh) : 0;
  const opexRate = totalGrossRevenue > 0 ? totalOpex / totalGrossRevenue : 0.15;
  const platformFeeRate = totalNetRevenue > 0 ? totalPlatformFee / totalNetRevenue : 0.0075;

  const steps: RevenueBridgeStep[] = [
    { label: "Energy Production", amount: Math.round(totalProductionMwh * 100) / 100, type: "add" },
    { label: `PPA Revenue ($${ppaRate}/MWh)`, amount: Math.round(totalGrossRevenue * 100) / 100, type: "total" },
    { label: `Operating Expenses (${Math.round(opexRate * 100)}%)`, amount: Math.round(totalOpex * 100) / 100, type: "subtract" },
    { label: "Net Revenue", amount: Math.round(totalNetRevenue * 100) / 100, type: "total" },
    { label: `Platform Fee (${(platformFeeRate * 100).toFixed(2)}%)`, amount: Math.round(totalPlatformFee * 100) / 100, type: "subtract" },
    { label: "Distributable to Investors", amount: Math.round(totalDistributable * 100) / 100, type: "total" },
  ];

  return {
    steps,
    summary: {
      totalProductionMwh: Math.round(totalProductionMwh * 100) / 100,
      ppaRatePerMwh: ppaRate,
      grossRevenue: Math.round(totalGrossRevenue * 100) / 100,
      operatingExpenses: Math.round(totalOpex * 100) / 100,
      opexRate: Math.round(opexRate * 10000) / 10000,
      netRevenue: Math.round(totalNetRevenue * 100) / 100,
      platformFee: Math.round(totalPlatformFee * 100) / 100,
      platformFeeRate: Math.round(platformFeeRate * 10000) / 10000,
      distributableCash: Math.round(totalDistributable * 100) / 100,
    },
    provenance: buildProvenance(dataSources),
  };
}

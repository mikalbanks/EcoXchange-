/**
 * Normalizes a BacktestCompletePayload into a presentation-ready ReportModel
 * for the Production Verification Report PDF. All derivations live here so the
 * PDF components stay declarative.
 */
import type {
  BacktestCompletePayload,
  DeveloperIntakeData,
  VerificationStatus,
} from "@shared/developer-backtest";

// ── Formatting helpers (exported for component use) ──────────────────────────

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtNum(n: number, decimals = 1): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtPct(value0to100: number, decimals = 1): string {
  return `${value0to100.toFixed(decimals)}%`;
}

export function fmtUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function fmtUsdRate(n: number): string {
  return `$${n.toFixed(4)}`;
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseMonth(key: string): { year: number; monthIndex: number } {
  const [y, m] = key.split("-");
  return { year: Number(y), monthIndex: Math.max(0, Number(m) - 1) };
}

/** "2024-01" → "Jan 24" */
export function monthShortLabel(key: string): string {
  const { year, monthIndex } = parseMonth(key);
  return `${MONTH_SHORT[monthIndex]} ${String(year).slice(-2)}`;
}

/** "2024-01" → "January 2024" */
export function monthLongLabel(key: string): string {
  const { year, monthIndex } = parseMonth(key);
  return `${MONTH_LONG[monthIndex]} ${year}`;
}

// ── Label maps ───────────────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  monocrystalline: "Monocrystalline",
  polycrystalline: "Polycrystalline",
  thin_film: "Thin film",
  cdte: "CdTe (thin film)",
};

const RACKING_LABELS: Record<string, string> = {
  open_rack: "Open rack, fixed tilt",
  roof_mount: "Roof mount, fixed tilt",
  single_axis_tracker: "Single-axis tracker",
};

const INVERTER_LABELS: Record<string, string> = {
  solaredge: "SolarEdge",
  enphase: "Enphase",
  fronius: "Fronius",
  sma: "SMA",
};

const OFFTAKE_LABELS: Record<string, string> = {
  ppa: "Power Purchase Agreement",
  community_solar: "Community solar",
  net_metering: "Net metering",
  merchant: "Merchant",
};

function formatLatLon(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}

// ── Report model types ───────────────────────────────────────────────────────

export interface ReportMonthlyRow {
  monthKey: string;
  shortLabel: string; // "Jan 24"
  axisLabel: string; // "Jan"
  expectedKwh: number;
  simulatedKwh: number;
  poaKwhM2: number;
  cellTempC: number;
  capacityFactorPct: number; // 0–100
  ghiKwhM2: number;
  status: VerificationStatus;
  deviationPct: number;
}

export interface ReportRevenueRow {
  monthKey: string;
  shortLabel: string;
  expectedKwh: number;
  ratePerKwh: number;
  revenueUsd: number;
}

export interface ReportConfigItem {
  label: string;
  value: string;
}

export interface ReportModel {
  projectName: string;
  locationLabel: string;
  capacityKwDc: number;
  capacityMwDc: number;
  verificationPeriod: string;
  generatedDate: string; // "June 13, 2026"
  generatedTimestamp: string; // ISO

  monthsAnalyzed: number;
  monthsVerified: number;
  monthsFlagged: number;
  allVerified: boolean;

  annualExpectedMwh: number;
  annualExpectedKwh: number;
  annualCapacityFactorPct: number;

  config: ReportConfigItem[];
  engineLabel: string;
  moduleGammaPdc: string;

  monthly: ReportMonthlyRow[];
  totals: {
    expectedKwh: number;
    avgCellTempC: number;
    capacityFactorPct: number;
  };

  // Seasonal highlights
  peakMonthLabel: string;
  peakMonthKwh: number;
  peakMonthCfPct: number;
  lowMonthLabel: string;
  lowMonthKwh: number;
  lowMonthCfPct: number;
  peakToTroughRatio: number;
  hottestMonthLabel: string;
  hottestMonthCellTempC: number;

  includeRevenue: boolean;
  revenue?: {
    annualRevenueUsd: number;
    monthlyAvgUsd: number;
    ppaRatePerKwh: number;
    escalatorPct: number;
    rows: ReportRevenueRow[];
    totalRevenueUsd: number;
  };
}

export interface BuildReportOptions {
  includeRevenue?: boolean;
}

function fullYearsBetween(fromIso: string, toKey: string): number {
  const from = new Date(fromIso);
  const { year, monthIndex } = parseMonth(toKey);
  if (Number.isNaN(from.getTime())) return 0;
  let years = year - from.getFullYear();
  // Subtract a year if the month-of-year hasn't been reached yet.
  if (monthIndex < from.getMonth()) years -= 1;
  return Math.max(0, years);
}

export function buildReportModel(
  payload: BacktestCompletePayload,
  options: BuildReportOptions = {},
): ReportModel {
  const project = payload.project as DeveloperIntakeData;
  const { summary } = payload;
  const months = [...payload.monthly_results].sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  const monthly: ReportMonthlyRow[] = months.map((m) => ({
    monthKey: m.month,
    shortLabel: monthShortLabel(m.month),
    axisLabel: MONTH_SHORT[parseMonth(m.month).monthIndex],
    expectedKwh: m.expected_kwh,
    simulatedKwh: m.simulated_inverter_kwh,
    poaKwhM2: m.poa_irradiance_kwh_m2,
    cellTempC: m.cell_temperature_avg_c,
    capacityFactorPct: m.capacity_factor * 100,
    ghiKwhM2: m.ghi_kwh_m2,
    status: m.status,
    deviationPct: m.deviation_pct,
  }));

  const totalExpectedKwh = monthly.reduce((s, m) => s + m.expectedKwh, 0);
  const avgCellTempC =
    monthly.length > 0
      ? monthly.reduce((s, m) => s + m.cellTempC, 0) / monthly.length
      : 0;
  const annualCapacityFactorPct = summary.annual_capacity_factor * 100;

  // Seasonal highlights — derive from the actual months so labels stay in sync.
  const byExpectedDesc = [...monthly].sort((a, b) => b.expectedKwh - a.expectedKwh);
  const peak = byExpectedDesc[0];
  const low = byExpectedDesc[byExpectedDesc.length - 1];
  const hottest = [...monthly].sort((a, b) => b.cellTempC - a.cellTempC)[0];
  const peakToTrough =
    low && low.capacityFactorPct > 0
      ? peak.capacityFactorPct / low.capacityFactorPct
      : summary.peak_to_trough_ratio;

  const generatedAt = new Date(payload.generated_at);
  const generatedDate = generatedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const config: ReportConfigItem[] = [
    { label: "Location", value: formatLatLon(project.latitude, project.longitude) },
    { label: "DC Capacity", value: `${fmtInt(project.capacity_kw_dc)} kW` },
    {
      label: "Module Type",
      value: `${MODULE_LABELS[project.module_type] ?? project.module_type} (${(project.module_efficiency * 100).toFixed(0)}% eff.)`,
    },
    {
      label: "Tilt / Azimuth",
      value: `${project.tilt_deg}° / ${project.azimuth_deg}°`,
    },
    { label: "DC/AC Ratio", value: project.dc_ac_ratio.toFixed(2) },
    { label: "Racking", value: RACKING_LABELS[project.racking_type] ?? project.racking_type },
    { label: "Inverter", value: INVERTER_LABELS[project.inverter_brand] ?? project.inverter_brand },
    { label: "Off-take", value: OFFTAKE_LABELS[project.offtake_type] ?? project.offtake_type },
    { label: "Commissioned", value: project.commissioning_date },
    { label: "Degradation Rate", value: `${(project.degradation_rate * 100).toFixed(2)}%/year` },
    { label: "System Losses", value: `${(project.system_losses * 100).toFixed(0)}%` },
  ];

  // ── Revenue (conditional) ──────────────────────────────────────────────────
  const hasPpaRate = project.ppa_rate_per_kwh != null && project.ppa_rate_per_kwh > 0;
  const includeRevenue = options.includeRevenue ?? hasPpaRate;

  let revenue: ReportModel["revenue"];
  if (includeRevenue && hasPpaRate) {
    const baseRate = project.ppa_rate_per_kwh as number;
    const escalator = project.ppa_escalator ?? 0;
    const rows: ReportRevenueRow[] = monthly.map((m) => {
      const years = fullYearsBetween(project.commissioning_date, m.monthKey);
      const rate = baseRate * Math.pow(1 + escalator / 100, years);
      return {
        monthKey: m.monthKey,
        shortLabel: m.shortLabel,
        expectedKwh: m.expectedKwh,
        ratePerKwh: rate,
        revenueUsd: m.expectedKwh * rate,
      };
    });
    const totalRevenueUsd = rows.reduce((s, r) => s + r.revenueUsd, 0);
    revenue = {
      annualRevenueUsd: totalRevenueUsd,
      monthlyAvgUsd: rows.length > 0 ? totalRevenueUsd / rows.length : 0,
      ppaRatePerKwh: baseRate,
      escalatorPct: escalator,
      rows,
      totalRevenueUsd,
    };
  }

  return {
    projectName: project.name,
    locationLabel: formatLatLon(project.latitude, project.longitude),
    capacityKwDc: project.capacity_kw_dc,
    capacityMwDc: project.capacity_kw_dc / 1000,
    verificationPeriod:
      monthly.length > 0
        ? `${monthLongLabel(monthly[0].monthKey)} – ${monthLongLabel(monthly[monthly.length - 1].monthKey)}`
        : "—",
    generatedDate,
    generatedTimestamp: payload.generated_at,

    monthsAnalyzed: monthly.length,
    monthsVerified: summary.months_verified,
    monthsFlagged: summary.months_flagged,
    allVerified: summary.months_flagged === 0,

    annualExpectedMwh: summary.annual_expected_kwh / 1000,
    annualExpectedKwh: summary.annual_expected_kwh,
    annualCapacityFactorPct,

    config,
    engineLabel: summary.expected_engine,
    moduleGammaPdc: "-0.40%/°C",

    monthly,
    totals: {
      expectedKwh: totalExpectedKwh,
      avgCellTempC,
      capacityFactorPct: annualCapacityFactorPct,
    },

    peakMonthLabel: peak ? monthLongLabel(peak.monthKey).split(" ")[0] : "—",
    peakMonthKwh: peak?.expectedKwh ?? 0,
    peakMonthCfPct: peak?.capacityFactorPct ?? 0,
    lowMonthLabel: low ? monthLongLabel(low.monthKey).split(" ")[0] : "—",
    lowMonthKwh: low?.expectedKwh ?? 0,
    lowMonthCfPct: low?.capacityFactorPct ?? 0,
    peakToTroughRatio: peakToTrough,
    hottestMonthLabel: hottest ? monthLongLabel(hottest.monthKey).split(" ")[0] : "—",
    hottestMonthCellTempC: hottest?.cellTempC ?? 0,

    includeRevenue: includeRevenue && hasPpaRate,
    revenue,
  };
}

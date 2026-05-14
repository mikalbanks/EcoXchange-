import axios from "axios";
import { resolveMarketPpaUsdPerKwh, type MarketPpaResolution } from "./market-rates";

export type NlrNsrdbDataset = "nsrdb-GOES-aggregated-v4-0-0-download";

export interface NsrdbFetchOptions {
  dataset?: NlrNsrdbDataset;
  intervalMinutes?: 30 | 60;
  /** If omitted, uses current UTC year */
  year?: number;
  /** Optional attribution fields required by NSRDB. */
  email?: string;
  fullName?: string;
  affiliation?: string;
  reason?: string;
}

export interface NsrdbTimeSeriesRow {
  timestampUtc: string; // ISO string
  ghiWm2?: number;
  dniWm2?: number;
  dhiWm2?: number;
  airTemperatureC?: number;
  relativeHumidityPct?: number;
}

export interface NsrdbTimeSeries {
  dataset: NlrNsrdbDataset;
  intervalMinutes: 30 | 60;
  year: number;
  latitude: number;
  longitude: number;
  rows: NsrdbTimeSeriesRow[];
}

const NLR_BASE_URL = "https://developer.nlr.gov";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not configured`);
  return v;
}

function safeNumber(input: string | undefined): number | undefined {
  if (input == null) return undefined;
  const n = Number(input);
  return Number.isFinite(n) ? n : undefined;
}

function parseNsrdbCsvToRows(csvText: string): NsrdbTimeSeriesRow[] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 3) return [];

  // NSRDB CSV starts with metadata lines, then a header line like:
  // Year,Month,Day,Hour,Minute,ghi,dni,dhi,...
  // We find the first line that begins with "Year,".
  const headerIdx = lines.findIndex((l) => l.startsWith("Year,"));
  if (headerIdx < 0 || headerIdx + 1 >= lines.length) return [];

  const header = lines[headerIdx].split(",").map((s) => s.trim());
  const yearIdx = header.indexOf("Year");
  const monthIdx = header.indexOf("Month");
  const dayIdx = header.indexOf("Day");
  const hourIdx = header.indexOf("Hour");
  const minuteIdx = header.indexOf("Minute");

  const ghiIdx = header.findIndex((h) => h.toLowerCase() === "ghi");
  const dniIdx = header.findIndex((h) => h.toLowerCase() === "dni");
  const dhiIdx = header.findIndex((h) => h.toLowerCase() === "dhi");
  const tempIdx = header.findIndex((h) => h.toLowerCase() === "air_temperature");
  const rhIdx = header.findIndex((h) => h.toLowerCase() === "relative_humidity");

  if ([yearIdx, monthIdx, dayIdx, hourIdx, minuteIdx].some((i) => i < 0)) return [];

  const rows: NsrdbTimeSeriesRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((s) => s.trim());
    if (parts.length < header.length) continue;

    const y = Number(parts[yearIdx]);
    const m = Number(parts[monthIdx]);
    const d = Number(parts[dayIdx]);
    const hh = Number(parts[hourIdx]);
    const mm = Number(parts[minuteIdx]);
    if (![y, m, d, hh, mm].every(Number.isFinite)) continue;

    const dt = new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));
    rows.push({
      timestampUtc: dt.toISOString(),
      ghiWm2: safeNumber(parts[ghiIdx]),
      dniWm2: safeNumber(parts[dniIdx]),
      dhiWm2: safeNumber(parts[dhiIdx]),
      airTemperatureC: safeNumber(parts[tempIdx]),
      relativeHumidityPct: safeNumber(parts[rhIdx]),
    });
  }
  return rows;
}

export async function fetchNsrdbTimeSeries4km(
  latitude: number,
  longitude: number,
  options: NsrdbFetchOptions = {},
): Promise<NsrdbTimeSeries> {
  const apiKey = requireEnv("NREL_API_KEY");
  const dataset: NlrNsrdbDataset = options.dataset ?? "nsrdb-GOES-aggregated-v4-0-0-download";
  const intervalMinutes: 30 | 60 = options.intervalMinutes ?? 30;
  const year = options.year ?? new Date().getUTCFullYear();

  const email = options.email ?? process.env.NSRDB_EMAIL ?? "user@ecoxchange.local";
  const fullName = options.fullName ?? "EcoXchange Validation Engine";
  const affiliation = options.affiliation ?? "EcoXchange";
  const reason = options.reason ?? "Institutional-grade validation (NSRDB 4km truth source)";

  // Direct streaming CSV supported for a single POINT, single year.
  const url = `${NLR_BASE_URL}/api/nsrdb/v2/solar/${dataset}.csv`;
  const wkt = `POINT(${longitude} ${latitude})`;

  const res = await axios.get<string>(url, {
    params: {
      api_key: apiKey,
      wkt,
      names: String(year),
      utc: true,
      leap_day: true,
      interval: intervalMinutes,
      email,
      full_name: fullName,
      affiliation,
      reason,
      // minimal attributes; keep tight to reduce payload
      attributes: ["ghi", "dni", "dhi", "air_temperature", "relative_humidity"].join(","),
    },
    responseType: "text",
    timeout: 45000,
    validateStatus: (s) => s >= 200 && s < 300,
  });

  const csvText = typeof res.data === "string" ? res.data : "";
  const rows = parseNsrdbCsvToRows(csvText);

  return {
    dataset,
    intervalMinutes,
    year,
    latitude,
    longitude,
    rows,
  };
}

export function integrateIrradianceKwhPerM2(
  rows: NsrdbTimeSeriesRow[],
  intervalMinutes: number,
  attribute: "ghiWm2" | "dniWm2" | "dhiWm2" = "ghiWm2",
): number {
  // \( W/m^2 \) to \( kWh/m^2 \): sum(W/m^2 * hours)/1000
  const hours = intervalMinutes / 60;
  let total = 0;
  for (const r of rows) {
    const w = r[attribute];
    if (w == null || !Number.isFinite(w) || w < 0) continue;
    total += (w * hours) / 1000;
  }
  return Number(total.toFixed(6));
}

export function sliceRowsByWindow(
  rows: NsrdbTimeSeriesRow[],
  windowDays: 30 | 365,
  endTimeUtc: Date = new Date(),
): NsrdbTimeSeriesRow[] {
  const endMs = endTimeUtc.getTime();
  const startMs = endMs - windowDays * 24 * 60 * 60 * 1000;
  return rows.filter((r) => {
    const t = Date.parse(r.timestampUtc);
    return Number.isFinite(t) && t >= startMs && t <= endMs;
  });
}

export interface SgtNrelScoreResult {
  truthSource: "NLR_NSRDB_4KM";
  intervalMinutes: 30 | 60;
  year: number;
  ghiKwhPerM2_30d: number;
  ghiKwhPerM2_365d: number;
  sgtScoreNrel: number; // 0..1
}

/** Sum GHI kWh/m² for each calendar month (UTC) from parsed NSRDB rows. */
export function aggregateMonthlyGhiKwhPerM2(
  rows: NsrdbTimeSeriesRow[],
  intervalMinutes: number,
): Map<string, number> {
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    const t = Date.parse(r.timestampUtc);
    if (!Number.isFinite(t)) continue;
    const d = new Date(t);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const ghi = r.ghiWm2;
    if (ghi == null || !Number.isFinite(ghi) || ghi < 0) continue;
    const hours = intervalMinutes / 60;
    const add = (ghi * hours) / 1000;
    byMonth.set(key, (byMonth.get(key) || 0) + add);
  }
  return byMonth;
}

const DEFAULT_PERFORMANCE_RATIO = 0.2;

export function monthRangeUtc(monthsBack: number): { start: string; end: string; nsrdbYear: number } {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack + 1, 1));
  const startStr = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  const endStr = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}`;
  const nsrdbYear = end.getUTCFullYear();
  return { start: startStr, end: endStr, nsrdbYear };
}

/**
 * NLR-verified monthly modeled MWh from NSRDB GHI × capacity × PR (institutional production proxy).
 */
export async function getNrelModeledMonthlyMwh(
  latitude: number,
  longitude: number,
  capacityMw: number,
  monthsBack: number,
  performanceRatio: number = DEFAULT_PERFORMANCE_RATIO,
): Promise<Map<string, number>> {
  const { start, end, nsrdbYear } = monthRangeUtc(monthsBack);
  const ts = await fetchNsrdbTimeSeries4km(latitude, longitude, { year: nsrdbYear });
  const monthlyGhi = aggregateMonthlyGhiKwhPerM2(ts.rows, ts.intervalMinutes);
  const out = new Map<string, number>();
  for (const [period, ghiKwhM2] of monthlyGhi) {
    if (period < start || period > end) continue;
    const mwh = ghiKwhM2 * capacityMw * 1000 * performanceRatio;
    out.set(period, Number(mwh.toFixed(3)));
  }
  return out;
}

export async function computeAnnualKwhNsrdb(
  latitude: number,
  longitude: number,
  capacityMw: number,
  performanceRatio: number = DEFAULT_PERFORMANCE_RATIO,
): Promise<number> {
  const modeled = await getNrelModeledMonthlyMwh(latitude, longitude, capacityMw, 12, performanceRatio);
  let sumKwh = 0;
  for (const mwh of modeled.values()) {
    sumKwh += mwh * 1000;
  }
  return Number(sumKwh.toFixed(0));
}

export interface FinancialApyInputs {
  annualKwh: number;
  marketPpaUsdPerKwh: number;
  annualOmUsd: number;
  assetCapexUsd: number;
}

/**
 * Financial APY = ((Annual kWh × Market PPA $/kWh) − Annual O&M) / Asset CapEx
 */
export function computeFinancialApy(inputs: FinancialApyInputs): number | null {
  const { annualKwh, marketPpaUsdPerKwh, annualOmUsd, assetCapexUsd } = inputs;
  if (!Number.isFinite(annualKwh) || annualKwh <= 0) return null;
  if (!Number.isFinite(marketPpaUsdPerKwh) || marketPpaUsdPerKwh <= 0) return null;
  if (!Number.isFinite(assetCapexUsd) || assetCapexUsd <= 0) return null;
  const gross = annualKwh * marketPpaUsdPerKwh;
  const net = gross - (Number.isFinite(annualOmUsd) ? annualOmUsd : 0);
  if (net <= 0) return null;
  return net / assetCapexUsd;
}

export interface InstitutionalYieldResult {
  annualKwhNsrdb: number;
  financialApy: number | null;
  financialApyPct: number | null;
  marketPpa: MarketPpaResolution;
  assetCapexUsd: number;
  annualOmUsd: number;
}

/**
 * Full institutional yield stack: NSRDB annual kWh, market PPA resolution, APY vs CapEx.
 */
export async function computeInstitutionalYieldForProject(params: {
  state: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  capacityMw: number;
  fixedPpaRatePerKwh?: string | number | null;
  monthlyOpexUsd?: string | number | null;
  totalCapexUsd?: string | number | null;
  performanceRatio?: number;
}): Promise<InstitutionalYieldResult | null> {
  const capMw = params.capacityMw;
  if (!Number.isFinite(capMw) || capMw <= 0) return null;

  const lat = Number(params.latitude);
  const lon = Number(params.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const marketPpa = resolveMarketPpaUsdPerKwh({
    state: params.state,
    latitude: lat,
    longitude: lon,
    fixedPpaRatePerKwh: params.fixedPpaRatePerKwh,
  });

  const pr = params.performanceRatio ?? DEFAULT_PERFORMANCE_RATIO;
  const annualKwhNsrdb = await computeAnnualKwhNsrdb(lat, lon, capMw, pr);

  const monthlyOm = Number(params.monthlyOpexUsd ?? 0);
  const annualOmUsd = Number.isFinite(monthlyOm) ? monthlyOm * 12 : 0;

  const fromStack = Number(params.totalCapexUsd);
  const assetCapexUsd =
    Number.isFinite(fromStack) && fromStack > 0 ? fromStack : capMw * 1_000_000;

  const financialApy = computeFinancialApy({
    annualKwh: annualKwhNsrdb,
    marketPpaUsdPerKwh: marketPpa.usdPerKwh,
    annualOmUsd,
    assetCapexUsd,
  });

  return {
    annualKwhNsrdb,
    financialApy,
    financialApyPct: financialApy != null ? financialApy * 100 : null,
    marketPpa,
    assetCapexUsd,
    annualOmUsd,
  };
}

export async function computeSgtScoreFromNsrdbTruth(
  latitude: number,
  longitude: number,
  opts: NsrdbFetchOptions = {},
): Promise<SgtNrelScoreResult> {
  const ts = await fetchNsrdbTimeSeries4km(latitude, longitude, opts);
  const rows30 = sliceRowsByWindow(ts.rows, 30);
  const rows365 = sliceRowsByWindow(ts.rows, 365);

  const ghi30 = integrateIrradianceKwhPerM2(rows30, ts.intervalMinutes, "ghiWm2");
  const ghi365 = integrateIrradianceKwhPerM2(rows365, ts.intervalMinutes, "ghiWm2");

  // Score heuristic:
  // - prefer stable, data-rich sites (365d window), but keep responsiveness (30d)
  // - map to 0..1 with soft saturation.
  const normalized = (x: number) => 1 - Math.exp(-Math.max(0, x) / 400); // 400 kWh/m2 saturates near 1
  const sgtScoreNrel = Math.max(
    0,
    Math.min(1, 0.35 * normalized(ghi30) + 0.65 * normalized(ghi365)),
  );

  return {
    truthSource: "NLR_NSRDB_4KM",
    intervalMinutes: ts.intervalMinutes,
    year: ts.year,
    ghiKwhPerM2_30d: ghi30,
    ghiKwhPerM2_365d: ghi365,
    sgtScoreNrel: Number(sgtScoreNrel.toFixed(4)),
  };
}


import axios from "axios";

export type MeterDataSource = "synthetic" | "stored";

export interface BacktestSiteConfig {
  siteId: string;
  siteName: string;
  latitude: number;
  longitude: number;
  capacityKw: number;
  arrayType: string;
  startDate: string;
  endDate: string;
  projectId?: string;
  meterDataSource?: MeterDataSource;
}

export interface BacktestInterval {
  timestamp: string;
  hour: number;
  satelliteKw: number;
  meterKw: number;
  deltaKw: number;
  deltaPct: number;
  handshakeCleared2Pct: boolean;
  handshakeCleared5Pct: boolean;
}

export interface BacktestStatistics {
  mae: number;
  rmse: number;
  passRate2Pct: number;
  passRate5Pct: number;
  confidenceScore: number;
  peakProductionHour: number;
  totalEnergyMwh: number;
  totalIntervals: number;
  daylightIntervals: number;
  nightIntervals: number;
  errorBuckets: {
    within1Pct: number;
    within2Pct: number;
    within5Pct: number;
    above5Pct: number;
  };
}

export type SatelliteSource = "SOLCAST_HISTORICAL" | "SOLCAST_ESTIMATED_ACTUALS" | "SYNTHETIC_FALLBACK";

export interface BacktestReport {
  site: BacktestSiteConfig;
  statistics: BacktestStatistics;
  intervals: BacktestInterval[];
  satelliteSource: SatelliteSource;
  meterDataSource: MeterDataSource;
  generatedAt: string;
  engineVersion: string;
}

const PVDAQ_9068: BacktestSiteConfig = {
  siteId: "9068",
  siteName: "NREL PVDAQ Site 9068 — Greeley, CO",
  latitude: 40.3864,
  longitude: -104.5512,
  capacityKw: 4738,
  arrayType: "horizontal_single_axis",
  startDate: "2023-06-01",
  endDate: "2023-06-30",
};

function solarElevation(dayOfYear: number, hour: number, latitude: number): number {
  const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const decRad = declination * Math.PI / 180;
  const latRad = latitude * Math.PI / 180;
  const hourAngle = (hour - 12) * 15 * Math.PI / 180;
  const sinElev = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle);
  return Math.asin(Math.max(-1, Math.min(1, sinElev))) * 180 / Math.PI;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generatePvdaqProduction(config: BacktestSiteConfig): Map<string, number> {
  const production = new Map<string, number>();
  const rng = seededRandom(906820230601);

  const start = new Date(config.startDate + "T00:00:00Z");
  const end = new Date(config.endDate + "T23:59:59Z");

  let dailyCloudPattern = 0.85;

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getUTCFullYear(), 0, 0).getTime()) / 86400000);

    dailyCloudPattern = 0.80 + rng() * 0.18;
    const hasMorningCloud = rng() < 0.25;
    const hasAfternoonCloud = rng() < 0.20;

    for (let interval = 0; interval < 96; interval++) {
      const hour = interval * 0.25;
      const ts = new Date(d);
      ts.setUTCHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
      const key = ts.toISOString();

      const elev = solarElevation(dayOfYear, hour, config.latitude);

      if (elev <= 2) {
        production.set(key, 0);
        continue;
      }

      const airmass = 1 / Math.sin(Math.max(elev, 5) * Math.PI / 180);
      const clearSkyFraction = Math.pow(0.7, Math.pow(airmass, 0.678));

      const trackingBoost = config.arrayType === "horizontal_single_axis" ? 1.15 : 1.0;
      const elevNorm = Math.sin(elev * Math.PI / 180);

      let cloudFactor = dailyCloudPattern;
      if (hasMorningCloud && hour < 10) cloudFactor *= (0.6 + rng() * 0.3);
      if (hasAfternoonCloud && hour > 14) cloudFactor *= (0.65 + rng() * 0.25);

      const tempDerate = hour > 11 && hour < 16 ? (0.94 + rng() * 0.04) : (0.97 + rng() * 0.02);
      const soiling = 0.98;

      let powerKw = config.capacityKw * elevNorm * clearSkyFraction * trackingBoost * cloudFactor * tempDerate * soiling;

      const minuteNoise = 1.0 + (rng() - 0.5) * 0.06;
      powerKw *= minuteNoise;

      if (powerKw > config.capacityKw * 0.95) {
        powerKw = config.capacityKw * (0.93 + rng() * 0.05);
      }

      production.set(key, Math.max(0, Number(powerKw.toFixed(2))));
    }
  }

  return production;
}

function generate31DayChunks(startDate: string, endDate: string): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  const end = new Date(endDate + "T23:59:59Z");
  let cursor = new Date(startDate + "T00:00:00Z");

  while (cursor < end) {
    const chunkEnd = new Date(cursor.getTime() + 31 * 24 * 60 * 60 * 1000);
    const actualEnd = chunkEnd > end ? end : chunkEnd;
    chunks.push({
      start: cursor.toISOString().replace(".000Z", "Z"),
      end: actualEnd.toISOString().replace(".000Z", "Z"),
    });
    cursor = new Date(chunkEnd.getTime());
  }

  return chunks;
}

function parseSolcastRecords(records: any[]): Map<string, number> {
  const solcastMap = new Map<string, number>();
  for (const record of records) {
    const periodEnd = new Date(record.period_end);
    const periodStart = new Date(periodEnd.getTime() - 15 * 60 * 1000);
    const periodKey = periodStart.toISOString();
    solcastMap.set(periodKey, record.pv_estimate ?? 0);
  }
  return solcastMap;
}

function evaluateCoverage(solcastMap: Map<string, number>, timestamps: string[]): { matchedCount: number; coveragePct: number } {
  const daylightTimestamps = timestamps.filter(t => {
    const h = new Date(t).getUTCHours();
    return h >= 5 && h <= 20;
  });
  const matchedCount = daylightTimestamps.filter(t => solcastMap.has(t)).length;
  const coveragePct = daylightTimestamps.length > 0
    ? Math.min(100, (matchedCount / daylightTimestamps.length) * 100)
    : 0;
  return { matchedCount, coveragePct };
}

async function fetchSolcastHistoric(
  config: BacktestSiteConfig,
  apiKey: string,
): Promise<Map<string, number> | null> {
  const chunks = generate31DayChunks(config.startDate, config.endDate);
  console.log(`   🛰️ Fetching Solcast historic data: ${chunks.length} chunk(s) for ${config.startDate} → ${config.endDate}`);

  const solcastMap = new Map<string, number>();
  let totalRecords = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      console.log(`   🛰️ Chunk ${i + 1}/${chunks.length}: ${chunk.start} → ${chunk.end}`);
      const response = await axios.get(
        "https://api.solcast.com.au/data/historic/rooftop_pv_power",
        {
          params: {
            latitude: config.latitude,
            longitude: config.longitude,
            capacity: config.capacityKw,
            start: chunk.start,
            end: chunk.end,
            period: "PT15M",
            array_type: config.arrayType === "horizontal_single_axis" ? "horizontal_single_axis" : "fixed",
            format: "json",
          },
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 30000,
        },
      );

      const records = response.data?.estimated_actuals || [];
      if (records.length > 0) {
        const chunkMap = parseSolcastRecords(records);
        for (const [k, v] of chunkMap) {
          solcastMap.set(k, v);
        }
        totalRecords += records.length;
        console.log(`      ✅ ${records.length} records retrieved`);
      } else {
        console.log(`      ⚠️ No records for this chunk`);
      }

      if (i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        console.log(`      ⚠️ Chunk ${i + 1} failed (HTTP ${status}), aborting historic fetch`);
      } else {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`      ⚠️ Chunk ${i + 1} error: ${msg}, aborting historic fetch`);
      }
      return null;
    }
  }

  if (totalRecords === 0) {
    console.log(`   ⚠️ Solcast historic returned no data`);
    return null;
  }

  console.log(`   🛰️ Solcast historic total: ${totalRecords} records across ${chunks.length} chunks`);
  return solcastMap;
}

async function fetchSolcastEstimatedActuals(
  config: BacktestSiteConfig,
  apiKey: string,
  timestamps: string[],
): Promise<Map<string, number> | null> {
  try {
    console.log(`   🛰️ Trying Solcast estimated_actuals (recent ~7 days)...`);
    const response = await axios.get(
      "https://api.solcast.com.au/world_pv_power/estimated_actuals",
      {
        params: {
          latitude: config.latitude,
          longitude: config.longitude,
          capacity: config.capacityKw,
          period: "PT15M",
          format: "json",
          hours: 168,
        },
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 20000,
      },
    );

    const actuals = response.data?.estimated_actuals;
    if (!actuals || actuals.length === 0) {
      console.log(`   ⚠️ Solcast estimated_actuals returned no data`);
      return null;
    }

    console.log(`   🛰️ Solcast estimated_actuals: ${actuals.length} records`);
    const solcastMap = parseSolcastRecords(actuals);

    const { matchedCount, coveragePct } = evaluateCoverage(solcastMap, timestamps);
    if (coveragePct < 10) {
      console.log(`   ⚠️ estimated_actuals coverage too low (${coveragePct.toFixed(1)}%), period outside ~7-day window`);
      return null;
    }

    console.log(`   ✅ estimated_actuals matched ${matchedCount}/${timestamps.length} intervals (${coveragePct.toFixed(1)}% daylight)`);
    return solcastMap;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.log(`   ⚠️ estimated_actuals failed (HTTP ${error.response?.status})`);
    } else {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`   ⚠️ estimated_actuals error: ${msg}`);
    }
    return null;
  }
}

interface SolcastResult {
  data: Map<string, number>;
  source: SatelliteSource;
}

async function fetchSolcastHistoricalSeries(
  config: BacktestSiteConfig,
  timestamps: string[],
): Promise<SolcastResult | null> {
  const SOLCAST_API_KEY = process.env.SOLCAST_API_KEY;
  if (!SOLCAST_API_KEY) {
    console.log(`   ⚠️ SOLCAST_API_KEY not configured, using synthetic satellite model`);
    return null;
  }

  console.log(`   🛰️ Solcast satellite data fetch for ${config.capacityKw} kW at ${config.latitude}, ${config.longitude}`);
  console.log(`   🛰️ Date range: ${config.startDate} → ${config.endDate}`);

  const historicResult = await fetchSolcastHistoric(config, SOLCAST_API_KEY);
  if (historicResult) {
    const { matchedCount, coveragePct } = evaluateCoverage(historicResult, timestamps);
    if (coveragePct >= 10) {
      console.log(`   ✅ Using Solcast historic data: ${matchedCount}/${timestamps.length} intervals (${coveragePct.toFixed(1)}% daylight coverage)`);
      return { data: historicResult, source: "SOLCAST_HISTORICAL" };
    }
    console.log(`   ⚠️ Historic data coverage too low (${coveragePct.toFixed(1)}%), trying estimated_actuals...`);
  }

  const estimatedResult = await fetchSolcastEstimatedActuals(config, SOLCAST_API_KEY, timestamps);
  if (estimatedResult) {
    return { data: estimatedResult, source: "SOLCAST_ESTIMATED_ACTUALS" };
  }

  console.log(`   ⚠️ All Solcast endpoints exhausted, falling back to synthetic satellite model`);
  return null;
}

function generateSyntheticSatelliteEstimates(config: BacktestSiteConfig): Map<string, number> {
  const estimates = new Map<string, number>();
  const rng = seededRandom(720230601);

  const start = new Date(config.startDate + "T00:00:00Z");
  const end = new Date(config.endDate + "T23:59:59Z");

  let dailyCloudPattern = 0.85;

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getUTCFullYear(), 0, 0).getTime()) / 86400000);

    dailyCloudPattern = 0.82 + rng() * 0.16;
    const hasMorningCloud = rng() < 0.22;
    const hasAfternoonCloud = rng() < 0.18;

    for (let interval = 0; interval < 96; interval++) {
      const hour = interval * 0.25;
      const ts = new Date(d);
      ts.setUTCHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
      const key = ts.toISOString();

      const elev = solarElevation(dayOfYear, hour, config.latitude);

      if (elev <= 2) {
        estimates.set(key, 0);
        continue;
      }

      const airmass = 1 / Math.sin(Math.max(elev, 5) * Math.PI / 180);
      const clearSkyFraction = Math.pow(0.7, Math.pow(airmass, 0.678));

      const trackingBoost = config.arrayType === "horizontal_single_axis" ? 1.15 : 1.0;
      const elevNorm = Math.sin(elev * Math.PI / 180);

      let cloudFactor = dailyCloudPattern;
      if (hasMorningCloud && hour < 10) cloudFactor *= (0.62 + rng() * 0.28);
      if (hasAfternoonCloud && hour > 14) cloudFactor *= (0.67 + rng() * 0.23);

      const tempDerate = hour > 11 && hour < 16 ? (0.94 + rng() * 0.04) : (0.97 + rng() * 0.02);
      const soiling = 0.975;

      let powerKw = config.capacityKw * elevNorm * clearSkyFraction * trackingBoost * cloudFactor * tempDerate * soiling;

      const irradianceNoise = 1.0 + (rng() - 0.5) * 0.05;
      powerKw *= irradianceNoise;

      if (powerKw > config.capacityKw * 0.95) {
        powerKw = config.capacityKw * (0.93 + rng() * 0.05);
      }

      estimates.set(key, Math.max(0, Number(powerKw.toFixed(2))));
    }
  }

  return estimates;
}

function calculateStatistics(intervals: BacktestInterval[], config: BacktestSiteConfig): BacktestStatistics {
  const daylightIntervals = intervals.filter(i => i.meterKw > 0 || i.satelliteKw > 0);
  const nightIntervals = intervals.filter(i => i.meterKw === 0 && i.satelliteKw === 0);

  const absErrors = daylightIntervals.map(i => Math.abs(i.satelliteKw - i.meterKw));
  const sqErrors = daylightIntervals.map(i => Math.pow(i.satelliteKw - i.meterKw, 2));

  const mae = absErrors.length > 0
    ? (absErrors.reduce((a, b) => a + b, 0) / absErrors.length) / config.capacityKw * 100
    : 0;

  const rmse = sqErrors.length > 0
    ? Math.sqrt(sqErrors.reduce((a, b) => a + b, 0) / sqErrors.length) / config.capacityKw * 100
    : 0;

  const passRate2Pct = daylightIntervals.length > 0
    ? (daylightIntervals.filter(i => i.handshakeCleared2Pct).length / daylightIntervals.length) * 100
    : 0;

  const passRate5Pct = daylightIntervals.length > 0
    ? (daylightIntervals.filter(i => i.handshakeCleared5Pct).length / daylightIntervals.length) * 100
    : 0;

  const confidenceScore = Math.max(0, Math.min(100, 100 - mae * 10));

  const hourlyProd: Record<number, { total: number; count: number }> = {};
  for (const i of intervals) {
    const h = i.hour;
    if (!hourlyProd[h]) hourlyProd[h] = { total: 0, count: 0 };
    hourlyProd[h].total += i.meterKw;
    hourlyProd[h].count++;
  }
  let peakHour = 12;
  let peakAvg = 0;
  for (const [h, data] of Object.entries(hourlyProd)) {
    const avg = data.total / data.count;
    if (avg > peakAvg) {
      peakAvg = avg;
      peakHour = Number(h);
    }
  }

  const totalEnergyKwh = intervals.reduce((sum, i) => sum + (i.meterKw * 0.25), 0);
  const totalEnergyMwh = Number((totalEnergyKwh / 1000).toFixed(2));

  const within1Pct = daylightIntervals.filter(i => i.deltaPct <= 1).length;
  const within2Pct = daylightIntervals.filter(i => i.deltaPct > 1 && i.deltaPct <= 2).length;
  const within5Pct = daylightIntervals.filter(i => i.deltaPct > 2 && i.deltaPct <= 5).length;
  const above5Pct = daylightIntervals.filter(i => i.deltaPct > 5).length;

  return {
    mae: Number(mae.toFixed(4)),
    rmse: Number(rmse.toFixed(4)),
    passRate2Pct: Number(passRate2Pct.toFixed(2)),
    passRate5Pct: Number(passRate5Pct.toFixed(2)),
    confidenceScore: Number(confidenceScore.toFixed(1)),
    peakProductionHour: peakHour,
    totalEnergyMwh,
    totalIntervals: intervals.length,
    daylightIntervals: daylightIntervals.length,
    nightIntervals: nightIntervals.length,
    errorBuckets: { within1Pct, within2Pct, within5Pct, above5Pct },
  };
}

async function loadStoredMeterData(projectId: string, config: BacktestSiteConfig): Promise<Map<string, number> | null> {
  try {
    const { csvConnector } = await import("./scada-connector");
    const windowStart = new Date(config.startDate);
    const windowEnd = new Date(config.endDate);

    const intervals = await csvConnector.fetchIntervals(projectId, windowStart, windowEnd);
    if (intervals.length === 0) return null;

    const meterMap = new Map<string, number>();

    for (const interval of intervals) {
      if (interval.granularity === "15min" || interval.granularity === "hourly") {
        const kw = (interval.productionMwh * 1000) / (interval.granularity === "15min" ? 0.25 : 1);
        meterMap.set(interval.periodStart.toISOString(), Math.max(0, Number(kw.toFixed(2))));
      } else {
        const periodMs = interval.periodEnd.getTime() - interval.periodStart.getTime();
        const daysInPeriod = Math.max(1, periodMs / (1000 * 60 * 60 * 24));
        const dailyMwh = interval.productionMwh / daysInPeriod;

        for (let d = new Date(interval.periodStart); d < interval.periodEnd && d < windowEnd; d = new Date(d.getTime() + 86400000)) {
          if (d < windowStart) continue;
          const dayOfYear = Math.floor((d.getTime() - new Date(d.getUTCFullYear(), 0, 0).getTime()) / 86400000);
          for (let q = 0; q < 96; q++) {
            const hour = q * 0.25;
            const ts = new Date(d);
            ts.setUTCHours(Math.floor(hour), (hour % 1) * 60, 0, 0);

            const elev = solarElevation(dayOfYear, hour, config.latitude);
            if (elev <= 2) {
              meterMap.set(ts.toISOString(), 0);
              continue;
            }

            const elevNorm = Math.sin(elev * Math.PI / 180);
            const totalElevNormForDay = Array.from({ length: 96 }, (_, i) => {
              const h = i * 0.25;
              const e = solarElevation(dayOfYear, h, config.latitude);
              return e > 2 ? Math.sin(e * Math.PI / 180) : 0;
            }).reduce((a, b) => a + b, 0);

            const intervalMwh = totalElevNormForDay > 0 ? dailyMwh * (elevNorm / totalElevNormForDay) : 0;
            const intervalKw = (intervalMwh * 1000) / 0.25;
            meterMap.set(ts.toISOString(), Math.max(0, Number(intervalKw.toFixed(2))));
          }
        }
      }
    }

    return meterMap.size > 0 ? meterMap : null;
  } catch (err) {
    console.error("Failed to load stored meter data:", err);
    return null;
  }
}

export async function runBacktest(config?: BacktestSiteConfig): Promise<BacktestReport> {
  const site = config || PVDAQ_9068;
  const dataSource = site.meterDataSource || "synthetic";

  console.log(`\n📊 [Backtest Engine] Starting SGT Backtest for ${site.siteName}`);
  console.log(`   Site ID: ${site.siteId} | Capacity: ${site.capacityKw} kW | Array: ${site.arrayType}`);
  console.log(`   Period: ${site.startDate} → ${site.endDate}`);
  console.log(`   Location: ${site.latitude}, ${site.longitude}`);
  console.log(`   Meter Data Source: ${dataSource}\n`);

  let meterData: Map<string, number>;
  let actualMeterSource: MeterDataSource = dataSource;
  if (dataSource === "stored" && site.projectId) {
    const storedData = await loadStoredMeterData(site.projectId, site);
    if (storedData) {
      meterData = storedData;
      console.log(`   ✅ Stored production data loaded: ${meterData.size} intervals from database`);
    } else {
      meterData = generatePvdaqProduction(site);
      actualMeterSource = "synthetic";
      console.log(`   ⚠️ No stored data found, falling back to synthetic: ${meterData.size} intervals`);
    }
  } else {
    meterData = generatePvdaqProduction(site);
    console.log(`   ✅ Synthetic PVDAQ meter data generated: ${meterData.size} intervals`);
  }

  const allTimestamps = Array.from(meterData.keys());
  let satelliteSource: SatelliteSource = "SYNTHETIC_FALLBACK";
  let satelliteData: Map<string, number>;

  const solcastSeries = await fetchSolcastHistoricalSeries(site, allTimestamps);
  if (solcastSeries) {
    satelliteSource = solcastSeries.source;
    satelliteData = solcastSeries.data;
    for (const ts of allTimestamps) {
      if (!satelliteData.has(ts)) {
        satelliteData.set(ts, 0);
      }
    }
    console.log(`   ✅ Using ${solcastSeries.source} as satellite truth (${satelliteData.size} intervals)`);
  } else {
    satelliteData = generateSyntheticSatelliteEstimates(site);
    console.log(`   ✅ Using synthetic satellite model as fallback (${satelliteData.size} intervals)`);
  }

  const intervals: BacktestInterval[] = [];
  for (const [timestamp, meterKw] of meterData) {
    const satelliteKw = satelliteData.get(timestamp) || 0;
    const deltaKw = Math.abs(satelliteKw - meterKw);
    const deltaPct = site.capacityKw > 0 ? (deltaKw / site.capacityKw) * 100 : 0;

    intervals.push({
      timestamp,
      hour: new Date(timestamp).getUTCHours(),
      satelliteKw: Number(satelliteKw.toFixed(2)),
      meterKw: Number(meterKw.toFixed(2)),
      deltaKw: Number(deltaKw.toFixed(2)),
      deltaPct: Number(deltaPct.toFixed(4)),
      handshakeCleared2Pct: deltaPct <= 2,
      handshakeCleared5Pct: deltaPct <= 5,
    });
  }

  intervals.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const statistics = calculateStatistics(intervals, site);

  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║     SGT BACKTEST REPORT — ${site.siteId}                  ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  Site: ${site.siteName.padEnd(40)}║`);
  console.log(`║  Period: ${site.startDate} → ${site.endDate}               ║`);
  console.log(`║  Capacity: ${site.capacityKw} kW (${(site.capacityKw/1000).toFixed(1)} MW)                    ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  CONFIDENCE SCORE: ${statistics.confidenceScore.toFixed(1)}%                       ║`);
  console.log(`║  MAE:  ${statistics.mae.toFixed(4)}%                                  ║`);
  console.log(`║  RMSE: ${statistics.rmse.toFixed(4)}%                                  ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  SGT Pass Rate @2%: ${statistics.passRate2Pct.toFixed(2)}%                    ║`);
  console.log(`║  SGT Pass Rate @5%: ${statistics.passRate5Pct.toFixed(2)}%                    ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  Total Intervals: ${statistics.totalIntervals}                          ║`);
  console.log(`║  Daylight Intervals: ${statistics.daylightIntervals}                       ║`);
  console.log(`║  Total Energy: ${statistics.totalEnergyMwh} MWh                      ║`);
  console.log(`║  Peak Hour (UTC): ${statistics.peakProductionHour}:00                          ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  Error Buckets (daylight only):                 ║`);
  console.log(`║    ≤1%:  ${statistics.errorBuckets.within1Pct} intervals                          ║`);
  console.log(`║    1-2%: ${statistics.errorBuckets.within2Pct} intervals                           ║`);
  console.log(`║    2-5%: ${statistics.errorBuckets.within5Pct} intervals                           ║`);
  console.log(`║    >5%:  ${statistics.errorBuckets.above5Pct} intervals                            ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  Satellite Source: ${satelliteSource.padEnd(29)}║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);

  return {
    site,
    statistics,
    intervals,
    satelliteSource,
    meterDataSource: actualMeterSource,
    generatedAt: new Date().toISOString(),
    engineVersion: "v2026.1-backtest",
  };
}

let cachedReport: BacktestReport | null = null;

export async function getCachedBacktestReport(): Promise<BacktestReport> {
  if (!cachedReport) {
    cachedReport = await runBacktest();
  }
  return cachedReport;
}

export function clearBacktestCache(): void {
  cachedReport = null;
}

import { db } from "../db";
import { projects, meters, sgtIntervals, scadaDataSources } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getSatellitePowerEstimate, type SkyOracleResult } from "./solcast";
import { getNetMeterShadow, type NetMeterShadowResult } from "./utility-shadow";
import { addMinutes } from "date-fns";
import { storage } from "../storage";

export interface SgtHandshakeResult {
  projectId: string;
  projectName: string;
  intervalId: number;
  syntheticGrossWh: number;
  skyOracle: {
    pvEstimateKw: number;
    timestamp: string;
    source: "SOLCAST" | "SYNTHETIC_FALLBACK";
    isRealSite: boolean;
  };
  utilityShadow: NetMeterShadowResult;
  telemetrySources: string[];
}

function generateSyntheticSolarEstimate(capacityKw: number): SkyOracleResult {
  const hour = new Date().getUTCHours();
  let intensity = 0;
  if (hour >= 6 && hour <= 20) {
    intensity = Math.sin(Math.PI * (hour - 6) / 14);
  }
  const cloudFactor = 0.85 + Math.random() * 0.10;
  const pvEstimateKw = capacityKw * intensity * cloudFactor;

  return {
    pvEstimateKw: Number(pvEstimateKw.toFixed(4)),
    timestamp: new Date().toISOString(),
    isRealSite: false,
    siteName: "Synthetic Fallback (no Solcast)",
  };
}

const METERED_FRESHNESS_DAYS = 90;

async function hasRealScadaData(projectId: string): Promise<boolean> {
  try {
    const dataSources = await storage.getScadaDataSourcesByProject(projectId);
    const realSources = dataSources.filter(
      s => s.status === "ACTIVE" && (s.sourceType === "CSV_UPLOAD" || s.sourceType === "CONNECTOR")
    );
    if (realSources.length === 0) return false;

    const production = await storage.getProductionByProject(projectId);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - METERED_FRESHNESS_DAYS);

    return production.some(p =>
      (p.source === "CSV_UPLOAD" || p.source === "SCADA") &&
      new Date(p.periodEnd) > cutoff
    );
  } catch {
    return false;
  }
}

async function getLatestMeterReading(projectId: string, capacityKw: number): Promise<{ grossKw: number; source: string; granularity: string; periodCoverage: string } | null> {
  try {
    const { csvConnector } = await import("./scada-connector");
    const now = new Date();
    const lookback = new Date(now);
    lookback.setDate(lookback.getDate() - METERED_FRESHNESS_DAYS);

    const intervals = await csvConnector.fetchIntervals(projectId, lookback, now);
    if (intervals.length === 0) return null;

    intervals.sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime());
    const latest = intervals[0];

    const hoursInPeriod = (latest.periodEnd.getTime() - latest.periodStart.getTime()) / (1000 * 60 * 60);
    const avgKw = (latest.productionMwh * 1000) / Math.max(0.25, hoursInPeriod);

    return {
      grossKw: Math.min(capacityKw, Math.max(0, Number(avgKw.toFixed(4)))),
      source: latest.source,
      granularity: latest.granularity,
      periodCoverage: `${latest.periodStart.toISOString().slice(0, 10)} to ${latest.periodEnd.toISOString().slice(0, 10)}`,
    };
  } catch {
    return null;
  }
}

export async function runSgtHandshake(
  projectId: string,
): Promise<SgtHandshakeResult> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const capacityKw = Number(project.capacityKw || 0);
  if (capacityKw <= 0) {
    throw new Error(
      `Project ${projectId} has no capacity configured (capacityKw=${project.capacityKw})`,
    );
  }

  const projectMeters = await db
    .select()
    .from(meters)
    .where(eq(meters.projectId, projectId));

  if (projectMeters.length === 0) {
    throw new Error(`No meters found for project ${projectId}`);
  }

  const activeMeter = projectMeters.find((m) => m.isActive) || projectMeters[0];

  let skyResult: SkyOracleResult;
  let solcastSource: "SOLCAST" | "SYNTHETIC_FALLBACK";
  const telemetrySources: string[] = [];

  try {
    const lat = project.latitude ? Number(project.latitude) : undefined;
    const lon = project.longitude ? Number(project.longitude) : undefined;
    skyResult = await getSatellitePowerEstimate(capacityKw, lat, lon);
    solcastSource = "SOLCAST";
    telemetrySources.push("Solcast Satellite API");
    console.log(
      `🛰️ [SGT Handshake] Sky Oracle returned ${skyResult.pvEstimateKw} kW from ${skyResult.siteName}`,
    );
  } catch (err: any) {
    console.warn(
      `⚠️ [SGT Handshake] Solcast unavailable (${err.message}), using synthetic fallback`,
    );
    skyResult = generateSyntheticSolarEstimate(capacityKw);
    solcastSource = "SYNTHETIC_FALLBACK";
    telemetrySources.push("Synthetic Solar Estimate (Solcast unavailable)");
  }

  const hasRealData = await hasRealScadaData(projectId);
  let grossWh: number;
  let qualityFlag: string;
  let netWhValue: string;

  if (hasRealData) {
    const meterReading = await getLatestMeterReading(projectId, capacityKw);
    if (meterReading) {
      grossWh = (meterReading.grossKw / 4) * 1000;
      const isHighFidelity = meterReading.granularity === "15min" || meterReading.granularity === "hourly";
      qualityFlag = isHighFidelity ? "METERED" : "METERED_AGGREGATE";
      netWhValue = "0.00";
      telemetrySources.push(`Real SCADA Data (${meterReading.source}, ${meterReading.granularity} granularity, ${meterReading.periodCoverage})`);
      console.log(`📊 [SGT Handshake] Using real meter data: ${meterReading.grossKw.toFixed(2)} kW from ${meterReading.source} (${meterReading.granularity})`);
    } else {
      const utilityShadowResult = getNetMeterShadow(capacityKw, skyResult.pvEstimateKw);
      telemetrySources.push("Utility Shadow (simulated net meter)");
      const reconciledSolarKw = utilityShadowResult.consumptionKw - utilityShadowResult.netMeterKw;
      grossWh = (reconciledSolarKw / 4) * 1000;
      qualityFlag = solcastSource === "SOLCAST" ? "OK" : "SYNTHETIC_FALLBACK";
      netWhValue = ((utilityShadowResult.netMeterKw / 4) * 1000).toFixed(2);
    }
  } else {
    const utilityShadowResult = getNetMeterShadow(capacityKw, skyResult.pvEstimateKw);
    telemetrySources.push("Utility Shadow (simulated net meter)");
    const reconciledSolarKw = utilityShadowResult.consumptionKw - utilityShadowResult.netMeterKw;
    grossWh = (reconciledSolarKw / 4) * 1000;
    qualityFlag = solcastSource === "SOLCAST" ? "OK" : "SYNTHETIC_FALLBACK";
    netWhValue = ((utilityShadowResult.netMeterKw / 4) * 1000).toFixed(2);
  }

  const utilityShadowResult = getNetMeterShadow(capacityKw, skyResult.pvEstimateKw);

  const now = new Date();
  const intervalStart = new Date(now);
  intervalStart.setMinutes(Math.floor(now.getMinutes() / 15) * 15, 0, 0);
  const intervalEnd = addMinutes(intervalStart, 15);

  const [inserted] = await db
    .insert(sgtIntervals)
    .values({
      meterId: activeMeter.id,
      intervalStart,
      intervalEnd,
      netWh: netWhValue,
      expectedGrossWh: ((skyResult.pvEstimateKw / 4) * 1000).toFixed(2),
      syntheticGrossWh: grossWh.toFixed(2),
      irradianceWm2: (
        skyResult.pvEstimateKw > 0
          ? ((skyResult.pvEstimateKw / capacityKw) * 1000).toFixed(4)
          : "0.0000"
      ),
      source: hasRealData ? "SCADA" : (solcastSource === "SOLCAST" ? "SOLCAST" : "CALCULATED"),
      qualityFlag,
    })
    .returning();

  console.log(
    `✅ [SGT Handshake] Interval #${inserted.id} created: ${grossWh.toFixed(2)} Wh gross (${qualityFlag})`,
  );
  console.log(hasRealData ? "Real SCADA Data Integrated: SGT Loop Closed." : "Utility Shadow Integrated: SGT Loop Closed.");

  return {
    projectId: project.id,
    projectName: project.name,
    intervalId: inserted.id,
    syntheticGrossWh: Number(grossWh.toFixed(2)),
    skyOracle: {
      pvEstimateKw: skyResult.pvEstimateKw,
      timestamp: skyResult.timestamp,
      source: solcastSource,
      isRealSite: skyResult.isRealSite,
    },
    utilityShadow: utilityShadowResult,
    telemetrySources,
  };
}

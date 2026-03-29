import { db } from "../db";
import { projects, meters, sgtIntervals } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getSatellitePowerEstimate, type SkyOracleResult } from "./solcast";
import { getNetMeterShadow, type NetMeterShadowResult } from "./utility-shadow";
import { addMinutes } from "date-fns";

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

  const utilityShadowResult = getNetMeterShadow(capacityKw, skyResult.pvEstimateKw);
  telemetrySources.push("Utility Shadow (simulated net meter)");

  const reconciledSolarKw =
    utilityShadowResult.consumptionKw - utilityShadowResult.netMeterKw;
  const syntheticGrossWh = (reconciledSolarKw / 4) * 1000;

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
      netWh: ((utilityShadowResult.netMeterKw / 4) * 1000).toFixed(2),
      expectedGrossWh: ((skyResult.pvEstimateKw / 4) * 1000).toFixed(2),
      syntheticGrossWh: syntheticGrossWh.toFixed(2),
      irradianceWm2: (
        skyResult.pvEstimateKw > 0
          ? ((skyResult.pvEstimateKw / capacityKw) * 1000).toFixed(4)
          : "0.0000"
      ),
      source: solcastSource === "SOLCAST" ? "SOLCAST" : "CALCULATED",
      qualityFlag: solcastSource === "SOLCAST" ? "OK" : "SYNTHETIC_FALLBACK",
    })
    .returning();

  console.log(
    `✅ [SGT Handshake] Interval #${inserted.id} created: ${syntheticGrossWh.toFixed(2)} Wh synthetic gross`,
  );
  console.log("Utility Shadow Integrated: SGT Loop Closed.");

  return {
    projectId: project.id,
    projectName: project.name,
    intervalId: inserted.id,
    syntheticGrossWh: Number(syntheticGrossWh.toFixed(2)),
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

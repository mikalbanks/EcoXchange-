import { createHash } from "crypto";
import { storage } from "../storage";
import type { SkyOracleResult } from "./solcast";
import type { IrradianceSnapshot } from "@shared/schema";

export type ArchiveSatelliteSource =
  | "SOLCAST_LIVE"
  | "SOLCAST_HISTORICAL"
  | "SOLCAST_ESTIMATED_ACTUALS"
  | "SYNTHETIC_FALLBACK";

export interface ArchiveSolcastReadParams {
  projectId: string;
  meterId?: string | null;
  capacityKw: number;
  latitude?: number | null;
  longitude?: number | null;
  result: SkyOracleResult;
  intervalStart: Date;
  intervalEnd: Date;
  satelliteSource: ArchiveSatelliteSource;
  rawResponse?: unknown;
}

function hashPayload(payload: unknown): string {
  const json = JSON.stringify(payload ?? {});
  return createHash("sha256").update(json).digest("hex");
}

/**
 * Archives a Solcast (or synthetic-fallback) read into irradiance_snapshots.
 * Idempotent on (projectId, intervalStart, satelliteSource).
 */
export async function archiveSolcastRead(
  params: ArchiveSolcastReadParams,
): Promise<IrradianceSnapshot> {
  const irradianceWm2 =
    params.capacityKw > 0
      ? (params.result.pvEstimateKw / params.capacityKw) * 1000
      : 0;

  const rawForHash = params.rawResponse ?? {
    pvEstimateKw: params.result.pvEstimateKw,
    timestamp: params.result.timestamp,
    siteName: params.result.siteName,
    source: params.satelliteSource,
    intervalStart: params.intervalStart.toISOString(),
  };

  return storage.createIrradianceSnapshot({
    projectId: params.projectId,
    meterId: params.meterId ?? null,
    latitude:
      params.latitude != null ? (params.latitude.toFixed(6) as any) : null,
    longitude:
      params.longitude != null ? (params.longitude.toFixed(6) as any) : null,
    capacityKw: params.capacityKw.toFixed(2) as any,
    pvEstimateKw: params.result.pvEstimateKw.toFixed(4) as any,
    irradianceWm2: irradianceWm2.toFixed(4) as any,
    intervalStart: params.intervalStart,
    intervalEnd: params.intervalEnd,
    satelliteSource: params.satelliteSource,
    rawResponseHash: hashPayload(rawForHash),
    rawResponseJson: rawForHash as any,
  });
}

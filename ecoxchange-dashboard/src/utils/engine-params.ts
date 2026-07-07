// Builders bridging dashboard project data to the live pvlib engine client.

import type {
  ExpectedGenerationRequest,
  ExpectedGenerationResponse,
} from "../services/engineClient.js";
import type { ProjectMeta, VerificationRecord } from "./types.js";

// ProjectMeta carries no degradation rate; use the engine's documented default.
const DEFAULT_DEGRADATION_RATE = 0.0075;

/**
 * Engine request covering the same months as the project's verification
 * records, so the live expected series lines up 1:1 with the seed records.
 */
export function engineParamsForProject(
  project: ProjectMeta,
  records: VerificationRecord[],
): ExpectedGenerationRequest | null {
  if (records.length === 0) return null;
  const first = records[0].period_start.slice(0, 10);
  const [lastYear, lastMonth] = records[records.length - 1].period_start
    .split("-")
    .map(Number);
  // Day 0 of the following month = last day of the record's month.
  const endOfLastMonth = new Date(Date.UTC(lastYear, lastMonth, 0))
    .toISOString()
    .slice(0, 10);

  return {
    latitude: project.latitude,
    longitude: project.longitude,
    capacity_kw_dc: project.capacity_kw,
    tilt_deg: project.tilt_deg,
    azimuth_deg: project.azimuth_deg,
    module_efficiency: project.module_efficiency,
    system_losses: project.system_losses,
    degradation_rate: DEFAULT_DEGRADATION_RATE,
    commissioning_date: project.commissioning_date,
    start_date: first,
    end_date: endOfLastMonth,
  };
}

/**
 * Overlay the live engine's expected_kwh onto seed verification records by
 * month. Actuals, deviations, and VERIFIED/FLAGGED verdicts stay untouched —
 * recomputing them client-side would silently change verification outcomes.
 */
export function mergeEngineExpected(
  records: VerificationRecord[],
  engineData: ExpectedGenerationResponse,
): VerificationRecord[] {
  const byMonth = new Map(
    engineData.monthly_breakdown.map((m) => [m.month, m.expected_kwh]),
  );
  return records.map((r) => {
    const liveKwh = byMonth.get(r.period_start.slice(0, 7));
    return liveKwh === undefined ? r : { ...r, expected_kwh: Math.round(liveKwh) };
  });
}

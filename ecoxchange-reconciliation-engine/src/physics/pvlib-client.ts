import { z } from "zod";
import type { DailyIrradiance, ProjectConfig } from "../utils/types.js";

/**
 * HTTP client for the Python pvlib expected-generation microservice.
 *
 * This replaces the in-process Hay-Davies `calculateExpectedGeneration` with a
 * call to the pvlib service, which adds temperature derating, IAM, module
 * technology coefficients, inverter clipping, and an explicit loss budget.
 * The reconciliation flow is unchanged — only `expected_kwh` moves here.
 */

const PVLIB_SERVICE_URL =
  process.env.PVLIB_SERVICE_URL ?? "http://localhost:3004";

const DEFAULT_TIMEOUT_MS = 120_000;

const MonthlyBreakdownSchema = z.object({
  month: z.string(),
  expected_kwh: z.number(),
  poa_irradiance_kwh_m2: z.number(),
  cell_temperature_avg_c: z.number(),
  performance_ratio: z.number(),
  capacity_factor: z.number(),
  days_in_month: z.number(),
  days_with_data: z.number(),
});

const ExpectedGenerationResponseSchema = z.object({
  total_expected_kwh: z.number(),
  monthly_breakdown: z.array(MonthlyBreakdownSchema),
  system_summary: z.record(z.unknown()),
  model_metadata: z.record(z.unknown()),
  warnings: z.array(z.string()),
});

export type PvlibExpectedGenerationResult = z.infer<
  typeof ExpectedGenerationResponseSchema
>;

/** ProjectConfig plus the optional higher-fidelity pvlib fields. */
export interface PvlibProjectInput extends ProjectConfig {
  module_type?: string;
  inverter_efficiency?: number;
  dc_ac_ratio?: number;
  albedo?: number;
  racking_type?: string;
}

export interface PvlibClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

/**
 * Call the pvlib service to compute expected generation for one period.
 * Throws on network failure or non-2xx response; callers that need a fallback
 * should catch and fall back to the in-process model.
 */
export async function getExpectedGeneration(
  project: PvlibProjectInput,
  daily_irradiance: DailyIrradiance[],
  opts: PvlibClientOptions = {},
): Promise<PvlibExpectedGenerationResult> {
  const baseUrl = opts.baseUrl ?? PVLIB_SERVICE_URL;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${baseUrl}/expected-generation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        project: {
          latitude: project.latitude,
          longitude: project.longitude,
          capacity_kw_dc: project.capacity_kw_dc,
          tilt_deg: project.tilt_deg,
          azimuth_deg: project.azimuth_deg,
          module_efficiency: project.module_efficiency,
          system_losses: project.system_losses,
          degradation_rate: project.degradation_rate,
          commissioning_date: project.commissioning_date,
          module_type: project.module_type ?? "monocrystalline",
          inverter_efficiency: project.inverter_efficiency ?? 0.96,
          dc_ac_ratio: project.dc_ac_ratio ?? 1.2,
          albedo: project.albedo ?? 0.2,
          racking_type: project.racking_type ?? "open_rack",
        },
        daily_weather: daily_irradiance.map((d) => ({
          date: d.date,
          ghi_kwh_m2: d.ghi_kwh_m2,
          dni_kwh_m2: d.dni_kwh_m2,
          dhi_kwh_m2: d.dhi_kwh_m2,
          temp_air_c: d.temp_air_c ?? 20.0,
          wind_speed_m_s: d.wind_speed_m_s ?? 1.0,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`pvlib service error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return ExpectedGenerationResponseSchema.parse(data);
  } finally {
    clearTimeout(timeout);
  }
}

/** Liveness probe used to decide whether to use pvlib or the local fallback. */
export async function checkPvlibHealth(
  opts: PvlibClientOptions = {},
): Promise<boolean> {
  const baseUrl = opts.baseUrl ?? PVLIB_SERVICE_URL;
  try {
    const response = await fetch(`${baseUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

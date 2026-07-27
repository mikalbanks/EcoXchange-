// Client for the deployed pvlib verification engine (ecoxchange-pvlib-service).
//
// The engine is optional infrastructure: when VITE_ENGINE_URL is unset the
// client reports isConfigured() === false, every consumer falls back to the
// baked-in seed/backtest data, and the dashboard behaves exactly as before.
// All failures degrade to console.warn + null — never a thrown error in the
// render path.

const ENGINE_URL = (import.meta.env.VITE_ENGINE_URL ?? "").replace(/\/$/, "");
// pvlib on a Render free-tier instance can cold-start; allow a long window.
const ENGINE_TIMEOUT_MS = 30_000;
const HEALTH_TIMEOUT_MS = 5_000;

export interface EngineHealthResponse {
  status: string;
  engine_version: string;
  model: string;
  transposition: string;
  pvlib_version?: string;
}

/** Matches SiteExpectedGenerationRequest on the service (POST /api/expected-generation). */
export interface ExpectedGenerationRequest {
  latitude: number;
  longitude: number;
  capacity_kw_dc: number;
  tilt_deg: number;
  azimuth_deg: number;
  module_efficiency: number;
  system_losses: number;
  degradation_rate: number;
  /** Optional: "linear" (service default) or "piecewise_nrel" (Spec 6). */
  degradation_model?: "linear" | "piecewise_nrel";
  commissioning_date: string; // YYYY-MM-DD
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
}

export interface MonthlyGeneration {
  month: string; // "2024-01"
  expected_kwh: number;
  poa_irradiance_kwh_m2: number;
  cell_temperature_avg_c: number;
  performance_ratio: number;
  capacity_factor: number;
  days_in_month: number;
  days_with_data: number;
}

export interface ExpectedGenerationResponse {
  total_expected_kwh: number;
  monthly_breakdown: MonthlyGeneration[];
  p50_kwh: number;
  p90_kwh: number;
  combined_uncertainty_pct: number;
  weather_source: string;
  engine_version: string;
  system_summary: {
    capacity_kw_dc: number;
    capacity_kw_ac: number;
    degradation_factor: number;
    system_losses_pct: number;
    [key: string]: unknown;
  };
  model_metadata: {
    transposition_model: string;
    pvlib_version: string;
    [key: string]: unknown;
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class EngineClient {
  private baseUrl: string;
  private available: boolean | null = null;

  constructor(baseUrl: string = ENGINE_URL) {
    this.baseUrl = baseUrl;
  }

  isConfigured(): boolean {
    return this.baseUrl.length > 0;
  }

  /** Last observed reachability (null until the first health check resolves). */
  isAvailable(): boolean {
    return this.available === true;
  }

  async checkHealth(): Promise<EngineHealthResponse | null> {
    if (!this.isConfigured()) return null;
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/health`, {}, HEALTH_TIMEOUT_MS);
      if (res.ok) {
        this.available = true;
        return (await res.json()) as EngineHealthResponse;
      }
      this.available = false;
      return null;
    } catch {
      this.available = false;
      return null;
    }
  }

  async getExpectedGeneration(
    params: ExpectedGenerationRequest,
  ): Promise<ExpectedGenerationResponse | null> {
    if (!this.isConfigured()) return null;
    try {
      const res = await fetchWithTimeout(
        `${this.baseUrl}/api/expected-generation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        },
        ENGINE_TIMEOUT_MS,
      );
      if (res.ok) {
        this.available = true;
        return (await res.json()) as ExpectedGenerationResponse;
      }
      console.warn(`Engine returned ${res.status}: ${await res.text()}`);
      return null;
    } catch (err) {
      console.warn("Engine request failed:", err);
      this.available = false;
      return null;
    }
  }
}

export const engineClient = new EngineClient();

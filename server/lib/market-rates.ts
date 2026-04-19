/**
 * Institutional market reference rates (LevelTen P25 proxy + CAISO hub placeholders).
 * Override via env for live desk pricing without code changes.
 */

/** LevelTen Q1 2026 P25 solar PPA index benchmark (USD/MWh) — product UI tooltip reference */
export const LEVELTEN_P25_Q1_2026_USD_PER_MWH = 64.49;

/** CAISO all-in proxy when hub env not set (USD/kWh) — aligns to ~$64.49/MWh */
export const CAISO_Q1_2026_PROXY_USD_PER_KWH = LEVELTEN_P25_Q1_2026_USD_PER_MWH / 1000;

export type CaisoHub = "NP15" | "SP15";

function numEnv(name: string, fallback: number): number {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Default hub prices ($/MWh) — NP15 vs SP15 can diverge; defaults track the same benchmark until overridden */
export function getCaisoHubPriceUsdPerMwh(hub: CaisoHub): number {
  if (hub === "NP15") {
    return numEnv("CAISO_NP15_USD_PER_MWH", LEVELTEN_P25_Q1_2026_USD_PER_MWH);
  }
  return numEnv("CAISO_SP15_USD_PER_MWH", LEVELTEN_P25_Q1_2026_USD_PER_MWH);
}

/**
 * Rough CAISO congestion zone from coordinates (Northern vs Southern).
 * NP-15: northern; SP-15: southern — simplified split ~35°N.
 */
export function resolveCaisoHubFromCoords(latitude: number, longitude: number): CaisoHub {
  void longitude;
  return latitude >= 35 ? "NP15" : "SP15";
}

export type MarketPpaResolution = {
  /** Effective energy price in $/kWh */
  usdPerKwh: number;
  /** Human-readable source label */
  source: "FIXED_PPA" | "CAISO_NP15_SPOT_PROXY" | "CAISO_SP15_SPOT_PROXY" | "LEVELTEN_P25_PROXY";
  hub?: CaisoHub;
  benchmarkUsdPerMwh: number;
};

function isCalifornia(state: string): boolean {
  const s = state.trim().toUpperCase();
  return s === "CA" || s === "CALIFORNIA";
}

/**
 * Fixed `ppa_rate` on the project is $/kWh when set (>0). Otherwise:
 * - California: NP15 or SP15 hub proxy from env (defaults to LevelTen benchmark $/MWh).
 * - Other states: LevelTen P25 proxy ($/kWh).
 */
export function resolveMarketPpaUsdPerKwh(params: {
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  fixedPpaRatePerKwh?: string | number | null;
}): MarketPpaResolution {
  const fixed = Number(params.fixedPpaRatePerKwh);
  if (Number.isFinite(fixed) && fixed > 0) {
    return {
      usdPerKwh: fixed,
      source: "FIXED_PPA",
      benchmarkUsdPerMwh: LEVELTEN_P25_Q1_2026_USD_PER_MWH,
    };
  }

  const bench = LEVELTEN_P25_Q1_2026_USD_PER_MWH;

  if (isCalifornia(params.state)) {
    const lat = Number(params.latitude);
    const lon = Number(params.longitude);
    const hub =
      Number.isFinite(lat) && Number.isFinite(lon)
        ? resolveCaisoHubFromCoords(lat, lon)
        : "NP15";
    const usdPerMwh = getCaisoHubPriceUsdPerMwh(hub);
    return {
      usdPerKwh: usdPerMwh / 1000,
      source: hub === "NP15" ? "CAISO_NP15_SPOT_PROXY" : "CAISO_SP15_SPOT_PROXY",
      hub,
      benchmarkUsdPerMwh: bench,
    };
  }

  return {
    usdPerKwh: bench / 1000,
    source: "LEVELTEN_P25_PROXY",
    benchmarkUsdPerMwh: bench,
  };
}

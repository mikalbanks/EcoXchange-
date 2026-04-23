/**
 * Institutional market reference rates (LevelTen P25 proxy + CAISO hub placeholders).
 * Mirrors server/lib/market-rates.ts for plain JS consumers.
 */

export const LEVELTEN_P25_Q1_2026_USD_PER_MWH = 64.49;
export const CAISO_Q1_2026_PROXY_USD_PER_KWH = LEVELTEN_P25_Q1_2026_USD_PER_MWH / 1000;

function numEnv(name, fallback) {
  const v = typeof process !== "undefined" && process.env ? process.env[name] : undefined;
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function getCaisoHubPriceUsdPerMwh(hub) {
  if (hub === "NP15") {
    return numEnv("CAISO_NP15_USD_PER_MWH", LEVELTEN_P25_Q1_2026_USD_PER_MWH);
  }
  return numEnv("CAISO_SP15_USD_PER_MWH", LEVELTEN_P25_Q1_2026_USD_PER_MWH);
}

export function resolveCaisoHubFromCoords(latitude) {
  return latitude >= 35 ? "NP15" : "SP15";
}

function isCalifornia(state) {
  const s = String(state).trim().toUpperCase();
  return s === "CA" || s === "CALIFORNIA";
}

export function resolveMarketPpaUsdPerKwh(params) {
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
      Number.isFinite(lat) && Number.isFinite(lon) ? resolveCaisoHubFromCoords(lat, lon) : "NP15";
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

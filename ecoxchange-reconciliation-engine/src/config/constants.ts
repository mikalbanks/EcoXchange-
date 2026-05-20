export const ENGINE_VERSION = "0.1.0";

export const ALBEDO = 0.2;
export const SOLAR_CONSTANT_W_M2 = 1367;
export const STC_IRRADIANCE_KW_M2 = 1.0;

export const NASA_POWER_BASE_URL =
  process.env.NASA_POWER_BASE_URL ??
  "https://power.larc.nasa.gov/api/temporal/daily/point";

export const TRANSPOSITION_MODEL = "hay_davies" as const;

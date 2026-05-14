export const SOLAREDGE_BASE_URL =
  process.env.SOLAREDGE_API_BASE_URL ?? "https://monitoringapi.solaredge.com";

export const ENPHASE_BASE_URL =
  process.env.ENPHASE_API_BASE_URL ?? "https://api.enphaseenergy.com/api/v4";

export const FRONIUS_BASE_URL =
  process.env.FRONIUS_API_BASE_URL ?? "https://www.solarweb.com/api/v1";

export const SMA_BASE_URL =
  process.env.SMA_API_BASE_URL ?? "https://ennexos.sunnyportal.com/api/v1";

export const REQUEST_TIMEOUT_MS = 30_000;

export const MAX_DATE_RANGE_DAYS = 365;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

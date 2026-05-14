export const NASA_POWER_BASE_URL =
  process.env.NASA_POWER_BASE_URL ?? "https://power.larc.nasa.gov/api/temporal";

export const NREL_NSRDB_BASE_URL =
  process.env.NREL_NSRDB_BASE_URL ?? "https://developer.nrel.gov/api/solar";

export const SOLARGIS_BASE_URL =
  process.env.SOLARGIS_BASE_URL ?? "https://api.solargis.com/data/v2";

export const REQUEST_TIMEOUT_MS = 30_000;

export const MAX_DATE_RANGE_DAYS = 365;
export const MAX_MONTH_RANGE = 60;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const NASA_POWER_EARLIEST = "1981-01-01";
export const NREL_NSRDB_EARLIEST = "1998-01-01";
export const SOLARGIS_EARLIEST = "1994-01-01";

export const NASA_POWER_MISSING_SENTINEL = -999;

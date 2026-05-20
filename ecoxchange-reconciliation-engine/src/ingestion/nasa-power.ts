import axios from "axios";
import { NASA_POWER_BASE_URL } from "../config/constants.js";
import type { DailyIrradiance } from "../utils/types.js";

// NASA POWER daily endpoint returns these parameters directly in kWh/m²/day
// (per https://power.larc.nasa.gov/docs/services/api/temporal/daily/).
const PARAMS = [
  "ALLSKY_SFC_SW_DWN", // GHI
  "ALLSKY_SFC_SW_DNI", // DNI
  "ALLSKY_SFC_SW_DIFF", // DHI
].join(",");

const FILL = -999;

function yyyymmdd(iso: string): string {
  return iso.replace(/-/g, "");
}

function isoFromKey(key: string): string {
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
}

export interface NasaPowerResponse {
  daily: DailyIrradiance[];
  monthly_total_ghi: number;
  raw: unknown;
}

/**
 * Fetch daily GHI/DNI/DHI from NASA POWER for a date range (inclusive).
 * Returns kWh/m²/day. Missing values (-999) are dropped.
 */
export async function fetchNasaPowerDaily(
  latitude: number,
  longitude: number,
  startIso: string,
  endIso: string,
): Promise<NasaPowerResponse> {
  const url = NASA_POWER_BASE_URL;
  const resp = await axios.get(url, {
    params: {
      parameters: PARAMS,
      community: "RE",
      longitude,
      latitude,
      start: yyyymmdd(startIso),
      end: yyyymmdd(endIso),
      format: "JSON",
    },
    timeout: 60_000,
  });

  const props = resp.data?.properties?.parameter;
  if (!props) {
    throw new Error("NASA POWER response missing properties.parameter");
  }
  const ghi = props.ALLSKY_SFC_SW_DWN ?? {};
  const dni = props.ALLSKY_SFC_SW_DNI ?? {};
  const dhi = props.ALLSKY_SFC_SW_DIFF ?? {};

  const dailyKeys = Object.keys(ghi).sort();
  const daily: DailyIrradiance[] = [];
  for (const key of dailyKeys) {
    const g = ghi[key];
    const dn = dni[key];
    const dh = dhi[key];
    if (g === FILL || dn === FILL || dh === FILL) continue;
    daily.push({
      date: isoFromKey(key),
      ghi_kwh_m2: g,
      dni_kwh_m2: dn,
      dhi_kwh_m2: dh,
    });
  }

  const monthly_total_ghi = daily.reduce((s, d) => s + d.ghi_kwh_m2, 0);
  return { daily, monthly_total_ghi, raw: resp.data };
}

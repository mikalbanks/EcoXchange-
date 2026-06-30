import axios from "axios";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { PVDAQSite } from "../utils/types.js";

const PVDAQ_SITES_URL = "https://developer.nrel.gov/api/pvdaq/v3/sites.json";

interface SitesResponse {
  outputs?: Array<Record<string, unknown>>;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/**
 * Fetch the PVDAQ sites list. Caches the JSON locally so the network call is
 * one-time per pipeline run. Requires NREL_API_KEY in env.
 */
export async function fetchPvdaqSites(cachePath: string): Promise<PVDAQSite[]> {
  if (existsSync(cachePath)) {
    return loadCached(cachePath);
  }
  const key = process.env.NREL_API_KEY;
  if (!key) {
    // PVDAQ refinement is optional; absence of NREL_API_KEY yields an empty
    // PVDAQ set and lets the pipeline run without it.
    return [];
  }
  const resp = await axios.get<SitesResponse>(PVDAQ_SITES_URL, {
    params: { api_key: key },
    timeout: 60_000,
  });
  const sites = (resp.data?.outputs ?? [])
    .map((r): PVDAQSite | null => {
      const lat = num(r.site_latitude ?? r.latitude);
      const lon = num(r.site_longitude ?? r.longitude);
      if (lat === null || lon === null) return null;
      return {
        system_id: String(r.system_id ?? r.id ?? ""),
        latitude: lat,
        longitude: lon,
        array_tilt: num(r.array_tilt ?? r.tilt),
        array_azimuth: num(r.array_azimuth ?? r.azimuth),
      };
    })
    .filter((s): s is PVDAQSite => s !== null);

  writeFileSync(cachePath, JSON.stringify(sites, null, 2), "utf8");
  return sites;
}

function loadCached(path: string): PVDAQSite[] {
  const text = readFileSync(path, "utf8");
  return JSON.parse(text) as PVDAQSite[];
}

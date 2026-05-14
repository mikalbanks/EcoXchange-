import axios from "axios";

const EIA_BASE = "https://api.eia.gov/v2";

function requireEiaKey(): string {
  const k = process.env.EIA_API_KEY;
  if (!k) throw new Error("EIA_API_KEY not configured");
  return k;
}

export interface EiaGeneratorInventoryRow {
  plantid: string;
  plantName: string;
  generatorid: string;
  latitude: number;
  longitude: number;
  nameplateMw: number;
  technology: string;
  period: string;
}

function num(s: string | undefined): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Fetch solar PV generators from operating-generator-capacity (EIA-860 inventory),
 * paginated. Filter client-side for utility-scale (nameplate >= minMw).
 */
export async function fetchSolarPvGeneratorsPage(
  offset: number,
  length: number,
  stateIdFacet?: string | null,
): Promise<EiaGeneratorInventoryRow[]> {
  const apiKey = requireEiaKey();
  const url = `${EIA_BASE}/electricity/operating-generator-capacity/data/`;
  const params: Record<string, string | number | string[]> = {
    api_key: apiKey,
    frequency: "monthly",
    "data[]": ["latitude", "longitude", "nameplate-capacity-mw"],
    "facets[technology][]": "Solar Photovoltaic",
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    offset,
    length,
  };
  if (stateIdFacet) {
    params["facets[stateid][]"] = stateIdFacet;
  }
  const res = await axios.get(url, {
    params,
    timeout: 120000,
    validateStatus: (s) => s >= 200 && s < 300,
  });

  const data = res.data?.response?.data as Array<Record<string, string>> | undefined;
  if (!data?.length) return [];

  const out: EiaGeneratorInventoryRow[] = [];
  for (const row of data) {
    const plantid = row.plantid;
    const plantName = row.plantName ?? "";
    const generatorid = row.generatorid;
    const lat = num(row.latitude);
    const lon = num(row.longitude);
    const nameplateMw = num(row["nameplate-capacity-mw"]);
    if (!plantid || !generatorid || !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(nameplateMw)) {
      continue;
    }
    out.push({
      plantid,
      plantName,
      generatorid,
      latitude: lat,
      longitude: lon,
      nameplateMw,
      technology: row.technology ?? "Solar Photovoltaic",
      period: row.period ?? "",
    });
  }
  return out;
}

export interface FacilityFuelMonthlyRow {
  period: string;
  generationMwh: number;
}

/**
 * Monthly net generation (MWh) from facility-fuel (EIA-923) for a plant.
 * Aggregates across fuels/prime movers for the plant.
 */
export async function fetchFacilityFuelMonthlyGeneration(
  plantCode: string,
  startPeriod: string,
  endPeriod: string,
): Promise<FacilityFuelMonthlyRow[]> {
  const apiKey = requireEiaKey();
  const url = `${EIA_BASE}/electricity/facility-fuel/data/`;
  const res = await axios.get(url, {
    params: {
      api_key: apiKey,
      frequency: "monthly",
      "data[]": "generation",
      "facets[plantCode][]": plantCode,
      start: startPeriod,
      end: endPeriod,
      "sort[0][column]": "period",
      "sort[0][direction]": "asc",
      length: 5000,
    },
    timeout: 120000,
    validateStatus: (s) => s >= 200 && s < 300,
  });

  const rows = res.data?.response?.data as Array<Record<string, string>> | undefined;
  if (!rows?.length) return [];

  const byMonth = new Map<string, number>();
  for (const row of rows) {
    const period = row.period;
    const genRaw = row.generation != null ? String(row.generation).replace(/,/g, "") : "";
    const gen = num(genRaw);
    if (!period || !Number.isFinite(gen)) continue;
    byMonth.set(period, (byMonth.get(period) || 0) + gen);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, generationMwh]) => ({
      period,
      generationMwh: Number(generationMwh.toFixed(3)),
    }));
}

/**
 * NASA POWER API Client
 * ---------------------
 * Fetches near-real-time meteorological data (GHI, DNI, DHI, temperature,
 * wind speed) from NASA's Prediction Of Worldwide Energy Resources API.
 *
 * Endpoint: https://power.larc.nasa.gov/api/temporal/hourly
 * Parameters sourced from the CERES / MERRA-2 reanalysis products.
 */
import axios from "axios";

export interface NasaPowerHourlyData {
  timestamp: Date;
  ghiWm2: number;   // ALLSKY_SFC_SW_DWN (W/m²)
  dniWm2: number;   // ALLSKY_SFC_SW_DNI (W/m²)
  dhiWm2: number;   // ALLSKY_SFC_SW_DIFF (W/m²)
  airTemperatureC: number; // T2M (°C)
  windSpeedMs: number;     // WS10M (m/s)
  cloudFraction: number;   // CLOUD_AMT (fraction 0..1)
}

const NASA_POWER_BASE = "https://power.larc.nasa.gov/api/temporal/hourly/point";

/**
 * Fetch hourly meteorological data from NASA POWER for a given location and
 * date range. Returns parsed records ready for the Perez decomposition model.
 */
export async function fetchNasaPowerHourly(
  latitude: number,
  longitude: number,
  startDate: string, // YYYYMMDD
  endDate: string     // YYYYMMDD
): Promise<NasaPowerHourlyData[]> {
  const params = {
    parameters: "ALLSKY_SFC_SW_DWN,ALLSKY_SFC_SW_DNI,ALLSKY_SFC_SW_DIFF,T2M,WS10M,CLOUD_AMT",
    community: "RE", // Renewable Energy community
    longitude,
    latitude,
    start: startDate,
    end: endDate,
    format: "JSON",
    "time-standard": "UTC",
  };

  const response = await axios.get(NASA_POWER_BASE, { params, timeout: 30_000 });
  const properties = response.data.properties?.parameter;

  if (!properties) {
    throw new Error("NASA POWER API returned unexpected structure");
  }

  const ghi = properties.ALLSKY_SFC_SW_DWN;
  const dni = properties.ALLSKY_SFC_SW_DNI;
  const dhi = properties.ALLSKY_SFC_SW_DIFF;
  const temp = properties.T2M;
  const wind = properties.WS10M;
  const cloud = properties.CLOUD_AMT;

  const records: NasaPowerHourlyData[] = [];

  for (const key of Object.keys(ghi)) {
    // NASA POWER hourly keys: "YYYYMMDDHH"
    const year = parseInt(key.slice(0, 4));
    const month = parseInt(key.slice(4, 6)) - 1;
    const day = parseInt(key.slice(6, 8));
    const hour = parseInt(key.slice(8, 10));

    const ghiVal = ghi[key];
    // NASA POWER uses -999.0 as fill value for missing data
    if (ghiVal < 0) continue;

    records.push({
      timestamp: new Date(Date.UTC(year, month, day, hour)),
      ghiWm2: ghiVal,
      dniWm2: Math.max(0, dni[key] ?? 0),
      dhiWm2: Math.max(0, dhi[key] ?? 0),
      airTemperatureC: temp[key] ?? 25,
      windSpeedMs: Math.max(0, wind[key] ?? 1),
      cloudFraction: cloud[key] != null && cloud[key] >= 0 ? cloud[key] / 100 : 0.3,
    });
  }

  return records;
}

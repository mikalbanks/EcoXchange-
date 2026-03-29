import axios from "axios";

const SOLCAST_API_KEY = process.env.SOLCAST_API_KEY;
const IS_TRIAL_ACTIVE = process.env.IS_TRIAL_ACTIVE === "true";

const FREE_LAT = 48.3078;
const FREE_LON = -105.1017;

export interface SkyOracleResult {
  pvEstimateKw: number;
  timestamp: string;
  isRealSite: boolean;
  siteName: string;
}

export async function getSatellitePowerEstimate(
  capacityKw: number,
  lat?: number,
  lon?: number,
): Promise<SkyOracleResult> {
  if (!SOLCAST_API_KEY) {
    throw new Error(
      "SOLCAST_API_KEY is not configured. Add it to Replit Secrets.",
    );
  }

  let targetLat: number;
  let targetLon: number;
  let usingRealSite: boolean;

  if (IS_TRIAL_ACTIVE) {
    if (lat == null || lon == null) {
      throw new Error(
        "Trial mode is active but no GPS coordinates provided. Supply lat/lon for the target asset.",
      );
    }
    targetLat = lat;
    targetLon = lon;
    usingRealSite = true;
  } else {
    targetLat = FREE_LAT;
    targetLon = FREE_LON;
    usingRealSite = false;
  }

  console.log(
    `🛰️ [Sky Oracle] Requesting data for ${capacityKw}kW at ${targetLat}, ${targetLon}` +
      (usingRealSite ? " (Trial — real site)" : " (Sandbox — Fort Peck)"),
  );

  try {
    const response = await axios.get(
      "https://api.solcast.com.au/pv_power/advanced/estimated_actuals",
      {
        params: {
          latitude: targetLat,
          longitude: targetLon,
          capacity: capacityKw,
          format: "json",
          api_key: SOLCAST_API_KEY,
        },
        timeout: 15000,
      },
    );

    const actuals = response.data?.estimated_actuals;
    if (!actuals || actuals.length === 0) {
      throw new Error("Solcast returned no estimated actuals data.");
    }

    const latest = actuals[0];

    return {
      pvEstimateKw: latest.pv_estimate,
      timestamp: latest.period_end,
      isRealSite: usingRealSite,
      siteName: usingRealSite
        ? "Target Asset"
        : "Fort Peck (Unmetered Sandbox)",
    };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      console.error(
        `❌ [Sky Oracle] API Error (HTTP ${status}):`,
        data || error.message,
      );

      if (status === 401 || status === 403) {
        throw new Error(
          "Solcast API key is invalid or expired. Check SOLCAST_API_KEY in Replit Secrets.",
        );
      }
      if (status === 429) {
        throw new Error(
          "Solcast rate limit exceeded. Wait before retrying.",
        );
      }
      throw new Error(
        `Satellite telemetry unavailable (HTTP ${status}): ${JSON.stringify(data) || error.message}`,
      );
    }
    console.error("❌ [Sky Oracle] Unexpected error:", error.message);
    throw new Error(`Satellite telemetry unavailable: ${error.message}`);
  }
}

import type { IrradianceRecord, IrradianceSourceName } from "@ecoxchange/shared";
import type { IrradianceSource } from "../sources/base.js";
import { getSource, resolveAutoSource } from "../sources/registry.js";
import { NasaPowerSource } from "../sources/nasa_power.js";
import type { GetDailyParams } from "../types.js";

export function jsonContent(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

/**
 * Resolve and run a source, with NREL→NASA-POWER fallback when NREL is selected
 * but lacks an API key or fails at runtime.
 */
export async function fetchDailyWithFallback(
  selector: IrradianceSourceName | "auto",
  params: GetDailyParams,
): Promise<{ source_used: IrradianceSourceName; records: IrradianceRecord[] }> {
  const chosen: IrradianceSourceName =
    selector === "auto" ? resolveAutoSource(params.lat, params.lon) : selector;

  const source: IrradianceSource = getSource(chosen);

  if (chosen === "nrel_nsrdb" && !process.env.NREL_API_KEY) {
    console.error(
      `[irradiance] NREL selected but NREL_API_KEY missing — falling back to NASA POWER.`,
    );
    const fallback = new NasaPowerSource();
    return {
      source_used: "nasa_power",
      records: await fallback.getDailyRecords(params),
    };
  }

  try {
    return {
      source_used: chosen,
      records: await source.getDailyRecords(params),
    };
  } catch (err) {
    if (chosen === "nrel_nsrdb") {
      console.error(
        `[irradiance] NREL failed (${(err as Error).message}); falling back to NASA POWER.`,
      );
      const fallback = new NasaPowerSource();
      return {
        source_used: "nasa_power",
        records: await fallback.getDailyRecords(params),
      };
    }
    throw err;
  }
}

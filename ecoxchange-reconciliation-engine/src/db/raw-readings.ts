import { supabase } from "./client.js";
import type { RawReading } from "./types.js";

const TABLE = "raw_readings";

export async function storeRawReading(
  reading: Omit<RawReading, "id" | "fetched_at">,
): Promise<RawReading> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(reading, { onConflict: "project_id,source,period_start" })
    .select()
    .single();
  if (error) throw new Error(`storeRawReading: ${error.message}`);
  if (!data) throw new Error("storeRawReading: no row returned");
  return data as RawReading;
}

export async function getReadingsForPeriod(
  projectId: string,
  periodStart: string,
): Promise<RawReading[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("project_id", projectId)
    .eq("period_start", periodStart);
  if (error) throw new Error(`getReadingsForPeriod: ${error.message}`);
  return (data ?? []) as RawReading[];
}

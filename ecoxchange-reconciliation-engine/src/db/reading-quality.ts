import { supabase } from "./client.js";
import type { ReadingQuality } from "./types.js";

const TABLE = "reading_quality";

/** The evidence row behind a reading's `data_quality` (migration 013).
 *  One per reading — the unique constraint makes re-running QC an update. */
export async function storeReadingQuality(
  quality: Omit<ReadingQuality, "id" | "evaluated_at">,
): Promise<ReadingQuality> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(quality, { onConflict: "raw_reading_id" })
    .select()
    .single();
  if (error) throw new Error(`storeReadingQuality: ${error.message}`);
  if (!data) throw new Error("storeReadingQuality: no row returned");
  return data as ReadingQuality;
}

export async function getReadingQuality(
  rawReadingId: string,
): Promise<ReadingQuality | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("raw_reading_id", rawReadingId)
    .maybeSingle();
  if (error) throw new Error(`getReadingQuality: ${error.message}`);
  return (data as ReadingQuality | null) ?? null;
}

/** Periods QC stopped. `error` means the series is unusable — most often
 *  time-misaligned — so these never reached reconciliation and are waiting on a
 *  human, not on a tolerance decision. */
export async function getBlockedReadings(limit = 100): Promise<ReadingQuality[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("qc_verdict", "error")
    .order("evaluated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getBlockedReadings: ${error.message}`);
  return (data ?? []) as ReadingQuality[];
}

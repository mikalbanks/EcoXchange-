import { supabase } from "./client.js";
import type { VerificationRecord } from "./types.js";

const TABLE = "verification_records";

export async function storeVerificationRecord(
  record: Omit<VerificationRecord, "id" | "verified_at">,
): Promise<VerificationRecord> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(record, { onConflict: "project_id,period_start" })
    .select()
    .single();
  if (error) throw new Error(`storeVerificationRecord: ${error.message}`);
  if (!data) throw new Error("storeVerificationRecord: no row returned");
  return data as VerificationRecord;
}

export async function getVerificationRecord(
  projectId: string,
  periodStart: string,
): Promise<VerificationRecord | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("project_id", projectId)
    .eq("period_start", periodStart)
    .maybeSingle();
  if (error) throw new Error(`getVerificationRecord: ${error.message}`);
  return (data as VerificationRecord | null) ?? null;
}

export async function getVerificationHistory(
  projectId: string,
): Promise<VerificationRecord[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("project_id", projectId)
    .order("period_start", { ascending: true });
  if (error) throw new Error(`getVerificationHistory: ${error.message}`);
  return (data ?? []) as VerificationRecord[];
}

import { getSupabase } from "./client.js";
import type {
  StatusHistoryEntry,
  SubmissionRow,
  SubmissionStatus,
} from "../utils/types.js";

const TABLE = "developer_submissions";
const COLUMNS = "*";

export async function insertSubmission(
  row: Record<string, unknown>,
): Promise<SubmissionRow> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert(row)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`insertSubmission: ${error.message}`);
  return data as SubmissionRow;
}

export async function getSubmission(
  id: string,
): Promise<SubmissionRow | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getSubmission: ${error.message}`);
  return (data as SubmissionRow | null) ?? null;
}

export async function listPendingSubmissions(
  limit = 3,
): Promise<SubmissionRow[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(COLUMNS)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`listPendingSubmissions: ${error.message}`);
  return (data ?? []) as SubmissionRow[];
}

export async function updateStatus(
  id: string,
  status: SubmissionStatus,
  note: string | null = null,
): Promise<void> {
  const supabase = getSupabase();
  const { data: existing, error: readErr } = await supabase
    .from(TABLE)
    .select("status_history")
    .eq("id", id)
    .single();
  if (readErr || !existing)
    throw new Error(`updateStatus: ${readErr?.message ?? "missing row"}`);

  const history = ((existing as { status_history: StatusHistoryEntry[] | null })
    .status_history ?? []) as StatusHistoryEntry[];
  history.push({ status, ts: new Date().toISOString(), note });

  const { error } = await supabase
    .from(TABLE)
    .update({
      status,
      status_history: history,
      updated_at: new Date().toISOString(),
      ...(note ? { notes: note } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(`updateStatus: ${error.message}`);
}

export async function attachReport(
  id: string,
  backtest_report_id: string,
  project_id: string,
  backtest_report_path: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLE)
    .update({
      backtest_report_id,
      project_id,
      backtest_report_path,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`attachReport: ${error.message}`);
}

/**
 * Soft-claim: only succeeds if the row is still in 'submitted'. Returns true
 * if we claimed it (now in 'validating'); false if another worker beat us.
 */
export async function claimForProcessing(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: "validating", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "submitted")
    .select("id");
  if (error) throw new Error(`claimForProcessing: ${error.message}`);
  return (data ?? []).length === 1;
}

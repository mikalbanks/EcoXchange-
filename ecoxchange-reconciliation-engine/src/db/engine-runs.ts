import { supabase } from "./client.js";
import type { EngineRun, RunStatus, TriggerType } from "./types.js";

const TABLE = "engine_runs";

export async function createEngineRun(
  period: string,
  triggerType: TriggerType,
  engineVersion: string,
): Promise<EngineRun> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      target_period: period,
      trigger_type: triggerType,
      engine_version: engineVersion,
    })
    .select()
    .single();
  if (error) throw new Error(`createEngineRun: ${error.message}`);
  if (!data) throw new Error("createEngineRun: no row returned");
  return data as EngineRun;
}

export async function updateRunCounter(
  runId: string,
  status: RunStatus,
): Promise<void> {
  const column = `projects_${status}`;
  const { error } = await supabase.rpc("increment_engine_run_counter", {
    run_id: runId,
    column_name: column,
  });
  if (!error) return;

  // Fallback path: rpc not present. Read-modify-write.
  const { data: existing, error: readErr } = await supabase
    .from(TABLE)
    .select("projects_attempted,projects_verified,projects_flagged,projects_pending,projects_errored")
    .eq("id", runId)
    .single();
  if (readErr || !existing) throw new Error(`updateRunCounter: ${readErr?.message ?? "missing run"}`);
  const row = existing as Record<string, number>;
  const update: Record<string, number> = {
    projects_attempted: (row.projects_attempted ?? 0) + 1,
    [column]: (row[column] ?? 0) + 1,
  };
  const { error: updErr } = await supabase.from(TABLE).update(update).eq("id", runId);
  if (updErr) throw new Error(`updateRunCounter: ${updErr.message}`);
}

export async function completeEngineRun(runId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ completed_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw new Error(`completeEngineRun: ${error.message}`);
}

export async function logRunError(
  runId: string,
  projectId: string,
  err: Error,
): Promise<void> {
  const { data: existing, error: readErr } = await supabase
    .from(TABLE)
    .select("errors")
    .eq("id", runId)
    .single();
  if (readErr || !existing) throw new Error(`logRunError: ${readErr?.message ?? "missing run"}`);
  const prior = ((existing as { errors: unknown }).errors ?? []) as Array<{
    project_id: string;
    error_message: string;
  }>;
  const next = [...prior, { project_id: projectId, error_message: err.message }];
  const { error: updErr } = await supabase
    .from(TABLE)
    .update({ errors: next })
    .eq("id", runId);
  if (updErr) throw new Error(`logRunError: ${updErr.message}`);
}

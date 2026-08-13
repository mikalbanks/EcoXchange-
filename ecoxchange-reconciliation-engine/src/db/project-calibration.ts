/**
 * Spec 23 §4 — calibration persistence.
 *
 * Deliberately narrow: there is a read, an insert, and a history listing. There
 * is NO update and NO upsert, and that omission is the point. A calibration is
 * frozen at write (§4.3); re-fitting inserts a new version linked by
 * `supersedes_id`. Exporting an `upsertCalibration` here would put a one-line
 * path to violating that in every caller's autocomplete.
 *
 * The database enforces the same rule with an append-only trigger (migration
 * 015). Both exist on purpose — this module is the ergonomic guard, the trigger
 * is the real one, because application code can be edited and a constraint
 * cannot be edited by accident.
 */
import { supabase } from "./client.js";
import type { ProjectCalibration } from "./types.js";

const TABLE = "project_calibration";

/**
 * The calibration currently in force: highest `calibration_version` for the
 * project. Null means the plant has never been calibrated, which callers must
 * treat as PENDING_CALIBRATION — not as a reason to fall back to flat ±15%.
 */
export async function getActiveCalibration(
  projectId: string,
): Promise<ProjectCalibration | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("project_id", projectId)
    .order("calibration_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getActiveCalibration: ${error.message}`);
  return (data as ProjectCalibration | null) ?? null;
}

/** Full version chain, oldest first — the audit trail behind any past band. */
export async function getCalibrationHistory(
  projectId: string,
): Promise<ProjectCalibration[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("project_id", projectId)
    .order("calibration_version", { ascending: true });
  if (error) throw new Error(`getCalibrationHistory: ${error.message}`);
  return (data ?? []) as ProjectCalibration[];
}

/**
 * Fetch one calibration by id — how a historical verification record resolves
 * the bands it was actually judged against, rather than the project's current
 * ones. That distinction is the whole reason `verification_records` carries a
 * `calibration_id`.
 */
export async function getCalibrationById(
  calibrationId: string,
): Promise<ProjectCalibration | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", calibrationId)
    .maybeSingle();
  if (error) throw new Error(`getCalibrationById: ${error.message}`);
  return (data as ProjectCalibration | null) ?? null;
}

/**
 * Insert a new calibration version.
 *
 * `calibration_version` and `supersedes_id` are derived here from what is
 * already stored rather than accepted from the caller — a caller that computes
 * its own version number is a caller that can overwrite v1 by passing 1 twice.
 * The unique constraint on (project_id, calibration_version) would catch that,
 * but failing on a race is worse than never constructing the collision.
 *
 * Insert only. To change a calibration, call this again with a `refit_reason`.
 */
export async function insertCalibration(input: {
  project_id: string;
  residual_mad_pct: number;
  plant_factor: number;
  seasonal_factors: Record<number, number>;
  window_start: string;
  window_end: string;
  n_months_used: number;
  frozen_by: string;
  engine_version: string;
  /** Required for every version after the first — §4.4 wants the reason stored. */
  refit_reason?: string | null;
}): Promise<ProjectCalibration> {
  const current = await getActiveCalibration(input.project_id);
  const nextVersion = (current?.calibration_version ?? 0) + 1;

  if (current !== null && !input.refit_reason) {
    throw new Error(
      "insertCalibration: re-fitting an already-calibrated project requires " +
        "refit_reason (spec 23 §4.4 — documented physical change, spec 21 " +
        "shift_detected, or scheduled annual review)",
    );
  }

  const row = {
    project_id: input.project_id,
    calibration_version: nextVersion,
    residual_mad_pct: input.residual_mad_pct,
    plant_factor: input.plant_factor,
    seasonal_factors: input.seasonal_factors,
    window_start: input.window_start,
    window_end: input.window_end,
    n_months_used: input.n_months_used,
    frozen_by: input.frozen_by,
    supersedes_id: current?.id ?? null,
    refit_reason: input.refit_reason ?? null,
    engine_version: input.engine_version,
  };

  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) throw new Error(`insertCalibration: ${error.message}`);
  if (!data) throw new Error("insertCalibration: no row returned");
  return data as ProjectCalibration;
}

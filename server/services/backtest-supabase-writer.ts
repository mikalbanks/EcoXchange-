/**
 * Env-gated Supabase persistence for developer-portal backtests.
 *
 * The reconciliation engine ships typed DB helpers under
 * `ecoxchange-reconciliation-engine/src/db/`, but every one of them imports
 * `db/client.ts`, which THROWS at module load when SUPABASE_URL /
 * SUPABASE_SERVICE_ROLE_KEY are absent. Importing them would crash the whole
 * server whenever Supabase is unconfigured — the opposite of "env-gated". So we
 * create our own lazily-initialised client here and reimplement the handful of
 * upserts inline. Nothing in this module throws into its callers: when Supabase
 * is not configured (or a write fails) the backtest still completes in-memory.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENGINE_VERSION } from "../../ecoxchange-reconciliation-engine/src/config/constants.js";
import type { ReconciliationOutput } from "../../ecoxchange-reconciliation-engine/src/utils/types.js";
import {
  type BacktestRequest,
  type BacktestSummary,
  type MonthlyBacktestResult,
  DEFAULT_DEGRADATION_RATE,
  DEFAULT_SYSTEM_LOSSES,
} from "@shared/developer-backtest";

// `undefined` = not yet probed, `null` = probed and disabled (env missing).
let cachedClient: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Lazily construct (and memoise) the service-role client, or null if unset. */
export function getBacktestSupabase(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cachedClient =
    url && key
      ? createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  return cachedClient;
}

/** One month's reconciliation context, collected during the backtest loop. */
export interface ReconciliationRow {
  month: string; // "YYYY-MM"
  period_start: string; // "YYYY-MM-DD"
  period_end: string; // "YYYY-MM-DD"
  verification: ReconciliationOutput;
  simulated_utility_kwh: number;
}

export interface PersistInput {
  request: BacktestRequest;
  results: MonthlyBacktestResult[];
  summary: BacktestSummary;
  reconciliations: ReconciliationRow[];
  windowEndMonth: string; // "YYYY-MM-DD" — the engine_run target_period
}

export interface PersistOutcome {
  projectId: string | null;
  persisted: boolean;
}

/**
 * Persist a completed backtest to Supabase (projects, engine_runs,
 * verification_records, raw_readings). Returns the real project id when
 * written. Never rejects — on any failure it logs and reports `persisted:
 * false`, so a database hiccup cannot fail the backtest the user is watching.
 */
export async function persistBacktest(input: PersistInput): Promise<PersistOutcome> {
  const supabase = getBacktestSupabase();
  if (!supabase) return { projectId: null, persisted: false };

  try {
    const { request, summary, reconciliations, results, windowEndMonth } = input;
    const p = request.project;
    const ppaRate = p.ppa_rate_per_kwh ?? null;

    // 1. Project identity. `projects.name` has no unique index, so we cannot
    //    upsert on it — select, then update-in-place or insert.
    const projectPayload = {
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      timezone: p.timezone,
      capacity_kw_dc: p.capacity_kw_dc,
      tilt_deg: p.tilt_deg,
      azimuth_deg: p.azimuth_deg,
      module_efficiency: p.module_efficiency,
      system_losses: p.system_losses ?? DEFAULT_SYSTEM_LOSSES,
      degradation_rate: p.degradation_rate ?? DEFAULT_DEGRADATION_RATE,
      commissioning_date: p.commissioning_date,
      inverter_brand: p.inverter_brand,
      // NOT NULL with no default — supply placeholders for backtest projects.
      inverter_api_key_ref: "developer-portal-backtest",
      inverter_plant_id: p.inverter_plant_id?.trim() || "pending",
      utility_provider: p.utility_provider ?? null,
      offtake_type: p.offtake_type,
      ppa_rate_per_kwh: ppaRate,
      ppa_escalator: p.ppa_escalator ?? null,
      module_type: p.module_type,
      dc_ac_ratio: p.dc_ac_ratio,
      racking_type: p.racking_type,
    };

    const { data: existing, error: selErr } = await supabase
      .from("projects")
      .select("id")
      .eq("name", p.name)
      .limit(1)
      .maybeSingle();
    if (selErr) throw selErr;

    let projectId: string;
    if (existing?.id) {
      projectId = existing.id as string;
      // `status` is deliberately absent from projectPayload on this branch.
      // Spec 19 Task A suspends the Savannah fixture project, and this writer
      // upserts by NAME — forcing status:'active' here would silently
      // un-suspend a project someone had deliberately taken out of service.
      // Status is an operational decision; a backtest re-run is not one.
      const { error } = await supabase
        .from("projects")
        .update({ ...projectPayload, updated_at: new Date().toISOString() })
        .eq("id", projectId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("projects")
        // 'active' makes a NEW backtest project visible to read paths.
        .insert({ ...projectPayload, status: "active" })
        .select("id")
        .single();
      if (error) throw error;
      projectId = (data as { id: string }).id;
    }

    // 2. Engine run — one row per backtest execution.
    const { error: runErr } = await supabase.from("engine_runs").insert({
      engine_version: ENGINE_VERSION,
      target_period: windowEndMonth,
      trigger_type: "backtest",
      projects_attempted: 1,
      projects_verified: summary.months_verified > 0 ? 1 : 0,
      projects_flagged: summary.months_flagged > 0 ? 1 : 0,
      completed_at: new Date().toISOString(),
    });
    if (runErr) throw runErr;

    // 3. Verification records — one upsert per month.
    const verificationRows = reconciliations.map((r) => ({
      project_id: projectId,
      period_start: r.period_start,
      period_end: r.period_end,
      inverter_kwh: r.verification.inverter_kwh,
      utility_kwh: r.verification.utility_kwh,
      expected_kwh: r.verification.expected_kwh,
      inv_vs_expected_pct: r.verification.inv_vs_expected_pct,
      inv_vs_utility_pct: r.verification.inv_vs_utility_pct,
      util_vs_expected_pct: r.verification.util_vs_expected_pct,
      status: r.verification.status,
      flag_reasons: r.verification.flag_reasons,
      tolerance_config: r.verification.tolerance_config,
      estimated_revenue: ppaRate != null ? r.verification.expected_kwh * ppaRate : null,
      engine_version: ENGINE_VERSION,
      // Spec 19 Task B. The developer-portal backtest simulates the inverter
      // and utility legs against real NASA POWER irradiance, so every record it
      // writes is 'simulated'. NOT NULL in the database with no default:
      // omitting this is a write error, not a silent null.
      data_provenance: "simulated" as const,
    }));
    const { error: vErr } = await supabase
      .from("verification_records")
      .upsert(verificationRows, { onConflict: "project_id,period_start" });
    if (vErr) throw vErr;

    // 4. Raw readings — best-effort; a failure here must not discard the
    //    verification records already written.
    //
    //    All three legs are written, not just satellite. A verification record
    //    with no underlying readings is structurally impossible for engine
    //    output, and that inconsistency is exactly what made the Spec 19
    //    fixture identifiable as hand-inserted (docs/spec-19-diagnostic.md).
    //    A utility leg is written only when the month actually has one — the
    //    two-way degrade path leaves utility_kwh null.
    try {
      const rawRows = results.flatMap((m) => {
        const recon = reconciliations.find((r) => r.month === m.month);
        const period_start = recon?.period_start ?? `${m.month}-01`;
        const period_end = recon?.period_end ?? `${m.month}-28`;
        const base = {
          project_id: projectId,
          period_start,
          period_end,
          data_quality: "complete",
          data_provenance: "simulated" as const,
        };

        const rows: Record<string, unknown>[] = [
          {
            ...base,
            source: "satellite",
            ghi_kwh_m2: m.ghi_kwh_m2,
            raw_response: {
              source: "nasa_power",
              poa_kwh_m2: m.poa_irradiance_kwh_m2,
              // The irradiance leg is genuinely real; only INV/UTL are modelled.
              irradiance_is_real: true,
            },
          },
          {
            ...base,
            source: "inverter",
            kwh_gross: recon?.verification.inverter_kwh ?? null,
            raw_response: { simulated: true },
          },
        ];

        if (recon?.verification.utility_kwh != null) {
          rows.push({
            ...base,
            source: "utility_meter",
            kwh_net: recon.verification.utility_kwh,
            raw_response: { simulated: true },
          });
        }

        return rows;
      });
      const { error: rawErr } = await supabase
        .from("raw_readings")
        .upsert(rawRows, { onConflict: "project_id,source,period_start" });
      if (rawErr) {
        console.warn(`[backtest-writer] raw_readings skipped: ${rawErr.message}`);
      }
    } catch (rawErr) {
      console.warn(
        `[backtest-writer] raw_readings skipped: ${(rawErr as Error).message}`,
      );
    }

    return { projectId, persisted: true };
  } catch (err) {
    console.warn(`[backtest-writer] persistence failed: ${(err as Error).message}`);
    return { projectId: null, persisted: false };
  }
}

// ── Read helpers (used by the verification-history route + /api/health) ───────

export async function getPersistedProject(
  id: string,
): Promise<Record<string, unknown> | null> {
  const supabase = getBacktestSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getPersistedProject: ${error.message}`);
  return (data as Record<string, unknown> | null) ?? null;
}

/**
 * Spec 19 G2 — provenance is required at the API boundary.
 *
 * A record that cannot state where its telemetry came from does not get
 * rendered. Rows predating migration 014, or written by any path that skipped
 * `data_provenance`, are dropped here rather than served unlabelled: an
 * untagged number on a public surface is the failure this spec exists to fix.
 *
 * Dropped rows are logged loudly — silence is how the original fixture survived
 * for two months.
 */
export async function getPersistedVerificationHistory(
  id: string,
): Promise<Record<string, unknown>[]> {
  const supabase = getBacktestSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("verification_records")
    .select("*")
    .eq("project_id", id)
    .order("period_start", { ascending: true });
  if (error) throw new Error(`getPersistedVerificationHistory: ${error.message}`);

  const rows = (data as Record<string, unknown>[]) ?? [];
  const served = rows.filter((r) => r.data_provenance != null);
  if (served.length !== rows.length) {
    console.error(
      `[backtest-writer] G2: withheld ${rows.length - served.length} of ` +
        `${rows.length} verification record(s) for project ${id} with null ` +
        "data_provenance — a record that cannot state its origin is not served.",
    );
  }
  return served;
}

/** Lightweight liveness probe for the /api/health aggregation. */
export async function probeSupabase(): Promise<"ok" | "unreachable"> {
  const supabase = getBacktestSupabase();
  if (!supabase) return "unreachable";
  try {
    const { error } = await supabase.from("projects").select("id").limit(1);
    return error ? "unreachable" : "ok";
  } catch {
    return "unreachable";
  }
}

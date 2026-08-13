import { z } from "zod";

/**
 * Spec 22 — performance analytics contracts.
 *
 * Shared between the Express routes (server/routes/analytics.ts) and the three
 * owner-facing report pages. The shape mirrors
 * `verification-engine/reports/plant_analytics.json`, which the Python engine
 * writes and the server reads: there is no TS↔Python bridge in this repo, so a
 * committed artifact is the interface between them.
 *
 * The schema is deliberately strict about one thing. A degradation rate and its
 * confidence interval travel together or not at all — `.superRefine` below
 * rejects a rate without bounds, the same rule migration 014 carries as a CHECK
 * and the Python `DegradationResult` raises on. Three enforcement points for one
 * invariant looks redundant until you notice that this is the number most likely
 * to be lifted out of a report and quoted at a warranty adjuster, and that a
 * rate with no error bars looks *more* authoritative than one with them, not
 * less.
 */

export const DEGRADATION_METHODS = ["clearsky", "sensor"] as const;
export type DegradationMethod = (typeof DEGRADATION_METHODS)[number];

/** Whether the PPA rate behind the dollar figures was real or assumed. */
export const PPA_RATE_BASES = ["cited", "estimated"] as const;
export type PpaRateBasis = (typeof PPA_RATE_BASES)[number];

/**
 * Whether availability rested on a real cumulative meter or on energy
 * integrated from the same power series the analysis is testing. The second
 * cannot reliably separate a communications dropout from a genuine outage,
 * because the derived cumulative goes flat across exactly the gaps that
 * distinguish them — so those figures are a lower bound, and are labelled.
 */
export const AVAILABILITY_BASES = ["metered", "derived_from_power"] as const;
export type AvailabilityBasis = (typeof AVAILABILITY_BASES)[number];

const monthlyAvailabilitySchema = z.object({
  period: z.string(),
  availability_pct: z.number().nullable(),
  lost_production_kwh: z.number().nullable(),
  actual_production_kwh: z.number().nullable(),
});

const provenanceSchema = z
  .object({
    method: z.string().optional(),
    window_rationale: z.string().optional(),
    site_caveats: z.array(z.string()).default([]),
    ppa_rate_basis: z.enum(PPA_RATE_BASES).optional(),
    availability_basis: z.enum(AVAILABILITY_BASES).optional(),
    availability_subsystems: z.number().optional(),
    availability_monthly: z.array(monthlyAvailabilitySchema).default([]),
    span_months: z.number().optional(),
    months_kept: z.array(z.string()).default([]),
    months_qc_excluded: z.array(z.record(z.unknown())).default([]),
    months_unavailable: z.array(z.record(z.unknown())).default([]),
    degradation_within_plausible_range: z.boolean().nullable().optional(),
    soiling_signal_found: z.boolean().optional(),
    expected_annual_kwh: z.number().nullable().optional(),
    gamma_pdc: z.number().optional(),
    gamma_pdc_source: z.string().optional(),
    temperature_model: z.string().optional(),
    confidence_level: z.number().optional(),
    interp_freq: z.string().optional(),
    aggregation_freq: z.string().optional(),
    config_hash: z.string().optional(),
    site_qa_status: z.string().nullable().optional(),
    site_qa_issue: z.string().nullable().optional(),
    channels_used: z.array(z.string()).default([]),
  })
  // Extra keys pass through: the Python side adds provenance freely, and a new
  // field there must not take the reports down here.
  .passthrough();

export const plantAnalyticsRowSchema = z
  .object({
    id: z.string(),
    project_id: z.string(),
    as_of_date: z.string(),
    window_start: z.string(),
    window_end: z.string(),

    degradation_pct_per_yr: z.number().nullable(),
    degradation_ci_low: z.number().nullable(),
    degradation_ci_high: z.number().nullable(),
    degradation_method: z.enum(DEGRADATION_METHODS),

    soiling_loss_pct: z.number().nullable(),
    soiling_ci_low: z.number().nullable(),
    soiling_ci_high: z.number().nullable(),
    soiling_ratio: z.number().nullable(),

    availability_pct: z.number().nullable(),
    lost_production_kwh: z.number().nullable(),
    outage_count: z.number().nullable(),

    ppa_rate_per_kwh: z.number().nullable(),
    soiling_loss_usd: z.number().nullable(),
    availability_loss_usd: z.number().nullable(),

    n_days_analyzed: z.number(),
    rdtools_version: z.string(),
    engine_version: z.string(),
    computed_at: z.string(),

    provenance: provenanceSchema.default({}),
    notes: z.array(z.string()).default([]),
  })
  .superRefine((row, ctx) => {
    if (
      row.degradation_pct_per_yr !== null &&
      (row.degradation_ci_low === null || row.degradation_ci_high === null)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["degradation_ci_low"],
        message:
          "A degradation rate arrived without a confidence interval. Spec 22 §3 " +
          "makes the band mandatory: a rate without one is not defensible, and " +
          "it is the number most likely to be quoted out of context. Refusing " +
          "the artifact is better than rendering a rate that looks more certain " +
          "than it is.",
      });
    }
  });

export type PlantAnalyticsRow = z.infer<typeof plantAnalyticsRowSchema>;

const acceptanceSchema = z.object({
  criterion: z.string(),
  statement: z.string(),
  met: z.boolean().nullable(),
  detail: z.string(),
});

const systemRecordSchema = z
  .object({
    system_id: z.number(),
    project_id: z.string(),
    name: z.string(),
    window: z.object({
      start: z.string(),
      end: z.string(),
      rationale: z.string(),
    }),
    caveats: z.array(z.string()).default([]),
    row_id: z.string().optional(),
    error: z.string().optional(),
  })
  .passthrough();

export const plantAnalyticsArtifactSchema = z
  .object({
    generated_at: z.string(),
    engine_version: z.string(),
    rdtools_version: z.string(),
    as_of_date: z.string(),
    min_months_for_degradation: z.number(),
    plausible_degradation_range_pct_per_yr: z.array(z.number()),
    systems: z.array(systemRecordSchema).default([]),
    skipped: z
      .array(z.object({ system_id: z.number(), reason: z.string() }))
      .default([]),
    acceptance: z.array(acceptanceSchema).default([]),
    rows: z.array(plantAnalyticsRowSchema).default([]),
  })
  .passthrough();

export type PlantAnalyticsArtifact = z.infer<typeof plantAnalyticsArtifactSchema>;

/** One project as the report pages consume it. */
export interface PlantAnalyticsProject {
  projectId: string;
  systemId: number;
  name: string;
  window: { start: string; end: string; rationale: string };
  caveats: string[];
  /** Clear-sky first — it is the default method and the one not dependent on
   *  site hardware (§2.2). */
  rows: PlantAnalyticsRow[];
  error?: string;
}

export interface PlantAnalyticsResponse {
  generatedAt: string;
  engineVersion: string;
  rdtoolsVersion: string;
  asOfDate: string;
  projects: PlantAnalyticsProject[];
  skipped: { system_id: number; reason: string }[];
  acceptance: { criterion: string; statement: string; met: boolean | null; detail: string }[];
}

/** Formats a rate and its interval as one inseparable string. */
export function formatRateWithInterval(row: PlantAnalyticsRow): string {
  if (row.degradation_pct_per_yr === null) return "Not reported";
  const rate = row.degradation_pct_per_yr.toFixed(2);
  if (row.degradation_ci_low === null || row.degradation_ci_high === null) {
    return `${rate} %/yr`;
  }
  return `${rate} %/yr (95% CI ${row.degradation_ci_low.toFixed(
    2,
  )} to ${row.degradation_ci_high.toFixed(2)})`;
}

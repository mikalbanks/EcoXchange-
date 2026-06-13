import { z } from "zod";

/**
 * Developer Portal — intake + backtest contracts.
 *
 * Shared between the Express SSE route (server/routes/developer-backtest.ts)
 * and the React intake wizard / results dashboard. The intake schema maps onto
 * the reconciliation engine's ProjectConfig; the result types describe the
 * shape the developer-facing dashboard renders.
 */

export const MODULE_TYPES = [
  "monocrystalline",
  "polycrystalline",
  "thin_film",
  "cdte",
] as const;

export const RACKING_TYPES = [
  "open_rack",
  "roof_mount",
  "single_axis_tracker",
] as const;

export const INVERTER_BRANDS = ["solaredge", "enphase", "fronius", "sma"] as const;

export const OFFTAKE_TYPES = [
  "ppa",
  "community_solar",
  "net_metering",
  "merchant",
] as const;

/** Default module efficiency suggested per module technology. */
export const MODULE_EFFICIENCY_DEFAULTS: Record<
  (typeof MODULE_TYPES)[number],
  number
> = {
  monocrystalline: 0.2,
  polycrystalline: 0.17,
  thin_film: 0.11,
  cdte: 0.18,
};

// ── Wizard step schemas ──────────────────────────────────────────────────────

export const intakeStep1Schema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters").max(100),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  timezone: z.string().min(1, "Timezone is required"),
});

export const intakeStep2Schema = z.object({
  capacity_kw_dc: z.coerce.number().min(100).max(20000),
  tilt_deg: z.coerce.number().min(0).max(90),
  azimuth_deg: z.coerce.number().min(0).max(360),
  module_type: z.enum(MODULE_TYPES),
  module_efficiency: z.coerce.number().min(0.05).max(0.3),
  racking_type: z.enum(RACKING_TYPES),
  dc_ac_ratio: z.coerce.number().min(0.8).max(2.0),
  commissioning_date: z
    .string()
    .min(1, "Commissioning date is required")
    .refine((d) => new Date(d) <= new Date(), "Date cannot be in the future"),
});

export const intakeStep3Schema = z
  .object({
    inverter_brand: z.enum(INVERTER_BRANDS),
    has_monitoring_access: z.boolean().default(false),
    inverter_plant_id: z.string().optional(),
    developer_notes: z.string().optional(),
  })
  .refine(
    (d) => !d.has_monitoring_access || !!d.inverter_plant_id?.trim(),
    {
      message: "Inverter plant ID is required when monitoring access is enabled",
      path: ["inverter_plant_id"],
    },
  );

export const intakeStep4Schema = z
  .object({
    offtake_type: z.enum(OFFTAKE_TYPES),
    ppa_rate_per_kwh: z.coerce.number().min(0.01).max(0.5).optional(),
    ppa_escalator: z.coerce.number().min(0).max(10).optional(),
    utility_provider: z.string().optional(),
    equity_raise_requested: z.coerce.number().min(0).optional(),
  })
  .refine((d) => d.offtake_type !== "ppa" || d.ppa_rate_per_kwh != null, {
    message: "PPA rate is required for a PPA off-take",
    path: ["ppa_rate_per_kwh"],
  });

// System-model constants not collected in the wizard (sensible defaults).
export const DEFAULT_SYSTEM_LOSSES = 0.14;
export const DEFAULT_DEGRADATION_RATE = 0.0075;

export const developerIntakeSchema = intakeStep1Schema
  .merge(intakeStep2Schema)
  .and(intakeStep3Schema)
  .and(intakeStep4Schema)
  .and(
    z.object({
      system_losses: z.coerce.number().min(0).max(0.5).default(DEFAULT_SYSTEM_LOSSES),
      degradation_rate: z.coerce
        .number()
        .min(0)
        .max(0.05)
        .default(DEFAULT_DEGRADATION_RATE),
    }),
  );

export type DeveloperIntakeData = z.infer<typeof developerIntakeSchema>;

export const backtestRequestSchema = z.object({
  project: developerIntakeSchema,
  backtest_months: z.coerce.number().int().min(1).max(24).default(12),
});

export type BacktestRequest = z.infer<typeof backtestRequestSchema>;

// ── Result types (server → client) ───────────────────────────────────────────

export type BacktestStage =
  | "fetching_irradiance"
  | "calculating_expected"
  | "running_reconciliation"
  | "generating_report";

export type VerificationStatus = "verified" | "flagged" | "pending";

export interface MonthlyBacktestResult {
  month: string; // "2024-01"
  expected_kwh: number;
  simulated_inverter_kwh: number;
  deviation_pct: number;
  status: VerificationStatus;
  poa_irradiance_kwh_m2: number;
  cell_temperature_avg_c: number;
  capacity_factor: number;
  ghi_kwh_m2: number;
}

export interface BacktestSummary {
  annual_expected_kwh: number;
  annual_capacity_factor: number;
  avg_monthly_yield_kwh: number;
  peak_month: string;
  low_month: string;
  peak_to_trough_ratio: number;
  months_verified: number;
  months_flagged: number;
  expected_engine: string;
  estimated_annual_revenue?: number;
  estimated_monthly_yield_usd?: number;
}

export interface BacktestProgressEvent {
  stage: BacktestStage;
  progress_pct: number;
  message: string;
  month_results?: MonthlyBacktestResult;
}

export interface BacktestCompletePayload {
  backtest_id: string;
  project_id: string;
  project: DeveloperIntakeData;
  summary: BacktestSummary;
  monthly_results: MonthlyBacktestResult[];
  generated_at: string;
}

// ── Report request (client → server, PDF generation) ─────────────────────────

export const verificationStatusSchema = z.enum(["verified", "flagged", "pending"]);

export const monthlyBacktestResultSchema = z.object({
  month: z.string(),
  expected_kwh: z.number(),
  simulated_inverter_kwh: z.number(),
  deviation_pct: z.number(),
  status: verificationStatusSchema,
  poa_irradiance_kwh_m2: z.number(),
  cell_temperature_avg_c: z.number(),
  capacity_factor: z.number(),
  ghi_kwh_m2: z.number(),
});

export const backtestSummarySchema = z.object({
  annual_expected_kwh: z.number(),
  annual_capacity_factor: z.number(),
  avg_monthly_yield_kwh: z.number(),
  peak_month: z.string(),
  low_month: z.string(),
  peak_to_trough_ratio: z.number(),
  months_verified: z.number(),
  months_flagged: z.number(),
  expected_engine: z.string(),
  estimated_annual_revenue: z.number().optional(),
  estimated_monthly_yield_usd: z.number().optional(),
});

export const backtestCompletePayloadSchema = z.object({
  backtest_id: z.string(),
  project_id: z.string(),
  project: developerIntakeSchema,
  summary: backtestSummarySchema,
  monthly_results: z.array(monthlyBacktestResultSchema).min(1),
  generated_at: z.string(),
});

/**
 * POST /api/developer/report body — the full completed backtest payload plus an
 * optional override for whether the Revenue page is included (defaults to
 * "present when a PPA rate is set").
 */
export const reportRequestSchema = z.object({
  payload: backtestCompletePayloadSchema,
  include_revenue: z.boolean().optional(),
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;

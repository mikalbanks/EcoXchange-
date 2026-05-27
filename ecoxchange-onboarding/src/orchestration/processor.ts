import { decrypt } from "../crypto/secret.js";
import { getSupabase } from "../db/client.js";
import { insertReport } from "../db/reports.js";
import {
  attachReport,
  getSubmission,
  updateStatus,
} from "../db/submissions.js";
import { calculateExpectedGeneration } from "../reconciliation-bridge/expected.js";
import { reconcile } from "../reconciliation-bridge/reconcile.js";
import { buildReport } from "../report/generator.js";
import { uploadReport } from "../report/storage.js";
import { lastTwelveFullMonths } from "../utils/dates.js";
import type {
  MonthlyResult,
  ReconciledMonthly,
  SubmissionRow,
} from "../utils/types.js";
import { callMcp } from "./mcp-client.js";

const IRRADIANCE_URL =
  process.env.IRRADIANCE_MCP_URL ?? "http://localhost:3002/mcp";
const SOLAR_PLANT_URL =
  process.env.SOLAR_PLANT_MCP_URL ?? "http://localhost:3001/mcp";

interface CoverageResult {
  available_sources: string[];
  recommended_source: string;
  notes: string;
}

interface DailyIrradiancePayload {
  records: Array<{
    date: string;
    ghi_kwh_m2: number;
    poa_kwh_m2: number | null;
    air_temp_c: number | null;
  }>;
  source_used: string;
}

interface DailyIrradianceWithDni {
  records: Array<{
    date: string;
    ghi_kwh_m2: number;
    dni_kwh_m2?: number;
    dhi_kwh_m2?: number;
  }>;
  source_used: string;
}

interface CredCheckResult {
  valid: boolean;
  error: string | null;
}

interface ProductionResult {
  total_kwh_gross: number;
  data_quality: {
    completeness_pct: number;
  };
  raw_api_response: unknown;
}

export async function processSubmission(id: string): Promise<void> {
  const submission = await getSubmission(id);
  if (!submission) throw new Error(`submission ${id} not found`);

  // ──────────────────────────────────────────────
  // 1. Validate location coverage
  // ──────────────────────────────────────────────
  const coverage = await callMcp<CoverageResult>(
    IRRADIANCE_URL,
    "irradiance_check_coverage",
    {
      lat: submission.latitude,
      lon: submission.longitude,
    },
  );
  if (!coverage.available_sources || coverage.available_sources.length === 0) {
    await updateStatus(
      id,
      "rejected",
      "No irradiance data available for this location",
    );
    return;
  }

  // ──────────────────────────────────────────────
  // 2. Validate inverter credentials (best-effort)
  // ──────────────────────────────────────────────
  let hasValidCreds = false;
  if (submission.has_inverter_creds && submission.inverter_api_key) {
    try {
      const plain = decrypt(submission.inverter_api_key);
      const cred = await callMcp<CredCheckResult>(
        SOLAR_PLANT_URL,
        "plant_check_credentials",
        {
          brand: submission.inverter_brand,
          api_key: plain,
          plant_id: submission.inverter_plant_id ?? "",
        },
      );
      hasValidCreds = cred.valid;
      if (!cred.valid) {
        await updateStatus(
          id,
          "validating",
          `Inverter credential check failed: ${cred.error ?? "unknown"}. Proceeding satellite-only.`,
        );
      }
    } catch (err) {
      await updateStatus(
        id,
        "validating",
        `Inverter credential check threw: ${(err as Error).message}. Proceeding satellite-only.`,
      );
    }
  }

  // ──────────────────────────────────────────────
  // 3. Backtest from satellite
  // ──────────────────────────────────────────────
  await updateStatus(id, "backtesting", null);

  const { months } = lastTwelveFullMonths();
  const overallStart = months[0]!.firstDay;
  const overallEnd = months[months.length - 1]!.lastDay;

  const irradiance = await callMcp<DailyIrradiancePayload>(
    IRRADIANCE_URL,
    "irradiance_get_daily",
    {
      lat: submission.latitude,
      lon: submission.longitude,
      start_date: overallStart,
      end_date: overallEnd,
      source: "auto",
    },
  );
  const records = (irradiance as unknown as DailyIrradianceWithDni).records;
  const irradianceSource = irradiance.source_used;

  // Bucket daily records by month
  const byMonth = new Map<string, typeof records>();
  for (const r of records) {
    const m = r.date.slice(0, 7);
    const arr = byMonth.get(m);
    if (arr) arr.push(r);
    else byMonth.set(m, [r]);
  }

  const monthly: MonthlyResult[] = [];
  for (const m of months) {
    const key = `${m.year}-${String(m.month).padStart(2, "0")}`;
    const daysRaw = byMonth.get(key) ?? [];
    const days = daysRaw.map((d) => ({
      date: d.date,
      ghi_kwh_m2: d.ghi_kwh_m2,
      // Irradiance MCP tool returns GHI + POA; DNI/DHI may not be present.
      // Fall back to splitting GHI into beam+diffuse via a 30/70 default ratio
      // when the tool didn't return DNI/DHI. The reconciliation engine's
      // canonical Hay-Davies form uses beam-on-horizontal = GHI - DHI.
      dni_kwh_m2: d.dni_kwh_m2 ?? d.ghi_kwh_m2 * 0.7,
      dhi_kwh_m2: d.dhi_kwh_m2 ?? d.ghi_kwh_m2 * 0.3,
    }));
    const expected = calculateExpectedGeneration({
      capacity_kw_dc: submission.capacity_kw_dc,
      tilt_deg: submission.tilt_deg,
      azimuth_deg: submission.azimuth_deg,
      module_efficiency: submission.module_efficiency,
      system_losses: submission.system_losses,
      degradation_rate: submission.degradation_rate,
      commissioning_date: submission.commissioning_date,
      latitude: submission.latitude,
      longitude: submission.longitude,
      period_start: m.firstDay,
      period_end: m.lastDay,
      daily_irradiance: days,
    });
    const ghiMonth = days.reduce((s, d) => s + d.ghi_kwh_m2, 0);
    const poaMonth = expected.daily_breakdown.reduce(
      (s, d) => s + d.poa_kwh_m2,
      0,
    );
    monthly.push({
      month: key,
      ghi_kwh_m2: ghiMonth,
      expected_kwh: expected.expected_kwh,
      poa_kwh_m2: poaMonth,
    });
  }

  // ──────────────────────────────────────────────
  // 4. Reconcile with inverter (optional)
  // ──────────────────────────────────────────────
  let reconciled: ReconciledMonthly[] | null = null;
  if (hasValidCreds && submission.inverter_api_key && submission.inverter_plant_id) {
    await updateStatus(id, "reconciling", null);
    const plain = decrypt(submission.inverter_api_key);
    reconciled = [];
    for (const mRes of monthly) {
      try {
        const m = months.find(
          (mm) => `${mm.year}-${String(mm.month).padStart(2, "0")}` === mRes.month,
        )!;
        const production = await callMcp<ProductionResult>(
          SOLAR_PLANT_URL,
          "plant_get_production",
          {
            brand: submission.inverter_brand,
            api_key: plain,
            plant_id: submission.inverter_plant_id,
            start_date: m.firstDay,
            end_date: m.lastDay,
            resolution: "monthly",
          },
        );
        const result = reconcile({
          inverter_reading: {
            kwh_gross: production.total_kwh_gross,
            data_quality:
              production.data_quality.completeness_pct >= 90 ? "complete" : "partial",
            raw_response: production.raw_api_response,
          },
          utility_reading: null,
          expected_kwh: mRes.expected_kwh,
        });
        reconciled.push({
          ...mRes,
          inverter_kwh: production.total_kwh_gross,
          inv_vs_expected_pct: result.inv_vs_expected_pct,
          status: result.status,
          flag_reasons: result.flag_reasons,
          estimated_revenue_usd:
            submission.ppa_rate_per_kwh !== null &&
            submission.ppa_rate_per_kwh !== undefined
              ? production.total_kwh_gross * submission.ppa_rate_per_kwh
              : null,
        });
      } catch (err) {
        // Single-month failure: record as pending and continue
        reconciled.push({
          ...mRes,
          inverter_kwh: null,
          inv_vs_expected_pct: null,
          status: "pending",
          flag_reasons: [`Inverter fetch failed: ${(err as Error).message}`],
          estimated_revenue_usd: null,
        });
      }
    }
  }

  // ──────────────────────────────────────────────
  // 5. Build + upload report
  // ──────────────────────────────────────────────
  const report = buildReport({
    submission,
    monthly,
    reconciled,
    irradianceSource,
  });
  const uploaded = await uploadReport(id, report);

  // ──────────────────────────────────────────────
  // 6. Persist report row + project row
  // ──────────────────────────────────────────────
  const reportRow = await insertReport({
    submission_id: id,
    annual_expected_mwh: report.summary.annual_expected_mwh,
    capacity_factor_pct: report.summary.capacity_factor_pct,
    months_tested: report.summary.months_tested,
    months_verified: report.summary.months_verified ?? 0,
    months_flagged: report.summary.months_flagged ?? 0,
    estimated_annual_revenue: report.financials.estimated_annual_revenue_usd,
    estimated_annual_yield_pct: report.financials.estimated_yield_on_equity_pct,
    report_json_path: uploaded.jsonPath,
    report_md_path: uploaded.mdPath,
    irradiance_source: irradianceSource,
    has_real_inverter_data: report.summary.has_real_inverter_data,
    engine_version: report.engine_version,
  });

  const project = await createOnboardingProject(submission);

  await attachReport(id, reportRow.id, project.id, uploaded.jsonPath);
  await updateStatus(id, "report_ready", null);
}

interface ProjectRowMinimal {
  id: string;
}

async function createOnboardingProject(
  submission: SubmissionRow,
): Promise<ProjectRowMinimal> {
  const supabase = getSupabase();
  const inverterRef = submission.has_inverter_creds
    ? `vault:submission:${submission.id}`
    : "pending";
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: submission.project_name,
      latitude: submission.latitude,
      longitude: submission.longitude,
      capacity_kw_dc: submission.capacity_kw_dc,
      tilt_deg: submission.tilt_deg,
      azimuth_deg: submission.azimuth_deg,
      module_efficiency: submission.module_efficiency,
      system_losses: submission.system_losses,
      degradation_rate: submission.degradation_rate,
      commissioning_date: submission.commissioning_date,
      inverter_brand:
        submission.inverter_brand === "other"
          ? "solaredge"
          : submission.inverter_brand,
      inverter_api_key_ref: inverterRef,
      inverter_plant_id: submission.inverter_plant_id ?? "pending",
      offtake_type: submission.offtake_type ?? null,
      ppa_rate_per_kwh: submission.ppa_rate_per_kwh ?? null,
      ppa_escalator: submission.ppa_escalator ?? null,
      status: "onboarding",
    })
    .select("id")
    .single();
  if (error || !data)
    throw new Error(
      `createOnboardingProject: ${error?.message ?? "no row returned"}`,
    );
  return data as ProjectRowMinimal;
}

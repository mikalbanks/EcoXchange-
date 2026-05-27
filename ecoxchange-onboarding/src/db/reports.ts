import { getSupabase } from "./client.js";

const TABLE = "backtest_reports";

export interface BacktestReportRow {
  id: string;
  submission_id: string;
  annual_expected_mwh: number;
  capacity_factor_pct: number;
  months_tested: number;
  months_verified: number;
  months_flagged: number;
  estimated_annual_revenue: number | null;
  estimated_annual_yield_pct: number | null;
  report_json_path: string;
  report_md_path: string | null;
  irradiance_source: string;
  has_real_inverter_data: boolean;
  engine_version: string;
  generated_at: string;
}

export async function insertReport(
  row: Omit<BacktestReportRow, "id" | "generated_at">,
): Promise<BacktestReportRow> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(`insertReport: ${error.message}`);
  return data as BacktestReportRow;
}

export async function getReportBySubmission(
  submissionId: string,
): Promise<BacktestReportRow | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select("*")
    .eq("submission_id", submissionId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getReportBySubmission: ${error.message}`);
  return (data as BacktestReportRow | null) ?? null;
}

export async function createSignedReportUrl(
  path: string,
  expiresIn = 60 * 60,
): Promise<string> {
  const { data, error } = await getSupabase().storage
    .from("onboarding-reports")
    .createSignedUrl(path, expiresIn);
  if (error || !data)
    throw new Error(
      `createSignedReportUrl: ${error?.message ?? "no data returned"}`,
    );
  return data.signedUrl;
}

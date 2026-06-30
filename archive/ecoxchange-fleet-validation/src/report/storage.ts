import type { BatchBacktestReport } from "../utils/types.js";
import { renderMarkdown } from "./markdown.js";
import { getSupabase } from "../db/client.js";

const BUCKET = "evidence";

export interface StoredReport {
  jsonPath: string;
  mdPath: string;
}

export async function uploadReport(
  report: BatchBacktestReport,
): Promise<StoredReport> {
  const supabase = getSupabase();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = `validation-reports/${stamp}_fleet_validation.json`;
  const mdPath = `validation-reports/${stamp}_fleet_validation.md`;
  const jsonBlob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const mdBlob = new Blob([renderMarkdown(report)], {
    type: "text/markdown",
  });
  const { error: e1 } = await supabase.storage
    .from(BUCKET)
    .upload(jsonPath, jsonBlob, { contentType: "application/json", upsert: false });
  if (e1) throw new Error(`uploadReport (json): ${e1.message}`);
  const { error: e2 } = await supabase.storage
    .from(BUCKET)
    .upload(mdPath, mdBlob, { contentType: "text/markdown", upsert: false });
  if (e2) throw new Error(`uploadReport (md): ${e2.message}`);
  return { jsonPath, mdPath };
}

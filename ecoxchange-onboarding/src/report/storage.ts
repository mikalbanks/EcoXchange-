import { getSupabase } from "../db/client.js";
import type { DeveloperBacktestReport } from "../utils/types.js";
import { renderMarkdown } from "./markdown.js";

const BUCKET = "onboarding-reports";

export interface UploadedReport {
  jsonPath: string;
  mdPath: string;
}

export async function uploadReport(
  submissionId: string,
  report: DeveloperBacktestReport,
): Promise<UploadedReport> {
  const supabase = getSupabase();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = `${submissionId}/${stamp}.json`;
  const mdPath = `${submissionId}/${stamp}.md`;

  const jsonPayload = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const mdPayload = new Blob([renderMarkdown(report)], {
    type: "text/markdown",
  });

  const { error: jsonErr } = await supabase.storage
    .from(BUCKET)
    .upload(jsonPath, jsonPayload, {
      contentType: "application/json",
      upsert: false,
    });
  if (jsonErr) throw new Error(`uploadReport (json): ${jsonErr.message}`);

  const { error: mdErr } = await supabase.storage
    .from(BUCKET)
    .upload(mdPath, mdPayload, {
      contentType: "text/markdown",
      upsert: false,
    });
  if (mdErr) throw new Error(`uploadReport (md): ${mdErr.message}`);

  return { jsonPath, mdPath };
}

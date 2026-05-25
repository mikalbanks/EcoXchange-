import { supabase } from "../db/client.js";

export async function archiveRawEvidence(
  projectId: string,
  source: string,
  period: string,
  rawResponse: object,
): Promise<string> {
  const path = `${projectId}/${period}/${source}/${Date.now()}.json`;
  const { error } = await supabase.storage
    .from("evidence")
    .upload(path, JSON.stringify(rawResponse, null, 2), {
      contentType: "application/json",
      upsert: false,
    });
  if (error) throw new Error(`archiveRawEvidence: ${error.message}`);
  return path;
}

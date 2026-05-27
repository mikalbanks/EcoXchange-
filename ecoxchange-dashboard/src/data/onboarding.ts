import type {
  BacktestReportResponse,
  IntakeForm,
  StatusResponse,
} from "../utils/onboarding-types.js";

const API_URL =
  (import.meta.env.VITE_ONBOARDING_API_URL as string | undefined) ??
  "http://localhost:3004";

function url(path: string): string {
  return `${API_URL}${path}`;
}

export async function submitIntake(
  form: IntakeForm,
): Promise<{ submission_id: string; status: string }> {
  // Strip empties that the Zod schema would reject
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(form)) {
    if (v === "" || v === undefined) continue;
    payload[k] = v;
  }
  const resp = await fetch(url("/api/onboard/submit"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Submit failed (${resp.status}): ${body}`);
  }
  return resp.json();
}

export async function fetchStatus(id: string): Promise<StatusResponse> {
  const resp = await fetch(url(`/api/onboard/status/${id}`));
  if (!resp.ok) throw new Error(`Status fetch failed: ${resp.status}`);
  return resp.json();
}

export async function fetchReport(
  id: string,
): Promise<BacktestReportResponse> {
  const resp = await fetch(url(`/api/onboard/report/${id}`));
  if (!resp.ok) throw new Error(`Report fetch failed: ${resp.status}`);
  return resp.json();
}

export async function verifyCredentials(
  brand: string,
  api_key: string,
  plant_id: string,
): Promise<{ valid: boolean; error: string | null }> {
  const resp = await fetch(url("/api/onboard/verify-credentials"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ brand, api_key, plant_id }),
  });
  if (!resp.ok) {
    return { valid: false, error: `HTTP ${resp.status}` };
  }
  return resp.json();
}

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset = import.meta.env.VITE_SANITY_DATASET || "production";
const apiVersion = import.meta.env.VITE_SANITY_API_VERSION || "2026-09-25";

export async function fetchSanity(query, params = {}) {
  if (!projectId) return null;
  const encodedQuery = encodeURIComponent(query);
  const encodedParams = Object.entries(params).map(([key, value]) => `&$${key}=${encodeURIComponent(JSON.stringify(value))}`).join("");
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodedQuery}${encodedParams}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sanity request failed: ${response.status}`);
  const payload = await response.json();
  return payload.result;
}


import axios from "axios";
import type { InsertInterconnectionQueueEntry } from "@shared/schema";

const GRIDSTATUS_API_BASE = "https://api.gridstatus.io/v1";
const GRIDSTATUS_API_KEY = process.env.GRIDSTATUS_API_KEY;

export interface GridStatusFetchResult {
  iso: string;
  fetched: number;
  upserts: InsertInterconnectionQueueEntry[];
  skipped: boolean;
  error?: string;
}

interface RawGridStatusRow {
  queue_id?: string;
  project_name?: string;
  queue_status?: string;
  resource_type?: string;
  capacity_mw?: number | string;
  state?: string;
  county?: string;
  latitude?: number | string;
  longitude?: number | string;
  [k: string]: unknown;
}

function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function mapRow(iso: string, row: RawGridStatusRow): InsertInterconnectionQueueEntry | null {
  const externalId = row.queue_id ? String(row.queue_id) : null;
  if (!externalId) return null;
  return {
    externalId,
    isoCode: iso,
    projectName: row.project_name ? String(row.project_name) : "",
    queueStatus: row.queue_status ? String(row.queue_status) : null,
    resourceType: row.resource_type ? String(row.resource_type) : null,
    capacityMW:
      num(row.capacity_mw) != null ? (num(row.capacity_mw)!.toFixed(4) as any) : null,
    state: row.state ? String(row.state) : "",
    county: row.county ? String(row.county) : null,
    latitude:
      num(row.latitude) != null ? (num(row.latitude)!.toFixed(6) as any) : null,
    longitude:
      num(row.longitude) != null ? (num(row.longitude)!.toFixed(6) as any) : null,
    rawJson: JSON.stringify(row),
  };
}

/**
 * Fetches one ISO's interconnection queue from GridStatus.io.
 * Returns mapped insert rows; caller upserts via the unique (isoCode, externalId) index.
 * Skips gracefully when GRIDSTATUS_API_KEY is unset.
 */
export async function fetchInterconnectionQueueEntries(opts: {
  iso: string;
  limit?: number;
}): Promise<GridStatusFetchResult> {
  if (!GRIDSTATUS_API_KEY) {
    return { iso: opts.iso, fetched: 0, upserts: [], skipped: true };
  }

  try {
    const limit = opts.limit ?? 200;
    const url = `${GRIDSTATUS_API_BASE}/datasets/${opts.iso.toLowerCase()}_interconnection_queue/query`;
    const response = await axios.get(url, {
      params: { limit, return_format: "json" },
      headers: { "x-api-key": GRIDSTATUS_API_KEY },
      timeout: 30_000,
    });

    const rows: RawGridStatusRow[] = response.data?.data ?? [];
    const upserts: InsertInterconnectionQueueEntry[] = [];
    for (const row of rows) {
      const mapped = mapRow(opts.iso, row);
      if (mapped) upserts.push(mapped);
    }
    return { iso: opts.iso, fetched: rows.length, upserts, skipped: false };
  } catch (err: any) {
    const status = axios.isAxiosError(err) ? err.response?.status : null;
    let msg = err.message;
    if (status === 401 || status === 403) msg = "GridStatus API key invalid or unauthorized";
    if (status === 429) msg = "GridStatus rate-limited";
    return { iso: opts.iso, fetched: 0, upserts: [], skipped: false, error: msg };
  }
}

import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { MAX_DATE_RANGE_DAYS, MS_PER_DAY } from "../constants.js";

export function assertDateRange(startDate: string, endDate: string): void {
  const start = Date.parse(startDate + "T00:00:00Z");
  const end = Date.parse(endDate + "T00:00:00Z");
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid date(s): start_date=${startDate}, end_date=${endDate}.`,
    );
  }
  if (end < start) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `end_date (${endDate}) is earlier than start_date (${startDate}).`,
    );
  }
  const days = Math.floor((end - start) / MS_PER_DAY) + 1;
  if (days > MAX_DATE_RANGE_DAYS) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Date range exceeds ${MAX_DATE_RANGE_DAYS}-day limit. Split into multiple calls.`,
    );
  }
}

export function isoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function iterateDates(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const cur = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  while (cur.getTime() <= end.getTime()) {
    out.push(isoDate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

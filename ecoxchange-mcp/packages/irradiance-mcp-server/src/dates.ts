import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import {
  MAX_DATE_RANGE_DAYS,
  MAX_MONTH_RANGE,
  MS_PER_DAY,
} from "./constants.js";

export function assertDailyRange(startDate: string, endDate: string): void {
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
      `Date range exceeds 365-day maximum. Split into annual calls.`,
    );
  }
  const yesterdayUtcMs =
    Date.now() - (Date.now() % MS_PER_DAY) - MS_PER_DAY;
  if (end > yesterdayUtcMs) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `end_date ${endDate} is in the future. Irradiance data is only available up to yesterday.`,
    );
  }
}

export function assertMonthRange(startMonth: string, endMonth: string): void {
  const start = monthIndex(startMonth);
  const end = monthIndex(endMonth);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid month(s): start_month=${startMonth}, end_month=${endMonth}.`,
    );
  }
  if (end < start) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `end_month (${endMonth}) is earlier than start_month (${startMonth}).`,
    );
  }
  if (end - start + 1 > MAX_MONTH_RANGE) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Month range exceeds ${MAX_MONTH_RANGE}-month (5-year) maximum. Split into multiple calls.`,
    );
  }
}

export function monthIndex(yyyymm: string): number {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyymm);
  if (!m) return Number.NaN;
  return parseInt(m[1], 10) * 12 + (parseInt(m[2], 10) - 1);
}

export function monthBounds(yyyymm: string): { start: string; end: string } {
  const [y, m] = yyyymm.split("-").map((s) => parseInt(s, 10));
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function yyyymmdd(d: string): string {
  return d.replaceAll("-", "");
}

export function isoYesterdayUtc(): string {
  const d = new Date(Date.now() - MS_PER_DAY);
  return d.toISOString().slice(0, 10);
}

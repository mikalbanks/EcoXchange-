import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";

export function isoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function firstOfMonth(iso: string): string {
  return isoDate(startOfMonth(parseISO(iso)));
}

export function lastOfMonth(iso: string): string {
  return isoDate(endOfMonth(parseISO(iso)));
}

export interface MonthRange {
  start: string;
  end: string;
}

export function monthRange(startMonth: string, endMonth: string): MonthRange[] {
  const out: MonthRange[] = [];
  let cursor = startOfMonth(parseISO(startMonth));
  const stop = startOfMonth(parseISO(endMonth));
  while (cursor.getTime() <= stop.getTime()) {
    out.push({ start: isoDate(cursor), end: isoDate(endOfMonth(cursor)) });
    cursor = addMonths(cursor, 1);
  }
  return out;
}

export function dayOfYear(iso: string): number {
  const d = parseISO(iso);
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const diff =
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
    start.getTime();
  return Math.floor(diff / (24 * 3600 * 1000)) + 1;
}

export function daysBetweenInclusive(startIso: string, endIso: string): string[] {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  const n = differenceInCalendarDays(end, start);
  const out: string[] = [];
  for (let i = 0; i <= n; i++) out.push(isoDate(addDays(start, i)));
  return out;
}

export function yearsBetween(startIso: string, endIso: string): number {
  const days = differenceInCalendarDays(parseISO(endIso), parseISO(startIso));
  return days / 365.25;
}

export function midDate(startIso: string, endIso: string): string {
  const days = differenceInCalendarDays(parseISO(endIso), parseISO(startIso));
  return isoDate(addDays(parseISO(startIso), Math.floor(days / 2)));
}

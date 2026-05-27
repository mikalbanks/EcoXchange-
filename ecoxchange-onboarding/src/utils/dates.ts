export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isoMonth(d: Date): string {
  return d.toISOString().slice(0, 7);
}

/**
 * Returns the last 12 full calendar months ending at the last complete month.
 * If "today" is mid-May 2026, returns May 2025 → April 2026.
 */
export function lastTwelveFullMonths(asOf = new Date()): {
  start: Date;
  end: Date;
  months: Array<{ year: number; month: number; firstDay: string; lastDay: string }>;
} {
  // last complete month = month before current
  const ref = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1));
  const end = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - 1, 1));
  const start = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), 1));
  const months: Array<{ year: number; month: number; firstDay: string; lastDay: string }> = [];
  for (let i = 0; i < 12; i++) {
    const m = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const firstDay = isoDate(m);
    const lastOf = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0));
    months.push({
      year: m.getUTCFullYear(),
      month: m.getUTCMonth() + 1,
      firstDay,
      lastDay: isoDate(lastOf),
    });
  }
  const overallEnd = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
  );
  return { start, end: overallEnd, months };
}

export function yearsBetween(start: string, end: string | Date = new Date()): number {
  const a = new Date(start + "T00:00:00Z").getTime();
  const b = end instanceof Date ? end.getTime() : new Date(end + "T00:00:00Z").getTime();
  return Math.max(0, (b - a) / (365.25 * 24 * 3600 * 1000));
}

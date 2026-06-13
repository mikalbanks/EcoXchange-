/** Shared formatting helpers for developer-portal backtest views. */

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2024-03" → "Mar" (falls back to the raw value if unparseable). */
export function monthLabel(month: string): string {
  const m = /^\d{4}-(\d{2})/.exec(month);
  if (!m) return month;
  return MONTH_ABBR[Number(m[1]) - 1] ?? month;
}

/** "2024-03" → "Mar 2024". */
export function monthLabelLong(month: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(month);
  if (!m) return month;
  return `${MONTH_ABBR[Number(m[2]) - 1] ?? ""} ${m[1]}`.trim();
}

export function kwhToMwh(kwh: number): number {
  return kwh / 1000;
}

export function formatMwh(kwh: number): string {
  return `${kwhToMwh(kwh).toLocaleString(undefined, { maximumFractionDigits: 1 })} MWh`;
}

export function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

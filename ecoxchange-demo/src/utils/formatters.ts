const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdDecimal = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatUsd(n: number): string {
  return usd0.format(n);
}

export function formatUsdRate(n: number): string {
  return usdDecimal.format(n);
}

export function formatKwh(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} kWh`;
}

export function formatMwh(mwh: number): string {
  return `${mwh.toLocaleString("en-US", { maximumFractionDigits: 1 })} MWh`;
}

/** Axis ticks for the production chart: 500_000 → "500K". */
export function formatKwhCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${Math.round(n)}`;
}

export function formatPct(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_SHORT = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function parts(iso: string): [number, number] {
  const y = parseInt(iso.slice(0, 4), 10);
  const m = parseInt(iso.slice(5, 7), 10);
  return [y, m];
}

export function formatMonthLong(iso: string): string {
  const [y, m] = parts(iso);
  return `${MONTH_LONG[m - 1]} ${y}`;
}

export function formatMonthShortMono(iso: string): string {
  const [y, m] = parts(iso);
  return `${MONTH_SHORT[m - 1]} ${y}`;
}

export function formatMonthAxis(iso: string): string {
  const [, m] = parts(iso);
  return MONTH_SHORT[m - 1] ?? "";
}

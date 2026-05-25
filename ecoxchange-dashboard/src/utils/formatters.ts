const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const kwh = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const mwh = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function formatUsd(n: number, precise = false): string {
  return (precise ? usdPrecise : usd).format(n);
}

export function formatKwh(n: number): string {
  return `${kwh.format(n)} kWh`;
}

export function formatMwh(n: number): string {
  return `${mwh.format(n)} MWh`;
}

export function formatPct(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function formatMonth(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatMonthLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatMonthShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
}

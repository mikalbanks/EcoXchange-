// Offering-specific formatting helpers. Yields/IRR are stored as ratios
// (0.07 = 7%); deviation/within-tolerance are already percentages.

export function ratioPct(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function pct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

// Compact USD for large raise figures: $2.5M, $750K, $10K.
export function usdCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `$${Math.round(n / 1_000)}K`;
  }
  return `$${Math.round(n)}`;
}

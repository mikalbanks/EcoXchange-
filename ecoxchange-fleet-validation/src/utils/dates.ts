export function firstOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function lastOfMonth(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0)); // day=0 → last day of previous month
  return d.toISOString().slice(0, 10);
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

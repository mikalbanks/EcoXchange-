// Number formatting for impact equivalencies (Spec 08 acceptance #7).
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const dec2 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const fmtInt = (n: number) => int.format(Math.round(n));
export const fmtKg = (n: number) => `${int.format(Math.round(n))} kg`;
export const fmtHomes = (n: number) => dec2.format(n);
export const fmtTrees = (n: number) => int.format(Math.round(n));
export const fmtAcres = (n: number) => dec1.format(n);
export const fmtKwh = (n: number) => `${int.format(Math.round(n))} kWh`;

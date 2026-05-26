/**
 * Industry capacity-factor benchmark by latitude. Used to score physical
 * durability ("is this asset over- or under-performing its region?").
 *
 * Sources: NREL ATB 2023 and DOE Solar Futures Study. Banded to keep the
 * mapping coarse — the scorer reads "above / at / below" rather than chasing
 * 0.1% differences.
 */
export function getRegionalCapacityFactorBenchmark(lat: number): number {
  const abs = Math.abs(lat);
  if (abs < 28) return 22; // deep south / desert SW (Phoenix ~33° but sunbelt CF still ~22-25)
  if (abs < 36) return 19; // Savannah, Atlanta, Charlotte, SoCal
  if (abs < 42) return 17; // NJ, PA, central states
  if (abs < 48) return 15; // Boston, MA, OR, WA
  return 13; // northern latitudes
}

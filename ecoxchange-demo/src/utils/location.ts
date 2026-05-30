interface StateBox {
  code: string;
  name: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

const STATE_BOXES: StateBox[] = [
  { code: "AL", name: "Alabama", latMin: 30.1, latMax: 35.1, lonMin: -88.5, lonMax: -84.8 },
  { code: "AZ", name: "Arizona", latMin: 31.2, latMax: 37.1, lonMin: -114.9, lonMax: -109 },
  { code: "CA", name: "California", latMin: 32.4, latMax: 42.1, lonMin: -124.5, lonMax: -114.1 },
  { code: "CO", name: "Colorado", latMin: 36.9, latMax: 41.1, lonMin: -109.1, lonMax: -102 },
  { code: "FL", name: "Florida", latMin: 24.4, latMax: 31.1, lonMin: -87.7, lonMax: -80 },
  { code: "GA", name: "Georgia", latMin: 30.3, latMax: 35.1, lonMin: -85.7, lonMax: -80.7 },
  { code: "IL", name: "Illinois", latMin: 36.9, latMax: 42.6, lonMin: -91.6, lonMax: -87 },
  { code: "MA", name: "Massachusetts", latMin: 41.2, latMax: 42.9, lonMin: -73.6, lonMax: -69.8 },
  { code: "MD", name: "Maryland", latMin: 37.8, latMax: 39.8, lonMin: -79.6, lonMax: -75 },
  { code: "NC", name: "North Carolina", latMin: 33.8, latMax: 36.7, lonMin: -84.4, lonMax: -75.4 },
  { code: "NJ", name: "New Jersey", latMin: 38.8, latMax: 41.4, lonMin: -75.6, lonMax: -73.9 },
  { code: "NM", name: "New Mexico", latMin: 31.2, latMax: 37.1, lonMin: -109.1, lonMax: -103 },
  { code: "NV", name: "Nevada", latMin: 35, latMax: 42.1, lonMin: -120.1, lonMax: -114 },
  { code: "NY", name: "New York", latMin: 40.4, latMax: 45.1, lonMin: -79.9, lonMax: -71.8 },
  { code: "OR", name: "Oregon", latMin: 41.9, latMax: 46.3, lonMin: -124.7, lonMax: -116.4 },
  { code: "PA", name: "Pennsylvania", latMin: 39.6, latMax: 42.3, lonMin: -80.6, lonMax: -74.6 },
  { code: "SC", name: "South Carolina", latMin: 32, latMax: 35.3, lonMin: -83.4, lonMax: -78.5 },
  { code: "TX", name: "Texas", latMin: 25.8, latMax: 36.6, lonMin: -106.7, lonMax: -93.5 },
  { code: "UT", name: "Utah", latMin: 36.9, latMax: 42.1, lonMin: -114.1, lonMax: -109 },
  { code: "VA", name: "Virginia", latMin: 36.5, latMax: 39.6, lonMin: -83.8, lonMax: -75.1 },
  { code: "WA", name: "Washington", latMin: 45.5, latMax: 49.1, lonMin: -124.9, lonMax: -116.9 },
];

export function lookupUsState(latitude: number, longitude: number) {
  return (
    STATE_BOXES.find(
      (state) =>
        latitude >= state.latMin &&
        latitude <= state.latMax &&
        longitude >= state.lonMin &&
        longitude <= state.lonMax,
    ) ?? null
  );
}

export function locationFromCoords(latitude: number, longitude: number): string {
  const state = lookupUsState(latitude, longitude);
  if (state) return `${state.name} solar project`;
  return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
}

/**
 * Best-effort US-state lookup from lat/lon via state bounding boxes.
 * Returns null outside the US. Boxes are simplified; ambiguous coords near
 * state lines may resolve to the larger neighbor — good enough for filtering.
 */
const STATE_BOXES: Array<{
  code: string;
  name: string;
  // [minLat, maxLat, minLon, maxLon]
  box: [number, number, number, number];
}> = [
  { code: "AL", name: "Alabama", box: [30.14, 35.0, -88.47, -84.89] },
  { code: "AK", name: "Alaska", box: [51.21, 71.39, -179.15, -129.97] },
  { code: "AZ", name: "Arizona", box: [31.33, 37.0, -114.82, -109.04] },
  { code: "AR", name: "Arkansas", box: [33.0, 36.5, -94.62, -89.64] },
  { code: "CA", name: "California", box: [32.53, 42.01, -124.48, -114.13] },
  { code: "CO", name: "Colorado", box: [36.99, 41.0, -109.06, -102.04] },
  { code: "CT", name: "Connecticut", box: [40.95, 42.05, -73.73, -71.79] },
  { code: "DE", name: "Delaware", box: [38.45, 39.84, -75.79, -75.05] },
  { code: "FL", name: "Florida", box: [24.52, 31.0, -87.63, -80.03] },
  { code: "GA", name: "Georgia", box: [30.36, 35.0, -85.61, -80.84] },
  { code: "HI", name: "Hawaii", box: [18.91, 28.4, -178.34, -154.81] },
  { code: "ID", name: "Idaho", box: [41.99, 49.0, -117.24, -111.04] },
  { code: "IL", name: "Illinois", box: [36.97, 42.51, -91.51, -87.5] },
  { code: "IN", name: "Indiana", box: [37.77, 41.76, -88.1, -84.78] },
  { code: "IA", name: "Iowa", box: [40.38, 43.5, -96.64, -90.14] },
  { code: "KS", name: "Kansas", box: [36.99, 40.0, -102.05, -94.59] },
  { code: "KY", name: "Kentucky", box: [36.5, 39.15, -89.57, -81.97] },
  { code: "LA", name: "Louisiana", box: [28.93, 33.02, -94.04, -88.82] },
  { code: "ME", name: "Maine", box: [43.06, 47.46, -71.08, -66.95] },
  { code: "MD", name: "Maryland", box: [37.89, 39.72, -79.49, -75.05] },
  { code: "MA", name: "Massachusetts", box: [41.24, 42.89, -73.51, -69.93] },
  { code: "MI", name: "Michigan", box: [41.7, 48.31, -90.42, -82.41] },
  { code: "MN", name: "Minnesota", box: [43.5, 49.38, -97.24, -89.49] },
  { code: "MS", name: "Mississippi", box: [30.17, 35.0, -91.66, -88.1] },
  { code: "MO", name: "Missouri", box: [35.99, 40.61, -95.77, -89.1] },
  { code: "MT", name: "Montana", box: [44.36, 49.0, -116.05, -104.04] },
  { code: "NE", name: "Nebraska", box: [40.0, 43.0, -104.05, -95.31] },
  { code: "NV", name: "Nevada", box: [35.0, 42.0, -120.0, -114.04] },
  { code: "NH", name: "New Hampshire", box: [42.7, 45.31, -72.56, -70.61] },
  { code: "NJ", name: "New Jersey", box: [38.93, 41.36, -75.56, -73.89] },
  { code: "NM", name: "New Mexico", box: [31.33, 37.0, -109.05, -103.0] },
  { code: "NY", name: "New York", box: [40.5, 45.02, -79.76, -71.86] },
  { code: "NC", name: "North Carolina", box: [33.84, 36.59, -84.32, -75.46] },
  { code: "ND", name: "North Dakota", box: [45.94, 49.0, -104.05, -96.55] },
  { code: "OH", name: "Ohio", box: [38.4, 41.98, -84.82, -80.52] },
  { code: "OK", name: "Oklahoma", box: [33.62, 37.0, -103.0, -94.43] },
  { code: "OR", name: "Oregon", box: [41.99, 46.29, -124.57, -116.46] },
  { code: "PA", name: "Pennsylvania", box: [39.72, 42.27, -80.52, -74.69] },
  { code: "RI", name: "Rhode Island", box: [41.15, 42.02, -71.86, -71.12] },
  { code: "SC", name: "South Carolina", box: [32.03, 35.22, -83.36, -78.54] },
  { code: "SD", name: "South Dakota", box: [42.48, 45.95, -104.06, -96.44] },
  { code: "TN", name: "Tennessee", box: [34.98, 36.68, -90.31, -81.65] },
  { code: "TX", name: "Texas", box: [25.84, 36.5, -106.65, -93.51] },
  { code: "UT", name: "Utah", box: [36.99, 42.0, -114.05, -109.04] },
  { code: "VT", name: "Vermont", box: [42.73, 45.02, -73.44, -71.46] },
  { code: "VA", name: "Virginia", box: [36.54, 39.47, -83.68, -75.24] },
  { code: "WA", name: "Washington", box: [45.54, 49.0, -124.85, -116.92] },
  { code: "WV", name: "West Virginia", box: [37.2, 40.64, -82.64, -77.72] },
  { code: "WI", name: "Wisconsin", box: [42.49, 47.08, -92.89, -86.25] },
  { code: "WY", name: "Wyoming", box: [40.99, 45.01, -111.06, -104.05] },
];

export function lookupUsState(
  lat: number,
  lon: number,
): { code: string; name: string } | null {
  for (const s of STATE_BOXES) {
    const [minLat, maxLat, minLon, maxLon] = s.box;
    if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
      return { code: s.code, name: s.name };
    }
  }
  return null;
}

// Words that follow a city name in typical project naming ("Savannah
// Community Solar 5MW", "Phoenix AZ Commercial 1MW") and mark its end.
const CITY_STOP_WORDS = new Set([
  "Community",
  "Commercial",
  "Solar",
  "PV",
  "Energy",
  "Industrial",
  "Residential",
  "Project",
  "Facility",
  "Farm",
  "Park",
]);

/**
 * Best-effort city extraction from a project name. Takes leading capitalized
 * words until a stop word or a 2-letter state code or a digit token is hit.
 */
export function cityFromName(name: string): string | null {
  const parts = name.split(/\s+/);
  const tokens: string[] = [];
  for (const tok of parts) {
    if (!/^[A-Z]/.test(tok)) break;
    if (CITY_STOP_WORDS.has(tok)) break;
    if (/^[A-Z]{2}$/.test(tok)) break; // state code (e.g. "AZ")
    if (/\d/.test(tok)) break;
    tokens.push(tok);
  }
  return tokens.length > 0 ? tokens.join(" ") : null;
}

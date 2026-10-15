/**
 * Public-domain electric transmission geometry assembled by Western Power Pool
 * from HIFLD / DHS CISA and SeerAI archive (SeerAI states CC BY 4.0).
 * Source URLs intentionally centralized for a future EcoXchange-owned tile host.
 * The archive is a point-in-time infrastructure inventory, not available MW.
 */
const WPP_DATA_ORIGIN = "https://raw.githubusercontent.com/BenHutchinsWPP/TransmissionMap/data-static/data/layers/";
export const transmissionArchiveUrl = WPP_DATA_ORIGIN + "hifld_transmission_lines.pmtiles";
export const substationArchiveUrl = WPP_DATA_ORIGIN + "hifld_substations.geojson.gz";

export function formatScoutCoordinates(point: { lng: number; lat: number }): string {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) ||
      Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) return "Coordinates unavailable";
  return `${point.lat.toFixed(5)}°, ${point.lng.toFixed(5)}°`;
}

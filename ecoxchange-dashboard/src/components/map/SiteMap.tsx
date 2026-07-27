import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useIsMobile } from "../../hooks/useMediaQuery.js";

// Pulsing site marker — same divIcon technique as PipelineMap so the
// accentBrt box-shadow halo keyframe (animate-badge-pulse) applies.
const siteIcon = L.divIcon({
  className: "",
  html: `<span class="block h-6 w-6 rounded-full border-2 border-white bg-accentBrt animate-badge-pulse" data-testid="site-marker" aria-hidden="true"></span>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface Props {
  latitude: number;
  longitude: number;
  zoom?: number;
}

/**
 * Single-site map for the Run Demo backtest flow: the project location
 * with a pulsing marker while satellite data is "fetched" for it.
 * Rectangular container per brand; degrades gracefully without tiles.
 */
export function SiteMap({ latitude, longitude, zoom = 7 }: Props) {
  const isMobile = useIsMobile();

  return (
    <div
      className="overflow-hidden border border-darkBg/10"
      data-testid="site-map"
    >
      <MapContainer
        key={`${latitude},${longitude}`}
        center={[latitude, longitude]}
        zoom={zoom}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={true}
        style={{ height: isMobile ? "220px" : "320px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={[latitude, longitude]} icon={siteIcon} />
      </MapContainer>
    </div>
  );
}

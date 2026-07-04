import { Link } from "react-router-dom";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { YieldDisclosure } from "../../compliance/components/YieldDisclosure.js";
import { useIsMobile } from "../../hooks/useMediaQuery.js";
import { palette } from "../../config/palette.js";
import { PIPELINE_MARKERS, type ProjectMarker } from "../../data/pipeline-markers.js";

// Continental US framing (spec §1.5).
const CONUS_CENTER: [number, number] = [39.5, -98.35];
const CONUS_BOUNDS: L.LatLngBoundsExpression = [
  [22, -130],
  [52, -62],
];

// Pulsing active-project marker: a divIcon so the existing accentBrt
// box-shadow halo keyframe (animate-badge-pulse) applies — SVG circle
// markers can't carry box-shadows.
const activeIcon = L.divIcon({
  className: "", // suppress leaflet's default divIcon chrome
  html: `<span class="block h-6 w-6 rounded-full border-2 border-white bg-accentBrt animate-badge-pulse" data-testid="active-marker" aria-hidden="true"></span>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

const VECTOR_STYLE: Record<"pipeline" | "target_market", { color: string; radius: number; opacity: number }> = {
  pipeline: { color: palette.medGreen, radius: 8, opacity: 0.7 },
  target_market: { color: palette.lightGreen, radius: 6, opacity: 0.4 },
};

function MarkerPopup({ marker }: { marker: ProjectMarker }) {
  const capacityMw = marker.capacityKw / 1000;
  if (marker.status === "active") {
    return (
      <div className="min-w-[210px] space-y-1.5 font-sans">
        <p className="font-medium text-darkBg">{marker.name}</p>
        <p className="text-xs text-textMuted">
          {marker.capacityKw.toLocaleString("en-US")} kW DC
        </p>
        <p className="flex items-center gap-1.5 text-xs font-medium text-medGreen">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accentBrt" aria-hidden />
          {marker.verificationStatus} · Dec 2024
        </p>
        {marker.estimatedYield ? (
          <p className="text-xs text-textDark">
            Est. Yield:{" "}
            <YieldDisclosure value={marker.estimatedYield} type="yield_rate" basis="modeled" />
          </p>
        ) : null}
        {marker.program ? (
          <p className="text-xs text-textMuted">Program: {marker.program}</p>
        ) : null}
        {marker.projectPath ? (
          <Link
            to={marker.projectPath}
            className="mt-1 inline-block text-xs font-medium text-medGreen underline-offset-2 hover:underline"
          >
            View Project →
          </Link>
        ) : null}
      </div>
    );
  }
  return (
    <div className="min-w-[190px] space-y-1.5 font-sans">
      <p className="font-medium text-darkBg">{marker.name}</p>
      <p className="text-xs text-textMuted">
        ~{capacityMw} MW · {marker.status === "pipeline" ? "Pipeline" : "Target market"}
      </p>
      {marker.program ? (
        <p className="text-xs text-textMuted">Program: {marker.program}</p>
      ) : null}
      <p className="text-xs text-textMuted">
        Status: {marker.status === "pipeline" ? "Pipeline development" : "Target market"}
      </p>
    </div>
  );
}

/**
 * Pipeline & target-markets map (differentiation spec §1): the Savannah
 * project as a pulsing active marker plus target-state program markers.
 * CartoDB Positron tiles (muted, free); rectangular container per brand.
 * Degrades gracefully when tiles are unreachable — markers still render.
 */
export function PipelineMap() {
  const isMobile = useIsMobile();

  return (
    <div
      className="overflow-hidden border border-darkBg/10"
      data-testid="pipeline-map"
    >
      <MapContainer
        center={CONUS_CENTER}
        zoom={4}
        minZoom={3}
        maxBounds={CONUS_BOUNDS}
        scrollWheelZoom={false}
        style={{ height: isMobile ? "280px" : "400px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {PIPELINE_MARKERS.map((marker) =>
          marker.status === "active" ? (
            <Marker
              key={marker.id}
              position={[marker.latitude, marker.longitude]}
              icon={activeIcon}
            >
              <Popup>
                <MarkerPopup marker={marker} />
              </Popup>
            </Marker>
          ) : (
            <CircleMarker
              key={marker.id}
              center={[marker.latitude, marker.longitude]}
              radius={VECTOR_STYLE[marker.status].radius}
              pathOptions={{
                color: VECTOR_STYLE[marker.status].color,
                fillColor: VECTOR_STYLE[marker.status].color,
                fillOpacity: VECTOR_STYLE[marker.status].opacity,
                opacity: VECTOR_STYLE[marker.status].opacity,
              }}
            >
              <Popup>
                <MarkerPopup marker={marker} />
              </Popup>
            </CircleMarker>
          ),
        )}
      </MapContainer>
    </div>
  );
}

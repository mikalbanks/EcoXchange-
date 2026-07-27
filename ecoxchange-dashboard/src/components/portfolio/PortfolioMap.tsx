// CONUS portfolio map (Spec 5): every demo project as a pin color-coded by
// verification status — accentBrt verified, amber flagged, gray pending or
// onboarding. Same Leaflet patterns as PipelineMap (CartoDB Positron
// tiles, divIcon markers, rectangular brand container).

import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useIsMobile } from "../../hooks/useMediaQuery.js";
import { VerificationBadge } from "../VerificationBadge.js";
import type { DemoProject } from "../../data/demo-projects.js";

const CONUS_CENTER: [number, number] = [39.5, -98.35];
const CONUS_BOUNDS: L.LatLngBoundsExpression = [
  [22, -130],
  [52, -62],
];

const PIN_CLASSES: Record<DemoProject["verification_status"], string> = {
  verified: "bg-accentBrt",
  flagged: "bg-flagAmber",
  pending: "bg-gray-400",
};

function pinIcon(project: DemoProject): L.DivIcon {
  const pulse =
    project.verification_status === "flagged" ? " animate-badge-pulse" : "";
  return L.divIcon({
    className: "",
    html: `<span class="block h-5 w-5 rounded-full border-2 border-white ${PIN_CLASSES[project.verification_status]}${pulse}" aria-hidden="true"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

export function PortfolioMap({ projects }: { projects: DemoProject[] }) {
  const isMobile = useIsMobile();

  return (
    <div
      className="overflow-hidden border border-darkBg/10"
      data-testid="portfolio-map"
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
        {projects.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={pinIcon(p)}
          >
            <Popup>
              <div className="min-w-[210px] space-y-1.5 font-sans">
                <p className="font-medium text-darkBg">{p.name}</p>
                <p className="text-xs text-textMuted">
                  {p.capacity_kw.toLocaleString("en-US")} kW DC ·{" "}
                  {p.city}, {p.state}
                  {p.status === "onboarding" ? " · Onboarding" : ""}
                </p>
                <VerificationBadge
                  status={p.verification_status}
                  size="sm"
                />
                {p.current_yield_pct > 0 ? (
                  <p className="text-xs text-textDark">
                    Yield: {p.current_yield_pct.toFixed(1)}% ·{" "}
                    {p.investor_count} investors
                  </p>
                ) : null}
                {p.detailPath ? (
                  <Link
                    to={p.detailPath}
                    className="mt-1 inline-block text-xs font-medium text-medGreen underline-offset-2 hover:underline"
                  >
                    View Project →
                  </Link>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

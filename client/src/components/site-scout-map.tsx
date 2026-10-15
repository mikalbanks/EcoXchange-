import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatScoutCoordinates, transmissionArchiveUrl, substationArchiveUrl } from "@/lib/site-scout-map";
import "./site-scout-map.css";

type MapPoint = { lng: number; lat: number };
type MapControls = {
  location: string;
  onLocationChange: (value: string) => void;
  onPointChange: (point: MapPoint) => void;
};

type MapRuntime = {
  maplibregl: any;
  pmtiles: any;
};

const MAPLIBRE_VERSION = "5.13.0";
const PMTILES_VERSION = "3.2.0";
const MAP_SCRIPT = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
const MAP_CSS = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
const PMTILES_SCRIPT = `https://cdn.jsdelivr.net/npm/pmtiles@${PMTILES_VERSION}/dist/pmtiles.js`;
const ATTRIBUTION = 'HIFLD / DHS CISA · SeerAI / Source Cooperative (CC BY 4.0) · TransmissionMap (MIT)';
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
let runtimePromise: Promise<MapRuntime> | undefined;
let protocolRegistered = false;

function loadScript(url: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "true") { resolve(); return; }
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = id;
    script.src = url;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => { script.remove(); reject(new Error("Unable to download mapping library.")); };
    document.head.appendChild(script);
  });
}

function loadRuntime(): Promise<MapRuntime> {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      if (!document.getElementById("scout-maplibre-css")) {
        const link = document.createElement("link");
        link.id = "scout-maplibre-css";
        link.rel = "stylesheet";
        link.href = MAP_CSS;
        document.head.appendChild(link);
      }
      await loadScript(MAP_SCRIPT, "scout-maplibre-runtime");
      await loadScript(PMTILES_SCRIPT, "scout-pmtiles-runtime");
      const globals = window as typeof window & { maplibregl?: any; pmtiles?: any };
      if (!globals.maplibregl?.Map || !globals.pmtiles?.Protocol) {
        throw new Error("Mapping libraries did not initialize.");
      }
      if (!protocolRegistered) {
        const protocol = new globals.pmtiles.Protocol();
        globals.maplibregl.addProtocol("pmtiles", protocol.tile.bind(protocol));
        protocolRegistered = true;
      }
      return { maplibregl: globals.maplibregl, pmtiles: globals.pmtiles };
    })().catch((error) => { runtimePromise = undefined; throw error; });
  }
  return runtimePromise;
}

function detailsElement(title: string, rows: Array<[string, unknown]>): HTMLElement {
  const root = document.createElement("div");
  root.className = "scout-map-feature";
  const heading = document.createElement("strong");
  heading.textContent = title;
  root.appendChild(heading);
  for (const [label, value] of rows) {
    if (value === null || value === undefined || value === "") continue;
    const paragraph = document.createElement("p");
    const tag = document.createElement("span");
    tag.textContent = `${label}: `;
    paragraph.append(tag, document.createTextNode(String(value)));
    root.appendChild(paragraph);
  }
  const disclaimer = document.createElement("small");
  disclaimer.textContent = "Mapped infrastructure only. No confirmed usable MW, energization date, or interconnection rights.";
  root.appendChild(disclaimer);
  return root;
}

async function fetchSubstations(signal: AbortSignal): Promise<any> {
  const response = await fetch(substationArchiveUrl, { signal });
  if (!response.ok) throw new Error(`Substation data unavailable (HTTP ${response.status}).`);
  if (typeof DecompressionStream === "undefined") throw new Error("Browser does not support compressed substation files.");
  const compressed = await response.blob();
  const decoded = compressed.stream().pipeThrough(new DecompressionStream("gzip"));
  const geojson = await new Response(decoded).json();
  if (geojson?.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
    throw new Error("Substation data response is invalid.");
  }
  return geojson;
}

/**
 * Site Scout's native React map is adapted from the architecture of the
 * MIT-licensed Western Power Pool TransmissionMap project. Infrastructure
 * data remain third-party hosted; never interpret mapped voltage as spare MW.
 */
export default function SiteScoutMap({ location, onLocationChange, onPointChange }: MapControls) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const runtimeRef = useRef<MapRuntime | null>(null);
  const callbacksRef = useRef({ onLocationChange, onPointChange });
  const fetchRef = useRef<AbortController | null>(null);
  const lastSearchRef = useRef(0);
  const substationsLoadedRef = useRef(false);
  const [mapStatus, setMapStatus] = useState("Loading infrastructure map…");
  const [mapError, setMapError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState("");
  const [showLines, setShowLines] = useState(true);
  const [showSubstations, setShowSubstations] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  callbacksRef.current = { onLocationChange, onPointChange };

  useEffect(() => {
    let active = true;
    let map: any;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const abort = new AbortController();
    fetchRef.current = abort;
    setMapReady(false);
    setMapError("");
    setMapStatus("Loading infrastructure map…");
    substationsLoadedRef.current = false;

    (async () => {
      try {
        const runtime = await loadRuntime();
        if (!active || !containerRef.current) return;
        runtimeRef.current = runtime;
        const { maplibregl } = runtime;
        map = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: [-96, 38],
          zoom: 3.6,
          minZoom: 2,
          maxZoom: 16,
          attributionControl: true,
        });
        mapRef.current = map;
        watchdog = setTimeout(() => {
          if (active && !map?.loaded()) {
            setMapError("The basemap did not finish loading. Try again or continue with the written screening form.");
            setMapStatus("Map basemap unavailable");
          }
        }, 15000);
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        map.on("error", (event: any) => {
          console.warn("[Site Scout] map source error:", event.error || event);
          const message = String(event.error?.message || "");
          if (message.includes("pmtiles") || message.includes("hifld") || message.includes("HTTP 404")) {
            if (active) setMapStatus("Infrastructure layer unavailable. Map remains usable.");
          }
        });

        map.on("load", () => {
          if (!active) return;
          if (watchdog) clearTimeout(watchdog);
          try {
            map.addSource("scout-hifld-lines", {
              type: "vector",
              url: "pmtiles://" + transmissionArchiveUrl,
              attribution: ATTRIBUTION,
              minzoom: 2,
              maxzoom: 11,
            });
            map.addLayer({
              id: "scout-hifld-lines",
              type: "line",
              source: "scout-hifld-lines",
              "source-layer": "hifld_transmission_lines",
              layout: { visibility: "visible", "line-join": "round" },
              paint: {
                "line-color": ["step", ["to-number", ["get", "VOLTAGE"], 0], "#a49eaa", 115, "#94a54f", 230, "#cd8f4e", 345, "#b45742", 500, "#733f4d"],
                "line-opacity": 0.83,
                "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 7, 1.75, 11, 2.7],
              },
            });
            map.addSource("scout-hifld-substations", {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
              cluster: true,
              clusterMaxZoom: 9,
              clusterRadius: 45,
              attribution: ATTRIBUTION,
            });
            map.addLayer({
              id: "scout-substation-clusters",
              type: "circle",
              source: "scout-hifld-substations",
              filter: ["has", "point_count"],
              layout: { visibility: "none" },
              paint: { "circle-color": "#315d50", "circle-radius": ["step", ["get", "point_count"], 12, 100, 18, 1000, 24], "circle-opacity": 0.85 },
            });
            map.addLayer({
              id: "scout-substation-points",
              type: "circle",
              source: "scout-hifld-substations",
              filter: ["!", ["has", "point_count"]],
              layout: { visibility: "none" },
              paint: { "circle-color": "#e2b049", "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 11, 7], "circle-stroke-color": "#213a33", "circle-stroke-width": 1 },
            });
            map.on("click", (event: any) => {
              const features = map.queryRenderedFeatures(event.point, { layers: [
                "scout-substation-points", "scout-substation-clusters", "scout-hifld-lines",
              ] });
              const feature = features[0];
              if (feature?.layer?.id === "scout-substation-clusters") {
                map.easeTo({ center: event.lngLat, zoom: Math.min(map.getZoom() + 2, 13) });
                return;
              }
              if (feature) {
                const p = feature.properties || {};
                const isLine = feature.layer.id === "scout-hifld-lines";
                const title = isLine ? "Mapped transmission segment" : "Mapped substation";
                const rows: Array<[string, unknown]> = isLine
                  ? [["Operator", p.OWNER], ["Voltage (kV)", p.VOLTAGE], ["Status (historical)", p.STATUS], ["Source feature ID", p.ID]]
                  : [["Name", p.name], ["Maximum kV", p.max_kv], ["Minimum kV", p.min_kv]];
                new maplibregl.Popup({ closeButton: true, maxWidth: "260px" })
                  .setLngLat(event.lngLat).setDOMContent(detailsElement(title, rows)).addTo(map);
                return;
              }
              const point: MapPoint = { lng: Number(event.lngLat.lng.toFixed(5)), lat: Number(event.lngLat.lat.toFixed(5)) };
              choosePoint(point, `Selected site · ${formatScoutCoordinates(point)}`);
            });
            if (active) { setMapReady(true); setMapStatus("Mapped U.S. transmission lines · click empty space to mark a site"); }
          } catch (error) {
            if (active) {
              setMapError(error instanceof Error ? error.message : "Map layers could not be initialized.");
              setMapStatus("Map initialization incomplete");
            }
          }
        });

        function choosePoint(point: MapPoint, label: string) {
          markerRef.current?.remove();
          markerRef.current = new maplibregl.Marker({ color: "#de7c48" })
            .setLngLat([point.lng, point.lat]).addTo(map);
          setSelectedPoint(point);
          callbacksRef.current.onPointChange(point);
          callbacksRef.current.onLocationChange(label);
        }
      } catch (error) {
        if (active) {
          setMapError(error instanceof Error ? error.message : "Unable to load the map.");
          setMapStatus("Map unavailable");
        }
      }
    })();

    return () => {
      active = false;
      abort.abort();
      if (watchdog) clearTimeout(watchdog);
      markerRef.current?.remove();
      markerRef.current = null;
      if (map) map.remove();
      if (mapRef.current === map) mapRef.current = null;
    };
  }, [retryKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer("scout-hifld-lines")) {
      map.setLayoutProperty("scout-hifld-lines", "visibility", showLines ? "visible" : "none");
    }
  }, [showLines, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.getSource("scout-hifld-substations")) return;
    for (const id of ["scout-substation-clusters", "scout-substation-points"]) {
      map.setLayoutProperty(id, "visibility", showSubstations ? "visible" : "none");
    }
    if (!showSubstations || substationsLoadedRef.current) return;
    let cancelled = false;
    setMapStatus("Loading HIFLD substation locations…");
    const controller = fetchRef.current;
    if (!controller) return;
    void fetchSubstations(controller.signal).then((data) => {
      if (cancelled || controller.signal.aborted) return;
      map.getSource("scout-hifld-substations")?.setData(data);
      substationsLoadedRef.current = true;
      setMapStatus("U.S. transmission and substation layers available · click map to inspect");
    }).catch((error) => {
      if (cancelled || controller.signal.aborted) return;
      setMapStatus("Substation layer unavailable; transmission map remains usable.");
      setShowSubstations(false);
      console.warn("[Site Scout] substation load:", error);
    });
    return () => { cancelled = true; };
  }, [showSubstations, mapReady]);

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = (searchText.trim() || location.trim()).slice(0, 180);
    if (query.length < 3) { setSearchFeedback("Enter a city, state or U.S. address."); return; }
    if (Date.now() - lastSearchRef.current < 1200) { setSearchFeedback("Please wait before searching again."); return; }
    if (!mapRef.current) { setSearchFeedback("Wait for the map to finish loading."); return; }
    lastSearchRef.current = Date.now();
    setSearching(true);
    setSearchFeedback("");
    try {
      const response = await fetch("https://nominatim.openstreetmap.org/search?" + new URLSearchParams({
        q: query, format: "json", limit: "1", countrycodes: "us",
      }), { headers: { Accept: "application/json" }, signal: fetchRef.current?.signal });
      if (!response.ok) throw new Error("Search provider is unavailable.");
      const results = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
      if (!results.length) { setSearchFeedback("No U.S. location matched. Try city and state, or select a point directly."); return; }
      const place = results[0];
      const lng = Number(place.lon);
      const lat = Number(place.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) throw new Error("Search returned invalid coordinates.");
      mapRef.current.flyTo({ center: [lng, lat], zoom: 10, essential: true });
      markerRef.current?.remove();
      markerRef.current = new runtimeRef.current!.maplibregl.Marker({ color: "#de7c48" })
        .setLngLat([lng, lat]).addTo(mapRef.current);
      const point = { lng: Number(lng.toFixed(5)), lat: Number(lat.toFixed(5)) };
      setSelectedPoint(point);
      callbacksRef.current.onPointChange(point);
      callbacksRef.current.onLocationChange(query);
      setSearchFeedback("Location found; adjust the marker by clicking an empty map location.");
    } catch (error) {
      if (fetchRef.current?.signal.aborted) return;
      setSearchFeedback(error instanceof Error ? error.message : "Search failed; choose a point directly.");
    } finally {
      setSearching(false);
    }
  };

  return <section className="scout-map-shell" aria-label="Interactive transmission infrastructure map">
    <div className="scout-map-topline">
      <div>
        <span className="label">Site Scout / Interactive infrastructure atlas</span>
        <h3>See the grid. Select a candidate site.</h3>
        <p>U.S. transmission and substations, mapped from HIFLD public infrastructure records. Infrastructure visibility is not confirmed available capacity.</p>
      </div>
      <form className="scout-map-search" onSubmit={search}>
        <label htmlFor="scout-map-query">Find a U.S. location</label>
        <div>
          <input id="scout-map-query" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="City, state or address" maxLength={180} />
          <button type="submit" disabled={searching || !mapReady}>{searching ? "Finding…" : "Find ↗"}</button>
        </div>
      </form>
    </div>
    <div className="scout-map-stage">
      <div ref={containerRef} className="scout-map-canvas" aria-label="Drag and zoom the infrastructure map. Click empty space to select a site." />
      {!mapReady && <div className="scout-map-loading" role="status">{mapStatus}{mapError && <button type="button" onClick={() => setRetryKey(k => k + 1)}>Retry map</button>}</div>}
      {mapReady && <div className="scout-map-layers" aria-label="Infrastructure layers">
        <strong>Visible layers</strong>
        <label><input type="checkbox" checked={showLines} onChange={e => setShowLines(e.target.checked)} /> Transmission lines</label>
        <label><input type="checkbox" checked={showSubstations} onChange={e => setShowSubstations(e.target.checked)} /> Substations</label>
      </div>}
    </div>
    <div className="scout-map-bottom">
      <div><span className="scout-map-status" role="status">{mapStatus}</span>{searchFeedback && <span className="scout-map-feedback" role="status">{searchFeedback}</span>}</div>
      <div className="scout-map-selected">{selectedPoint ? <><b>Candidate pin</b> {formatScoutCoordinates(selectedPoint)}</> : "Click empty map space to pin a potential site"}</div>
    </div>
    <p className="scout-map-credit">Sources: <a href="https://github.com/BenHutchinsWPP/TransmissionMap" target="_blank" rel="noopener noreferrer">Western Power Pool TransmissionMap (MIT)</a>; HIFLD / DHS CISA, SeerAI / Source Cooperative (CC BY 4.0), and <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> for place search. Map baselayers © OpenFreeMap/OSM. HIFLD validation dates may extend only through 2021. Layers are hosted by an external project and may be unavailable or incomplete. Never assume spare capacity, service territory, interconnection rights, permitting, or firm energization from infrastructure shown.</p>
  </section>;
}

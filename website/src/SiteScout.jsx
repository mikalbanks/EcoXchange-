import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "./icons";
import "./site-scout.css";

const MODULES = [
  ["site-scout-maplibre-css", "link", "https://cdn.jsdelivr.net/npm/maplibre-gl@5.13.0/dist/maplibre-gl.css"],
  ["site-scout-maplibre-js", "script", "https://cdn.jsdelivr.net/npm/maplibre-gl@5.13.0/dist/maplibre-gl.js"],
  ["site-scout-pmtiles-js", "script", "https://cdn.jsdelivr.net/npm/pmtiles@3.2.0/dist/pmtiles.js"],
];
const LINES_URL = "https://raw.githubusercontent.com/BenHutchinsWPP/TransmissionMap/data-static/data/layers/hifld_transmission_lines.pmtiles";
const SUBSTATIONS_URL = "https://raw.githubusercontent.com/BenHutchinsWPP/TransmissionMap/data-static/data/layers/hifld_substations.geojson.gz";
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const CREDIT = "HIFLD / DHS CISA; SeerAI / Source Cooperative (CC BY 4.0); Western Power Pool TransmissionMap (MIT)";
export const SCOUT_HANDOFF_KEY = "ecoxchange-site-scout-v1";

let modulesPromise;
let registeredProtocol = false;

function addResource([id, tag, url]) {
  if (tag === "link") {
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing?.dataset.ready === "true") return resolve();
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = id;
    script.src = url;
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = () => { script.dataset.ready = "true"; resolve(); };
    script.onerror = () => { script.remove(); reject(new Error("Could not download the mapping library.")); };
    document.head.appendChild(script);
  });
}

async function loadMapModules() {
  if (!modulesPromise) {
    modulesPromise = (async () => {
      await addResource(MODULES[0]);
      await addResource(MODULES[1]);
      await addResource(MODULES[2]);
      const maplibregl = window.maplibregl;
      const pmtiles = window.pmtiles;
      if (!maplibregl?.Map || !pmtiles?.Protocol) throw new Error("Map libraries are not available.");
      if (!registeredProtocol) {
        const protocol = new pmtiles.Protocol();
        maplibregl.addProtocol("pmtiles", protocol.tile.bind(protocol));
        registeredProtocol = true;
      }
      return maplibregl;
    })().catch(error => { modulesPromise = undefined; throw error; });
  }
  return modulesPromise;
}

function inspectPopup(title, properties, type) {
  const element = document.createElement("div");
  element.className = "site-scout-popup";
  const heading = document.createElement("strong");
  heading.textContent = title;
  element.appendChild(heading);
  const rows = type === "line"
    ? [["Operator", properties.OWNER], ["Voltage", properties.VOLTAGE ? `${properties.VOLTAGE} kV` : null], ["Recorded status", properties.STATUS]]
    : [["Name", properties.name], ["Maximum voltage", properties.max_kv ? `${properties.max_kv} kV` : null]];
  for (const [label, value] of rows) {
    if (value === undefined || value === null || value === "") continue;
    const line = document.createElement("p");
    const key = document.createElement("b");
    key.textContent = label + ": ";
    line.append(key, document.createTextNode(String(value)));
    element.appendChild(line);
  }
  const note = document.createElement("small");
  note.textContent = "Map reference only. Usable MW, utility service, interconnection and energization remain unverified.";
  element.appendChild(note);
  return element;
}

async function getSubstations(signal) {
  const response = await fetch(SUBSTATIONS_URL, { signal });
  if (!response.ok) throw new Error("Substation data unavailable.");
  if (!("DecompressionStream" in window)) throw new Error("This browser cannot unpack substation data.");
  const stream = (await response.blob()).stream().pipeThrough(new DecompressionStream("gzip"));
  const data = await new Response(stream).json();
  if (data?.type !== "FeatureCollection" || !Array.isArray(data.features)) throw new Error("Invalid substation data.");
  return data;
}

function coordinates(point) {
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

export function SiteScoutPage() {
  const mapElement = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const maplibre = useRef(null);
  const aborter = useRef(null);
  const substationsReady = useRef(false);
  const latestSearch = useRef(0);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Preparing infrastructure map…");
  const [problem, setProblem] = useState("");
  const [retry, setRetry] = useState(0);
  const [showLines, setShowLines] = useState(true);
  const [showSubstations, setShowSubstations] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [location, setLocation] = useState("");
  const [sitePoint, setSitePoint] = useState(null);
  const [plannedMw, setPlannedMw] = useState("");
  const [rampMonth, setRampMonth] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let mounted = true;
    let instance;
    let timeout;
    const controller = new AbortController();
    aborter.current = controller;
    substationsReady.current = false;
    setReady(false);
    setProblem("");
    setStatus("Preparing infrastructure map…");

    void loadMapModules().then(gl => {
      if (!mounted || !mapElement.current) return;
      maplibre.current = gl;
      instance = new gl.Map({
        container: mapElement.current,
        style: STYLE_URL,
        center: [-97, 39],
        zoom: 3.6,
        minZoom: 2,
        maxZoom: 16,
        attributionControl: true,
      });
      map.current = instance;
      instance.addControl(new gl.NavigationControl({ showCompass: false }), "top-right");
      timeout = window.setTimeout(() => {
        if (!mounted || instance?.loaded()) return;
        setProblem("The basemap is taking too long to load. You can continue to the assessment without using the map.");
        setStatus("Map loading problem");
      }, 15000);
      instance.on("error", event => {
        console.warn("[EcoXchange Site Scout]", event.error || event);
        const message = String(event.error?.message || "");
        if (message.includes("pmtiles") || message.includes("hifld")) {
          if (mounted) setStatus("Infrastructure layer unavailable. Site selection remains available.");
        }
      });
      instance.on("load", () => {
        if (!mounted) return;
        window.clearTimeout(timeout);
        try {
          instance.addSource("site-scout-lines", {
            type: "vector", url: "pmtiles://" + LINES_URL, minzoom: 2, maxzoom: 11,
            attribution: CREDIT,
          });
          instance.addLayer({
            id: "site-scout-lines", type: "line", source: "site-scout-lines",
            "source-layer": "hifld_transmission_lines",
            layout: { visibility: "visible", "line-join": "round" },
            paint: {
              "line-color": ["step", ["to-number", ["get", "VOLTAGE"], 0], "#a49eaa", 115, "#94a54f", 230, "#cd8f4e", 345, "#b45742", 500, "#733f4d"],
              "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 7, 1.75, 11, 2.7],
              "line-opacity": 0.83,
            },
          });
          instance.addSource("site-scout-substations", {
            type: "geojson", data: { type: "FeatureCollection", features: [] },
            cluster: true, clusterMaxZoom: 9, clusterRadius: 45,
            attribution: CREDIT,
          });
          instance.addLayer({
            id: "site-scout-clusters", type: "circle", source: "site-scout-substations",
            filter: ["has", "point_count"],
            layout: { visibility: "none" },
            paint: { "circle-color": "#24553f", "circle-radius": ["step", ["get", "point_count"], 13, 100, 19, 1000, 25], "circle-opacity": 0.85 },
          });
          instance.addLayer({
            id: "site-scout-substation-points", type: "circle", source: "site-scout-substations",
            filter: ["!", ["has", "point_count"]], layout: { visibility: "none" },
            paint: { "circle-color": "#e1ae52", "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 11, 7], "circle-stroke-color": "#204534", "circle-stroke-width": 1.2 },
          });
          instance.on("click", event => {
            const features = instance.queryRenderedFeatures(event.point, {
              layers: ["site-scout-substation-points", "site-scout-clusters", "site-scout-lines"],
            });
            const feature = features[0];
            if (feature?.layer?.id === "site-scout-clusters") {
              instance.easeTo({ center: event.lngLat, zoom: Math.min(13, instance.getZoom() + 2) });
              return;
            }
            if (feature) {
              const isLine = feature.layer.id === "site-scout-lines";
              new gl.Popup({ maxWidth: "280px" })
                .setLngLat(event.lngLat)
                .setDOMContent(inspectPopup(isLine ? "Mapped transmission segment" : "Mapped substation", feature.properties || {}, isLine ? "line" : "substation"))
                .addTo(instance);
              return;
            }
            const point = { lat: Number(event.lngLat.lat.toFixed(5)), lng: Number(event.lngLat.lng.toFixed(5)) };
            placePin(point);
          });
          setReady(true);
          setStatus("Transmission map ready · click empty map space to pin a candidate site");
        } catch (error) {
          setProblem(error instanceof Error ? error.message : "Infrastructure layer loading failed.");
        }
      });
      function placePin(point) {
        marker.current?.remove();
        marker.current = new gl.Marker({ color: "#1a754e" }).setLngLat([point.lng, point.lat]).addTo(instance);
        setSitePoint(point);
        setLocation(`Map-selected site (${coordinates(point)})`);
        setFeedback("");
      }
    }).catch(error => {
      if (!mounted) return;
      setProblem(error instanceof Error ? error.message : "Map is temporarily unavailable.");
      setStatus("Map unavailable");
    });
    return () => {
      mounted = false;
      controller.abort();
      window.clearTimeout(timeout);
      marker.current?.remove();
      marker.current = null;
      instance?.remove();
      if (map.current === instance) map.current = null;
    };
  }, [retry]);

  useEffect(() => {
    if (map.current?.getLayer("site-scout-lines")) {
      map.current.setLayoutProperty("site-scout-lines", "visibility", showLines ? "visible" : "none");
    }
  }, [showLines, ready]);

  useEffect(() => {
    if (!ready || !map.current?.getSource("site-scout-substations")) return;
    const instance = map.current;
    for (const id of ["site-scout-clusters", "site-scout-substation-points"]) {
      instance.setLayoutProperty(id, "visibility", showSubstations ? "visible" : "none");
    }
    if (!showSubstations || substationsReady.current || !aborter.current) return;
    let cancelled = false;
    const controller = aborter.current;
    setStatus("Loading mapped substation locations…");
    void getSubstations(controller.signal).then(data => {
      if (cancelled || controller.signal.aborted || map.current !== instance) return;
      instance.getSource("site-scout-substations")?.setData(data);
      substationsReady.current = true;
      setStatus("Transmission and substation layers ready");
    }).catch(error => {
      if (cancelled || controller.signal.aborted) return;
      console.warn("[EcoXchange Site Scout]", error);
      setStatus("Substations unavailable. Transmission lines remain accessible.");
      setShowSubstations(false);
    });
    return () => { cancelled = true; };
  }, [ready, showSubstations]);

  async function findLocation(event) {
    event.preventDefault();
    const text = searchText.trim().slice(0, 150);
    if (text.length < 3) return setFeedback("Enter a U.S. city or address.");
    if (Date.now() - latestSearch.current < 1200) return setFeedback("Wait a moment before searching again.");
    if (!ready || !map.current) return setFeedback("Wait until the map is ready.");
    latestSearch.current = Date.now();
    setSearching(true);
    setFeedback("");
    try {
      const params = new URLSearchParams({ q: text, format: "json", limit: "1", countrycodes: "us" });
      const response = await fetch("https://nominatim.openstreetmap.org/search?" + params, {
        signal: aborter.current?.signal, headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Location search is temporarily unavailable.");
      const result = await response.json();
      if (!result?.length) return setFeedback("No U.S. location matched. Try a city and state.");
      const point = { lat: Number(result[0].lat), lng: Number(result[0].lon) };
      if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) throw new Error("Search returned invalid coordinates.");
      map.current.flyTo({ center: [point.lng, point.lat], zoom: 10, essential: true });
      marker.current?.remove();
      marker.current = new maplibre.current.Marker({ color: "#1a754e" })
        .setLngLat([point.lng, point.lat]).addTo(map.current);
      setSitePoint(point);
      setLocation(text.slice(0, 135));
      setFeedback("Location found. Click an empty point on the map to refine the site pin.");
    } catch (error) {
      if (aborter.current?.signal.aborted) return;
      setFeedback(error instanceof Error ? error.message : "Location search failed.");
    } finally {
      setSearching(false);
    }
  }

  function continueToAssessment() {
    const safeLocation = location.trim().slice(0, 150);
    const mwNumber = Number(plannedMw);
    const validMw = plannedMw.trim() !== "" && Number.isFinite(mwNumber) && mwNumber > 0 && mwNumber <= 10000;
    const selected = sitePoint && Number.isFinite(sitePoint.lat) && Number.isFinite(sitePoint.lng)
      ? `${sitePoint.lat.toFixed(5)}, ${sitePoint.lng.toFixed(5)}` : "";
    try {
      sessionStorage.setItem(SCOUT_HANDOFF_KEY, JSON.stringify({
        savedAt: Date.now(),
        location: (safeLocation + (selected && !safeLocation.includes(selected) ? ` [pin: ${selected}]` : "")).slice(0, 180),
        plannedMw: validMw ? String(mwNumber) : "",
        energization: /^\d{4}-(0[1-9]|1[0-2])$/.test(rampMonth) ? rampMonth : "",
      }));
    } catch { /* Assessment remains usable even if storage is blocked. */ }
  }

  return <div className="site-scout-page">
    <section className="site-scout-heading container">
      <p className="eyebrow">Site Scout · power-first site intelligence</p>
      <h1>Find a site.<br /><span>Think power first.</span></h1>
      <p className="lead">Explore mapped transmission lines and substations, select a candidate location, and bring its power requirements into an EcoXchange site assessment. No account required.</p>
      <p className="site-scout-qualification">Early-stage screening only. Infrastructure shown does <strong>not</strong> confirm available capacity, service rights, or energization timing.</p>
    </section>

    <section className="container site-scout-workspace" aria-label="Site Scout interactive infrastructure atlas">
      <div className="site-scout-toolbar">
        <form onSubmit={findLocation} className="site-scout-search">
          <label htmlFor="site-scout-search">Search a U.S. location</label>
          <div className="site-scout-search-row">
            <input id="site-scout-search" placeholder="City, state or street address" value={searchText} onChange={event => setSearchText(event.target.value)} maxLength={150} />
            <button className="button button--primary" type="submit" disabled={searching || !ready}>{searching ? "Finding…" : "Find location"}</button>
          </div>
        </form>
        <div className="site-scout-toggles" aria-label="Map layers">
          <label><input type="checkbox" checked={showLines} onChange={event => setShowLines(event.target.checked)} /> Transmission lines</label>
          <label><input type="checkbox" checked={showSubstations} onChange={event => setShowSubstations(event.target.checked)} /> Substations</label>
        </div>
      </div>
      <div className="site-scout-map-wrap">
        <div ref={mapElement} className="site-scout-map" role="application" aria-label="Interactive U.S. electric grid map. Pan and zoom to explore and click empty map space to select a site." />
        {!ready && <div className="site-scout-map-loading" role="status">
          <span>{problem || status}</span>
          {problem && <button type="button" className="button button--primary" onClick={() => setRetry(value => value + 1)}>Retry map</button>}
        </div>}
      </div>
      <div className="site-scout-statusbar"><span role="status">{status}</span>{sitePoint && <strong>Candidate pin: {coordinates(sitePoint)}</strong>}</div>
      {feedback && <p className="site-scout-feedback" role="status">{feedback}</p>}
      <p className="site-scout-credits">Map technology: <a href="https://github.com/BenHutchinsWPP/TransmissionMap" target="_blank" rel="noopener noreferrer">Western Power Pool TransmissionMap (MIT)</a>, MapLibre and PMTiles. Infrastructure: HIFLD / DHS CISA and SeerAI / Source Cooperative (CC BY 4.0); historical records may be outdated. Basemap: OpenFreeMap / © OpenStreetMap contributors. Manual search: OpenStreetMap Nominatim. External map sources may be unavailable. Proximity to a line or substation is <strong>not</strong> a statement of usable megawatts, connection cost, queue position, service territory, or power arrival date.</p>
    </section>

    <section className="site-scout-next">
      <div className="container site-scout-next-grid">
        <div>
          <p className="eyebrow">Next · qualify the opportunity</p>
          <h2>Turn a map location into a real power conversation.</h2>
          <p>Tell us what the project needs and when. We'll carry your site information into the existing EcoXchange assessment, where our team evaluates technical and commercial fit. Unknown supply stays unknown.</p>
        </div>
        <div className="site-scout-fields">
          <label htmlFor="site-scout-location">Candidate site / geography</label>
          <input id="site-scout-location" value={location} onChange={event => { setLocation(event.target.value); setSitePoint(null); marker.current?.remove(); marker.current = null; }} placeholder="Select a point on the map or enter a location" maxLength={150} />
          <div className="site-scout-field-grid">
            <div><label htmlFor="site-scout-mw">Required facility power (MW) <span>(optional)</span></label><input id="site-scout-mw" type="number" min="0.001" max="10000" step="any" inputMode="decimal" value={plannedMw} onChange={event => setPlannedMw(event.target.value)} placeholder="e.g. 25" /></div>
            <div><label htmlFor="site-scout-ramp">Target first ramp <span>(optional)</span></label><input id="site-scout-ramp" type="month" value={rampMonth} onChange={event => setRampMonth(event.target.value)} /></div>
          </div>
          <a href="/assessment" className="button button--primary site-scout-continue" onClick={continueToAssessment}>Continue to site assessment <ArrowRight aria-hidden="true" /></a>
          <small>Requires normal contact details and human verification on the next page. No lead is submitted by using this map.</small>
        </div>
      </div>
    </section>
  </div>;
}

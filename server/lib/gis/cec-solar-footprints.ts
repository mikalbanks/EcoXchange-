export type CecSolarFootprintType = "Ground" | "Parking" | "Rooftop";

export interface CecSolarFootprintFeature {
  objectId: number;
  countyName: string | null;
  acres: number | null;
  type: CecSolarFootprintType;
  geometry: unknown;
}

const CEC_SOLAR_FOOTPRINTS_LAYER =
  "https://services3.arcgis.com/bWPjFyq029ChCGur/arcgis/rest/services/Solar_Footprints_V2/FeatureServer/0";

function toEsriPointGeometry(latitude: number, longitude: number) {
  // ArcGIS layer uses EPSG:3310 (see layer metadata). For a lightweight placeholder,
  // we query using "geometryType=esriGeometryPoint" with WGS84 and let server handle projection.
  // If projection issues appear, we can add an explicit `inSR=4326` and `outSR=4326`.
  return { x: longitude, y: latitude, spatialReference: { wkid: 4326 } };
}

export async function fetchCecSolarFootprintsByLatLng(
  latitude: number,
  longitude: number,
  options: { searchMeters?: number; maxFeatures?: number } = {},
): Promise<CecSolarFootprintFeature[]> {
  const { searchMeters = 250, maxFeatures = 25 } = options;

  const url = new URL(`${CEC_SOLAR_FOOTPRINTS_LAYER}/query`);
  url.searchParams.set("f", "json");
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("geometry", JSON.stringify(toEsriPointGeometry(latitude, longitude)));
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("distance", String(searchMeters));
  url.searchParams.set("units", "esriSRUnit_Meter");
  url.searchParams.set("outFields", "OBJECTID,COUNTYNAME,Acres,Type");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("resultRecordCount", String(Math.max(1, Math.min(maxFeatures, 2000))));

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `CEC Solar Footprints query failed (HTTP ${res.status}). ${text.slice(0, 200)}`,
    );
  }

  const json = (await res.json()) as any;
  const feats = Array.isArray(json.features) ? json.features : [];

  return feats.map((f: any) => ({
    objectId: Number(f.attributes?.OBJECTID),
    countyName: (f.attributes?.COUNTYNAME ?? null) as string | null,
    acres:
      f.attributes?.Acres === null || f.attributes?.Acres === undefined
        ? null
        : Number(f.attributes.Acres),
    type: (f.attributes?.Type ?? "Ground") as CecSolarFootprintType,
    geometry: f.geometry,
  }));
}


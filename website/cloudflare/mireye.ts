/**
 * Mireye adapter for EcoXchange's CURRENT Cloudflare website.
 *
 * Public: only Mireye Free Fetch coordinate fields; no parcel identity,
 * boundaries, ownership or licensed property information is returned.
 * Private: Search/Enrich require a separate internal token and stay server-side.
 * No vendor credentials may be embedded in client bundles or source.
 *
 * Mireye docs: https://docs.mireye.ai/api-reference/fetch
 * Terms: https://www.mireye.com/terms (October 20, 2026)
 */
interface MireyeEnv {
  MIREYE_API_TOKEN?: string;
  ECOXCHANGE_SITE_SCOUT_ADMIN_TOKEN?: string;
}

// These are individually confirmed public coordinate field IDs from
// https://docs.mireye.ai/api-reference/fetch (2026-10-22).
// Deliberately small bundles, not 100+ field presets: lower latency and
// avoids accidental licensed property enrichment on the public endpoint.
const PUBLIC_TRACK_FIELDS: Record<string, readonly string[]> = {
  data_center: [
    "nearest_transmission_line_distance_m",
    "nearest_transmission_line_voltage_kv",
    "nearest_substation_distance_m",
    "nearest_substation_max_voltage_kv",
    "electric_utility_service_territory",
    "iso_rto",
    "interconnection_queue_active_capacity_county_mw",
    "fiber_broadband_available",
    "fiber_provider_count",
    "nearest_gas_pipeline_distance_m",
    "design_wet_bulb_temperature_0_4pct_degc",
    "free_cooling_hours_per_year_15c",
    "within_water_service_area",
    "within_floodplain_polygon",
    "grading_difficulty_class",
    "in_air_quality_nonattainment",
  ],
  solar: [
    "ghi_annual_kwh_m2_day",
    "pv_capacity_factor_pct",
    "pv_specific_yield_kwh_per_kw",
    "slope_degrees",
    "aspect_cardinal",
    "prime_farmland_classification",
    "grading_difficulty_class",
    "nearest_transmission_line_distance_m",
    "nearest_utility_solar_facility_distance_m",
    "within_floodplain_polygon",
    "intersects_wetland",
    "surface_management_agency",
  ],
  wind: [
    "mean_wind_speed_100m_ms",
    "wind_capacity_factor_pct",
    "wind_least_cost_interconnect_distance_m",
    "nearest_transmission_line_distance_m",
    "nearest_wind_project_capacity_mw",
    "special_use_airspace_type",
    "nearest_airport_distance_m",
    "slope_degrees",
    "prime_farmland_classification",
    "within_floodplain_polygon",
    "intersects_wetland",
  ],
  storage: [
    "nearest_transmission_line_distance_m",
    "nearest_substation_distance_m",
    "nearest_substation_max_voltage_kv",
    "electric_utility_service_territory",
    "iso_rto",
    "interconnection_queue_active_capacity_county_mw",
    "grading_difficulty_class",
    "soil_hydrologic_group",
    "within_floodplain_polygon",
    "intersects_wetland",
    "nearest_power_plant_distance_m",
    "avg_retail_electricity_price_industrial_usd_per_kwh",
  ],
};

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: jsonHeaders });

function coordinates(value: Record<string, unknown>): { lat: number; lng: number } | null {
  const lat = value.lat, lng = value.lng;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // Coarse western-longitude guard only; Mireye validates exact coverage.
  // Western Aleutian positive longitudes can be added with a future map update.
  if (lat < 18 || lat > 72 || lng < -180 || lng > -65) return null;
  return { lat, lng };
}

function internalAuthorized(request: Request, secret: string | undefined) {
  if (!secret || secret.length < 24) return false;
  const supplied = request.headers.get("authorization") || "";
  const expected = "Bearer " + secret;
  if (supplied.length !== expected.length) return false;
  let delta = 0;
  for (let i = 0; i < supplied.length; i++) delta |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  return delta === 0;
}

async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  if (Number(request.headers.get("content-length") || "0") > 4096) return null;
  const body = await request.text();
  if (body.length > 4096) return null;
  try {
    const value: unknown = JSON.parse(body);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

async function providerCall(
  path: "fetch" | "search" | "enrich",
  payload: object,
  env: MireyeEnv,
  paid = false,
  idempotencyKey?: string,
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "Authorization": `Bearer ${env.MIREYE_API_TOKEN!}`,
  };
  if (paid) headers["Idempotency-Key"] = idempotencyKey || crypto.randomUUID();
  // Search and Enrich can take longer than Fetch; upper bound is enforced upstream.
  const response = await fetch("https://api.mireye.com/v1/" + path, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(paid ? 205000 : 25000),
  });
  if (!response.ok) {
    console.warn("Mireye provider error", { operation: path, status: response.status });
    return reply(
      { error: response.status === 402 ? "Mireye account spending limit reached." : "Geospatial provider is temporarily unavailable." },
      response.status === 402 ? 402 : response.status === 429 ? 429 : 502,
    );
  }
  return response;
}

export async function handleMireyeSiteScout(
  request: Request,
  env: MireyeEnv,
  path: string,
): Promise<Response> {
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const isPublic = path === "/api/site-scout/context";
  if (!isPublic && !internalAuthorized(request, env.ECOXCHANGE_SITE_SCOUT_ADMIN_TOKEN)) {
    return reply({ error: "Not authorized" }, 401);
  }
  if (!env.MIREYE_API_TOKEN) return reply({ error: "Mireye is not yet configured for this site." }, 503);
  const body = await parseBody(request);
  if (!body) return reply({ error: "Invalid request body" }, 400);

  try {
    if (isPublic) {
      const point = coordinates(body);
      if (!point) return reply({ error: "Choose a valid US location on the map first." }, 422);
      // Website-selected purpose controls the free public coordinate fields.
      // Do not allow arbitrary caller-supplied vendor field names on this route.
      const track = typeof body.track === "string" ? body.track : "data_center";
      const requestedFields = Object.prototype.hasOwnProperty.call(PUBLIC_TRACK_FIELDS, track)
        ? PUBLIC_TRACK_FIELDS[track] : null;
      if (!requestedFields) return reply({ error: "Unsupported screening track" }, 422);
      const response = await providerCall("fetch", { ...point, fields: [...requestedFields] }, env);
      if (!response.ok) return response;
      const data = await response.json() as { fields?: Record<string, unknown>; partial_failures?: unknown[]; fetched_at?: string };
      const fields: Record<string, unknown> = {};
      for (const key of requestedFields) {
        // Keep absent/failed records, rather than quietly treating unknown as
        // no flood, no wetlands or reliable grid capacity.
        if (data.fields && Object.prototype.hasOwnProperty.call(data.fields, key)) fields[key] = data.fields[key];
      }
      return reply({ point, track, fields, partialFailures: Array.isArray(data.partial_failures) ? data.partial_failures.length : 0, fetchedAt: data.fetched_at || null, provider: "Mireye" });
    }

    // INTERNAL ONLY. Property records can be researched by EcoXchange staff
    // under Mireye's licensed-data agreement, not published or redistributed
    // to visitors. Fixed dollar cap per call prevents unbounded paid requests.
    const providedKey = request.headers.get("idempotency-key") || "";
    const idempotencyKey = /^[A-Za-z0-9_.:-]{8,128}$/.test(providedKey) ? providedKey : crypto.randomUUID();
    if (path === "/api/internal/site-scout/search") {
      const state = typeof body.state === "string" ? body.state.trim().toUpperCase() : "";
      const minAcres = body.minAcres, maxAcres = body.maxAcres;
      const limit = body.limit === undefined ? 10 : body.limit;
      if (!/^[A-Z]{2}$/.test(state) || typeof minAcres !== "number" || !Number.isFinite(minAcres) || minAcres < 1 ||
          typeof maxAcres !== "number" || !Number.isFinite(maxAcres) || maxAcres < minAcres || maxAcres > 1000000 ||
          typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 25) {
        return reply({ error: "Provide state, minAcres, maxAcres and a limit of 1–25." }, 422);
      }
      const filters: Array<{ field: string; op: string; value: unknown }> = [
        { field: "state2", op: "eq", value: state },
        { field: "pvd_gisacre", op: "between", value: [minAcres, maxAcres] },
      ];
      if (typeof body.county === "string" && body.county.trim()) {
        filters.push({ field: "county", op: "eq", value: body.county.trim().slice(0, 70) });
      }
      const response = await providerCall("search", {
        filters, fields: ["owner", "zoning"], limit, max_cost_usd: "0.20",
      }, env, true, idempotencyKey);
      if (!response.ok) return response;
      const data = await response.json();
      return reply({ data, internalOnly: true });
    }
    if (path === "/api/internal/site-scout/enrich") {
      const point = coordinates(body);
      if (!point) return reply({ error: "Provide a precise US parcel coordinate." }, 422);
      const response = await providerCall("enrich", {
        ...point,
        fields: ["owner", "zoning", "slope_degrees", "within_floodplain_polygon", "nearest_transmission_line_distance_m", "electric_utility_service_territory"],
        max_cost_usd: "0.02",
      }, env, true, idempotencyKey);
      if (!response.ok) return response;
      const data = await response.json();
      return reply({ data, internalOnly: true });
    }
    return reply({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Site Scout geospatial request failed", error instanceof Error ? error.name : "unknown");
    return reply({ error: "Geospatial information could not be retrieved. Please try again." }, 502);
  }
}

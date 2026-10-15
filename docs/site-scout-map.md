# Site Scout — interactive infrastructure mapping (Phase 2)

## Architecture

Native EcoXchange React component: `client/src/components/site-scout-map.tsx`. It uses the MapLibre GL JS and PMTiles browser distribution builds to render public-source infrastructure maps. Architecture and selected data conventions were adapted from Western Power Pool's open-source [TransmissionMap](https://github.com/BenHutchinsWPP/TransmissionMap) (MIT application code). The map is embedded in /site-scout and its clicked/geocoded candidate coordinates are written into the visitor-supplied lead notes. No API keys, schema migrations, or database writes are added by the map itself.

### Map layers

- U.S. transmission lines: HIFLD/DHS CISA and SeerAI archive, supplied as vector PMTiles via TransmissionMap's public `data-static` branch. Source-layer `hifld_transmission_lines`; properties include VOLTAGE, OWNER, STATUS and ID. PMTiles range requests fetch only visible tiles. Data validation dates can be as old as 2021.
- U.S. substations: HIFLD/DHS CISA archive, filtered by upstream TransmissionMap, compressed GeoJSON, lazily downloaded after the visitor toggles on substations. Clustering is enabled to avoid drawing >50,000 separate marks when zoomed out.
- Basemap: OpenFreeMap Positron. Place lookup: OSM Nominatim triggered only by an explicit user search, not autocomplete. OSM/ODbL credit is displayed.
- Each layer has user-facing source credits; source-host failures are shown as partial failures rather than silently interpreted as zero infrastructure.

Third-party dependencies loaded on demand: MapLibre GL JS v5.13.0 and PMTiles v3.2.0 via pinned jsDelivr assets. This is a lightweight MVP delivery strategy that does not alter package-lock.json; before high-volume production, **vendor/bundle the dependencies and self-host/cache the licensed HIFLD tiles**. Avoid building a business-critical mapping SLA on GitHub raw hosting. A failure of external CDNs or their CORS/range support may make the map unavailable.

### Licensing

- TransmissionMap software: MIT (Copyright 2026 Western Power Pool); credit linked in the map. This code was implemented natively rather than copying entire proprietary/third-party services.
- HIFLD/DHS CISA underlying government works: public domain; archive curation/distribution through SeerAI / Source Cooperative is identified as CC BY 4.0 in TransmissionMap's release inventory (credit included).
- OpenStreetMap search data: ODbL attribution via Nominatim. OpenFreeMap basemap: OSM/ODbL, with standard MapLibre attribution.
- Exclude Our Grid Future planned-transmission feed from this commercial product: upstream states non-commercial terms. Do not include datasets with unclear commercial licenses.

### UX and safety

- View transmission lines, optionally enable substations, inspect line voltage/owner and substation kV.
- Search a U.S. location (one manual Nominatim request, no autocomplete) or click unoccupied map area to place the site pin. Map controls permit zoom and drag.
- Selected geographic coordinates are written into lead notes as `Candidate map pin (visitor selected; not validated)`. Place names entered in intake are visitor supplied.
- **No inference of firm power, serviceability, site rights, utility jurisdiction, grid capacity, firm date, ability to interconnect, or cost from a nearby line/substation.** The existing user-supplied MW checklist remains separate.
- Map and search provider outages do not block submission through the existing form.

### Launch verification / blockers

1. Run browser against /site-scout: map rendering (desktop and mobile), lines, substation toggle, click/tap marker, geocoder, feature inspector, toggles and errors (network blocked).
2. Verify CDN browser scripts and PMTiles range responses, substation gzip decode, CORS, and MapLibre style/CDN operation in actual target browsers.
3. Run `npm test`, `npm run check`, and `npm run build`, separating pre-existing unrelated errors. GitHub Actions CI issue #167 is not resolved by this map feature.
4. Submit real test lead with consent and check `power_gap_intakes.source = website_site_scout` and notes, within the deployed configured database.
5. Only then merge to main/deploy after explicit founder approval.

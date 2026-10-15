import { describe, expect, it } from "vitest";
import { formatScoutCoordinates, transmissionArchiveUrl, substationArchiveUrl } from "./site-scout-map";

describe("Site Scout infrastructure map helpers", () => {
  it("formats stable latitude / longitude for map-picked sites", () => {
    expect(formatScoutCoordinates({ lat: 40.7357, lng: -74.1724 })).toBe("40.73570°, -74.17240°");
  });
  it("rejects invalid points rather than displaying NaN", () => {
    expect(formatScoutCoordinates({ lat: Number.NaN, lng: -74 })).toBe("Coordinates unavailable");
    expect(formatScoutCoordinates({ lat: 97, lng: 12 })).toBe("Coordinates unavailable");
  });
  it("uses named upstream public infrastructure archives, not fabricated site supply", () => {
    expect(transmissionArchiveUrl).toContain("/data-static/data/layers/hifld_transmission_lines.pmtiles");
    expect(substationArchiveUrl).toContain("/data-static/data/layers/hifld_substations.geojson.gz");
  });
});

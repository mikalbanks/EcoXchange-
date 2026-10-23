import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(join(root, path), "utf8");

test("Mireye REST credentials remain behind the Cloudflare server worker", () => {
  const edge = read("cloudflare/mireye.ts");
  const ui = read("src/SiteScout.jsx");
  assert.match(edge, /Authorization.*Bearer/);
  assert.match(edge, /env\.MIREYE_API_TOKEN/);
  assert.match(edge, /ECOXCHANGE_SITE_SCOUT_ADMIN_TOKEN/);
  assert.doesNotMatch(ui, /MIREYE_API_TOKEN|mry_[a-zA-Z0-9]/);
  assert.doesNotMatch(ui, /v1\/(search|enrich)/);
  assert.match(edge, /PUBLIC_TRACK_FIELDS/);
});

test("data center and renewable public-screen modes exist on server and client", () => {
  const edge = read("cloudflare/mireye.ts");
  const ui = read("src/SiteScout.jsx");
  for (const track of ["data_center", "solar", "wind", "storage"]) {
    assert.ok(edge.includes(track + ": ["), "missing allowlisted edge track " + track);
    assert.ok(ui.includes(track + ": {"), "missing public UI track " + track);
  }
  assert.match(ui, /Renewable energy/);
  assert.match(ui, /Continue to power assessment/);
  assert.match(ui, /Explore development partnerships/);
  assert.match(ui, /evidence\.source_url/);
  assert.match(edge, /partialFailures/);
});

test("site-scout public route and direct static URL are present", () => {
  const worker = read("cloudflare/worker.ts");
  const build = read("scripts/prepare-sites-build.mjs");
  assert.match(worker, /\/api\/site-scout\/context/);
  assert.match(build, /"site-scout"/);
  assert.match(worker, /handleMireyeSiteScout/);
});

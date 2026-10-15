import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("Site Scout lives on the CURRENT website router, navigation and sitemap", async () => {
  const [app, homepage, meta, sitemap] = await Promise.all([
    read("../src/App.jsx"), read("../src/HomePage.jsx"), read("../src/content.js"), read("../public/sitemap.xml"),
  ]);
  assert.match(app, /import \{ SiteScoutPage \} from "\.\/SiteScout"/);
  assert.match(app, /\["Site Scout", "\/site-scout"\]/);
  assert.match(app, /path === "\/site-scout"\) page = <SiteScoutPage \/>/);
  assert.match(homepage, /href="\/site-scout"/);
  assert.match(meta, /"\/site-scout": \[/);
  assert.match(sitemap, /www\.ecoxchange\.net\/site-scout/);
});

test("Cloudflare current-website worker serves map and allows only required external map origins", async () => {
  const source = await read("../cloudflare/worker.ts");
  assert.match(source, /"\/site-scout"/);
  for (const token of [
    "https://tiles.openfreemap.org",
    "https://raw.githubusercontent.com",
    "https://cdn.jsdelivr.net",
    "https://nominatim.openstreetmap.org",
    "worker-src 'self' blob:",
  ]) assert.ok(source.includes(token), `Missing allowed map dependency ${token}`);
  assert.match(source, /TURNSTILE_SECRET/);
  assert.match(source, /HUBSPOT_ACCESS_TOKEN/);
  assert.match(source, /"\/api\/assessment"/);
});

test("Site Scout context is prefilled through the existing protected assessment, not the old lead API", async () => {
  const [site, assessment] = await Promise.all([read("../src/SiteScout.jsx"), read("../src/Assessment.jsx")]);
  assert.match(site, /"ecoxchange-site-scout-v1"/);
  assert.match(assessment, /"ecoxchange-site-scout-v1"/);
  assert.match(site, /sessionStorage\.setItem/);
  assert.match(assessment, /initialFormWithScoutContext/);
  assert.match(assessment, /fetch\("\/api\/assessment"/);
  assert.doesNotMatch(site, /api\/public\/power-gap-intakes/);
  assert.match(site, /SITE_S?COUT_HANDOFF_KEY|SCOUT_HANDOFF_KEY/);
});

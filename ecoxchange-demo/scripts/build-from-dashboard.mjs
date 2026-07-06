// Build shim: demo.ecoxchange.net serves the REAL sprint dashboard
// (../ecoxchange-dashboard), not this package's legacy app. This script
// builds the dashboard and stages its dist here so the ecoxchange-demo
// Cloudflare Worker (which owns the demo.ecoxchange.net custom domain and
// whose Workers Build runs `npm run build` in this directory) deploys the
// current product with zero Cloudflare-side configuration changes.
//
// See DEPRECATED-app.md — the src/ tree in this package is retired.

import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");
const dashboardRoot = join(demoRoot, "..", "ecoxchange-dashboard");
const dashboardDist = join(dashboardRoot, "dist");
const stagedDist = join(demoRoot, "dist");

const run = (cmd, cwd) => {
  console.log(`[build-from-dashboard] ${cmd} (in ${cwd})`);
  execSync(cmd, { cwd, stdio: "inherit" });
};

if (!existsSync(join(dashboardRoot, "package.json"))) {
  throw new Error(`ecoxchange-dashboard not found at ${dashboardRoot}`);
}

// npm ci is reproducible but requires the lockfile; fall back to install.
try {
  run("npm ci", dashboardRoot);
} catch {
  run("npm install", dashboardRoot);
}
// demo-site mode (.env.demo-site): baked demo dataset + demo compliance
// banners, no Supabase dependency — the deterministic public-demo profile.
run("npx tsc -b", dashboardRoot);
run("npx vite build --mode demo-site", dashboardRoot);

if (!existsSync(join(dashboardDist, "index.html"))) {
  throw new Error("Dashboard build produced no dist/index.html — aborting deploy.");
}

rmSync(stagedDist, { recursive: true, force: true });
cpSync(dashboardDist, stagedDist, { recursive: true });
console.log(`[build-from-dashboard] staged ${dashboardDist} -> ${stagedDist}`);

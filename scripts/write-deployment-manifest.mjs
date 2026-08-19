import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = process.argv[2];

if (!outputDirectory) {
  throw new Error("Usage: node scripts/write-deployment-manifest.mjs <output-directory>");
}

const commit =
  process.env.WORKERS_CI_COMMIT_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  "local";
const branch =
  process.env.WORKERS_CI_BRANCH ||
  process.env.CF_PAGES_BRANCH ||
  process.env.GITHUB_REF_NAME ||
  "local";

if (commit !== "local" && !/^[0-9a-f]{40}$/i.test(commit)) {
  throw new Error(`Deployment commit must be a 40-character Git SHA; received ${commit}`);
}

const manifest = {
  schema: "ecoxchange-deployment/v1",
  commit,
  branch,
  buildId: process.env.WORKERS_CI_BUILD_UUID || null,
  provider: process.env.WORKERS_CI ? "cloudflare-workers-builds" : "local",
  builtAt: new Date().toISOString(),
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(
  path.join(outputDirectory, "deployment.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

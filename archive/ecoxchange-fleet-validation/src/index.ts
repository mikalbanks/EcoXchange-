#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseUspvdb } from "./parsers/uspvdb.js";
import { parseEia860 } from "./parsers/eia860.js";
import { parseEia923 } from "./parsers/eia923.js";
import { joinDatasets } from "./parsers/joiner.js";
import { fetchPvdaqSites } from "./parsers/pvdaq.js";
import { refineWithPvdaq } from "./parsers/pvdaq-refine.js";
import { runBatchBacktest } from "./backtest/runner.js";
import { buildReport } from "./report/generator.js";
import { renderMarkdown } from "./report/markdown.js";
import { uploadReport } from "./report/storage.js";
import { storeReferenceProjects } from "./storage/reference-projects.js";
import type {
  JoinedPlantRecord,
  PlantBacktestResult,
} from "./utils/types.js";
import { capacityBand } from "./backtest/parameters.js";

const program = new Command();
program
  .name("ecoxchange-fleet")
  .description("Batch backtest the EcoXchange engine against the U.S. solar fleet")
  .version("0.1.0");

const USPVDB_PATH = "data/uspvdb/uspvdb_centroids.csv";
const EIA860_PATH = "data/eia860/eia860_solar.xlsx";
const EIA923_PATH = "data/eia923/EIA923_Schedules.xlsx";
const PVDAQ_CACHE = "data/pvdaq/sites.json";
const JOINED_PATH = "data/joined.json";

function ensureDir(filePath: string) {
  mkdirSync(dirname(resolve(filePath)), { recursive: true });
}

program
  .command("download")
  .description("Run scripts/download-data.sh to fetch all three datasets")
  .action(() => {
    execSync("bash scripts/download-data.sh", { stdio: "inherit" });
  });

interface PrepareOptions {
  minMw: string;
  maxMw: string;
  pvdaq: boolean;
}

program
  .command("prepare")
  .description("Parse + join USPVDB/EIA datasets, optionally refine with PVDAQ")
  .option("--min-mw <n>", "minimum DC MW", "1")
  .option("--max-mw <n>", "maximum DC MW", "20")
  .option("--no-pvdaq", "skip PVDAQ tilt/azimuth refinement")
  .action(async (opts: PrepareOptions) => {
    await prepare(opts);
  });

async function prepare(opts: PrepareOptions): Promise<JoinedPlantRecord[]> {
  console.log("Parsing USPVDB...");
  const uspvdb = parseUspvdb(USPVDB_PATH);
  console.log(`  ${uspvdb.length} rows`);
  console.log("Parsing EIA 860...");
  const eia860 = parseEia860(EIA860_PATH);
  console.log(`  ${eia860.length} plants`);
  console.log("Parsing EIA 923...");
  const eia923 = parseEia923(EIA923_PATH);
  console.log(`  ${eia923.length} plants with reported PV generation`);
  console.log("Joining...");
  const joined = joinDatasets(uspvdb, eia860, eia923, {
    minCapacityMwDc: parseFloat(opts.minMw),
    maxCapacityMwDc: parseFloat(opts.maxMw),
    excludePartialYear: true,
    minActualCapacityFactorPct: 10,
    maxActualCapacityFactorPct: 30,
  });
  console.log(`  ${joined.length} joined plants in ${opts.minMw}-${opts.maxMw} MW band`);

  if (opts.pvdaq !== false) {
    console.log("Refining tilt/azimuth from PVDAQ...");
    try {
      const sites = await fetchPvdaqSites(PVDAQ_CACHE);
      const stats = refineWithPvdaq(joined, sites);
      console.log(
        `  ${stats.refined}/${stats.considered} refined; ${stats.tilt_overrides} tilt + ${stats.azimuth_overrides} azimuth overrides`,
      );
    } catch (e) {
      console.warn(
        `  PVDAQ refinement skipped: ${(e as Error).message}`,
      );
    }
  }

  ensureDir(JOINED_PATH);
  writeFileSync(JOINED_PATH, JSON.stringify(joined, null, 2), "utf8");
  console.log(`Wrote ${JOINED_PATH}`);

  // Stats
  const byState = new Map<string, number>();
  const byBand = new Map<string, number>();
  for (const p of joined) {
    byState.set(p.state, (byState.get(p.state) ?? 0) + 1);
    const b = capacityBand(p.capacity_dc_mw);
    byBand.set(b, (byBand.get(b) ?? 0) + 1);
  }
  console.log(`\nBy state (top 10):`);
  for (const [s, n] of Array.from(byState.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10))
    console.log(`  ${s}: ${n}`);
  console.log(`\nBy capacity band:`);
  for (const [b, n] of byBand.entries()) console.log(`  ${b}: ${n}`);

  return joined;
}

interface BacktestOptions {
  limit?: string;
  concurrency: string;
  delay: string;
  systemLosses: string;
}

program
  .command("backtest")
  .description("Run batch backtest over the joined dataset")
  .option("--limit <n>", "process at most N plants (omit for full fleet)")
  .option("-c, --concurrency <n>", "concurrent NASA POWER calls", "5")
  .option("-d, --delay <ms>", "delay between batches in ms", "1000")
  .option(
    "--system-losses <n>",
    "fractional AC losses (0.14 engine default; 0.20 better matches real AC meter output for fleet validation)",
    "0.20",
  )
  .action(async (opts: BacktestOptions) => {
    await backtest(opts);
  });

async function backtest(opts: BacktestOptions): Promise<{
  joined: JoinedPlantRecord[];
  results: PlantBacktestResult[];
  errors: { plant: JoinedPlantRecord; error: string }[];
}> {
  if (!existsSync(JOINED_PATH)) {
    throw new Error(
      `${JOINED_PATH} missing — run 'ecoxchange-fleet prepare' first`,
    );
  }
  const joined = JSON.parse(readFileSync(JOINED_PATH, "utf8")) as JoinedPlantRecord[];
  const irradianceMcpUrl =
    process.env.IRRADIANCE_MCP_URL ?? "http://localhost:3002/mcp";
  console.log(
    `Running backtest against ${joined.length} plants via ${irradianceMcpUrl}`,
  );
  if (opts.limit) console.log(`  limit: ${opts.limit}`);
  const outcome = await runBatchBacktest(joined, {
    irradianceMcpUrl,
    concurrency: parseInt(opts.concurrency, 10),
    delayMs: parseInt(opts.delay, 10),
    maxPlants: opts.limit ? parseInt(opts.limit, 10) : null,
    systemLosses: parseFloat(opts.systemLosses),
    onProgress: (n, t) => console.log(`  [${n}/${t}]`),
  });
  console.log(
    `Done: ${outcome.results.length} succeeded, ${outcome.errors.length} errored`,
  );
  ensureDir("data/backtest-results.json");
  writeFileSync(
    "data/backtest-results.json",
    JSON.stringify(outcome.results, null, 2),
    "utf8",
  );
  writeFileSync(
    "data/backtest-errors.json",
    JSON.stringify(outcome.errors, null, 2),
    "utf8",
  );
  return { joined, results: outcome.results, errors: outcome.errors };
}

interface ReportOptions {
  output: string;
  upload: boolean;
  uspvdbVersion: string;
  eia860Year: string;
  eia923Year: string;
}

program
  .command("report")
  .description("Generate the validation report from cached backtest results")
  .option("--output <path>", "markdown output path", "reports/fleet-validation.md")
  .option("--no-upload", "skip Supabase Storage upload")
  .option(
    "--uspvdb-version <s>",
    "USPVDB version label",
    "v4.0 (2026-04)",
  )
  .option("--eia860-year <n>", "EIA 860 year", "2024")
  .option("--eia923-year <n>", "EIA 923 year", "2024")
  .action(async (opts: ReportOptions) => {
    await report(opts);
  });

async function report(opts: ReportOptions): Promise<void> {
  const joined = JSON.parse(readFileSync(JOINED_PATH, "utf8")) as JoinedPlantRecord[];
  const results = JSON.parse(
    readFileSync("data/backtest-results.json", "utf8"),
  ) as PlantBacktestResult[];
  const errors = JSON.parse(
    readFileSync("data/backtest-errors.json", "utf8"),
  );
  const pvdaqRefined = joined.filter((p) => p.pvdaq_system_id !== null).length;
  const reportObj = buildReport({
    results,
    errors,
    joined,
    totalInUspvdb: joined.length, // best-effort; raw USPVDB count is in prepare logs
    totalInBand: joined.length,
    sources: {
      uspvdb_version: opts.uspvdbVersion,
      eia860_year: parseInt(opts.eia860Year, 10),
      eia923_year: parseInt(opts.eia923Year, 10),
      irradiance: results[0]?.irradianceSource ?? "nasa_power",
    },
    pvdaqRefinedCount: pvdaqRefined,
  });
  ensureDir(opts.output);
  writeFileSync(opts.output, renderMarkdown(reportObj), "utf8");
  writeFileSync(
    opts.output.replace(/\.md$/, ".json"),
    JSON.stringify(reportObj, null, 2),
    "utf8",
  );
  console.log(`Wrote ${opts.output}`);
  console.log(`Headline: mean |dev|=${reportObj.validation.mean_absolute_deviation_pct.toFixed(2)}% · ${reportObj.validation.pct_within_10.toFixed(1)}% within ±10% · CF R=${reportObj.validation.cf_correlation.toFixed(3)}`);
  if (opts.upload !== false) {
    try {
      const uploaded = await uploadReport(reportObj);
      console.log(`Uploaded to Supabase: ${uploaded.jsonPath}`);
    } catch (e) {
      console.warn(`Upload skipped: ${(e as Error).message}`);
    }
  }
}

interface StoreRefOptions {
  count: string;
}

program
  .command("store-references")
  .description("Store top-N validated plants as Supabase reference projects")
  .option("--count <n>", "max projects to write", "25")
  .action(async (opts: StoreRefOptions) => {
    const results = JSON.parse(
      readFileSync("data/backtest-results.json", "utf8"),
    ) as PlantBacktestResult[];
    const stats = await storeReferenceProjects(results, {
      maxProjects: parseInt(opts.count, 10),
    });
    console.log(
      `Wrote ${stats.projectsInserted} projects and ${stats.recordsInserted} verification records (${stats.skipped} skipped)`,
    );
  });

interface RunAllOptions extends PrepareOptions, BacktestOptions, ReportOptions, StoreRefOptions {}

program
  .command("run-all")
  .description("download → prepare → backtest → report → store-references")
  .option("--min-mw <n>", "minimum DC MW", "1")
  .option("--max-mw <n>", "maximum DC MW", "20")
  .option("--no-pvdaq", "skip PVDAQ tilt/azimuth refinement")
  .option("--limit <n>", "limit plants for backtest")
  .option("-c, --concurrency <n>", "concurrent NASA POWER calls", "5")
  .option("-d, --delay <ms>", "delay between batches in ms", "1000")
  .option("--system-losses <n>", "fractional AC losses", "0.20")
  .option("--output <path>", "markdown output path", "reports/fleet-validation.md")
  .option("--no-upload", "skip Supabase upload")
  .option("--uspvdb-version <s>", "USPVDB version label", "v4.0 (2026-04)")
  .option("--eia860-year <n>", "EIA 860 year", "2024")
  .option("--eia923-year <n>", "EIA 923 year", "2024")
  .option("--count <n>", "store-references count", "25")
  .action(async (opts: RunAllOptions) => {
    await prepare(opts);
    await backtest(opts);
    await report(opts);
    const results = JSON.parse(
      readFileSync("data/backtest-results.json", "utf8"),
    ) as PlantBacktestResult[];
    const stats = await storeReferenceProjects(results, {
      maxProjects: parseInt(opts.count, 10),
    });
    console.log(
      `Stored ${stats.projectsInserted} reference projects + ${stats.recordsInserted} verification records`,
    );
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});

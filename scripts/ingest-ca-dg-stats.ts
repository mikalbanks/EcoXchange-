import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

type CaDgStatsRow = Record<string, string>;

/**
 * Placeholder ingest for California DG Stats bulk CSVs (1MW–5MW).
 *
 * Intended future behavior:
 * - parse bulk CEC DG Stats export CSVs
 * - map rows to EcoXchange project candidates
 * - persist to database and/or enqueue validation jobs
 *
 * Current behavior:
 * - validates file exists
 * - parses CSV
 * - prints basic stats + top header fields
 */
async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: tsx scripts/ingest-ca-dg-stats.ts <path/to/dg_stats.csv>");
    process.exit(1);
  }

  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(abs, "utf8");
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  }) as CaDgStatsRow[];

  const header = records[0] ? Object.keys(records[0]) : [];
  console.log(`[CA DG Stats Ingest] Parsed ${records.length.toLocaleString()} rows`);
  console.log(`[CA DG Stats Ingest] Columns (${header.length}): ${header.slice(0, 25).join(", ")}${header.length > 25 ? " ..." : ""}`);
}

main().catch((err) => {
  console.error("Ingest failed:", err);
  process.exit(1);
});


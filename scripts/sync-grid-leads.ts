import fs from "node:fs/promises";
import path from "node:path";
import { parseQueueLeadFromJson, syncQueueLeads } from "../server/lib/queue-sync";

interface CliArgs {
  input: string;
}

function parseArgs(argv: string[]): CliArgs {
  const inputFlagIndex = argv.findIndex((a) => a === "--input");
  if (inputFlagIndex < 0 || !argv[inputFlagIndex + 1]) {
    throw new Error("Usage: tsx scripts/sync-grid-leads.ts --input <path-to-queue_leads.json>");
  }
  return { input: argv[inputFlagIndex + 1] };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), args.input);
  const raw = await fs.readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Input file must be a JSON array.");

  const leads = parsed
    .map((item) => parseQueueLeadFromJson(item))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const summary = await syncQueueLeads(leads);
  console.log(
    `Lead Engine Online: ${summary.eligible} Institutional Projects Found in Queue`,
  );
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error("[sync-grid-leads] failed:", err);
  process.exit(1);
});

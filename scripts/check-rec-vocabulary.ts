/**
 * Spec 16 § 6 — CI vocabulary check.
 *
 *   npm run lint:vocabulary                 # fail on any new violation
 *   npm run lint:vocabulary -- --report     # also list baselined + negated matches
 *   npm run lint:vocabulary -- --update-baseline
 *
 * § 9.4 puts this first in the build order: every later REC surface validates
 * against § 6, and retrofitting the check is strictly more expensive than having
 * it before the copy exists.
 *
 * Exit codes: 0 clean, 1 new violations found, 2 bad usage.
 */
import fs from "node:fs";
import path from "node:path";

import { PROHIBITED_TERMS, SCAN_ROOTS } from "../shared/rec/vocabulary";
import {
  collectFiles,
  evaluate,
  loadBaseline,
  scanFiles,
  type BaselineEntry,
  type Match,
} from "../shared/rec/scan";

const repoRoot = path.resolve(import.meta.dirname, "..");
const args = new Set(process.argv.slice(2));
const wantReport = args.has("--report");
const wantUpdate = args.has("--update-baseline");

const files = SCAN_ROOTS.flatMap((root) => collectFiles(repoRoot, root));
const matches = scanFiles(repoRoot, files, PROHIBITED_TERMS);
const baseline = loadBaseline(repoRoot);
const verdict = evaluate(matches, baseline);

const rationaleOf = (termId: string) =>
  PROHIBITED_TERMS.find((t) => t.id === termId)?.rationale ?? "";

function printMatches(title: string, list: Match[]): void {
  if (list.length === 0) return;
  console.log(`\n${title}`);
  const byTerm = new Map<string, Match[]>();
  for (const m of list) {
    const arr = byTerm.get(m.termId) ?? [];
    arr.push(m);
    byTerm.set(m.termId, arr);
  }
  for (const [termId, group] of [...byTerm].sort()) {
    console.log(`\n  § 6 prohibited: "${group[0].term}"  [${termId}]`);
    const rationale = rationaleOf(termId);
    if (rationale) console.log(`  ${rationale}`);
    for (const m of group) {
      console.log(`    ${m.file}:${m.line}  → "${m.matched}"`);
      console.log(`      ${m.context}`);
    }
  }
}

if (wantUpdate) {
  const grouped = new Map<string, Match[]>();
  for (const m of verdict.newViolations.concat(verdict.baselined)) {
    const k = `${m.file}::${m.termId}`;
    const arr = grouped.get(k) ?? [];
    arr.push(m);
    grouped.set(k, arr);
  }
  const existing = new Map<string, BaselineEntry>(
    baseline.entries.map((e) => [`${e.file}::${e.termId}`, e]),
  );
  const entries: BaselineEntry[] = [...grouped]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, group]) => {
      const prior = existing.get(k);
      // Human-authored fields (`category`, `reason`, `decision`) are carried
      // through untouched; only the machine-derived counts and samples are
      // regenerated. Regeneration must never quietly discard a review.
      const entry: BaselineEntry = {
        file: group[0].file,
        termId: group[0].termId,
        count: group.length,
        samples: [...new Set(group.map((m) => m.matched))].slice(0, 4),
        category: prior?.category ?? "pending-decision",
        reason:
          prior?.reason ??
          "TODO — state why this is acknowledged, or resolve the violation and remove this entry.",
      };
      if (prior?.decision) entry.decision = prior.decision;
      return entry;
    });

  fs.writeFileSync(
    path.resolve(repoRoot, "shared/rec/vocabulary-baseline.json"),
    JSON.stringify({ note: baseline.note, entries }, null, 2) + "\n",
  );
  console.log(
    `Baseline updated: ${entries.length} entr${entries.length === 1 ? "y" : "ies"}.\n` +
      "Review every entry with category 'pending-decision' — an unreviewed baseline " +
      "is indistinguishable from disabling the check.",
  );
  process.exit(0);
}

// ─── Report ──────────────────────────────────────────────────────────────────

console.log(
  `Spec 16 § 6 vocabulary check — ${files.length} files, ` +
    `${PROHIBITED_TERMS.length} prohibited terms.`,
);

printMatches("NEW VIOLATIONS — these fail the check:", verdict.newViolations);

if (wantReport) {
  const pending = baseline.entries.filter((e) => e.category === "pending-decision");
  if (pending.length > 0) {
    console.log(
      "\nBASELINED — genuine § 6 violations in live copy, awaiting a decision:",
    );
    for (const e of pending) {
      console.log(`\n  ${e.file}  [${e.termId}] ×${e.count}`);
      console.log(`    samples: ${e.samples.map((s) => `"${s}"`).join(", ")}`);
      console.log(`    ${e.reason}`);
    }
  }

  const technical = baseline.entries.filter((e) => e.category === "technical");
  if (technical.length > 0) {
    console.log("\nBASELINED — technical usage, not user-facing copy:");
    for (const e of technical) {
      console.log(`  ${e.file}  [${e.termId}] ×${e.count} — ${e.reason}`);
    }
  }

  printMatches("NEGATED — allowed, the term appears inside a negation:", verdict.negated);
}

if (verdict.staleBaseline.length > 0) {
  console.log("\nSTALE BASELINE — resolved, prune these entries:");
  for (const e of verdict.staleBaseline) {
    console.log(`  ${e.file}  [${e.termId}] expected ×${e.count}`);
  }
}

const pendingCount = baseline.entries
  .filter((e) => e.category === "pending-decision")
  .reduce((n, e) => n + e.count, 0);

console.log(
  `\nnew: ${verdict.newViolations.length}  ` +
    `baselined: ${verdict.baselined.length} (${pendingCount} awaiting decision)  ` +
    `negated: ${verdict.negated.length}`,
);

if (verdict.newViolations.length > 0) {
  console.log(
    "\nFAIL — new § 6 violations. Fix the copy, or if this is a technical usage " +
      "rather than a claim, add a justified baseline entry.",
  );
  process.exit(1);
}

console.log(
  pendingCount > 0
    ? "\nPASS — no new violations. AC 16 is not yet met: see the entries awaiting a decision."
    : "\nPASS — § 6 clean (AC 16).",
);

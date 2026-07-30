/**
 * Spec 16 § 6 / § 10 — the vocabulary scanning engine.
 *
 * Split from the CLI in `scripts/check-rec-vocabulary.ts` so § 10's LOI securities
 * deny-list can reuse it rather than building a second checker, as § 10 requires:
 * "Reuse the § 6 CI machinery rather than building a second checker."
 *
 * The engine is deliberately term-list-agnostic — it takes a list of
 * `ProhibitedTerm` and some text, and reports matches. § 6's REC vocabulary and
 * § 10's securities deny-list are two term lists over the same engine.
 */
import fs from "node:fs";
import path from "node:path";

import {
  EXCLUDED_DIR_NAMES,
  SCAN_EXTENSIONS,
  SELF_EXCLUDED_PATHS,
  isMatchNegated,
  type ProhibitedTerm,
} from "./vocabulary";

export interface Match {
  /** Repo-relative, forward-slashed. */
  file: string;
  termId: string;
  term: string;
  /** 1-indexed. */
  line: number;
  /** The exact text that matched. */
  matched: string;
  /** The full source line, trimmed, for the report. */
  context: string;
  /** True when a negation cue precedes the match — allowed, see `isNegated`. */
  negated: boolean;
}

/** Find every prohibited-term match in a single blob of text. */
export function scanText(
  text: string,
  terms: ProhibitedTerm[],
  file = "<text>",
): Match[] {
  const matches: Match[] = [];

  // Precompute line starts so a match index maps to a line number in one pass.
  const lineStarts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") lineStarts.push(i + 1);
  }
  const lineOf = (index: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (lineStarts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  for (const term of terms) {
    // Patterns are declared global; clone to keep `lastIndex` from leaking
    // between files.
    const re = new RegExp(term.pattern.source, term.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const line = lineOf(m.index);
      matches.push({
        file,
        termId: term.id,
        term: term.term,
        line,
        matched: m[0],
        context: (text.split("\n")[line - 1] ?? "").trim().slice(0, 200),
        negated: isMatchNegated(text, m.index, m[0]),
      });
      // Zero-length matches would spin forever.
      if (m[0].length === 0) re.lastIndex++;
    }
  }

  return matches.sort((a, b) => a.line - b.line || a.termId.localeCompare(b.termId));
}

/** Recursively collect scannable files under `root`. */
export function collectFiles(repoRoot: string, root: string): string[] {
  const abs = path.resolve(repoRoot, root);
  if (!fs.existsSync(abs)) return [];

  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if ((EXCLUDED_DIR_NAMES as readonly string[]).includes(entry.name)) continue;
        walk(path.join(dir, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      if (!(SCAN_EXTENSIONS as readonly string[]).includes(path.extname(entry.name))) {
        continue;
      }
      const rel = path.relative(repoRoot, path.join(dir, entry.name)).split(path.sep).join("/");
      if ((SELF_EXCLUDED_PATHS as readonly string[]).includes(rel)) continue;
      out.push(rel);
    }
  };
  walk(abs);
  return out;
}

/** Scan a set of repo-relative files. */
export function scanFiles(
  repoRoot: string,
  files: string[],
  terms: ProhibitedTerm[],
): Match[] {
  const all: Match[] = [];
  for (const rel of files) {
    const text = fs.readFileSync(path.resolve(repoRoot, rel), "utf8");
    all.push(...scanText(text, terms, rel));
  }
  return all;
}

// ─── Baseline ────────────────────────────────────────────────────────────────

/**
 * A pre-existing violation, acknowledged and tracked.
 *
 * Introducing § 6 to a codebase written before it means the check starts red.
 * The honest options are to weaken the rule, to block all other work until every
 * violation is resolved, or to record what exists today and fail on anything
 * new. This is the third. `reason` is mandatory: an entry without a stated
 * justification is indistinguishable from ignoring the rule.
 */
export interface BaselineEntry {
  file: string;
  termId: string;
  /** Occurrences expected in this file. New occurrences fail the check. */
  count: number;
  /** Example matched strings, for the report. */
  samples: string[];
  /**
   * `technical` — the term is a code identifier or an industry term of art, not a
   *   claim in user-facing copy. Not a § 6 violation.
   * `pending-decision` — a genuine § 6 violation in live copy. Needs a founder or
   *   counsel decision; not something a build step should silently rewrite.
   */
  category: "technical" | "pending-decision";
  reason: string;
  /**
   * For `pending-decision` entries: what resolving it would take. Carried through
   * `--update-baseline` rather than regenerated, since it records a human call.
   */
  decision?: string;
}

export interface Baseline {
  note: string;
  entries: BaselineEntry[];
}

export function loadBaseline(repoRoot: string): Baseline {
  const file = path.resolve(repoRoot, "shared/rec/vocabulary-baseline.json");
  if (!fs.existsSync(file)) return { note: "", entries: [] };
  return JSON.parse(fs.readFileSync(file, "utf8")) as Baseline;
}

export interface Verdict {
  /** Matches that are new relative to the baseline — these fail the check. */
  newViolations: Match[];
  /** Matches accounted for by the baseline. */
  baselined: Match[];
  /** Matches inside a negation — allowed. */
  negated: Match[];
  /** Baseline entries with no corresponding match, i.e. resolved. Prune them. */
  staleBaseline: BaselineEntry[];
}

/** Classify raw matches against the baseline. */
export function evaluate(matches: Match[], baseline: Baseline): Verdict {
  const negated = matches.filter((m) => m.negated);
  const live = matches.filter((m) => !m.negated);

  const key = (file: string, termId: string) => `${file}::${termId}`;
  const budget = new Map<string, number>();
  for (const e of baseline.entries) budget.set(key(e.file, e.termId), e.count);

  const newViolations: Match[] = [];
  const baselined: Match[] = [];
  const used = new Map<string, number>();

  for (const m of live) {
    const k = key(m.file, m.termId);
    const remaining = budget.get(k) ?? 0;
    const consumed = used.get(k) ?? 0;
    if (consumed < remaining) {
      used.set(k, consumed + 1);
      baselined.push(m);
    } else {
      newViolations.push(m);
    }
  }

  const staleBaseline = baseline.entries.filter(
    (e) => (used.get(key(e.file, e.termId)) ?? 0) < e.count,
  );

  return { newViolations, baselined, negated, staleBaseline };
}

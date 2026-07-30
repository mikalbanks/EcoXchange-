/**
 * Spec 16 § 6 — REC copy vocabulary, encoded.
 *
 * The § 6 lists in this file are reproduced **verbatim** from
 * `docs/specs/EcoXchange_Spec_16_REC_UX.md`. The `term` field of every entry is
 * the spec's own wording. Do not reword, extend, or prune these lists to make a
 * check pass — § 6 is locked copy and changes require the same review as PPM
 * language (§ 3.1, AC 3).
 *
 * What is *not* verbatim, and is deliberately implementation detail: the
 * `pattern` regexes. Each one is a matcher for its `term`, and where a matcher
 * is broader than the literal phrase the widening is called out in `matcherNote`.
 * Widening is only ever in the blocking direction.
 *
 * § 9.4 puts this module first in the build order: "Every later surface validates
 * against it; retrofitting is strictly more expensive."
 *
 * The scanner that consumes this lives in `scripts/check-rec-vocabulary.ts` and
 * is reused for the § 10 LOI securities deny-list rather than duplicated (§ 10).
 *
 * NOTE: this file necessarily *contains* every prohibited term, so the scanner
 * excludes it from its own sweep. See `SELF_EXCLUDED_PATHS`.
 */

// ─── § 6 Approved terms ──────────────────────────────────────────────────────

/**
 * Spec 16 § 6, verbatim. These are the sanctioned ways to describe the product.
 * Not enforced by the scanner — an allowlist of approved phrasings is not a
 * constraint on prose — but kept here so copy authors have one place to look.
 */
export const APPROVED_TERMS = [
  "production-verified",
  "proprietary verification engine",
  "three-source reconciliation",
  "registry-issued certificates",
  "forecast certificates",
  "attribute attestation",
  "contracted certificate revenue",
  "merchant certificate revenue",
  "target",
  "modeled",
  "estimated",
] as const;

/**
 * Spec 16 § 6 "Always paired" — each left-hand item must not appear without its
 * right-hand counterpart in the same view. Encoded as data for the § 3.2 / § 7
 * work in later steps; the scanner does not enforce pairing, because pairing is
 * a property of a rendered view rather than of a source file.
 */
export const ALWAYS_PAIRED = [
  { subject: "contracted", requires: "merchant", relation: "vs." },
  { subject: "estimated figure", requires: "source and asof", relation: "with" },
  { subject: "yield", requires: "decomposition available", relation: "with" },
  { subject: "confidence band", requires: "its basis", relation: "with" },
] as const;

// ─── § 6 Prohibited terms ────────────────────────────────────────────────────

export interface ProhibitedTerm {
  /** Stable id for baseline entries and test references. */
  id: string;
  /** The § 6 wording, verbatim. */
  term: string;
  /** Matcher for `term`. */
  pattern: RegExp;
  /** Why § 6 prohibits it — for the violation report. */
  rationale: string;
  /** Present when the matcher is broader than the literal § 6 phrase. */
  matcherNote?: string;
}

/**
 * Spec 16 § 6 "Prohibited, CI-enforced", in spec order.
 *
 * Every `pattern` is case-insensitive and global. Word boundaries matter: a bare
 * `/oracle/` matches the identifier `oracleBridge`, which is a smart-contract
 * field name and not a claim about anything. `/\boracle\b/` does not.
 */
export const PROHIBITED_TERMS: ProhibitedTerm[] = [
  {
    id: "ecoxchange-mints-issues-creates-recs",
    term: "EcoXchange mints/issues/creates RECs",
    // Proximity match: the subject, an issuance verb, and the object, within one
    // sentence. The slash notation in § 6 enumerates three verbs; the inflected
    // forms are included because "EcoXchange is minting RECs" is the same claim.
    pattern:
      /\bEcoXchange\b[^.!?\n]{0,60}?\b(mints?|minting|issues?|issuing|creates?|creating)\b[^.!?\n]{0,60}?\b(RECs?|renewable energy certificates?)\b/gi,
    rationale:
      "EcoXchange is not a registry and does not create certificates. Registries issue; EcoXchange verifies and reconciles.",
    matcherNote:
      "Widened from the three literal verbs to their inflected forms, and from 'RECs' to 'renewable energy certificate(s)'.",
  },
  {
    id: "ecoxchange-registry",
    term: "EcoXchange registry",
    pattern: /\bEcoXchange\s+registry\b/gi,
    rationale:
      "Implies EcoXchange operates a certificate registry. It does not; it integrates with third-party registries.",
  },
  {
    id: "guaranteed-rec-revenue",
    term: "guaranteed REC revenue",
    pattern: /\bguaranteed\s+REC\s+revenue\b/gi,
    rationale:
      "Certificate revenue is never guaranteed. Merchant prices are policy-driven (§ 3.4).",
  },
  {
    id: "guaranteed-delivery",
    term: "guaranteed delivery",
    pattern: /\bguaranteed\s+delivery\b/gi,
    rationale:
      "Delivery of certificates depends on registry issuance, which EcoXchange does not control.",
  },
  {
    id: "carbon-credits",
    term: "carbon credits",
    pattern: /\bcarbon\s+credits?\b/gi,
    rationale:
      "RECs are not carbon credits. Conflating the two is the core greenwashing exposure § 3.1 exists to prevent.",
    matcherNote: "Singular 'carbon credit' included.",
  },
  {
    id: "carbon-offsets",
    term: "carbon offsets",
    pattern: /\bcarbon\s+offsets?\b/gi,
    rationale: "RECs are not offsets. Same conflation risk as carbon credits.",
    matcherNote: "Singular 'carbon offset' included.",
  },
  {
    id: "patent-pending",
    term: "patent-pending",
    pattern: /\bpatent[\s-]pending\b/gi,
    rationale:
      "An unsubstantiated IP claim in investor-facing copy. Remove unless an application is actually on file and counsel has cleared the wording.",
    matcherNote: "Matches the space-separated 'patent pending' as well as the hyphenated § 6 form.",
  },
  {
    id: "physics-verified",
    term: "physics-verified",
    pattern: /\bphysics[\s-]verified\b/gi,
    rationale:
      "Overclaims what the engine does. The approved term is 'production-verified'.",
    matcherNote: "Matches the space-separated form as well.",
  },
  {
    id: "oracle",
    term: "oracle",
    pattern: /\boracle\b/gi,
    rationale:
      "Asserts oracular reliability about estimated satellite data. The engine reconciles three sources and reports a verdict; it is not a source of truth.",
    matcherNote:
      "Word-boundary only, so identifiers like `oracleBridge`, `skyOracle`, and `SkyOracleResult` do not match. Prose uses such as 'Sky Oracle' and 'Oracle Bridge' do match.",
  },
  {
    id: "risk-free",
    term: "risk-free",
    pattern: /\brisk[\s-]free\b/gi,
    rationale: "No securities offering is risk-free.",
    matcherNote: "Matches the space-separated form as well.",
  },
  {
    id: "insured",
    term: "insured",
    pattern: /\binsured\b/gi,
    rationale:
      "Implies principal protection that does not exist. Note the negated form ('Not FDIC insured') is required securities language and is allowed — see NEGATION_CUES.",
  },
  {
    id: "price-forecast",
    term: "price forecast",
    pattern: /\bprice\s+forecasts?\b/gi,
    rationale:
      "§ 3.4 forbids projected future prices outright. Scenarios are permitted; forecasts are not.",
    matcherNote: "Plural included.",
  },
  {
    id: "expected-year-price",
    term: "expected 2027 price",
    // § 6 gives one instance of a class. A hard-coded 2027 would pass "expected
    // 2028 price" through, which is the same prohibited claim, so the year is
    // generalised. This widening is in the blocking direction only.
    pattern: /\bexpected\s+20\d{2}\s+price\b/gi,
    rationale:
      "A specific forward price claim. Prohibited by § 3.4's ban on projected future prices.",
    matcherNote:
      "Year generalised from the spec's literal '2027' to any 20xx, so adjacent vintages are caught too.",
  },
];

// ─── Negation handling ───────────────────────────────────────────────────────

/**
 * A prohibited term inside a negation is usually the copy we *want*. "Not FDIC
 * insured" and "EcoXchange does not issue RECs" are both correct disclosure and
 * both contain a § 6 term.
 *
 * When one of these cues appears in the text shortly before a match, the match
 * is reported as negated and does not fail the check. The window is deliberately
 * short so that an unrelated "not" earlier in a paragraph does not launder a
 * genuine claim.
 */
export const NEGATION_CUES = [
  "not",
  "never",
  "no",
  "nor",
  "cannot",
  "without",
  "neither",
  "does not",
  "do not",
  "is not",
  "are not",
] as const;

/** How many characters before a match are searched for a negation cue. */
export const NEGATION_WINDOW_CHARS = 48;

/** True when `window` contains a negation cue as a whole word. */
export function hasNegationCue(window: string): boolean {
  return NEGATION_CUES.some((cue) =>
    new RegExp(`(^|[^\\w-])${cue}([^\\w-]|$)`, "i").test(window),
  );
}

/**
 * True when `text` contains a negation cue in the window immediately preceding
 * `matchIndex`, and no sentence boundary intervenes.
 */
export function isNegated(text: string, matchIndex: number): boolean {
  const start = Math.max(0, matchIndex - NEGATION_WINDOW_CHARS);
  let window = text.slice(start, matchIndex);

  // A sentence boundary ends the negation's reach.
  const lastStop = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
    window.lastIndexOf("\n"),
  );
  if (lastStop !== -1) window = window.slice(lastStop + 1);

  return hasNegationCue(window);
}

/**
 * True when the match itself is negated, by a cue either just before it or
 * *inside* it.
 *
 * The inside case is not an edge case: the proximity patterns span a whole
 * clause, so "EcoXchange does not issue renewable energy certificates" — the
 * correct disclaimer, and the last line of the spec — matches from "EcoXchange"
 * onward and carries its own negation. A look-behind window starting at the match
 * cannot see it.
 */
export function isMatchNegated(
  text: string,
  matchIndex: number,
  matched: string,
): boolean {
  return isNegated(text, matchIndex) || hasNegationCue(matched);
}

// ─── Scan scope (§ 8.16) ─────────────────────────────────────────────────────

/**
 * AC 16: "§ 6 CI check passes across all components, copy, PDF templates, and
 * test fixtures." These roots are where those live.
 */
export const SCAN_ROOTS = [
  "client/src",
  "ecoxchange-dashboard/src",
  "ecoxchange-onboarding/src",
  "server",
  "shared",
  "web",
] as const;

export const SCAN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".html"] as const;

/**
 * Paths excluded from the sweep.
 *
 * `shared/rec/vocabulary.ts` and the baseline file are excluded because they
 * enumerate the prohibited terms by definition. `docs/` is excluded because the
 * spec itself quotes the § 6 list. Neither is user-facing copy.
 */
export const SELF_EXCLUDED_PATHS = [
  "shared/rec/vocabulary.ts",
  "shared/rec/vocabulary.test.ts",
  "shared/rec/vocabulary-baseline.json",
] as const;

export const EXCLUDED_DIR_NAMES = [
  "node_modules",
  "dist",
  "build",
  ".git",
  "coverage",
  "__snapshots__",
] as const;

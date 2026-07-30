import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  APPROVED_TERMS,
  PROHIBITED_TERMS,
  SCAN_ROOTS,
  isNegated,
} from "./vocabulary";
import {
  collectFiles,
  evaluate,
  loadBaseline,
  scanFiles,
  scanText,
} from "./scan";
import {
  ATTRIBUTE_OWNERSHIP_COPY,
  ATTRIBUTE_OWNERSHIP_VALUES,
  PROGRAM_SELECTION_PLACEHOLDER,
  SCREENING_GATE_COPY,
  attributeOwnershipCopy,
} from "./copy";

/**
 * Spec 16 § 6 / § 3.1 — the CI vocabulary check and the locked copy module.
 *
 * § 9.4 step 1 requires the check to exist before any REC surface does. AC 16
 * requires it to pass across components, copy, PDF templates, and test fixtures.
 */

const repoRoot = path.resolve(import.meta.dirname, "..", "..");

describe("§ 6 term lists", () => {
  it("carries all 13 prohibited terms from the spec", () => {
    expect(PROHIBITED_TERMS).toHaveLength(13);
    expect(PROHIBITED_TERMS.map((t) => t.term)).toEqual([
      "EcoXchange mints/issues/creates RECs",
      "EcoXchange registry",
      "guaranteed REC revenue",
      "guaranteed delivery",
      "carbon credits",
      "carbon offsets",
      "patent-pending",
      "physics-verified",
      "oracle",
      "risk-free",
      "insured",
      "price forecast",
      "expected 2027 price",
    ]);
  });

  it("carries all 11 approved terms from the spec", () => {
    expect(APPROVED_TERMS).toHaveLength(11);
    expect(APPROVED_TERMS).toContain("production-verified");
    expect(APPROVED_TERMS).toContain("proprietary verification engine");
    // The § 6 substitute for the prohibited "patent-pending" claim.
    expect(APPROVED_TERMS).toContain("proprietary verification engine");
  });

  it("gives every term a unique id and a rationale", () => {
    const ids = PROHIBITED_TERMS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of PROHIBITED_TERMS) {
      expect(t.rationale.length).toBeGreaterThan(20);
    }
  });
});

describe("§ 6 matchers", () => {
  const hits = (text: string) =>
    scanText(text, PROHIBITED_TERMS)
      .filter((m) => !m.negated)
      .map((m) => m.termId);

  it("catches each prohibited claim", () => {
    expect(hits("EcoXchange issues RECs for every project.")).toContain(
      "ecoxchange-mints-issues-creates-recs",
    );
    expect(hits("Tracked in the EcoXchange registry.")).toContain("ecoxchange-registry");
    expect(hits("Offers guaranteed REC revenue.")).toContain("guaranteed-rec-revenue");
    expect(hits("With guaranteed delivery of certificates.")).toContain(
      "guaranteed-delivery",
    );
    expect(hits("Buy carbon credits here.")).toContain("carbon-credits");
    expect(hits("Bundled carbon offsets.")).toContain("carbon-offsets");
    expect(hits("Our patent-pending engine.")).toContain("patent-pending");
    expect(hits("A physics-verified result.")).toContain("physics-verified");
    expect(hits("The Sky Oracle feed.")).toContain("oracle");
    expect(hits("A risk-free yield.")).toContain("risk-free");
    expect(hits("Your capital is insured.")).toContain("insured");
    expect(hits("See our price forecast.")).toContain("price-forecast");
    expect(hits("The expected 2027 price is $42.")).toContain("expected-year-price");
  });

  it("generalises the year in 'expected 2027 price' so adjacent vintages are caught", () => {
    expect(hits("The expected 2029 price is $42.")).toContain("expected-year-price");
  });

  it("matches inflected and space-separated forms", () => {
    expect(hits("EcoXchange is minting renewable energy certificates.")).toContain(
      "ecoxchange-mints-issues-creates-recs",
    );
    expect(hits("Our patent pending engine.")).toContain("patent-pending");
    expect(hits("A risk free return.")).toContain("risk-free");
  });

  it("does not match 'oracle' inside an identifier", () => {
    // These are the smart-contract field and type names already in the repo.
    expect(hits("const { oracleBridge } = contracts;")).not.toContain("oracle");
    expect(hits("let skyOracle: SkyOracleResult;")).not.toContain("oracle");
  });

  it("does not flag the § 6 approved substitute", () => {
    expect(hits("Our proprietary verification engine reconciles three sources.")).toEqual(
      [],
    );
  });

  it("does not flag 'not guaranteed', which is correct disclosure", () => {
    // § 6 prohibits "guaranteed REC revenue" and "guaranteed delivery", not the
    // bare word — YieldDisclosure.tsx's aria-label depends on this.
    expect(hits("Modeled yield, not guaranteed.")).toEqual([]);
  });

  it("reports the line number of a match", () => {
    const matches = scanText("clean line\nanother\nOur patent-pending engine.\n", PROHIBITED_TERMS);
    expect(matches).toHaveLength(1);
    expect(matches[0].line).toBe(3);
  });
});

describe("negation handling", () => {
  it("allows a prohibited term inside a negation", () => {
    // Required securities language, live at client/src/pages/admin/export-packet.tsx.
    const matches = scanText("Not FDIC insured.", PROHIBITED_TERMS);
    expect(matches).toHaveLength(1);
    expect(matches[0].negated).toBe(true);
  });

  it("allows the correct EcoXchange disclaimer", () => {
    const matches = scanText(
      "EcoXchange does not issue, mint, or create renewable energy certificates.",
      PROHIBITED_TERMS,
    );
    expect(matches.every((m) => m.negated)).toBe(true);
  });

  it("does not let a negation reach across a sentence boundary", () => {
    // "not" belongs to the first sentence; the claim in the second stands.
    expect(isNegated("This is not true. Your capital is insured", 40)).toBe(false);
  });

  it("does not let a distant negation launder a claim", () => {
    const text =
      "We do not make promises about anything at all in this long sentence, and separately your capital is insured";
    const idx = text.indexOf("insured");
    expect(isNegated(text, idx)).toBe(false);
  });
});

describe("§ 6 CI check over the repository (AC 16)", () => {
  const files = SCAN_ROOTS.flatMap((root) => collectFiles(repoRoot, root));
  const matches = scanFiles(repoRoot, files, PROHIBITED_TERMS);
  const verdict = evaluate(matches, loadBaseline(repoRoot));

  it("scans a non-trivial number of files", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("has no NEW violations", () => {
    const detail = verdict.newViolations
      .map((m) => `${m.file}:${m.line} "${m.matched}" (${m.termId})`)
      .join("\n");
    expect(verdict.newViolations, `New § 6 violations:\n${detail}`).toHaveLength(0);
  });

  it("has no stale baseline entries", () => {
    const detail = verdict.staleBaseline.map((e) => `${e.file} [${e.termId}]`).join("\n");
    expect(verdict.staleBaseline, `Resolved — prune these:\n${detail}`).toHaveLength(0);
  });

  it("fails when a violation is planted", () => {
    const planted = scanText(
      'const blurb = "Earn guaranteed REC revenue with zero risk";',
      PROHIBITED_TERMS,
      "client/src/pages/fake.tsx",
    );
    const plantedVerdict = evaluate(planted, loadBaseline(repoRoot));
    expect(plantedVerdict.newViolations.length).toBeGreaterThan(0);
    expect(plantedVerdict.newViolations[0].termId).toBe("guaranteed-rec-revenue");
  });

  it("excludes the vocabulary module itself from the sweep", () => {
    expect(files).not.toContain("shared/rec/vocabulary.ts");
    expect(files).not.toContain("shared/rec/vocabulary.test.ts");
  });
});

describe("baseline integrity", () => {
  const baseline = loadBaseline(repoRoot);

  it("justifies every entry", () => {
    expect(baseline.entries.length).toBeGreaterThan(0);
    for (const e of baseline.entries) {
      expect(e.reason, `${e.file} [${e.termId}]`).not.toMatch(/^TODO/);
      expect(e.reason.length, `${e.file} [${e.termId}]`).toBeGreaterThan(40);
      expect(["technical", "pending-decision"]).toContain(e.category);
    }
  });

  it("points every entry at a file that exists", () => {
    for (const e of baseline.entries) {
      expect(
        fs.existsSync(path.resolve(repoRoot, e.file)),
        `missing: ${e.file}`,
      ).toBe(true);
    }
  });
});

// ─── § 3.1 locked copy ───────────────────────────────────────────────────────

describe("§ 3.1 attribute ownership copy", () => {
  it("reproduces variant A verbatim", () => {
    expect(ATTRIBUTE_OWNERSHIP_COPY.A).toEqual({
      heading: "Environmental attributes",
      body: "The renewable energy certificates generated by this project are sold to third parties. Investors receive the cash proceeds from those sales as part of project revenue.",
      claim:
        "Investors in this offering do not hold, and may not claim, the renewable energy attributes of this generation.",
      claimTrailer: "The purchaser of the certificates holds that claim.",
    });
  });

  it("reproduces variant B verbatim", () => {
    expect(ATTRIBUTE_OWNERSHIP_COPY.B).toEqual({
      heading: "Environmental attributes",
      body: "The renewable energy certificates generated by this project are conveyed to the power purchaser under the offtake agreement. The project receives no separate certificate revenue, and this is reflected in the projected returns.",
      claim:
        "Investors in this offering do not hold, and may not claim, the renewable energy attributes of this generation.",
    });
  });

  it("carries the mandatory claim sentence in both variants", () => {
    for (const variant of ["A", "B"] as const) {
      expect(ATTRIBUTE_OWNERSHIP_COPY[variant].claim).toContain(
        "do not hold, and may not claim",
      );
    }
  });

  it("maps retained → A and conveyed → B", () => {
    expect(attributeOwnershipCopy("retained").variant).toBe("A");
    expect(attributeOwnershipCopy("conveyed").variant).toBe("B");
  });

  it("falls back to variant B on unknown and demands a warning (AC 2)", () => {
    const result = attributeOwnershipCopy("unknown");
    expect(result.variant).toBe("B");
    expect(result.requiresWarning).toBe(true);
  });

  it("does not demand a warning for a known state", () => {
    expect(attributeOwnershipCopy("retained").requiresWarning).toBe(false);
    expect(attributeOwnershipCopy("conveyed").requiresWarning).toBe(false);
  });

  it("keeps all four enum values legal in the database (§ 9.2)", () => {
    expect(ATTRIBUTE_OWNERSHIP_VALUES).toEqual([
      "retained",
      "conveyed",
      "retired_for_investors",
      "unknown",
    ]);
  });

  describe("variant C is absent, not merely unreachable (AC 19)", () => {
    it("exposes only variants A and B", () => {
      expect(Object.keys(ATTRIBUTE_OWNERSHIP_COPY).sort()).toEqual(["A", "B"]);
    });

    it("holds no retirement copy in the locked module", () => {
      for (const copy of Object.values(ATTRIBUTE_OWNERSHIP_COPY)) {
        for (const value of Object.values(copy)) {
          expect(value).not.toMatch(/retir/i);
        }
      }
    });

    it("throws rather than rendering an absent state", () => {
      expect(() => attributeOwnershipCopy("retired_for_investors")).toThrow(
        /variant C/,
      );
    });
  });

  it("passes its own § 6 check", () => {
    // The locked copy must not itself contain a prohibited term.
    const all = [
      ...Object.values(ATTRIBUTE_OWNERSHIP_COPY).flatMap((c) => Object.values(c)),
      ...Object.values(SCREENING_GATE_COPY),
    ].join("\n");
    expect(scanText(all, PROHIBITED_TERMS).filter((m) => !m.negated)).toEqual([]);
  });
});

describe("§ 4.2 screening gate copy", () => {
  it("reproduces the conveyed banner verbatim", () => {
    expect(SCREENING_GATE_COPY.conveyed).toBe(
      "Environmental attributes for this project are conveyed to your power purchaser. Certificate revenue is not available on this project. Projected returns reflect energy revenue only.",
    );
  });

  it("reproduces the not-sure banner verbatim", () => {
    expect(SCREENING_GATE_COPY.unknown).toBe(
      "We'll need to confirm this with your offtake agreement before modeling certificate revenue.",
    );
  });

  it("carries the § 9.4 step 3 placeholder verbatim", () => {
    expect(PROGRAM_SELECTION_PLACEHOLDER).toBe("PROGRAM SELECTION PENDING REGISTRY DATA");
  });
});

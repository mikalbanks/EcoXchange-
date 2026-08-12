// Spec 19 — the independence assertion.
//
// Three-way reconciliation only means something if the three legs are arrived at
// independently. The demo failed that for a long time and it showed: the Savannah
// generator (`scripts/generate-realistic-seed.mjs`) computes
//   inverter = expected_kwh × (1 + noise)
// and then rescales so the annual inverter total equals the annual expected total
// *exactly*. Reconciling those two series measures the noise function, nothing
// more, and forcing the annual totals equal is the fingerprint it leaves behind.
//
// This file asserts the properties a genuinely independent pair has, and
// `detectDerivedFromExpected` below is written so it FIRES on the old
// construction — the fixture at the bottom proves it, so the guardrail cannot
// quietly rot into a comment.
//
// Scope: the assertions run against PVDAQ 9068, whose inverter leg is measured.
// `demo-savannah.json` is deliberately NOT asserted here — it remains a synthetic
// illustrative scenario, and pretending otherwise is what this test exists to stop.

import { describe, expect, it } from "vitest";
import {
  PVDAQ_9068,
  PVDAQ_9068_PROJECT_ID,
  PVDAQ_9068_RECORDS,
  toProjectBundle,
} from "./demo-pvdaq-9068.js";
import { loadProject } from "./index.js";

interface Leg {
  inverter: number;
  expected: number;
}

/** Coefficient of variation of the per-period inverter/expected ratio. */
function ratioDispersion(rows: Leg[]): number {
  const ratios = rows.map((r) => r.inverter / r.expected);
  const mean = ratios.reduce((s, x) => s + x, 0) / ratios.length;
  const variance =
    ratios.reduce((s, x) => s + (x - mean) ** 2, 0) / ratios.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Heuristic for "one leg was computed from the other".
 *
 * Two independent series drift apart over a year; a derived pair is pinned. The
 * tell is the annual totals agreeing to far better precision than any individual
 * period does — that only happens when something rescaled them to match.
 */
function detectDerivedFromExpected(rows: Leg[]): boolean {
  const invTotal = rows.reduce((s, r) => s + r.inverter, 0);
  const expTotal = rows.reduce((s, r) => s + r.expected, 0);
  const annualGap = Math.abs(invTotal / expTotal - 1);

  const worstPeriodGap = Math.max(
    ...rows.map((r) => Math.abs(r.inverter / r.expected - 1)),
  );

  // Annual agreement two orders of magnitude tighter than the worst period is
  // not something independent measurement produces.
  return annualGap < worstPeriodGap / 100;
}

describe("PVDAQ 9068 — measured and modelled legs are independent", () => {
  const rows: Leg[] = PVDAQ_9068_RECORDS.filter(
    (r) => r.status !== "pending",
  ).map((r) => ({ inverter: r.inverter_kwh, expected: r.expected_kwh }));

  it("has periods to reconcile", () => {
    expect(rows.length).toBeGreaterThanOrEqual(12);
  });

  it("does not force the annual totals to agree", () => {
    const invTotal = rows.reduce((s, r) => s + r.inverter, 0);
    const expTotal = rows.reduce((s, r) => s + r.expected, 0);
    expect(invTotal).not.toBe(expTotal);

    // A real model-vs-measurement gap at annual scale, not a rounding residue.
    const annualDeviationPct = Math.abs(invTotal / expTotal - 1) * 100;
    expect(annualDeviationPct).toBeGreaterThan(0.5);
  });

  it("shows genuine month-to-month dispersion in the inverter/expected ratio", () => {
    expect(ratioDispersion(rows)).toBeGreaterThan(0.01);
  });

  it("is not detected as derived from the expected leg", () => {
    expect(detectDerivedFromExpected(rows)).toBe(false);
  });

  it("never reports a 0.0% inverter-vs-expected deviation for a reconciled period", () => {
    // The bug this whole spec exists to close.
    for (const r of PVDAQ_9068_RECORDS) {
      if (r.status === "pending") continue;
      expect(r.inv_vs_expected_pct).not.toBeNull();
      expect(Math.abs(r.inv_vs_expected_pct as number)).toBeGreaterThan(0);
    }
  });
});

describe("PVDAQ 9068 — provenance is stated on every leg", () => {
  it("marks the inverter leg as the only cited one", () => {
    const p = PVDAQ_9068.provenance;
    expect(p.inverter_kwh.basis).toBe("cited");
    expect(p.expected_kwh.basis).toBe("estimated");
    // The utility leg is modelled from the inverter leg. If this ever flips to
    // "cited" it must be because a real meter was connected — not because the
    // label looked better.
    expect(p.utility_kwh.basis).toBe("estimated");
  });

  it("names a source for every leg", () => {
    for (const leg of Object.values(PVDAQ_9068.provenance)) {
      expect(leg.source.length).toBeGreaterThan(0);
      expect(leg.note.length).toBeGreaterThan(0);
    }
  });
});

describe("QC gates hold", () => {
  it("resolves any period below the completeness minimum to PENDING", () => {
    const min = PVDAQ_9068.tolerance_config.min_data_completeness_pct;
    for (const r of PVDAQ_9068_RECORDS) {
      if (r.data_completeness_pct < min) {
        expect(r.status).toBe("pending");
      }
    }
  });

  it("keeps every verified period inside the inverter-vs-expected band", () => {
    const upper = PVDAQ_9068.tolerance_config.inv_vs_expected_upper_pct;
    const lower = PVDAQ_9068.tolerance_config.inv_vs_expected_lower_pct;
    for (const r of PVDAQ_9068_RECORDS) {
      if (r.status !== "verified") continue;
      expect(r.inv_vs_expected_pct as number).toBeLessThanOrEqual(upper);
      expect(r.inv_vs_expected_pct as number).toBeGreaterThanOrEqual(lower);
      expect(r.flag_reasons).toHaveLength(0);
    }
  });

  it("gives every flagged period a stated reason", () => {
    for (const r of PVDAQ_9068_RECORDS) {
      if (r.status !== "flagged") continue;
      expect(r.flag_reasons.length).toBeGreaterThan(0);
    }
  });
});

describe("the measured asset is reachable, not dead data", () => {
  it("resolves through loadProject by id", async () => {
    const bundle = await loadProject(PVDAQ_9068_PROJECT_ID);
    expect(bundle).not.toBeNull();
    expect(bundle!.project.name).toContain("9068");
    expect(bundle!.verification_records).toHaveLength(PVDAQ_9068_RECORDS.length);
  });

  it("never surfaces a computed-looking 0.0% for an uncomputable period", () => {
    // A period without a deviation must arrive as NaN, so a renderer shows "—"
    // rather than a confident zero.
    for (const r of toProjectBundle().verification_records) {
      const source = PVDAQ_9068_RECORDS.find(
        (x) => x.period_start === r.period_start,
      )!;
      if (source.inv_vs_expected_pct === null) {
        expect(Number.isNaN(r.inv_vs_expected_pct)).toBe(true);
      } else {
        expect(r.inv_vs_expected_pct).toBe(source.inv_vs_expected_pct);
      }
    }
  });
});

describe("the detector fires on the construction it exists to catch", () => {
  // Reproduces generate-realistic-seed.mjs: draw noise around the expected
  // series, then rescale so the annual totals match exactly.
  function derivedPair(): Leg[] {
    const expected = [
      516016, 546624, 667163, 836859, 796045, 858953,
      795158, 776243, 611196, 721974, 486701, 489823,
    ];
    const noisePct = [-0.7, 1.9, -3.8, -0.7, -1.8, -3.8, 3.5, 0.2, 3.1, 2.0, -0.7, 2.4];
    const raw = expected.map((e, i) => e * (1 + noisePct[i] / 100));

    const sumExpected = expected.reduce((s, x) => s + x, 0);
    const sumRaw = raw.reduce((s, x) => s + x, 0);
    const factor = sumExpected / sumRaw;

    return expected.map((e, i) => ({ inverter: raw[i] * factor, expected: e }));
  }

  it("flags a derived pair that a naive eyeball would pass", () => {
    const rows = derivedPair();

    // It looks healthy: every month deviates by a plausible few percent.
    expect(ratioDispersion(rows)).toBeGreaterThan(0.01);
    const worst = Math.max(...rows.map((r) => Math.abs(r.inverter / r.expected - 1)));
    expect(worst).toBeGreaterThan(0.02);

    // And yet the annual totals agree to floating-point noise.
    expect(detectDerivedFromExpected(rows)).toBe(true);
  });
});

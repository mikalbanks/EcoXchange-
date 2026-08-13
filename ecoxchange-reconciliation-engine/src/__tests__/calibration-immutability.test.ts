/**
 * Spec 23 AC 8 — "a test asserting no code path can re-fit calibration without
 * writing a new versioned row."
 *
 * A behavioural test would need a database. These are structural instead, and
 * they guard the two things that actually make the rule hold: the module
 * exposes no mutation verb, and the migration installs the trigger that stops
 * one being written by hand later.
 *
 * §4.3 is the reason this matters: a rolling re-fit absorbs the degradation
 * trend, so a calibration that can be edited in place is a degradation monitor
 * that quietly monitors nothing.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

// Read as source rather than imported: `db/client.ts` throws at module load
// without SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, and a guard that only runs
// when someone has credentials configured is a guard that will not run in CI.
const dbSource = read("../db/project-calibration.ts");
const migration = read("../../supabase/migrations/015_project_calibration.sql");

const exportedNames = [...dbSource.matchAll(/export (?:async )?function (\w+)/g)].map(
  (m) => m[1]!,
);

describe("the calibration module offers no way to mutate a frozen row", () => {
  it("exports no update, upsert, delete or patch function", () => {
    const mutators = exportedNames.filter((name) =>
      /update|upsert|delete|patch|overwrite/i.test(name),
    );
    expect(mutators).toEqual([]);
  });

  it("exports only the reads and the single insert", () => {
    expect([...exportedNames].sort()).toEqual([
      "getActiveCalibration",
      "getCalibrationById",
      "getCalibrationHistory",
      "insertCalibration",
    ]);
  });

  it("never calls .update() or .upsert() on the table", () => {
    expect(dbSource).not.toMatch(/\.update\(/);
    expect(dbSource).not.toMatch(/\.upsert\(/);
    expect(dbSource).not.toMatch(/\.delete\(/);
  });

  it("does not accept a caller-supplied version number", () => {
    // A caller that computes its own version is a caller that can pass 1 twice
    // and overwrite v1. The version is derived inside insertCalibration.
    expect(dbSource).not.toMatch(/calibration_version\s*:\s*input\./);
    expect(dbSource).toMatch(/nextVersion/);
  });

  it("refuses a re-fit that does not say why", () => {
    // §4.4: every re-fit records a reason. Enforced before the insert is built.
    expect(dbSource).toMatch(/refit_reason/);
    expect(dbSource).toMatch(/current !== null && !input\.refit_reason/);
  });
});

describe("the database refuses the mutation the module declines to offer", () => {
  it("installs an append-only trigger on UPDATE and on DELETE", () => {
    expect(migration).toMatch(/BEFORE UPDATE ON project_calibration/);
    expect(migration).toMatch(/BEFORE DELETE ON project_calibration/);
    expect(migration).toMatch(/restrict_violation/);
  });

  it("keeps the REVOKE as defence in depth, not as the control", () => {
    // An owner ignores its own REVOKE — the trigger is the load-bearing half.
    expect(migration).toMatch(/REVOKE UPDATE, DELETE ON project_calibration/);
  });

  it("links every version to the one it supersedes", () => {
    expect(migration).toMatch(/supersedes_id\s+UUID REFERENCES project_calibration\(id\)/);
    expect(migration).toMatch(/UNIQUE \(project_id, calibration_version\)/);
  });

  it("records which calibration judged each verification period", () => {
    // AC 3. Without this a historical band can only be recomputed from today's
    // calibration, which is not a reproduction of what actually happened.
    expect(migration).toMatch(
      /verification_records ADD COLUMN IF NOT EXISTS calibration_id/,
    );
    for (const column of [
      "gate_band_pct",
      "detect_band_pct",
      "detect_exceeded",
      "persistence_triggered",
    ]) {
      expect(migration).toContain(`ADD COLUMN IF NOT EXISTS ${column}`);
    }
  });

  it("is idempotent, because this repo has no migration runner", () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS project_calibration/);
    expect(migration).toMatch(/DROP TRIGGER IF EXISTS/);
  });
});

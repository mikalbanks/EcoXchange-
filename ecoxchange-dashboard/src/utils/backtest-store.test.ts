import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearBacktestResult,
  loadBacktestResult,
  newReportId,
  saveBacktestResult,
  type StoredBacktestResult,
} from "./backtest-store.js";
import { DEMO_SCENARIOS } from "../data/demo-scenarios.js";

// Minimal sessionStorage stub for the node test environment.
function installSessionStorage(): Map<string, string> {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  };
  return store;
}

function sampleResult(): StoredBacktestResult {
  const scenario = DEMO_SCENARIOS.savannah_5mw;
  return {
    scenario_id: scenario.id,
    project_name: scenario.intake.project_name,
    intake: scenario.intake,
    months: scenario.months,
    summary: scenario.summary,
    source: "seed",
    engine_version: "v2.0.0",
    generated_at: "2026-07-27T00:00:00.000Z",
    report_id: "BT-20260727-SAVANNAH-TEST",
  };
}

describe("backtest-store", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installSessionStorage();
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).sessionStorage;
  });

  it("round-trips a stored result", () => {
    saveBacktestResult(sampleResult());
    const loaded = loadBacktestResult();
    expect(loaded).not.toBeNull();
    expect(loaded?.scenario_id).toBe("savannah_5mw");
    expect(loaded?.months).toHaveLength(12);
    expect(loaded?.summary.annual_mwh).toBe(
      DEMO_SCENARIOS.savannah_5mw.summary.annual_mwh,
    );
  });

  it("returns null when nothing is stored", () => {
    expect(loadBacktestResult()).toBeNull();
  });

  it("returns null on corrupt or shape-mismatched payloads", () => {
    store.set("ecoxchange.backtest.result", "not-json{");
    expect(loadBacktestResult()).toBeNull();
    store.set("ecoxchange.backtest.result", JSON.stringify({ nope: true }));
    expect(loadBacktestResult()).toBeNull();
  });

  it("clears a stored result", () => {
    saveBacktestResult(sampleResult());
    clearBacktestResult();
    expect(loadBacktestResult()).toBeNull();
  });

  it("never throws when sessionStorage is unavailable", () => {
    delete (globalThis as Record<string, unknown>).sessionStorage;
    expect(() => saveBacktestResult(sampleResult())).not.toThrow();
    expect(loadBacktestResult()).toBeNull();
    expect(() => clearBacktestResult()).not.toThrow();
  });

  it("generates readable, unique-ish report ids", () => {
    const id = newReportId("billerica_2mw");
    expect(id).toMatch(/^BT-\d{8}-BILLERICA-[A-Z0-9]{4}$/);
    expect(newReportId("billerica_2mw")).not.toBe(id);
  });
});

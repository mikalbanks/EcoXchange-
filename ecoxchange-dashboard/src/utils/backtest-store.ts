// SessionStorage bridge between the Run Demo backtest flow and downstream
// pages (results summary, LOI builder). Mirrors the pattern the onboarding
// wizard uses for "ecoxchange.onboarding.form" — typed accessors, never
// throws when sessionStorage is unavailable (private mode, embeds).

import type { IntakeForm } from "./onboarding-types.js";
import type {
  DemoScenarioId,
  ScenarioMonth,
  ScenarioSummary,
} from "../data/demo-scenarios.js";

const STORAGE_KEY = "ecoxchange.backtest.result";

export type BacktestSource = "seed" | "live-engine";

export interface StoredBacktestResult {
  scenario_id: DemoScenarioId;
  project_name: string;
  intake: IntakeForm;
  months: ScenarioMonth[];
  summary: ScenarioSummary;
  source: BacktestSource;
  engine_version: string;
  generated_at: string; // ISO timestamp
  report_id: string;
}

export function saveBacktestResult(result: StoredBacktestResult): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    // sessionStorage may be unavailable in some embeds
  }
}

export function loadBacktestResult(): StoredBacktestResult | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBacktestResult;
    if (!parsed || !Array.isArray(parsed.months) || !parsed.summary) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearBacktestResult(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Short, human-readable run id shown on the results page and LOI. */
export function newReportId(scenarioId: DemoScenarioId): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BT-${stamp}-${scenarioId.split("_")[0].toUpperCase()}-${suffix}`;
}

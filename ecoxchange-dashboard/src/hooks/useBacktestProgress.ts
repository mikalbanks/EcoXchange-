// Drives the Run Demo backtest progress visualization.
//
// Two data paths, one UX:
//  - Seed path (default): steps through the scenario's baked-in 12-month
//    table on a deterministic timer, so the demo works with zero backends.
//  - Live path: when VITE_ENGINE_URL is configured, fires a real
//    pvlib-engine request at start(); the response's monthly_breakdown is
//    revealed on the same timer, so live runs look identical to seed runs.
//    Any engine failure falls back silently to the seed months —
//    engineClient never throws into the render path.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type DemoScenario,
  type ScenarioMonth,
  buildScenarioSummary,
} from "../data/demo-scenarios.js";
import {
  type BacktestSource,
  newReportId,
  saveBacktestResult,
} from "../utils/backtest-store.js";
import { engineClient } from "../services/engineClient.js";
import { ENGINE_VERSION } from "../config/engine.js";

export type BacktestStage =
  | "idle"
  | "fetching_weather"
  | "modeling"
  | "reconciling"
  | "complete"
  | "error";

export interface BacktestProgressState {
  stage: BacktestStage;
  message: string;
  revealed: ScenarioMonth[];
  progressPct: number;
  etaSeconds: number;
  runningCapacityFactor: number; // percent, over revealed months
  source: BacktestSource;
}

interface Timings {
  weatherMs: number;
  monthMs: number;
  reconcileMs: number;
}

const DEFAULT_TIMINGS: Timings = {
  weatherMs: 800,
  monthMs: 600,
  reconcileMs: 700,
};
const REDUCED_TIMINGS: Timings = {
  weatherMs: 150,
  monthMs: 100,
  reconcileMs: 150,
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function runningCapacityFactorPct(
  revealed: ScenarioMonth[],
  capacityKwDc: number,
): number {
  if (revealed.length === 0 || capacityKwDc <= 0) return 0;
  const kwh = revealed.reduce((s, m) => s + m.expected_kwh, 0);
  const hours = revealed.reduce((s, m) => s + daysInMonth(m.month) * 24, 0);
  return Math.round((kwh / (capacityKwDc * hours)) * 1000) / 10;
}

const IDLE_STATE: BacktestProgressState = {
  stage: "idle",
  message: "",
  revealed: [],
  progressPct: 0,
  etaSeconds: 0,
  runningCapacityFactor: 0,
  source: "seed",
};

export function useBacktestProgress(scenario: DemoScenario): {
  state: BacktestProgressState;
  start: () => void;
  reset: () => void;
} {
  const [state, setState] = useState<BacktestProgressState>(IDLE_STATE);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const runningRef = useRef(false);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      if (runningRef.current) fn();
    }, ms);
    timersRef.current.push(t);
  }, []);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    clearTimers();

    const timings = prefersReducedMotion()
      ? REDUCED_TIMINGS
      : DEFAULT_TIMINGS;
    const seedMonths = scenario.months;
    const capacity = scenario.intake.capacity_kw_dc;
    const totalMs =
      timings.weatherMs +
      seedMonths.length * timings.monthMs +
      timings.reconcileMs;

    setState({
      ...IDLE_STATE,
      stage: "fetching_weather",
      message: `Fetching NASA POWER satellite irradiance for ${scenario.location_label}…`,
      etaSeconds: Math.ceil(totalMs / 1000),
    });

    // Live-engine attempt: kicked off immediately; resolved months (if any)
    // replace the seed table before the reveal loop reads each index.
    let months: ScenarioMonth[] = seedMonths;
    let source: BacktestSource = "seed";
    if (engineClient.isConfigured()) {
      const first = seedMonths[0]?.month ?? "2024-01";
      const last = seedMonths[seedMonths.length - 1]?.month ?? "2024-12";
      void engineClient
        .getExpectedGeneration({
          latitude: scenario.intake.latitude,
          longitude: scenario.intake.longitude,
          capacity_kw_dc: capacity,
          tilt_deg: scenario.intake.tilt_deg,
          azimuth_deg: scenario.intake.azimuth_deg,
          module_efficiency: scenario.intake.module_efficiency,
          system_losses: scenario.intake.system_losses,
          degradation_rate: scenario.intake.degradation_rate,
          commissioning_date: scenario.intake.commissioning_date,
          start_date: `${first}-01`,
          end_date: `${last}-${daysInMonth(last)}`,
        })
        .then((res) => {
          if (!res || !runningRef.current) return;
          // Deviations stay from the seed table (live runs have no metered
          // data — the simulated inverter overlay is a labeled demo device).
          months = res.monthly_breakdown.map((m, i) => {
            const dev = seedMonths[i]?.deviation_pct ?? 0;
            return {
              month: m.month,
              ghi_kwh_m2: seedMonths[i]?.ghi_kwh_m2 ?? 0,
              expected_kwh: Math.round(m.expected_kwh),
              inverter_kwh: Math.round(m.expected_kwh * (1 + dev / 100)),
              deviation_pct: dev,
              status: "verified" as const,
            };
          });
          source = "live-engine";
        });
    }

    const revealMonth = (index: number) => {
      const revealed = months.slice(0, index + 1);
      const monthLabel = revealed[index].month;
      setState({
        stage: "modeling",
        message: `Running pvlib ModelChain · ${monthLabel}`,
        revealed,
        progressPct: Math.round(
          ((timings.weatherMs + (index + 1) * timings.monthMs) / totalMs) *
            100,
        ),
        etaSeconds: Math.ceil(
          ((months.length - index - 1) * timings.monthMs +
            timings.reconcileMs) /
            1000,
        ),
        runningCapacityFactor: runningCapacityFactorPct(revealed, capacity),
        source,
      });
    };

    for (let i = 0; i < seedMonths.length; i++) {
      schedule(
        () => revealMonth(i),
        timings.weatherMs + (i + 1) * timings.monthMs,
      );
    }

    schedule(
      () => {
        setState((prev) => ({
          ...prev,
          stage: "reconciling",
          message: "Reconciling against tolerance bands…",
          progressPct: 97,
          etaSeconds: Math.ceil(timings.reconcileMs / 1000),
        }));
      },
      timings.weatherMs + seedMonths.length * timings.monthMs + 10,
    );

    schedule(() => {
      runningRef.current = false;
      const summary = buildScenarioSummary(months, capacity);
      saveBacktestResult({
        scenario_id: scenario.id,
        project_name: scenario.intake.project_name,
        intake: scenario.intake,
        months,
        summary,
        source,
        engine_version: ENGINE_VERSION,
        generated_at: new Date().toISOString(),
        report_id: newReportId(scenario.id),
      });
      setState({
        stage: "complete",
        message: "Backtest complete",
        revealed: months,
        progressPct: 100,
        etaSeconds: 0,
        runningCapacityFactor: runningCapacityFactorPct(months, capacity),
        source,
      });
    }, totalMs);
  }, [scenario, clearTimers, schedule]);

  const reset = useCallback(() => {
    runningRef.current = false;
    clearTimers();
    setState(IDLE_STATE);
  }, [clearTimers]);

  return { state, start, reset };
}

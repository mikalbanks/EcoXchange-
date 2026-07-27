// Real-time backtest progress visualization (Spec 1B): project map with a
// pulsing site pin, month-by-month bars filling in as each month is
// processed, a running capacity factor count-up, and an ETA line — no
// blank loading screens during the pitch demo.

import type { BacktestProgressState } from "../../hooks/useBacktestProgress.js";
import type { DemoScenario } from "../../data/demo-scenarios.js";
import { SiteMap } from "../map/SiteMap.js";
import { AnimatedNumber } from "../shared/AnimatedNumber.js";
import { formatMonthShort } from "../../utils/formatters.js";

interface Props {
  scenario: DemoScenario;
  state: BacktestProgressState;
}

function formatEta(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const STAGE_LABEL: Record<BacktestProgressState["stage"], string> = {
  idle: "READY",
  fetching_weather: "FETCHING SATELLITE IRRADIANCE",
  modeling: "RUNNING PVLIB MODELCHAIN",
  reconciling: "RECONCILING TOLERANCE BANDS",
  complete: "BACKTEST COMPLETE",
  error: "ERROR",
};

export function BacktestProgressPanel({ scenario, state }: Props) {
  const slots = scenario.months.length;
  const maxKwh = Math.max(...scenario.months.map((m) => m.expected_kwh), 1);

  return (
    <div className="space-y-5" data-testid="backtest-progress-panel">
      <SiteMap
        latitude={scenario.intake.latitude}
        longitude={scenario.intake.longitude}
      />

      {/* Stage + ETA line */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-textMuted">
          {STAGE_LABEL[state.stage]}
          {state.stage === "modeling" && state.revealed.length > 0
            ? ` · ${formatMonthShort(
                `${state.revealed[state.revealed.length - 1].month}-01`,
              ).toUpperCase()} ${state.revealed[
                state.revealed.length - 1
              ].month.slice(0, 4)}`
            : ""}
        </p>
        {state.stage !== "complete" && state.stage !== "idle" ? (
          <p className="font-mono text-xs text-textMuted tabular-nums">
            ETA {formatEta(state.etaSeconds)}
          </p>
        ) : null}
      </div>

      {/* Thin progress bar */}
      <div
        className="h-1.5 w-full bg-paleGreen/50"
        role="progressbar"
        aria-valuenow={state.progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-accentBrt transition-all duration-500 ease-out"
          style={{ width: `${state.progressPct}%` }}
        />
      </div>

      {/* Month-by-month bars */}
      <div className="overflow-x-auto">
        <div className="flex h-36 min-w-[420px] items-end gap-1.5 sm:gap-2">
          {Array.from({ length: slots }, (_, i) => {
            const revealed = state.revealed[i];
            const heightPct = revealed
              ? Math.max(8, (revealed.expected_kwh / maxKwh) * 100)
              : 6;
            return (
              <div
                key={scenario.months[i].month}
                className="flex flex-1 flex-col items-center justify-end gap-1 self-stretch"
              >
                <div
                  className={`w-full transition-all duration-500 ease-out ${
                    revealed ? "bg-accentBrt" : "bg-paleGreen/60"
                  }`}
                  style={{ height: `${heightPct}%` }}
                  title={
                    revealed
                      ? `${revealed.month}: ${Math.round(
                          revealed.expected_kwh / 1000,
                        ).toLocaleString()} MWh expected`
                      : undefined
                  }
                />
                <span className="font-mono text-[10px] text-textMuted">
                  {formatMonthShort(`${scenario.months[i].month}-01`).charAt(0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Running stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-textMuted">
            Months processed
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-darkBg tabular-nums">
            {state.revealed.length}/{slots}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-textMuted">
            Running capacity factor
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-darkBg tabular-nums">
            {state.revealed.length > 0 ? (
              <AnimatedNumber
                value={state.runningCapacityFactor}
                duration={400}
                format={(n) => `${n.toFixed(1)}%`}
              />
            ) : (
              "—"
            )}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs uppercase tracking-wide text-textMuted">
            Data source
          </p>
          <p className="mt-1 font-mono text-sm text-darkBg">
            {state.source === "live-engine"
              ? "pvlib engine (live)"
              : "NASA POWER · pvlib ModelChain"}
          </p>
        </div>
      </div>

      <p className="text-xs text-textMuted">{state.message}</p>
    </div>
  );
}

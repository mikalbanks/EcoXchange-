// Guided demo flow entry (Spec 1A/1B): pick a realistic reference project,
// hit Run Demo, and watch the 12-month backtest fill in month by month —
// the "let me show you what this looks like for a project similar to
// yours" moment in a pitch meeting. Works with zero backends; upgrades to
// the live pvlib engine transparently when VITE_ENGINE_URL is set.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Zap } from "lucide-react";
import {
  DEMO_SCENARIO_LIST,
  DEMO_SCENARIOS,
  type DemoScenario,
  type DemoScenarioId,
} from "../../data/demo-scenarios.js";
import { useBacktestProgress } from "../../hooks/useBacktestProgress.js";
import { BacktestProgressPanel } from "../../components/developer/BacktestProgressPanel.js";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { SectionTag } from "../../components/ui/SectionTag.js";

function ScenarioCard({
  scenario,
  onRun,
  disabled,
}: {
  scenario: DemoScenario;
  onRun: () => void;
  disabled: boolean;
}) {
  return (
    <Card variant="bordered" padding="standard" className="flex flex-col">
      <p className="font-heading text-lg text-darkBg">{scenario.label}</p>
      <p className="mt-1 text-sm text-textMuted">{scenario.tagline}</p>
      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex items-center gap-2 text-textDark">
          <MapPin className="h-3.5 w-3.5 text-medGreen" aria-hidden />
          {scenario.location_label}
        </div>
        <div className="flex items-center gap-2 text-textDark">
          <Zap className="h-3.5 w-3.5 text-medGreen" aria-hidden />
          {(scenario.intake.capacity_kw_dc / 1000).toLocaleString()} MW DC ·{" "}
          {scenario.summary.capacity_factor_pct.toFixed(1)}% CF
        </div>
      </dl>
      <p className="mt-2 font-mono text-xs text-textMuted">
        {scenario.intake.offtake_type === "ppa"
          ? "PPA"
          : "Community Solar"}
        {scenario.state_program ? ` · ${scenario.state_program}` : ""}
        {" · $"}
        {scenario.intake.ppa_rate_per_kwh?.toFixed(3)}/kWh
      </p>
      <div className="mt-4 flex-1" />
      <Button
        variant="accent"
        size="md"
        className="w-full min-h-[44px]"
        onClick={onRun}
        disabled={disabled}
        data-testid={`run-demo-${scenario.id}`}
      >
        Run Demo
      </Button>
    </Card>
  );
}

export function RunDemo() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<DemoScenarioId | null>(null);
  const scenario = selectedId
    ? DEMO_SCENARIOS[selectedId]
    : DEMO_SCENARIOS.savannah_5mw;
  const { state, start, reset } = useBacktestProgress(scenario);

  // start() must run against the newly selected scenario, so selection and
  // start are split across a render.
  useEffect(() => {
    if (selectedId && state.stage === "idle") start();
  }, [selectedId, state.stage, start]);

  useEffect(() => {
    if (state.stage !== "complete") return;
    const t = setTimeout(() => navigate("/developer/demo/results"), 700);
    return () => clearTimeout(t);
  }, [state.stage, navigate]);

  const running = selectedId !== null && state.stage !== "idle";

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <SectionTag>GUIDED DEMO</SectionTag>
        <h1 className="font-heading text-3xl text-darkBg">
          Run a 12-Month Production Backtest
        </h1>
        <p className="mt-2 max-w-2xl text-textMuted">
          Pick a reference project similar to yours. We run pvlib ModelChain
          against NASA POWER satellite data for the exact coordinates — no
          hardware required, no data entry.
        </p>
      </div>

      {!running ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_SCENARIO_LIST.map((s) => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              disabled={running}
              onRun={() => {
                reset();
                setSelectedId(s.id);
              }}
            />
          ))}
        </div>
      ) : (
        <Card variant="bordered" padding="spacious">
          <SectionTag>BACKTEST IN PROGRESS</SectionTag>
          <h2 className="mb-4 font-heading text-xl text-darkBg">
            {scenario.label}
          </h2>
          <BacktestProgressPanel scenario={scenario} state={state} />
        </Card>
      )}

      <p className="text-xs text-textMuted">
        Estimates use pvlib ModelChain v2.0.0 with NASA POWER satellite
        irradiance for the project coordinates. Results are modeled, not
        measured; see the methodology note on the results page.
      </p>
    </div>
  );
}

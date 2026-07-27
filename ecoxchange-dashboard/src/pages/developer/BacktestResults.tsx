// The "So What" results summary (Spec 1C). One scrollable page that answers
// the developer's three questions after the demo backtest:
//   1. Does this platform actually understand my project?  (generation stats)
//   2. How much will this save me vs. traditional capital?  (cost comparison)
//   3. What happens next?                                   (LOI CTA)

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, RefreshCcw } from "lucide-react";
import {
  loadBacktestResult,
  type StoredBacktestResult,
} from "../../utils/backtest-store.js";
import { StatCard } from "../../components/StatCard.js";
import { AnimatedNumber } from "../../components/shared/AnimatedNumber.js";
import { LazyMount } from "../../components/shared/LazyMount.js";
import { ChartSkeleton } from "../../components/Skeleton.js";
import { SavingsBarChart } from "../../components/developer/SavingsBarChart.js";
import { CostComparisonTable } from "../../components/onboarding/CostComparisonTable.js";
import { DataSourceAttribution } from "../../compliance/components/DataSourceAttribution.js";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { SectionTag } from "../../components/ui/SectionTag.js";
import { SPEC_COST } from "../../utils/cost-comparison.js";
import { palette } from "../../config/palette.js";
import { formatMonthShort } from "../../utils/formatters.js";

function monthShort(month: string): string {
  return formatMonthShort(`${month}-01`);
}

function TimeToCapitalStrip() {
  // Proportional bars: 3–9 months (midpoint 26 weeks) vs 2–6 weeks
  // (midpoint 4) on a shared weeks scale.
  const scaleWeeks = 39; // 9 months
  return (
    <div className="space-y-4" data-testid="time-to-capital">
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-sm text-textDark">Traditional Reg D</span>
          <span className="font-mono text-sm font-bold text-darkBg">
            {SPEC_COST.timeToCapital.traditional}
          </span>
        </div>
        <div className="h-3 w-full bg-paleGreen/30">
          <div
            className="h-full bg-darkBg/70"
            style={{ width: `${(26 / scaleWeeks) * 100}%` }}
          />
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-sm text-textDark">EcoXchange</span>
          <span className="font-mono text-sm font-bold text-medGreen">
            {SPEC_COST.timeToCapital.ecoxchange}
          </span>
        </div>
        <div className="h-3 w-full bg-paleGreen/30">
          <div
            className="h-full bg-accentBrt"
            style={{ width: `${(4 / scaleWeeks) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function BacktestResults() {
  const navigate = useNavigate();
  const [result] = useState<StoredBacktestResult | null>(() =>
    loadBacktestResult(),
  );

  useEffect(() => {
    if (!result) navigate("/developer/demo", { replace: true });
  }, [result, navigate]);

  const chartRows = useMemo(
    () =>
      (result?.months ?? []).map((m) => ({
        month: monthShort(m.month),
        mwh: Math.round(m.expected_kwh / 100) / 10,
      })),
    [result],
  );

  if (!result) return null;

  const { summary } = result;

  return (
    <div className="space-y-12 animate-fade-in" data-testid="backtest-results">
      {/* ── Q1: Does this platform understand my project? ─────────────── */}
      <section>
        <SectionTag>BACKTEST RESULTS</SectionTag>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl text-darkBg">
              {result.project_name}
            </h1>
            <p className="mt-1 text-sm text-textMuted">
              12-month production backtest · Run {result.report_id}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 bg-darkBg px-3 py-1.5 font-mono text-xs text-paleGreen">
            <span
              className={`h-2 w-2 rounded-full ${
                result.source === "live-engine"
                  ? "bg-accentBrt"
                  : "bg-paleGreen"
              }`}
              aria-hidden
            />
            {result.source === "live-engine" ? "LIVE ENGINE" : "REFERENCE DATA"}{" "}
            · {result.engine_version}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Annual Expected Generation"
            value={
              <AnimatedNumber
                value={summary.annual_mwh}
                format={(n) => `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} MWh`}
                startOnView
              />
            }
            sublabel="P50 satellite-modeled"
          />
          <StatCard
            label="Capacity Factor"
            value={
              <AnimatedNumber
                value={summary.capacity_factor_pct}
                format={(n) => `${n.toFixed(1)}%`}
                startOnView
              />
            }
            sublabel="DC nameplate basis"
          />
          <StatCard
            label="Seasonal Ratio"
            value={
              <AnimatedNumber
                value={summary.seasonal_ratio}
                format={(n) => `${n.toFixed(2)}×`}
                startOnView
              />
            }
            sublabel={`Peak ${monthShort(summary.best_month.month)} · Low ${monthShort(summary.worst_month.month)}`}
          />
        </div>

        <Card variant="bordered" padding="standard" className="mt-6">
          <h2 className="font-heading text-lg text-darkBg">
            Seasonal Production Profile
          </h2>
          <div className="mt-3 h-64 w-full">
            <LazyMount placeholder={<ChartSkeleton />}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartRows}
                  margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
                >
                  <CartesianGrid
                    stroke={palette.paleGreen}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: palette.textMuted, fontSize: 11 }}
                    stroke={palette.textMuted}
                  />
                  <YAxis
                    tick={{ fill: palette.textMuted, fontSize: 11 }}
                    stroke={palette.textMuted}
                    width={44}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value} MWh`, "Expected"]}
                    contentStyle={{
                      border: `1px solid ${palette.paleGreen}`,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="mwh" fill={palette.medGreen} />
                </BarChart>
              </ResponsiveContainer>
            </LazyMount>
          </div>
          <DataSourceAttribution
            sources={[
              {
                name: "NASA POWER",
                type: "satellite",
                dateRange: `${monthShort(result.months[0].month)} ${result.months[0].month.slice(0, 4)} – ${monthShort(result.months[result.months.length - 1].month)} ${result.months[result.months.length - 1].month.slice(0, 4)}`,
              },
              { name: "pvlib ModelChain", type: "model" },
            ]}
            engineVersion={result.engine_version}
            isEstimate
            sourceMode={result.source === "live-engine" ? "live" : "cached"}
          />
          <p className="mt-3 text-sm text-textMuted">
            This estimate uses pvlib ModelChain v2.0.0 against NASA POWER
            satellite data for your exact coordinates. No hardware required.
          </p>
        </Card>
      </section>

      {/* ── Q2: How much will this save me? ───────────────────────────── */}
      <section>
        <SectionTag>COST COMPARISON</SectionTag>
        <h2 className="font-heading text-2xl text-darkBg">
          Traditional Capital vs. EcoXchange
        </h2>
        <Card variant="bordered" padding="spacious" className="mt-4">
          <SavingsBarChart />
        </Card>
        <div className="mt-4">
          <CostComparisonTable />
        </div>
        <Card variant="flat" padding="standard" className="mt-4">
          <h3 className="font-heading text-lg text-darkBg">Time to Capital</h3>
          <div className="mt-3">
            <TimeToCapitalStrip />
          </div>
        </Card>
      </section>

      {/* ── Q3: What happens next? ────────────────────────────────────── */}
      <section>
        <SectionTag>NEXT STEP</SectionTag>
        <Card variant="dark" padding="spacious">
          <h2 className="font-heading text-2xl text-cream">
            Sign a non-binding Letter of Intent
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-lightGreen">
            Pre-populated with your project details and this backtest. Download
            as a branded PDF or send it to your team.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="accent"
              size="lg"
              className="min-h-[44px]"
              onClick={() => navigate("/developer/loi")}
              data-testid="loi-cta"
            >
              Generate Letter of Intent
              <ArrowRight className="ml-2 inline h-4 w-4" aria-hidden />
            </Button>
            <Link
              to="/developer/demo"
              className="inline-flex min-h-[44px] items-center gap-2 border border-lightGreen/40 px-6 text-sm uppercase tracking-wider text-lightGreen transition-colors duration-150 hover:text-cream"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden />
              Run another scenario
            </Link>
          </div>
          <p className="mt-4 text-xs text-lightGreen/80">
            This LOI is non-binding and costs you nothing. It signals your
            intent to list this project on EcoXchange when the platform
            launches.
          </p>
        </Card>
      </section>
    </div>
  );
}

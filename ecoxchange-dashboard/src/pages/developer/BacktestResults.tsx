// Release 1 developer results: production evidence and methodology only.
// Commercial terms, transaction execution, and document generation remain
// outside the public pilot path.

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
import { RefreshCcw } from "lucide-react";
import {
  loadBacktestResult,
  type StoredBacktestResult,
} from "../../utils/backtest-store.js";
import { StatCard } from "../../components/StatCard.js";
import { AnimatedNumber } from "../../components/shared/AnimatedNumber.js";
import { LazyMount } from "../../components/shared/LazyMount.js";
import { ChartSkeleton } from "../../components/Skeleton.js";
import { DataSourceAttribution } from "../../compliance/components/DataSourceAttribution.js";
import { Card } from "../../components/ui/Card.js";
import { SectionTag } from "../../components/ui/SectionTag.js";
import { palette } from "../../config/palette.js";
import { formatMonthShort } from "../../utils/formatters.js";
import { SAVANNAH_VERIFICATION_HISTORY } from "../../data/demo-verification.js";
import { DegradationCurve } from "../../components/developer/DegradationCurve.js";
import { VerificationTimeline } from "../../components/verification/VerificationTimeline.js";
import { FlagReasonCard } from "../../components/verification/FlagReasonCard.js";
import { ReconciliationDiagram } from "../../components/ReconciliationDiagram.js";
import type { VerificationRecord } from "../../utils/types.js";

function monthShort(month: string): string {
  return formatMonthShort(`${month}-01`);
}

export function BacktestResults() {
  const navigate = useNavigate();
  const [result] = useState<StoredBacktestResult | null>(() =>
    loadBacktestResult(),
  );
  const [selectedVerification, setSelectedVerification] =
    useState<VerificationRecord | null>(null);
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

      {/* ── Degradation intelligence (Spec 6) ─────────────────────────── */}
      <section>
        <SectionTag>DEGRADATION INTELLIGENCE</SectionTag>
        <h2 className="font-heading text-2xl text-darkBg">
          How Output Evolves Over the Asset Life
        </h2>
        <Card variant="bordered" padding="standard" className="mt-4">
          <DegradationCurve
            commissioningDate={result.intake.commissioning_date}
            annualMwhYear1={summary.annual_mwh}
          />
        </Card>
      </section>

      {/* ── What ongoing verification looks like (Spec 3 preview) ─────── */}
      <section>
        <SectionTag>ONGOING VERIFICATION</SectionTag>
        <h2 className="font-heading text-2xl text-darkBg">
          What 12 Months of Operation Look Like
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-textMuted">
          This simulated reference scenario compares fixture-backed inverter,
          utility, and satellite series to illustrate the review thresholds.
          It is not an independent operating record and no distribution or
          other transaction is attached.
        </p>
        <Card variant="bordered" padding="standard" className="mt-4">
          <VerificationTimeline
            records={SAVANNAH_VERIFICATION_HISTORY}
            selectedPeriod={selectedVerification?.period_start ?? null}
            onSelect={(r) =>
              setSelectedVerification((prev) =>
                prev?.period_start === r.period_start ? null : r,
              )
            }
          />
        </Card>
        {selectedVerification ? (
          <div
            key={selectedVerification.period_start}
            className="mt-4 space-y-4"
          >
            <ReconciliationDiagram
              record={selectedVerification}
              animate
              showFlagReasons={selectedVerification.status !== "flagged"}
            />
            {selectedVerification.status === "flagged" ? (
              <FlagReasonCard record={selectedVerification} />
            ) : null}
          </div>
        ) : null}
      </section>

      {/* ── Q3: What happens next? ────────────────────────────────────── */}
      <section>
        <SectionTag>NEXT STEP</SectionTag>

        <Card variant="dark" padding="spacious">
          <h2 className="font-heading text-2xl text-cream">
            Continue with a technical pilot-fit review
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-lightGreen">
            Review the modeled production profile, source requirements, and
            secure data-access plan with the project team. This public demo does
            not create a financing application, quote, or legal document.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/developer/demo"
              className="inline-flex min-h-[44px] items-center gap-2 border border-lightGreen/40 px-6 text-sm uppercase tracking-wider text-lightGreen transition-colors duration-150 hover:text-cream"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden />
              Run another scenario
            </Link>
          </div>
          <p className="mt-4 text-xs text-lightGreen/80">
            A non-binding LOI may be discussed separately after pilot fit is
            confirmed and appropriate counsel has reviewed the language.
          </p>
        </Card>
      </section>
    </div>
  );
}

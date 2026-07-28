import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionTag } from "../ui/SectionTag.js";
import { SliderInput } from "../calculator/SliderInput.js";
import { YieldDisclosure } from "../../compliance/components/YieldDisclosure.js";
import { ProjectionDisclosure } from "../../compliance/components/ProjectionDisclosure.js";
import { DataSourceAttribution } from "../../compliance/components/DataSourceAttribution.js";
import { DEMO_OFFERING } from "../../data/demo-offering.js";
import { computeProForma, type ProFormaInputs } from "../../utils/proforma.js";
import { palette } from "../../config/palette.js";
import { ENGINE_VERSION } from "../../config/engine.js";
import { formatUsd } from "../../utils/formatters.js";

const DEBOUNCE_MS = 100;

function compactUsd(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

/**
 * Project-level pro-forma calculator for Savannah 5MW (Spec: distribution
 * sim, Part 4). Distinct from the portfolio ReturnsCalculator (/investor/
 * calculator): this models PPA revenue x production x escalator for one
 * project, with the 30% ITC pass-through toggle. Every output is a modeled
 * estimate and carries the Spec 07 disclosure marks.
 */
export function YieldCalculator() {
  const [inputs, setInputs] = useState<ProFormaInputs>({
    // Opens on the canonical demo position so the calculator's first render
    // agrees with the Portfolio and distribution figures on screen.
    investmentUsd: DEMO_OFFERING.demo_investor.position_value_usd,
    holdingPeriodYears: 20,
    includeItc: true,
  });
  const [applied, setApplied] = useState(inputs);

  // Debounce slider drags so the chart re-renders at most every 100ms.
  useEffect(() => {
    const t = setTimeout(() => setApplied(inputs), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [inputs]);

  const out = useMemo(() => computeProForma(applied), [applied]);

  const chartData = out.series.map((p) => ({
    label: `Yr ${p.year}`,
    withItc: p.cumulativeWithItc,
    withoutItc: p.cumulativeWithoutItc,
    sp500: p.sp500Reference,
  }));

  return (
    <section className="border border-darkBg/10 bg-white p-5 sm:p-6" aria-label="Yield calculator">
      <SectionTag>Yield Calculator</SectionTag>
      <h2 className="font-heading text-2xl text-darkBg">Projected Returns</h2>
      <p className="mt-1 text-sm text-textMuted">
        Savannah Community Solar 5MW · $0.085/kWh PPA · 2.0% annual escalator ·{" "}
        <YieldDisclosure value="modeled" type="yield_rate" basis="modeled">
          modeled estimates
        </YieldDisclosure>
      </p>

      <div className="mt-5 grid gap-5 sm:max-w-xl">
        <SliderInput
          label="Investment Amount"
          value={inputs.investmentUsd}
          min={10_000}
          max={250_000}
          step={5_000}
          format="currency"
          onChange={(v) => setInputs((prev) => ({ ...prev, investmentUsd: v }))}
        />
        <SliderInput
          label="Holding Period"
          value={inputs.holdingPeriodYears}
          min={5}
          max={25}
          step={1}
          format="years"
          onChange={(v) => setInputs((prev) => ({ ...prev, holdingPeriodYears: v }))}
        />
        <label className="flex items-center gap-2.5 text-sm text-darkBg">
          <input
            type="checkbox"
            checked={inputs.includeItc}
            onChange={(e) => setInputs((prev) => ({ ...prev, includeItc: e.target.checked }))}
            className="h-4 w-4 accent-medGreen"
            data-testid="itc-toggle"
          />
          Include 30% ITC pass-through
        </label>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="border border-darkBg/10 bg-cream/60 p-4" data-testid="calc-monthly">
          <p className="font-mono text-xl font-semibold tabular-nums text-darkBg">
            <YieldDisclosure
              value={formatUsd(out.monthlyDistribution, true)}
              type="cash_distribution"
              basis="modeled"
            />
          </p>
          <p className="mt-1 text-xs text-textMuted">Monthly Distribution</p>
        </div>
        <div className="border border-darkBg/10 bg-cream/60 p-4" data-testid="calc-yield">
          <p className="font-mono text-xl font-semibold tabular-nums text-darkBg">
            <YieldDisclosure
              value={`${out.annualCashYieldPct.toFixed(1)}%`}
              type="yield_rate"
              basis="modeled"
            />
          </p>
          <p className="mt-1 text-xs text-textMuted">Annual Cash Yield</p>
        </div>
        <div className="border border-darkBg/10 bg-cream/60 p-4" data-testid="calc-irr">
          <p className="font-mono text-xl font-semibold tabular-nums text-darkBg">
            <ProjectionDisclosure context="Modeled IRR over the selected holding period — subject to risk factors">
              {out.netIrrPct.toFixed(1)}%
            </ProjectionDisclosure>
          </p>
          <p className="mt-1 text-xs text-textMuted">
            Net IRR {applied.includeItc ? "(w/ ITC)" : "(no ITC)"}
          </p>
        </div>
        <div className="border border-darkBg/10 bg-cream/60 p-4" data-testid="calc-tokens">
          <p className="font-mono text-xl font-semibold tabular-nums text-darkBg">
            {out.tokenCount.toLocaleString("en-US")} ESN
          </p>
          <p className="mt-1 text-xs text-textMuted">
            Tokens Received · {out.ownershipPct.toFixed(1)}% ownership
          </p>
        </div>
      </div>

      <div className="mt-6 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="withItcFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.accentBrt} stopOpacity={0.35} />
                <stop offset="100%" stopColor={palette.accentBrt} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={palette.paleGreen} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: palette.textMuted, fontSize: 11 }}
              stroke={palette.textMuted}
              interval={Math.max(0, Math.floor(chartData.length / 10) - 1)}
            />
            <YAxis
              tick={{ fill: palette.textMuted, fontSize: 11 }}
              stroke={palette.textMuted}
              tickFormatter={compactUsd}
              width={56}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatUsd(value), name]}
              contentStyle={{
                borderRadius: 0,
                border: `1px solid ${palette.paleGreen}`,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {applied.includeItc ? (
              <Area
                type="monotone"
                dataKey="withItc"
                name="Cumulative (with ITC)"
                stroke={palette.medGreen}
                strokeWidth={2}
                fill="url(#withItcFill)"
                animationDuration={600}
              />
            ) : null}
            <Area
              type="monotone"
              dataKey="withoutItc"
              name="Cumulative (without ITC)"
              stroke={palette.lightGreen}
              strokeWidth={2}
              fill={palette.paleGreen}
              fillOpacity={0.4}
              animationDuration={600}
            />
            <Area
              type="monotone"
              dataKey="sp500"
              name="S&P 500 ref. (10% hist. avg)"
              stroke={palette.textMuted}
              strokeDasharray="5 4"
              fill="none"
              animationDuration={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-textMuted">
        S&amp;P 500 reference uses the ~10% historical average and is an imperfect comparison —
        different risk, liquidity, and tax profiles. Projections are modeled estimates, not
        investment advice, and are subject to the risk factors in the offering documents.
      </p>

      <DataSourceAttribution
        sources={[
          { name: "2024 verified production (demo dataset)", type: "model" },
          { name: "Pro-forma PPA economics (modeled)", type: "model" },
        ]}
        engineVersion={ENGINE_VERSION}
      />
    </section>
  );
}

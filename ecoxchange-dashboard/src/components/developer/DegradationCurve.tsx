// Degradation curve intelligence (Spec 6): the industry-standard linear
// model vs EcoXchange's NREL-informed piecewise model over the asset
// life, with a "you are here" marker at the system's current age and a
// summary card quantifying the difference.

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { palette } from "../../config/palette.js";
import {
  buildDegradationCurves,
  linearDegradationFactor,
  piecewiseNrelDegradationFactor,
  yearsSince,
} from "../../utils/degradation.js";
import { Card } from "../ui/Card.js";

interface Props {
  commissioningDate: string; // YYYY-MM-DD
  /** Year-1 annual production, for translating the factor gap into MWh. */
  annualMwhYear1?: number;
  ppaRate?: number; // $/kWh, for the $ translation
}

const HORIZON_YEARS = 30;

export function DegradationCurve({
  commissioningDate,
  annualMwhYear1,
  ppaRate,
}: Props) {
  const points = useMemo(() => buildDegradationCurves(HORIZON_YEARS), []);
  const age = yearsSince(commissioningDate);
  const showAge = age > 0 && age <= HORIZON_YEARS;

  const linear25 = linearDegradationFactor(25);
  const piecewise25 = piecewiseNrelDegradationFactor(25);

  // Cumulative 25-year output under each model (sum of yearly factors).
  const { cumLinear, cumPiecewise } = useMemo(() => {
    let l = 0;
    let p = 0;
    for (let y = 1; y <= 25; y++) {
      l += linearDegradationFactor(y - 0.5);
      p += piecewiseNrelDegradationFactor(y - 0.5);
    }
    return { cumLinear: l, cumPiecewise: p };
  }, []);
  const cumDeltaPct = ((cumPiecewise - cumLinear) / cumLinear) * 100;
  const deltaMwh =
    annualMwhYear1 != null ? (cumPiecewise - cumLinear) * annualMwhYear1 : null;

  return (
    <div className="space-y-4" data-testid="degradation-curve">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 8, right: 16, bottom: 4, left: 4 }}
          >
            <CartesianGrid
              stroke={palette.paleGreen}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              type="number"
              domain={[0, HORIZON_YEARS]}
              tickCount={7}
              tick={{ fill: palette.textMuted, fontSize: 11 }}
              stroke={palette.textMuted}
              label={{
                value: "Years since commissioning",
                position: "insideBottom",
                offset: -2,
                fill: palette.textMuted,
                fontSize: 11,
              }}
            />
            <YAxis
              domain={[0.75, 1.0]}
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
              tick={{ fill: palette.textMuted, fontSize: 11 }}
              stroke={palette.textMuted}
              width={44}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${(value * 100).toFixed(1)}% of nameplate`,
                name === "linear"
                  ? "Linear (industry standard)"
                  : "Piecewise (EcoXchange)",
              ]}
              labelFormatter={(year) => `Year ${year}`}
              contentStyle={{
                border: `1px solid ${palette.paleGreen}`,
                fontSize: 12,
              }}
            />
            <Legend
              formatter={(value: string) =>
                value === "linear"
                  ? "Linear (industry standard)"
                  : "Piecewise NREL (EcoXchange)"
              }
              wrapperStyle={{ fontSize: 11 }}
            />
            {showAge ? (
              <ReferenceLine
                x={age}
                stroke={palette.darkBg}
                strokeDasharray="4 4"
                label={{
                  value: "You are here",
                  position: "top",
                  fill: palette.darkBg,
                  fontSize: 11,
                }}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="linear"
              stroke={palette.lightGreen}
              strokeDasharray="6 4"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="piecewise"
              stroke={palette.medGreen}
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <Card variant="flat" padding="standard">
        <dl className="grid grid-cols-1 gap-3 font-mono text-xs sm:grid-cols-3">
          <div>
            <dt className="uppercase tracking-wide text-textMuted">
              Linear model · year 25
            </dt>
            <dd className="mt-1 text-lg font-bold text-darkBg tabular-nums">
              {(linear25 * 100).toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide text-textMuted">
              Piecewise model · year 25
            </dt>
            <dd className="mt-1 text-lg font-bold text-darkBg tabular-nums">
              {(piecewise25 * 100).toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide text-textMuted">
              25-yr cumulative Δ
            </dt>
            <dd className="mt-1 text-lg font-bold text-darkBg tabular-nums">
              {cumDeltaPct > 0 ? "+" : ""}
              {cumDeltaPct.toFixed(1)}%
              {deltaMwh != null ? (
                <span className="ml-1 text-xs font-normal text-textMuted">
                  ({deltaMwh > 0 ? "+" : ""}
                  {Math.round(deltaMwh).toLocaleString()} MWh
                  {ppaRate != null
                    ? ` · ${deltaMwh > 0 ? "+" : "-"}$${Math.abs(Math.round(deltaMwh * 1000 * ppaRate)).toLocaleString()}`
                    : ""}
                  )
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-textMuted">
          The industry-standard linear model misses light-induced degradation
          (LID) in year one and applies a single rate for the full asset
          life. The piecewise model — informed by NREL's meta-analysis of
          11,000+ degradation measurements (Jordan et al. 2016; Jordan &
          Kurtz 2013; IEC TS 63209:2021) — front-loads the LID drop, then
          slows mid-life, giving more accurate year-by-year expected
          generation.
        </p>
      </Card>
    </div>
  );
}

import { useMemo, useState } from "react";
import { SectionTag } from "../ui/SectionTag.js";
import { SliderInput } from "../calculator/SliderInput.js";
import { DataSourceAttribution } from "../../compliance/components/DataSourceAttribution.js";
import { computeCostComparison } from "../../utils/cost-comparison.js";
import { formatUsd } from "../../utils/formatters.js";

/**
 * Interactive traditional-vs-EcoXchange cost calculator (differentiation
 * spec §3): the developer moves the raise slider and watches the savings
 * band update. Distinct from the static CostComparisonTable on the backtest
 * report — this one is the live sales tool on the onboarding page.
 */
export function CostComparison() {
  const [equityRaise, setEquityRaise] = useState(2_500_000);
  const result = useMemo(() => computeCostComparison(equityRaise), [equityRaise]);

  return (
    <section
      className="border border-darkBg/10 bg-white p-5 sm:p-6"
      aria-label="Cost comparison calculator"
      data-testid="cost-comparison"
    >
      <SectionTag>Cost Comparison</SectionTag>
      <h2 className="font-heading text-2xl text-darkBg">Traditional vs. EcoXchange</h2>
      <p className="mt-1 text-sm text-textMuted">
        See how EcoXchange compares to traditional Reg D placement
      </p>

      <div className="mt-5 sm:max-w-md">
        <SliderInput
          label="Target Equity Raise"
          value={equityRaise}
          min={500_000}
          max={5_000_000}
          step={50_000}
          format="currency"
          onChange={setEquityRaise}
        />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-darkBg/10 text-left font-mono text-[10px] uppercase tracking-wider text-textMuted">
              <th className="py-2 pr-3 font-medium">Cost Item</th>
              <th className="py-2 pr-3 text-right font-medium">Traditional</th>
              <th className="py-2 text-right font-medium">EcoXchange</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-darkBg/5">
            {result.lines.map((line) => (
              <tr key={line.label}>
                <td className="py-2.5 pr-3 text-darkBg">{line.label}</td>
                <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-textMuted">
                  {formatUsd(line.traditional)}
                </td>
                <td className="py-2.5 text-right font-mono tabular-nums">
                  {line.ecoxchange === 0 ? (
                    <span className="font-sans font-medium text-medGreen">
                      {line.zeroLabel}
                    </span>
                  ) : (
                    <span className="text-darkBg">{formatUsd(line.ecoxchange)}</span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-darkBg/20 text-[15px] font-semibold">
              <td className="py-3 pr-3 font-mono text-[11px] uppercase tracking-wider text-darkBg">
                Total (first year)
              </td>
              <td
                className="py-3 pr-3 text-right font-mono tabular-nums text-darkBg"
                data-testid="traditional-total"
              >
                {formatUsd(result.traditionalTotal)}
              </td>
              <td
                className="py-3 text-right font-mono tabular-nums text-medGreen"
                data-testid="ecoxchange-total"
              >
                {formatUsd(result.ecoxchangeTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        className="mt-5 border border-accentBrt/50 bg-accentBrt/15 px-5 py-4"
        data-testid="savings-band"
      >
        <p className="font-mono text-lg font-semibold tabular-nums text-darkBg">
          Your savings: {formatUsd(result.savings)} ({result.savingsPct}%)
        </p>
        <p className="mt-1 text-sm text-darkBg/80">
          Plus: 4–6 week close vs. 3–9 months traditional
        </p>
      </div>

      <p className="mt-3 text-[11px] text-textMuted">
        Estimates based on industry benchmarks; subject to actual deal terms and securities
        counsel review.
      </p>
      <DataSourceAttribution
        sources={[
          { name: "SEIA / LBNL soft-cost benchmarks", type: "public_data" },
          { name: "EcoXchange standard terms", type: "model" },
        ]}
        isEstimate
      />
    </section>
  );
}

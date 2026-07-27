// Cost breakdown table for report page 4. Line items come from the
// centralized computeCostComparison() model so the table recalculates
// when the project's equity raise differs from $2.5M — no hardcoded fees.

import type { VerificationReportModel } from "../report-utils/report-model.js";
import { SPEC_COST } from "../../utils/cost-comparison.js";
import { formatUsd } from "../../utils/formatters.js";

export function ReportCostTable({
  model,
}: {
  model: VerificationReportModel;
}) {
  const { cost } = model;

  return (
    <table className="w-full border-collapse font-mono text-[10px]">
      <thead>
        <tr className="bg-darkBg text-white">
          <th className="px-3 py-2 text-left font-normal uppercase tracking-wide">
            Item
          </th>
          <th className="px-3 py-2 text-right font-normal uppercase tracking-wide">
            Traditional
          </th>
          <th className="px-3 py-2 text-right font-normal uppercase tracking-wide">
            EcoXchange
          </th>
        </tr>
      </thead>
      <tbody>
        {cost.lines.map((line, i) => (
          <tr
            key={line.label}
            className={i % 2 === 1 ? "bg-cream" : "bg-white"}
          >
            <td className="px-3 py-1.5 text-textDark">{line.label}</td>
            <td className="px-3 py-1.5 text-right tabular-nums text-textDark">
              {formatUsd(line.traditional)}
            </td>
            <td className="px-3 py-1.5 text-right tabular-nums text-medGreen">
              {line.ecoxchange > 0
                ? formatUsd(line.ecoxchange)
                : (line.zeroLabel ?? "Included")}
            </td>
          </tr>
        ))}
        <tr className={cost.lines.length % 2 === 1 ? "bg-cream" : "bg-white"}>
          <td className="px-3 py-1.5 text-textDark">Time to capital</td>
          <td className="px-3 py-1.5 text-right text-textDark">
            {SPEC_COST.timeToCapital.traditional}
          </td>
          <td className="px-3 py-1.5 text-right text-medGreen">
            {SPEC_COST.timeToCapital.ecoxchange}
          </td>
        </tr>
        <tr className="border-t-2 border-darkBg bg-white font-bold">
          <td className="px-3 py-2 text-textDark">
            ALL-IN YEAR 1 ({formatUsd(model.equityRaiseUsd)} raise)
          </td>
          <td className="px-3 py-2 text-right tabular-nums text-textDark">
            {formatUsd(SPEC_COST.traditionalLowUsd)}–
            {formatUsd(SPEC_COST.traditionalHighUsd)}
          </td>
          <td className="px-3 py-2 text-right tabular-nums text-medGreen">
            ~{formatUsd(model.allInYear1Usd)}
          </td>
        </tr>
        <tr className="bg-cream font-bold">
          <td className="px-3 py-2 text-textDark">10-YEAR SAVINGS</td>
          <td className="px-3 py-2" />
          <td className="px-3 py-2 text-right text-medGreen">
            {SPEC_COST.lifetimeSavingsLabel}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

import { SPEC_COST } from "../../utils/cost-comparison.js";

interface Row {
  label: string;
  traditional: string;
  ecoxchange: string;
  savings: string;
}

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const ROWS: Row[] = [
  {
    label: "All-in cost (Year 1, $2.5M raise)",
    traditional: `${usd(SPEC_COST.traditionalLowUsd)}–${usd(SPEC_COST.traditionalHighUsd)}`,
    ecoxchange: `${usd(SPEC_COST.ecoxchangeUpfrontUsd)} origination`,
    savings: SPEC_COST.lifetimeSavingsLabel,
  },
  {
    label: "Time to capital",
    traditional: SPEC_COST.timeToCapital.traditional,
    ecoxchange: SPEC_COST.timeToCapital.ecoxchange,
    savings: "—",
  },
  {
    label: "Ongoing annual admin",
    traditional: "$25,000–$40,000/yr",
    ecoxchange: `${usd(SPEC_COST.ecoxchangeAnnualUsd)}/yr platform fee`,
    savings: "—",
  },
];

export function CostComparisonTable() {
  return (
    <div className="bg-white rounded-lg border border-paleGreen/60 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-paleGreen/40 text-textMuted uppercase text-xs">
          <tr>
            <th className="px-4 py-3 text-left"></th>
            <th className="px-4 py-3 text-left">Traditional Reg D</th>
            <th className="px-4 py-3 text-left">EcoXchange</th>
            <th className="px-4 py-3 text-left">Savings</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-paleGreen/40">
          {ROWS.map((r) => (
            <tr key={r.label}>
              <td className="px-4 py-3 font-medium text-textDark">{r.label}</td>
              <td className="px-4 py-3 text-textDark">{r.traditional}</td>
              <td className="px-4 py-3 text-medGreen font-medium">
                {r.ecoxchange}
              </td>
              <td className="px-4 py-3 text-darkBg">{r.savings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

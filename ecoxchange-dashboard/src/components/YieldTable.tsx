import { Link } from "react-router-dom";
import type { VerificationRecord } from "../utils/types.js";
import { VerificationBadge } from "./VerificationBadge.js";
import { DataSourceAttribution } from "../compliance/components/DataSourceAttribution.js";
import { formatKwh, formatMonthLong, formatUsd } from "../utils/formatters.js";

interface Props {
  projectId: string;
  records: VerificationRecord[];
  investorSharePct?: number;
}

export function YieldTable({ projectId, records, investorSharePct = 2.0 }: Props) {
  const sorted = [...records].sort((a, b) =>
    b.period_start.localeCompare(a.period_start),
  );
  const share = investorSharePct / 100;
  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-paleGreen/60">
      <table className="min-w-full text-sm">
        <thead className="bg-paleGreen/40 text-textMuted uppercase text-xs">
          <tr>
            <th className="px-4 py-3 text-left">Month</th>
            <th className="px-4 py-3 text-right">Production</th>
            <th className="px-4 py-3 text-right">
              Investor Yield
              <sup
                className="ml-0.5 cursor-help text-[9px] normal-case"
                title="Modeled estimate — not a guarantee of future performance"
              >
                †
              </sup>
            </th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-paleGreen/40">
          {sorted.map((r) => (
            <tr key={r.period_start} className="hover:bg-cream/50">
              <td className="px-4 py-3 text-textDark">
                {formatMonthLong(r.period_start)}
              </td>
              <td className="px-4 py-3 text-right text-textDark">
                {formatKwh(r.inverter_kwh)}
              </td>
              <td className="px-4 py-3 text-right text-textDark">
                {formatUsd(r.estimated_revenue * share, true)}
              </td>
              <td className="px-4 py-3">
                <VerificationBadge
                  status={r.status}
                  size="sm"
                  deviations={{
                    inv_vs_expected_pct: r.inv_vs_expected_pct,
                    inv_vs_utility_pct: r.inv_vs_utility_pct,
                    util_vs_expected_pct: r.util_vs_expected_pct,
                  }}
                />
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/investor/project/${projectId}/verification/${r.period_start}`}
                  className="text-medGreen hover:text-darkBg font-medium"
                >
                  Detail →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 pb-3">
        <DataSourceAttribution
          sources={[
            { name: "EcoXchange Verification Engine", type: "model" },
            { name: "GA Power SREC Schedule", type: "public_data" },
          ]}
          isEstimate
        />
      </div>
    </div>
  );
}

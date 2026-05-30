import { Link } from "react-router-dom";
import type { VerificationRecord } from "../../data/types.js";
import {
  formatKwh,
  formatMonthShortMono,
  formatNullableUsd,
  formatPct,
} from "../../utils/formatters.js";
import { DEMO_ALLOCATION } from "../../utils/demo-config.js";
import { MetricLabel } from "../ui/MetricExplainer.js";

interface Props {
  projectId: string;
  records: VerificationRecord[];
}

const HEAD =
  "px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-tag text-white";
const CELL = "px-3 py-3 font-body text-[14px] text-eco-text-primary";

export function VerificationTable({ projectId, records }: Props) {
  const newestFirst = [...records].reverse();

  if (newestFirst.length === 0) {
    return (
      <div className="border border-eco-border bg-eco-pale/45 p-5">
        <p className="font-body text-[14px] text-eco-text-body">
          No verification records are connected for this project yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6 sm:mx-0" role="region" aria-label="Verification ledger table">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="bg-eco-dark">
            <th className={HEAD}>Month</th>
            <th className={`${HEAD} text-right`}>
              <MetricLabel metric="annual_production">Production</MetricLabel>
            </th>
            <th className={`${HEAD} text-right`}>
              <MetricLabel metric="expected_production">Expected</MetricLabel>
            </th>
            <th className={`${HEAD} text-right`}>
              <MetricLabel metric="deviation">Deviation</MetricLabel>
            </th>
            <th className={`${HEAD} text-right`}>
              <MetricLabel metric="distribution">Distribution</MetricLabel>
            </th>
            <th className={HEAD}>
              <MetricLabel metric="verification_status">Status</MetricLabel>
            </th>
            <th className={`${HEAD} text-right`}>Detail</th>
          </tr>
        </thead>
        <tbody>
          {newestFirst.map((record) => {
            const statusClass =
              record.status === "verified"
                ? "text-eco-verified"
                : record.status === "flagged"
                  ? "text-eco-flagged"
                  : "text-eco-text-muted";
            const distribution =
              record.status === "verified" && record.estimated_revenue !== null
                ? record.estimated_revenue *
                  (DEMO_ALLOCATION.investorSharePct / 100)
                : null;

            return (
              <tr
                key={record.period_start}
                className="border-b border-eco-border last:border-b-0 hover:bg-eco-pale/50 transition-colors duration-150"
              >
                <td className={`${CELL} font-mono uppercase tracking-tag text-[12px] text-eco-dark`}>
                  {formatMonthShortMono(record.period_start)}
                </td>
                <td className={`${CELL} text-right font-medium`}>
                  {formatKwh(record.inverter_kwh)}
                </td>
                <td className={`${CELL} text-right text-eco-text-body`}>
                  {formatKwh(record.expected_kwh)}
                </td>
                <td className={`${CELL} text-right font-mono tracking-tag text-[12px] ${statusClass}`}>
                  {formatPct(record.inv_vs_expected_pct)}
                </td>
                <td className={`${CELL} text-right`}>
                  {formatNullableUsd(distribution)}
                </td>
                <td className={CELL}>
                  <span className={`font-mono text-[10px] uppercase tracking-tag ${statusClass}`}>
                    {statusLabel(record.status)}
                  </span>
                </td>
                <td className={`${CELL} text-right`}>
                  <Link
                    to={`/project/${projectId}/verification/${record.period_start}`}
                    className="font-mono text-[11px] uppercase tracking-tag text-eco-mid hover:text-eco-dark transition-colors duration-150"
                  >
                    Detail -&gt;
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function statusLabel(status: VerificationRecord["status"]): string {
  if (status === "verified") return "Verified";
  if (status === "flagged") return "Flagged";
  if (status === "data_required") return "Data Required";
  return "Not Yet Verified";
}

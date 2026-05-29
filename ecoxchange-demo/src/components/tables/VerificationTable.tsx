import { Link } from "react-router-dom";
import type { VerificationRecord } from "../../data/types.js";
import {
  formatKwh,
  formatMonthShortMono,
  formatPct,
  formatUsd,
} from "../../utils/formatters.js";

interface Props {
  projectId: string;
  records: VerificationRecord[];
}

const HEAD = "px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-tag text-white";
const CELL = "px-3 py-3 font-body text-[14px] text-eco-text-primary";

export function VerificationTable({ projectId, records }: Props) {
  const newestFirst = [...records].reverse();
  return (
    <div className="overflow-x-auto -mx-6 sm:mx-0">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="bg-eco-dark">
            <th className={HEAD}>Month</th>
            <th className={`${HEAD} text-right`}>Production</th>
            <th className={`${HEAD} text-right`}>Expected</th>
            <th className={`${HEAD} text-right`}>Deviation</th>
            <th className={`${HEAD} text-right`}>Distribution</th>
            <th className={`${HEAD}`}>Status</th>
            <th className={`${HEAD} text-right`}>Detail</th>
          </tr>
        </thead>
        <tbody>
          {newestFirst.map((r) => {
            const flagged = r.status === "flagged";
            return (
              <tr
                key={r.period_start}
                className="border-b border-eco-border last:border-b-0 hover:bg-eco-pale/50 transition-colors duration-150"
              >
                <td className={`${CELL} font-mono uppercase tracking-tag text-[12px] text-eco-dark`}>
                  {formatMonthShortMono(r.period_start)}
                </td>
                <td className={`${CELL} text-right font-medium`}>
                  {formatKwh(r.inverter_kwh)}
                </td>
                <td className={`${CELL} text-right text-eco-text-body`}>
                  {formatKwh(r.expected_kwh)}
                </td>
                <td
                  className={`${CELL} text-right font-mono tracking-tag text-[12px] ${
                    flagged ? "text-eco-flagged" : "text-eco-verified"
                  }`}
                >
                  {formatPct(r.inv_vs_expected_pct)}
                </td>
                <td className={`${CELL} text-right`}>
                  {formatUsd(r.estimated_revenue * 0.02)}
                </td>
                <td className={CELL}>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-tag ${
                      flagged ? "text-eco-flagged" : "text-eco-verified"
                    }`}
                  >
                    {flagged ? "▲ Flagged" : "● Verified"}
                  </span>
                </td>
                <td className={`${CELL} text-right`}>
                  <Link
                    to={`/project/${projectId}/verification/${r.period_start}`}
                    className="font-mono text-[11px] uppercase tracking-tag text-eco-mid hover:text-eco-dark transition-colors duration-150"
                  >
                    Detail →
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

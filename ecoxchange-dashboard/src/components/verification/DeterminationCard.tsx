import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { VerificationBadge } from "../VerificationBadge.js";
import { Card } from "../ui/Card.js";
import { SectionTag } from "../ui/SectionTag.js";
import { formatMonthLong } from "../../utils/formatters.js";
import type { VerificationRecord } from "../../utils/types.js";

interface Props {
  projectId: string;
  record: VerificationRecord;
}

/**
 * The investor's first screen: what the monthly determination is, which sources
 * produced it, and — the part that actually matters to them — what it means for
 * their distribution.
 *
 * Every status states its distribution consequence in plain language. A badge
 * that says FLAGGED without saying "payment is on hold" is not information.
 */
export function DeterminationCard({ projectId, record }: Props) {
  const month = formatMonthLong(record.period_start);
  const flagged = record.status === "flagged";
  const pending = record.status === "pending";

  const heading = flagged
    ? `${month} production is flagged for review.`
    : pending
      ? `${month} production is pending verification.`
      : `${month} engine status is VERIFIED.`;

  const body = flagged
    ? "The available production inputs did not reconcile within the configured tolerance. Distribution processing is on hold while the discrepancy and each input's provenance are reviewed."
    : pending
      ? "One or more production inputs are unavailable for this period. Distribution processing begins once the determination completes."
      : "The available production inputs reconciled within the project's configured tolerance. Review the record's source provenance before treating the status as independent verification.";

  // Source legs read from the record itself rather than being asserted — a
  // missing utility read is a real state and has to show as one.
  const rows: Array<[string, string]> = [
    ["Inverter leg", record.inverter_kwh > 0 ? "Present" : "Unavailable"],
    ["Utility leg", record.utility_kwh != null ? "Present" : "Unavailable"],
    ["Expected model", record.expected_kwh > 0 ? "Complete" : "Incomplete"],
    ["Determination", record.status],
    [
      "Distribution eligibility",
      flagged ? "On hold" : pending ? "Pending" : "Released",
    ],
  ];

  return (
    <Card
      variant="bordered"
      padding="spacious"
      className={`border-l-4 ${flagged ? "!border-l-flagAmber" : "!border-l-accentBrt"}`}
      data-testid="determination-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionTag>Monthly Determination</SectionTag>
          <h2 className="font-heading text-2xl text-darkBg">{heading}</h2>
        </div>
        <VerificationBadge status={record.status} size="lg" />
      </div>

      <p className="mt-3 max-w-3xl text-sm text-textDark">{body}</p>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-textMuted">
              {label}
            </dt>
            <dd className="mt-0.5 text-sm font-medium capitalize text-darkBg">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <Link
        to={`/investor/project/${projectId}/verification/${record.period_start}`}
        className="mt-5 inline-flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wide text-medGreen underline-offset-2 hover:underline"
      >
        View verification record <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
}

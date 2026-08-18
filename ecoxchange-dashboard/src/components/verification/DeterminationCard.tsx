import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { VerificationBadge } from "../VerificationBadge.js";
import { Card } from "../ui/Card.js";
import { SectionTag } from "../ui/SectionTag.js";
import { formatMonthLong } from "../../utils/formatters.js";
import type { VerificationRecord } from "../../utils/types.js";
import { useData } from "../../context/DataContext.js";
import {
  describeDeterminationConsequence,
  describeTransactionPolicy,
  describeVerificationEvidence,
} from "../../data/index.js";

interface Props {
  projectId: string;
  record: VerificationRecord;
}

/**
 * The investor's first screen: what the monthly determination is, which sources
 * produced it, and whether any transaction consequence is actually attached.
 * Verification status must never imply a payment when the dataset has no
 * offering or distribution source.
 */
export function DeterminationCard({ projectId, record }: Props) {
  const { mode, scenario } = useData();
  const transactionPolicy = describeTransactionPolicy(mode, scenario, projectId);
  const month = formatMonthLong(record.period_start);
  const flagged = record.status === "flagged";
  const pending = record.status === "pending";

  const heading = flagged
    ? `${month} production is flagged for review.`
    : pending
      ? `${month} production is pending verification.`
      : `${month} engine status is VERIFIED.`;

  const evidence = describeVerificationEvidence(projectId, mode);
  const consequence = describeDeterminationConsequence(record.status, transactionPolicy);
  const statusBody = flagged
    ? "The available production inputs did not reconcile within the configured tolerance. Review the discrepancy and each input's provenance."
    : pending
      ? "One or more production inputs are unavailable for this period."
      : "The available production inputs reconciled within the project's configured tolerance. Review source provenance before treating the status as independent verification.";
  const transactionBody =
    transactionPolicy.state === "disabled"
      ? "This dataset has no offering or distribution attached, so the determination does not trigger a payment."
      : `Transaction consequence: ${consequence.toLowerCase()}.`;
  const body = `${statusBody} ${transactionBody}`;

  // Every determination names the source basis of each leg. A missing value is
  // still shown as unavailable rather than being promoted to a confident zero.
  const rows: Array<[string, string]> = [
    ["Inverter leg", record.inverter_kwh > 0 ? evidence.sourceNames.inverter : "Unavailable"],
    ["Utility leg", record.utility_kwh != null ? evidence.sourceNames.utility : "Unavailable"],
    ["Expected leg", record.expected_kwh > 0 ? evidence.sourceNames.satellite : "Unavailable"],
    ["Determination", record.status],
    ["Transaction consequence", consequence],
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

import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { useData } from "../../context/DataContext.js";
import { describeTransactionPolicy } from "../../data/index.js";
import type { TransactionPolicy } from "../../data/index.js";

interface BoundaryProps {
  surface: string;
  compact?: boolean;
  policy?: TransactionPolicy;
}

/**
 * Visible fail-closed state for any financial, legal, or settlement surface.
 * Verification data alone never implies that an offering or transaction exists.
 */
export function TransactionBoundaryNotice({
  surface,
  compact = false,
  policy,
}: BoundaryProps) {
  const { transactionPolicy } = useData();
  const activePolicy = policy ?? transactionPolicy;

  return (
    <section
      className="rounded-xl border border-flagAmber/40 bg-amber-50 p-5"
      data-testid="pilot-transaction-gate"
    >
      <div className="flex items-start gap-3">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-flagAmber" aria-hidden />
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-flagAmber">
            {activePolicy.badge}
          </p>
          <h2 className="mt-1 font-heading text-lg text-darkBg">
            {surface} unavailable in the primary pilot demo
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-textMuted">
            {activePolicy.description}
          </p>
          {!compact ? (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link className="font-medium text-medGreen hover:text-darkBg" to="/investor">
                Return to production verification
              </Link>
              <Link className="font-medium text-textMuted hover:text-darkBg" to="/demo">
                Open presenter controls
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

interface GateProps extends BoundaryProps {
  children: ReactNode;
  projectScoped?: boolean;
}

export function ReleaseOneBoundary({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-xl border border-flagAmber/40 bg-amber-50 p-5" data-testid="release-one-boundary">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-flagAmber">
        Outside Release 1
      </p>
      <h1 className="mt-1 font-heading text-2xl text-darkBg">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-textMuted">{description}</p>
      <Link className="mt-4 inline-block font-medium text-medGreen hover:text-darkBg" to="/investor">
        Return to the measured-production demo
      </Link>
    </section>
  );
}

/**
 * Allows fixture-backed transaction UX only after the presenter explicitly
 * selects the simulated Savannah stress scenario. All other modes fail closed.
 */
export function PilotTransactionGate({
  children,
  surface,
  projectScoped = false,
}: GateProps) {
  const { id } = useParams();
  const { mode, scenario, transactionPolicy } = useData();
  const activePolicy = projectScoped
    ? describeTransactionPolicy(mode, scenario, id)
    : transactionPolicy;

  if (activePolicy.state === "disabled") {
    return <TransactionBoundaryNotice surface={surface} policy={activePolicy} />;
  }

  return (
    <div className="space-y-6" data-testid="simulated-transaction-surface">
      <section className="border border-flagAmber/40 bg-flagAmber/10 px-4 py-3 text-sm text-darkBg">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-flagAmber">
          {activePolicy.badge}
        </span>{" "}
        — {activePolicy.description}
      </section>
      {children}
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Info, CheckCircle2 } from "lucide-react";
import { DripToggle } from "./DripToggle.js";
import { DistributionConfirmModal } from "./DistributionConfirmModal.js";
import {
  updateDistributionPreference,
  DEMO_INVESTOR_ID,
} from "../../data/distributions.js";
import { formatUsd } from "../../utils/formatters.js";
import type { DistributionPref, InvestorHolding } from "../../types/distributions.js";

interface Props {
  holding: InvestorHolding;
  totalReceived: number;
}

export function DistributionCard({ holding, totalReceived }: Props) {
  const [pref, setPref] = useState<DistributionPref>(holding.current_preference);
  const [pending, setPending] = useState<DistributionPref | null>(null);
  const [toast, setToast] = useState(false);

  const estimatedMonthly =
    (holding.cost_basis * holding.target_annual_yield) / 12;

  function onSelect(next: DistributionPref) {
    if (next === pref) return;
    setPending(next); // open confirm modal
  }

  async function confirm() {
    const next = pending;
    if (!next) return;
    const prev = pref;
    setPref(next); // optimistic
    setPending(null);
    try {
      await updateDistributionPreference(DEMO_INVESTOR_ID, holding.offering_id, next);
      setToast(true);
      setTimeout(() => setToast(false), 2500);
    } catch {
      setPref(prev); // revert on failure
    }
  }

  return (
    <div className="rounded-xl border border-paleGreen/60 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-heading text-lg text-darkBg">{holding.offering_name}</h3>
        {toast ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-medGreen">
            <CheckCircle2 className="h-4 w-4" /> Preference updated
          </span>
        ) : null}
      </div>
      <p className="text-sm text-textMuted">
        {holding.tokens_held} tokens · {formatUsd(holding.cost_basis)} invested
      </p>

      <div className="mt-3 border-t border-paleGreen/50 pt-3 text-sm">
        <span className="text-textMuted">Monthly Distribution: </span>
        <span className="font-mono font-semibold text-darkBg">
          ~{formatUsd(estimatedMonthly, true)} USDC
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-textMuted">
          Distribution Preference
        </div>
        <DripToggle value={pref} onSelect={onSelect} />
      </div>

      {pref === "reinvest" ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-paleGreen/30 px-3 py-2 text-xs text-darkBg">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-medGreen" />
          Preference saved — DRIP activation is pending on-chain reinvestment. Until
          then, distributions continue as cash out.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-paleGreen/50 pt-3">
        <div className="text-sm">
          <span className="text-textMuted">Total Distributions Received: </span>
          <span className="font-mono font-semibold text-darkBg">
            {formatUsd(totalReceived, true)}
          </span>
        </div>
        <Link
          to="/investor/distributions"
          className="inline-flex items-center gap-1 text-sm font-medium text-medGreen hover:text-darkBg"
        >
          View Distribution History <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <DistributionConfirmModal
        open={pending !== null}
        offeringName={holding.offering_name}
        from={pref}
        to={pending ?? pref}
        estimatedMonthly={estimatedMonthly}
        onCancel={() => setPending(null)}
        onConfirm={confirm}
      />
    </div>
  );
}

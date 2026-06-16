import { createPortal } from "react-dom";
import { formatUsd } from "../../utils/formatters.js";
import type { DistributionPref } from "../../types/distributions.js";

interface Props {
  open: boolean;
  offeringName: string;
  from: DistributionPref;
  to: DistributionPref;
  estimatedMonthly: number;
  onCancel: () => void;
  onConfirm: () => void;
}

const LABEL: Record<DistributionPref, string> = {
  cash_out: "Cash Out",
  reinvest: "Reinvest (DRIP)",
};

export function DistributionConfirmModal({
  open,
  offeringName,
  from,
  to,
  estimatedMonthly,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading text-xl text-darkBg">
          Confirm Distribution Preference Change
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-darkBg">
          You are switching your <strong>{offeringName}</strong> distributions from{" "}
          <strong>{LABEL[from]}</strong> to <strong>{LABEL[to]}</strong>.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-textMuted">
          {to === "reinvest" ? (
            <>
              Starting with your next distribution (~{formatUsd(estimatedMonthly, true)}),
              your USDC payout will automatically purchase additional ESN tokens at
              the current token price.
            </>
          ) : (
            <>
              Starting with your next distribution (~{formatUsd(estimatedMonthly, true)}),
              your payout will be sent as USDC to your wallet.
            </>
          )}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-textMuted">
          This change takes effect for the next distribution cycle. You can switch
          back at any time.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-paleGreen px-4 py-2 text-sm font-medium text-darkBg hover:bg-cream"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-medGreen px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-darkBg"
          >
            Confirm Change
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

import type { ReactNode } from "react";

export type YieldType =
  | "cash_distribution"
  | "irr"
  | "yield_rate"
  | "cumulative_return";

export type YieldBasis = "modeled" | "backtest" | "projected" | "actual";

interface YieldDisclosureProps {
  /** The formatted yield value, e.g. "$354" or "8.5%" — rendered if no children. */
  value: string;
  type: YieldType;
  basis: YieldBasis;
  children?: ReactNode;
}

const BASIS_LABEL: Record<YieldBasis, string> = {
  modeled: "Modeled estimate",
  backtest: "Backtest result",
  projected: "Forward-looking projection",
  actual: "Verified actual",
};

/**
 * Wraps any yield / return / income figure with a dagger (†) superscript that
 * carries the basis disclosure. The page-level DisclaimerFooter renders the
 * matching † legend. Inline <sup> at 9px so wrapping causes no layout shift.
 */
export function YieldDisclosure({ value, basis, children }: YieldDisclosureProps) {
  const basisLabel = BASIS_LABEL[basis];
  return (
    <span className="relative inline-block">
      {children ?? value}
      <sup
        className="text-[9px] ml-0.5 cursor-help text-textMuted"
        title={`${basisLabel} — not a guarantee of future performance`}
        aria-label={`${basisLabel}, not guaranteed`}
      >
        †
      </sup>
    </span>
  );
}

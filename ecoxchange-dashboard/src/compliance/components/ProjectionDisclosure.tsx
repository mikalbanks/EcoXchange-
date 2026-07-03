import type { ReactNode } from "react";

interface ProjectionDisclosureProps {
  children: ReactNode;
  /** Additional context, e.g. "Based on 2024 backtest data". */
  context?: string;
}

/**
 * Wraps any forward-looking statement (IRR projections, timeline estimates,
 * growth forecasts) with a double-dagger (‡) superscript. The page-level
 * DisclaimerFooter renders the matching ‡ legend.
 */
export function ProjectionDisclosure({ children, context }: ProjectionDisclosureProps) {
  return (
    <span className="relative">
      {children}
      <span
        className="text-[9px] align-super ml-0.5 cursor-help text-textMuted"
        title={context ?? "Forward-looking statement — subject to risk factors"}
        aria-label="Forward-looking statement, subject to risk factors"
      >
        ‡
      </span>
    </span>
  );
}

// Horizontal cost-comparison bars (Spec 1C): the savings gap between
// traditional Reg D capital formation and EcoXchange, shown visually —
// not just as a table. CSS-only width animation on first viewport entry
// (house rule: no framer-motion).

import { useEffect, useRef, useState } from "react";
import { SPEC_COST } from "../../utils/cost-comparison.js";
import { AnimatedNumber } from "../shared/AnimatedNumber.js";
import { formatUsd } from "../../utils/formatters.js";

function useInView(): { ref: React.RefObject<HTMLDivElement>; inView: boolean } {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

const SCALE_MAX = SPEC_COST.traditionalHighUsd;

export function SavingsBarChart() {
  const { ref, inView } = useInView();
  const pct = (n: number) => (inView ? (n / SCALE_MAX) * 100 : 0);

  return (
    <div ref={ref} className="space-y-5" data-testid="savings-bar-chart">
      {/* Traditional Reg D — solid to the low bound, hatched range band to the high */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-textDark">
            Traditional Reg D 506(c)
          </span>
          <span className="font-mono text-sm font-bold text-darkBg tabular-nums">
            <AnimatedNumber
              value={SPEC_COST.traditionalLowUsd}
              format={(n) => formatUsd(n)}
              startOnView
            />
            {"–"}
            <AnimatedNumber
              value={SPEC_COST.traditionalHighUsd}
              format={(n) => formatUsd(n)}
              startOnView
            />
          </span>
        </div>
        <div className="flex h-8 w-full bg-paleGreen/30">
          <div
            className="h-full bg-darkBg transition-all duration-1000 ease-out"
            style={{ width: `${pct(SPEC_COST.traditionalLowUsd)}%` }}
          />
          <div
            className="h-full transition-all duration-1000 ease-out"
            style={{
              width: `${pct(SPEC_COST.traditionalHighUsd - SPEC_COST.traditionalLowUsd)}%`,
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(27,77,53,0.55) 0 6px, rgba(27,77,53,0.25) 6px 12px)",
            }}
            title="Range: varies with counsel, placement, and marketing costs"
          />
        </div>
        <p className="mt-1 text-xs text-textMuted">
          All-in first year: counsel, placement, marketing, admin
        </p>
      </div>

      {/* EcoXchange */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-textDark">EcoXchange</span>
          <span className="font-mono text-sm font-bold text-medGreen tabular-nums">
            <AnimatedNumber
              value={SPEC_COST.ecoxchangeUpfrontUsd}
              format={(n) => formatUsd(n)}
              startOnView
            />{" "}
            + {formatUsd(SPEC_COST.ecoxchangeAnnualUsd)}/yr
          </span>
        </div>
        <div className="h-8 w-full bg-paleGreen/30">
          <div
            className="h-full bg-accentBrt transition-all duration-1000 ease-out"
            style={{ width: `${pct(SPEC_COST.ecoxchangeUpfrontUsd)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-textMuted">
          Origination at close + annual platform fee
        </p>
      </div>

      <p className="border-l-2 border-accentBrt bg-paleGreen/20 px-3 py-2 font-mono text-xs text-darkBg">
        SAVINGS: {SPEC_COST.lifetimeSavingsLabel}
      </p>
    </div>
  );
}

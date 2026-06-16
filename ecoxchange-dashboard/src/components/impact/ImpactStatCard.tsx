import type { ReactNode } from "react";
import { AnimatedNumber } from "../shared/AnimatedNumber.js";

interface Props {
  icon: ReactNode; // emoji or lucide icon
  value: number;
  format: (n: number) => string;
  label: string;
  unit?: string;
  animate?: boolean;
}

// A single environmental-equivalency metric card.
export function ImpactStatCard({
  icon,
  value,
  format,
  label,
  unit,
  animate = true,
}: Props) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-paleGreen/60 bg-white p-5 text-center shadow-sm">
      <div className="text-3xl" aria-hidden="true">
        {icon}
      </div>
      <div className="mt-2 font-mono text-2xl font-bold text-darkBg tabular-nums sm:text-3xl">
        {animate ? <AnimatedNumber value={value} format={format} /> : format(value)}
      </div>
      <div className="mt-1 text-sm font-medium text-darkBg">{label}</div>
      {unit ? <div className="text-xs text-textMuted">{unit}</div> : null}
    </div>
  );
}

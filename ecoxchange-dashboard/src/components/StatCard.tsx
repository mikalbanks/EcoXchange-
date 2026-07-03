import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  sublabel?: string;
}

export function StatCard({ label, value, sublabel }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-paleGreen/60 p-4 sm:p-5 min-h-[72px] transition-transform transition-shadow duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <div className="text-xs uppercase tracking-wide text-textMuted">{label}</div>
      <div className="mt-2 font-mono text-[22px] sm:text-3xl font-bold text-darkBg tabular-nums">
        {value}
      </div>
      {sublabel ? (
        <div className="mt-1 text-sm text-textMuted">{sublabel}</div>
      ) : null}
    </div>
  );
}

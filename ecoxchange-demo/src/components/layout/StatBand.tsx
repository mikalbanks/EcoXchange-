import type { ReactNode } from "react";
import { MetricLabel, type MetricKey } from "../ui/MetricExplainer.js";

export interface StatItem {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  metric?: MetricKey;
}

interface Props {
  stats: StatItem[];
}

export function StatBand({ stats }: Props) {
  return (
    <section className="bg-eco-stat-band text-white">
      <div className="mx-auto max-w-site px-6 sm:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-tag text-eco-text-light">
                {s.metric ? (
                  <MetricLabel metric={s.metric}>{s.label}</MetricLabel>
                ) : (
                  s.label
                )}
              </p>
              <p className="font-body text-eco-lime text-[36px] sm:text-[42px] leading-none">
                {s.value}
              </p>
              {s.sublabel ? (
                <p className="font-body text-[13px] text-eco-text-light">
                  {s.sublabel}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { AlertTriangle } from "lucide-react";

// Numbered list of plain-language risk factors.
export function RiskFactors({ risks }: { risks: string[] }) {
  if (risks.length === 0) return null;
  return (
    <ol className="space-y-3">
      {risks.map((risk, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-darkBg">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-flagAmber/15 text-[11px] font-semibold text-flagAmber">
            {i + 1}
          </span>
          <span>{risk}</span>
        </li>
      ))}
    </ol>
  );
}

export function RiskFactorsHeader() {
  return (
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-5 w-5 text-flagAmber" aria-hidden="true" />
      <span>Risk Factors</span>
    </div>
  );
}

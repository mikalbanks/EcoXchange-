import { AlertTriangle } from "lucide-react";

export function CalculatorDisclaimer() {
  return (
    <div className="flex gap-2 rounded-xl border border-paleGreen/50 bg-cream/50 p-4">
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0 text-flagAmber"
        aria-hidden="true"
      />
      <p className="font-mono text-[11px] leading-relaxed text-textMuted">
        Projections are illustrative only and do not guarantee future results.
        Actual returns depend on solar production, PPA performance, token
        appreciation, and market conditions. Benchmark figures use simplified
        constant-rate assumptions and are not forecasts. See the offering
        documents for complete risk disclosures.
      </p>
    </div>
  );
}

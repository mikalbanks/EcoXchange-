import { formatUsd } from "../../utils/formatters.js";

interface Props {
  esnValue: number;
  vsSp500: number;
  vsSavings: number;
  vsTips: number;
}

// Horizontal bar comparison of ending value: ESN solar vs S&P 500 / HYSA / TIPS.
export function BenchmarkComparison({
  esnValue,
  vsSp500,
  vsSavings,
  vsTips,
}: Props) {
  const rows = [
    { label: "EcoXchange Solar", value: esnValue, color: "bg-accentBrt", strong: true },
    { label: "S&P 500 (10%)", value: vsSp500, color: "bg-medGreen" },
    { label: "HYSA (4.5%)", value: vsSavings, color: "bg-lightGreen" },
    { label: "TIPS (2.5%)", value: vsTips, color: "bg-paleGreen" },
  ];
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-textMuted">
        vs Benchmarks
      </h4>
      <div className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-sm">
              <span className={r.strong ? "font-semibold text-darkBg" : "text-textMuted"}>
                {r.label}
              </span>
              <span className="font-mono tabular-nums text-darkBg">
                {formatUsd(r.value)}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-cream">
              <div
                className={`h-full rounded-full ${r.color}`}
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-textMuted">
        ESN solar income is backed by contracted PPA revenue with roughly 5%
        production volatility, versus the S&P 500's historical ~17.6%.
      </p>
    </div>
  );
}

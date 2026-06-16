import { usdCompact } from "./format.js";

interface Props {
  totalSubscribed: number;
  targetRaise: number;
}

// Funding progress bar: subscribed / target raise, with a clamped percentage.
export function FundingProgress({ totalSubscribed, targetRaise }: Props) {
  const ratio = targetRaise > 0 ? totalSubscribed / targetRaise : 0;
  const pct = Math.max(0, Math.min(1, ratio));
  const pctLabel = `${Math.round(pct * 100)}%`;

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-darkBg">{pctLabel} funded</span>
        <span className="text-textMuted">
          {usdCompact(totalSubscribed)} / {usdCompact(targetRaise)}
        </span>
      </div>
      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-paleGreen/50"
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Funding progress"
      >
        <div
          className="h-full rounded-full bg-accentBrt transition-all duration-500"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

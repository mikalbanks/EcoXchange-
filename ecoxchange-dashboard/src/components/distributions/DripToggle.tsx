import { Wallet, Repeat } from "lucide-react";
import type { DistributionPref } from "../../types/distributions.js";

interface Props {
  value: DistributionPref;
  onSelect: (pref: DistributionPref) => void;
  disabled?: boolean;
}

const OPTIONS: {
  key: DistributionPref;
  icon: typeof Wallet;
  title: string;
  desc: string;
}[] = [
  {
    key: "cash_out",
    icon: Wallet,
    title: "Cash Out to Wallet",
    desc: "USDC sent to your wallet monthly",
  },
  {
    key: "reinvest",
    icon: Repeat,
    title: "Reinvest (DRIP)",
    desc: "Auto-buy more ESN tokens monthly",
  },
];

// Cash Out | Reinvest radio pair.
export function DripToggle({ value, onSelect, disabled }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onSelect(opt.key)}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-150 disabled:opacity-60 ${
              active
                ? "border-medGreen bg-paleGreen/30 ring-1 ring-medGreen"
                : "border-paleGreen/60 bg-white hover:border-medGreen/60"
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                active ? "border-medGreen" : "border-paleGreen"
              }`}
            >
              {active ? <span className="h-2.5 w-2.5 rounded-full bg-medGreen" /> : null}
            </span>
            <span>
              <span className="flex items-center gap-1.5 font-medium text-darkBg">
                <Icon className="h-4 w-4 text-medGreen" />
                {opt.title}
              </span>
              <span className="mt-0.5 block text-xs text-textMuted">{opt.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

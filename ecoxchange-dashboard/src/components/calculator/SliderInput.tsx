import { useState } from "react";
import { formatUsd } from "../../utils/formatters.js";

export type SliderFormat = "currency" | "percent" | "years";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: SliderFormat;
  onChange: (value: number) => void;
}

// Percent values are stored as ratios (0.07) but shown/edited as "7.0%".
function display(value: number, format: SliderFormat): string {
  if (format === "currency") return formatUsd(value);
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  return `${value} ${value === 1 ? "year" : "years"}`;
}

function parse(raw: string, format: SliderFormat): number | null {
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return null;
  return format === "percent" ? n / 100 : n;
}

export function SliderInput({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const fillPct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-darkBg">{label}</label>
        <input
          type="text"
          inputMode="decimal"
          aria-label={label}
          value={editing ?? display(value, format)}
          onFocus={(e) => setEditing(e.target.value.replace(/[^0-9.]/g, ""))}
          onChange={(e) => {
            setEditing(e.target.value);
            const parsed = parse(e.target.value, format);
            if (parsed != null) onChange(clamp(parsed));
          }}
          onBlur={() => setEditing(null)}
          className="w-28 rounded-md border border-paleGreen bg-white px-2 py-1 text-right font-mono text-sm tabular-nums text-darkBg focus:border-medGreen focus:outline-none"
        />
      </div>
      <input
        type="range"
        className="eco-slider mt-2"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        style={{
          background: `linear-gradient(to right, #2E7D52 0%, #2E7D52 ${fillPct}%, #C8E8D4 ${fillPct}%, #C8E8D4 100%)`,
        }}
      />
    </div>
  );
}

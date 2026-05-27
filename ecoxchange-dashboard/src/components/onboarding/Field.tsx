import type { InputHTMLAttributes, ReactNode } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
  rightSlot?: ReactNode;
}

export function Field({ label, hint, error, rightSlot, className, ...rest }: Props) {
  return (
    <label className={`block ${className ?? ""}`}>
      <div className="text-xs uppercase tracking-wide text-textMuted mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <input
          {...rest}
          className="w-full rounded-md border border-paleGreen px-3 py-2 text-textDark bg-white outline-none focus:border-medGreen transition-colors duration-150"
        />
        {rightSlot}
      </div>
      {hint && !error ? (
        <div className="text-xs text-textMuted mt-1">{hint}</div>
      ) : null}
      {error ? (
        <div className="text-xs text-flagAmber mt-1">{error}</div>
      ) : null}
    </label>
  );
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  hint?: string;
}

export function Select({ label, value, onChange, options, hint }: SelectProps) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wide text-textMuted mb-1">
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-paleGreen px-3 py-2 text-textDark bg-white outline-none focus:border-medGreen transition-colors duration-150"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <div className="text-xs text-textMuted mt-1">{hint}</div> : null}
    </label>
  );
}

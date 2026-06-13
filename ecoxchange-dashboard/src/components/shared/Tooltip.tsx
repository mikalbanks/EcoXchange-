import { useState } from "react";
import type { ReactNode } from "react";

interface Props {
  label: ReactNode;
  children: ReactNode;
}

// Lightweight hover/focus tooltip — no dependency. Wraps an element and shows a
// small dark-green bubble on hover/focus. For chart tooltips we keep Recharts'
// own; this is for inline labels and icons.
export function Tooltip({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-darkBg px-2 py-1 text-xs text-white shadow-md"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

/** Uppercase monospace technical label, dot-separated by convention. */
export function MonoTag({ children, className = "" }: Props) {
  return (
    <span
      className={`font-mono text-[11px] sm:text-[12px] uppercase tracking-tag text-eco-olive ${className}`}
    >
      {children}
    </span>
  );
}

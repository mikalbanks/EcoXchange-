import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "accent";
type ButtonSize = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-darkBg text-cream hover:brightness-110",
  secondary: "border border-darkBg bg-transparent text-darkBg hover:bg-darkBg/5",
  ghost: "bg-transparent text-medGreen hover:text-darkBg",
  accent: "bg-accentBrt text-darkBg hover:brightness-105",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-6 text-sm",
  lg: "h-[52px] px-8 text-sm",
};

/**
 * Brand button (Spec 03 §6.1): rectangular (no radius), uppercase, tracked.
 * Hover lifts 1px; active settles; disabled at 40% opacity; loading swaps the
 * label for a spinner while preserving width.
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center rounded-none font-medium uppercase tracking-wider transition-all duration-200 hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      <span className={loading ? "invisible" : undefined}>{children}</span>
      {loading ? (
        <span
          aria-hidden
          className="absolute inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
    </button>
  );
}

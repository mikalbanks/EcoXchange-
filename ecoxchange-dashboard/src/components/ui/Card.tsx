import type { HTMLAttributes, ReactNode } from "react";

type CardVariant = "elevated" | "flat" | "bordered" | "dark";
type CardPadding = "compact" | "standard" | "spacious";

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  /** Adds the brand hover lift (-2px + shadow) for clickable cards. */
  interactive?: boolean;
  children: ReactNode;
}

const VARIANT: Record<CardVariant, string> = {
  elevated: "bg-white shadow-sm",
  flat: "bg-cream",
  bordered: "bg-white border border-darkBg/10",
  dark: "bg-darkBgSurface text-lightGreen",
};

const PADDING: Record<CardPadding, string> = {
  compact: "p-4",
  standard: "p-5",
  spacious: "p-7",
};

/**
 * Brand card (Spec 03 §6.2): rectangular (no radius). Interactive cards get
 * the standard hover lift (translateY(-2px) + soft brand shadow).
 */
export function Card({
  variant = "elevated",
  padding = "standard",
  interactive = false,
  children,
  className = "",
  ...rest
}: Props) {
  return (
    <div
      className={`rounded-none ${VARIANT[variant]} ${PADDING[padding]} ${
        interactive
          ? "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(27,77,53,0.08)] active:translate-y-0 active:shadow-none"
          : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

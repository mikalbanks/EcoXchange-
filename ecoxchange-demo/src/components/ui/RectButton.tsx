import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "olive";

interface CommonProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
  arrow?: boolean;
}

interface LinkProps extends CommonProps {
  to: string;
  href?: never;
  onClick?: never;
  type?: never;
}

interface AnchorProps extends CommonProps {
  href: string;
  to?: never;
  onClick?: never;
  type?: never;
}

interface ButtonProps extends CommonProps {
  onClick?: () => void;
  type?: "button" | "submit";
  to?: never;
  href?: never;
}

type Props = LinkProps | AnchorProps | ButtonProps;

const STYLES: Record<Variant, string> = {
  primary:
    "bg-eco-dark text-white border border-eco-dark hover:bg-eco-mid hover:border-eco-mid",
  secondary:
    "bg-white text-eco-dark border border-eco-dark hover:bg-eco-pale",
  olive:
    "bg-eco-cta-olive text-eco-dark border border-eco-cta-olive hover:brightness-95",
};

export function RectButton(props: Props) {
  const variant: Variant = props.variant ?? "primary";
  const classes =
    `inline-flex items-center justify-center gap-2 px-7 py-3 font-body text-[13px] font-medium uppercase tracking-cta transition-colors duration-150 ${STYLES[variant]} ${props.className ?? ""}`.trim();

  const content = (
    <>
      <span>{props.children}</span>
      {props.arrow ? <span aria-hidden>→</span> : null}
    </>
  );

  if ("to" in props && props.to) {
    return (
      <Link to={props.to} className={classes}>
        {content}
      </Link>
    );
  }
  if ("href" in props && props.href) {
    return (
      <a href={props.href} className={classes}>
        {content}
      </a>
    );
  }
  return (
    <button
      type={(props as ButtonProps).type ?? "button"}
      onClick={(props as ButtonProps).onClick}
      className={classes}
    >
      {content}
    </button>
  );
}

import { Link } from "react-router-dom";

interface Props {
  to: string;
  label: string;
}

export function BackLink({ to, label }: Props) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-tag text-eco-mid hover:text-eco-dark transition-colors duration-150"
    >
      <span aria-hidden>←</span>
      <span>{label}</span>
    </Link>
  );
}

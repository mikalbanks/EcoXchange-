import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface Props {
  title: string;
  message?: string;
  icon?: LucideIcon;
  cta?: { label: string; to: string };
}

export function EmptyState({ title, message, icon: Icon = Inbox, cta }: Props) {
  return (
    <div className="bg-white rounded-xl border border-paleGreen/60 p-10 text-center flex flex-col items-center gap-3">
      <div className="h-14 w-14 rounded-full bg-paleGreen/40 flex items-center justify-center">
        <Icon className="h-7 w-7 text-medGreen" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-xl text-darkBg">{title}</h3>
      {message ? (
        <p className="text-sm text-textMuted max-w-md">{message}</p>
      ) : null}
      {cta ? (
        <Link
          to={cta.to}
          className="mt-2 inline-flex items-center rounded-md bg-medGreen px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-darkBg"
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}

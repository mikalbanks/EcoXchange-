import type { Offering } from "../../types/offerings.js";

const STYLES: Record<Offering["status"], { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  coming_soon: { bg: "bg-paleGreen/50", text: "text-medGreen", label: "Coming Soon" },
  open: { bg: "bg-accentBrt/20", text: "text-darkBg", label: "Open" },
  fully_subscribed: { bg: "bg-paleGreen/60", text: "text-darkBg", label: "Fully Subscribed" },
  closed: { bg: "bg-gray-100", text: "text-gray-600", label: "Closed" },
};

export function OfferingStatusBadge({ status }: { status: Offering["status"] }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${s.bg} ${s.text}`}
    >
      {status === "open" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-accentBrt" />
      ) : null}
      {s.label}
    </span>
  );
}

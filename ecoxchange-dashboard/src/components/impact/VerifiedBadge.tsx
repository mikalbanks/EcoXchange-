import { ShieldCheck } from "lucide-react";

// Status-qualified badge. It deliberately does not claim source independence;
// the project verification record carries that evidence boundary.
export function VerifiedBadge({ size = "md" }: { size?: "sm" | "md" }) {
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-accentBrt/20 font-semibold uppercase tracking-wide text-darkBg ${pad}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-accentBrt opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accentBrt" />
      </span>
      <ShieldCheck className="h-4 w-4" />
      Engine-Qualified Periods
    </span>
  );
}

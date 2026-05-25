import type { VerificationStatus } from "../utils/types.js";

const styles: Record<
  VerificationStatus,
  { dot: string; bg: string; text: string; label: string }
> = {
  verified: {
    dot: "bg-accentBrt",
    bg: "bg-paleGreen/60",
    text: "text-darkBg",
    label: "VERIFIED",
  },
  flagged: {
    dot: "bg-flagAmber",
    bg: "bg-amber-50",
    text: "text-flagAmber",
    label: "FLAGGED",
  },
  pending: {
    dot: "bg-gray-400",
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: "PENDING",
  },
};

export function VerificationBadge({
  status,
  size = "md",
}: {
  status: VerificationStatus;
  size?: "sm" | "md";
}) {
  const s = styles[status];
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full ${padding} font-medium ${s.bg} ${s.text}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

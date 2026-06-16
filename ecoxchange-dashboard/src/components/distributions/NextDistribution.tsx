import { CalendarClock } from "lucide-react";
import { formatUsd } from "../../utils/formatters.js";

function prettyDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function NextDistribution({
  amount,
  date,
}: {
  amount: number;
  date: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-paleGreen/60 bg-paleGreen/30 px-5 py-4">
      <CalendarClock className="h-5 w-5 text-medGreen" />
      <div className="text-sm">
        <span className="text-textMuted">Next Distribution: </span>
        <span className="font-mono font-semibold text-darkBg">
          ~{formatUsd(amount, true)}
        </span>
        <span className="text-textMuted"> on {prettyDate(date)}</span>
      </div>
    </div>
  );
}

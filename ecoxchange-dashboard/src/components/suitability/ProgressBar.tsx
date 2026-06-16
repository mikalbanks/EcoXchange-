interface Props {
  current: number; // 1-based
  total: number;
  complete?: boolean;
}

// Step progress indicator (filled segments).
export function ProgressBar({ current, total, complete }: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors duration-200 ${
              complete || i < current ? "bg-accentBrt" : "bg-paleGreen/60"
            }`}
          />
        ))}
      </div>
      <span className="shrink-0 text-xs font-medium text-textMuted">
        {complete ? "Complete" : `Step ${current} of ${total}`}
      </span>
    </div>
  );
}

export type DataSourceType =
  | "satellite"
  | "utility"
  | "inverter"
  | "model"
  | "public_data";

export interface DataSource {
  /** e.g. "NASA POWER", "EIA-923", "SolarEdge API" */
  name: string;
  type: DataSourceType;
  /** e.g. "Jan 2024 – Dec 2024" */
  dateRange?: string;
}

interface DataSourceAttributionProps {
  sources: DataSource[];
  /** e.g. "v2.0.0" (verification engine version) */
  engineVersion?: string;
  /** Adds the "§ Methodology-documented estimate" prefix. */
  isEstimate?: boolean;
}

/**
 * Inline attribution line rendered below charts, tables, and verification
 * panels. Every data display must say where its numbers came from.
 */
export function DataSourceAttribution({
  sources,
  engineVersion,
  isEstimate,
}: DataSourceAttributionProps) {
  return (
    <div className="mt-2 pt-2 border-t border-darkBg/10">
      <p className="font-mono text-[10px] leading-relaxed tracking-[0.02em] text-textMuted">
        {isEstimate && (
          <span className="text-medGreen">
            § Methodology-documented estimate ·{" "}
          </span>
        )}
        Data:{" "}
        {sources.map((s, i) => (
          <span key={s.name}>
            {s.name}
            {s.dateRange && ` (${s.dateRange})`}
            {i < sources.length - 1 && " · "}
          </span>
        ))}
        {engineVersion && ` · Engine ${engineVersion}`}
      </p>
    </div>
  );
}

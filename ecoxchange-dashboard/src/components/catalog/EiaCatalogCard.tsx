import { MapPin } from "lucide-react";
import type { EiaCatalogEntry } from "../../types/catalog.js";
import { formatUsd, formatPct } from "../../utils/formatters.js";
import { isTargetCapacity } from "../../data/benchmark.js";

// Engine deviation badge: green within ±5%, amber within ±10%, neutral beyond.
function DeviationBadge({ plant }: { plant: EiaCatalogEntry }) {
  const cls = plant.within_5pct
    ? "bg-accentBrt/15 text-medGreen"
    : plant.within_10pct
      ? "bg-amber-100 text-amber-800"
      : "bg-gray-100 text-gray-600";
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums ${cls}`}
      title="EcoXchange engine deviation vs 2024 reported generation"
    >
      {formatPct(plant.deviation_pct)}
    </span>
  );
}

// Catalog tile for one real EIA plant, engine-verified.
export function EiaCatalogCard({ plant }: { plant: EiaCatalogEntry }) {
  const isTracking = plant.axis_type.toLowerCase().includes("tracking");
  return (
    <div
      data-testid="catalog-card"
      className="flex flex-col rounded-xl border border-paleGreen/60 bg-white p-5 shadow-sm transition-transform transition-shadow duration-150 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-base leading-snug text-darkBg">
          {plant.name}
        </h3>
        <DeviationBadge plant={plant} />
      </div>
      <p className="mt-1 flex items-center gap-1 text-sm text-textMuted">
        <MapPin className="h-3.5 w-3.5" />
        {plant.state} · {plant.latitude.toFixed(2)}, {plant.longitude.toFixed(2)}
      </p>
      {/* The catalog is a real EIA fleet sample, not a pipeline. Plants outside
          the 1–20 MW origination band are engine comparisons — labelled so they
          can't read as EcoXchange target projects. */}
      {!isTargetCapacity(plant.capacity_mw * 1000) ? (
        <span className="mt-2 self-start rounded-full border border-dashed border-paleGreen px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-textMuted">
          Comparison · outside 1–20 MW target
        </span>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-paleGreen/50 pt-4">
        <Mini label="Capacity" value={`${plant.capacity_mw.toFixed(1)} MW`} />
        <Mini
          label={isTracking ? "Axis" : "Tilt"}
          value={isTracking ? "Tracking" : `${plant.tilt_deg.toFixed(0)}°`}
        />
        <Mini label="CF (2024)" value={`${plant.actual_cf_pct.toFixed(1)}%`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Mini label="Indicative Value" value={formatUsd(plant.indicative_value_usd)} />
        <Mini
          label="Est. Annual Revenue"
          value={formatUsd(plant.implied_annual_revenue_usd)}
        />
      </div>

      <p className="mt-3 border-t border-paleGreen/40 pt-2 font-mono text-[10px] text-textMuted">
        EIA #{plant.eia_plant_id} · {plant.actual_mwh.toLocaleString("en-US")} MWh
        verified · {plant.commissioning_year}
      </p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-textMuted">
        {label}
      </div>
      <div className="font-mono text-sm font-bold text-darkBg tabular-nums">
        {value}
      </div>
    </div>
  );
}

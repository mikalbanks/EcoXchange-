import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { loadProject } from "../data/index.js";
import { ProductionChart } from "../components/ProductionChart.js";
import { StatCard } from "../components/StatCard.js";
import { VerificationBadge } from "../components/VerificationBadge.js";
import { YieldTable } from "../components/YieldTable.js";
import { formatKwh, formatMonthLong, formatPct } from "../utils/formatters.js";
import type { ProjectBundle } from "../utils/types.js";

export function ProjectDetail() {
  const { id = "" } = useParams();
  const [variant, setVariant] = useState<"verified" | "flagged">("verified");
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);

  useEffect(() => {
    setBundle(null);
    loadProject(id, { variant }).then(setBundle);
  }, [id, variant]);

  if (!bundle) return <div className="text-textMuted">Loading…</div>;

  const { project, verification_records: records, summary } = bundle;
  const latest = records[records.length - 1];
  const estIrr = ((summary.total_revenue_estimate * 0.6) / 50_000_000) * 100; // rough placeholder

  return (
    <div className="space-y-8">
      <Link to="/" className="inline-flex items-center gap-1 text-medGreen hover:text-darkBg">
        <ArrowLeft className="h-4 w-4" /> Back to Portfolio
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-darkBg">{project.name}</h1>
          <p className="text-textMuted mt-1">
            {project.location} ({project.latitude.toFixed(2)}°N, {Math.abs(project.longitude).toFixed(2)}°W) ·{" "}
            {project.capacity_kw.toLocaleString()} kW DC · {project.tilt_deg}° tilt ·{" "}
            <span className="capitalize">{project.offtake_type.replace("_", " ")}</span>
          </p>
        </div>
        <label className="inline-flex items-center gap-2 bg-white rounded-md border border-paleGreen/60 px-3 py-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={variant === "flagged"}
            onChange={(e) =>
              setVariant(e.target.checked ? "flagged" : "verified")
            }
            className="accent-medGreen"
          />
          Show Flagged (demo)
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-lg border border-paleGreen/60 p-5">
          <h2 className="font-heading text-xl text-darkBg mb-3">
            Monthly Production
          </h2>
          <ProductionChart records={records} />
        </div>

        <div className="bg-white rounded-lg border border-paleGreen/60 p-5 flex flex-col">
          <div className="text-xs uppercase tracking-wide text-textMuted">
            Most recent verification
          </div>
          <div className="mt-1 text-textDark">
            {formatMonthLong(latest.period_start)}
          </div>
          <div className="mt-2">
            <VerificationBadge status={latest.status} />
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Inverter" value={formatKwh(latest.inverter_kwh)} />
            <Row label="Utility" value={latest.utility_kwh !== null ? formatKwh(latest.utility_kwh) : "—"} />
            <Row label="Expected" value={formatKwh(latest.expected_kwh)} />
            <Row
              label="Deviation"
              value={formatPct(latest.inv_vs_expected_pct)}
            />
            <Row label="Tolerance" value="±15%" />
          </dl>
          <Link
            to={`/project/${project.id}/verification/${latest.period_start}`}
            className="mt-4 text-medGreen hover:text-darkBg font-medium text-sm"
          >
            Open verification detail →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Annual Output"
          value={`${summary.annual_production_mwh.toLocaleString()} MWh`}
        />
        <StatCard
          label="Capacity Factor"
          value={`${summary.capacity_factor_pct.toFixed(1)}%`}
        />
        <StatCard
          label="Est. IRR"
          value={`~${estIrr.toFixed(1)}%`}
          sublabel="modeled, illustrative"
        />
      </div>

      <div>
        <h2 className="font-heading text-xl text-darkBg mb-3">Monthly Yield</h2>
        <YieldTable projectId={project.id} records={records} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-textDark">
      <dt className="text-textMuted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

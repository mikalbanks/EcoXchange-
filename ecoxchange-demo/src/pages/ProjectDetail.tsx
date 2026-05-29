import { useParams } from "react-router-dom";
import { BackLink } from "../components/ui/BackLink.js";
import { MonoTag } from "../components/ui/MonoTag.js";
import { StatBand, type StatItem } from "../components/layout/StatBand.js";
import { ProductionChart } from "../components/charts/ProductionChart.js";
import { VerificationTable } from "../components/tables/VerificationTable.js";
import { ConfidenceAnnotation } from "../components/ui/ConfidenceAnnotation.js";
import { loadProject } from "../data/index.js";
import { useDemoMode } from "../state/demoMode.js";
import { formatMwh } from "../utils/formatters.js";

export function ProjectDetail() {
  const { id = "" } = useParams();
  const { mode } = useDemoMode();
  const bundle = loadProject(id, mode);

  if (!bundle) {
    return (
      <main className="mx-auto max-w-site px-6 sm:px-8 py-16 space-y-4">
        <BackLink to="/" label="Portfolio" />
        <p className="font-body text-eco-text-body">
          No project with id <code>{id}</code> in the demo set.
        </p>
      </main>
    );
  }

  const { project, verification_records, summary } = bundle;
  const total = verification_records.length;

  const stats: StatItem[] = [
    {
      label: "Annual Production",
      value: formatMwh(summary.annual_production_mwh),
    },
    {
      label: "Capacity Factor",
      value: `${summary.capacity_factor_pct.toFixed(1)}%`,
    },
    {
      label: "Months Verified",
      value: `${summary.months_verified}/${total}`,
      sublabel:
        summary.months_flagged > 0
          ? `${summary.months_flagged} flagged`
          : "All months reconciled",
    },
    { label: "Est. Net IRR", value: "7.8%", sublabel: "20-yr modeled" },
  ];

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-site px-6 sm:px-8 pt-10 sm:pt-14 pb-8 space-y-6">
        <BackLink to="/" label="Portfolio" />
        <div className="space-y-3">
          <MonoTag>Project · Reg D 506(c)</MonoTag>
          <h1 className="font-display italic text-[34px] sm:text-[44px] leading-tight">
            {project.name}.
          </h1>
          <p className="font-mono text-[11px] sm:text-[12px] uppercase tracking-tag text-eco-text-muted">
            {project.latitude.toFixed(2)}°N · {Math.abs(project.longitude).toFixed(2)}°W ·{" "}
            {project.capacity_kw.toLocaleString()} kW DC · {project.tilt_deg}° Tilt · Community Solar
          </p>
        </div>
      </section>

      <StatBand stats={stats} />

      {/* Production chart */}
      <section className="mx-auto max-w-site px-6 sm:px-8 py-12 sm:py-16 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="space-y-2">
            <MonoTag>§ II · Production</MonoTag>
            <h2 className="font-display italic text-[24px] sm:text-[28px]">
              Monthly production vs. expected.
            </h2>
          </div>
          <ConfidenceAnnotation obs={366} />
        </div>
        <div className="rule-thin" />
        <ProductionChart records={verification_records} />
      </section>

      {/* Verification table */}
      <section className="mx-auto max-w-site px-6 sm:px-8 pb-16 space-y-6">
        <div className="space-y-2">
          <MonoTag>§ III · Verification ledger</MonoTag>
          <h2 className="font-display italic text-[24px] sm:text-[28px]">
            Monthly reconciliations.
          </h2>
        </div>
        <div className="rule-thin" />
        <VerificationTable projectId={project.id} records={verification_records} />
        <p className="font-mono text-[11px] uppercase tracking-tag text-eco-text-muted pt-3">
          Distribution shown reflects a {(2).toFixed(1)}% ownership share of the project revenue at the {project.ppa_rate_per_kwh.toFixed(3)}/kWh PPA rate.
        </p>
      </section>
    </main>
  );
}

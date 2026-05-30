import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BackLink } from "../components/ui/BackLink.js";
import { MonoTag } from "../components/ui/MonoTag.js";
import { MetricLabel } from "../components/ui/MetricExplainer.js";
import { StatBand, type StatItem } from "../components/layout/StatBand.js";
import { ProductionChart } from "../components/charts/ProductionChart.js";
import { VerificationTable } from "../components/tables/VerificationTable.js";
import { ConfidenceAnnotation } from "../components/ui/ConfidenceAnnotation.js";
import { loadProject } from "../data/index.js";
import type { ProjectBundle } from "../data/types.js";
import { useDemoMode } from "../state/demoMode.js";
import {
  formatMwh,
  formatPercentPlain,
  formatRevenueType,
  formatUsdRate,
} from "../utils/formatters.js";
import { USDC_OPTIONAL_DISCLOSURE } from "../utils/demo-config.js";

export function ProjectDetail() {
  const { id = "" } = useParams();
  const { mode } = useDemoMode();
  const [bundle, setBundle] = useState<ProjectBundle | null | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setBundle(undefined);
    setError(null);
    loadProject(id, { variant: mode })
      .then((data) => {
        if (mounted) setBundle(data);
      })
      .catch((err) => {
        if (mounted) setError((err as Error).message);
      });
    return () => {
      mounted = false;
    };
  }, [id, mode]);

  if (error) {
    return (
      <main className="mx-auto max-w-site px-6 sm:px-8 py-16 space-y-4">
        <BackLink to="/projects" label="Projects" />
        <p className="font-body text-eco-text-body">{error}</p>
      </main>
    );
  }

  if (bundle === undefined) {
    return (
      <main className="mx-auto max-w-site px-6 sm:px-8 py-16 space-y-4">
        <BackLink to="/projects" label="Projects" />
        <p className="font-body text-eco-text-body">Loading project.</p>
      </main>
    );
  }

  if (!bundle) {
    return (
      <main className="mx-auto max-w-site px-6 sm:px-8 py-16 space-y-4">
        <BackLink to="/projects" label="Projects" />
        <p className="font-body text-eco-text-body">
          No solar project with id <code>{id}</code> in the demo set.
        </p>
      </main>
    );
  }

  const { project, verification_records, summary } = bundle;
  const total = verification_records.length;
  const hasMismatch = verification_records.some(
    (record) => record.verification_mismatch,
  );

  const stats: StatItem[] = [
    {
      label: "Annual Production",
      value: formatMwh(summary.annual_production_mwh),
      metric: "annual_production",
    },
    {
      label: "Capacity Factor",
      value: formatPercentPlain(summary.capacity_factor_pct),
      metric: "capacity_factor",
    },
    {
      label: "Months Verified",
      value: `${summary.months_verified}/${total}`,
      sublabel:
        summary.months_flagged > 0
          ? `${summary.months_flagged} flagged`
          : "All available months reconciled",
      metric: "verification_status",
    },
    {
      label: "PPA Rate",
      value: `${formatUsdRate(project.ppa_rate_per_kwh)}/kWh`,
      sublabel: formatRevenueType(project.offtake_type),
      metric: "ppa_rate",
    },
  ];

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-site px-6 sm:px-8 pt-10 sm:pt-14 pb-8 space-y-6">
        <BackLink to="/projects" label="Projects" />
        <div className="space-y-3">
          <MonoTag>Project - Reg D 506(c)</MonoTag>
          <h1 className="font-display italic text-[34px] sm:text-[44px] leading-tight">
            {project.name}.
          </h1>
          <p className="font-mono text-[11px] sm:text-[12px] uppercase tracking-tag text-eco-text-muted">
            {project.location} - {project.capacity_kw.toLocaleString()} kW DC -{" "}
            {formatRevenueType(project.offtake_type)}
          </p>
        </div>
      </section>

      <StatBand stats={stats} />

      <section className="mx-auto max-w-site px-6 sm:px-8 py-12 sm:py-16 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="space-y-2">
            <MonoTag>Section II - Production</MonoTag>
            <h2 className="font-display italic text-[24px] sm:text-[28px]">
              Monthly production vs. expected.
            </h2>
          </div>
          <ConfidenceAnnotation obs={verification_records.length || 0} />
        </div>
        <div className="rule-thin" />
        {verification_records.length > 0 ? (
          <ProductionChart
            records={verification_records}
            caption="Monthly Production"
          />
        ) : (
          <p className="border border-eco-border bg-eco-pale/45 p-5 font-body text-[14px] text-eco-text-body">
            Data Required: no verification records are available for this solar
            project yet.
          </p>
        )}
      </section>

      <section className="mx-auto max-w-site px-6 sm:px-8 pb-16 space-y-6">
        <div className="space-y-2">
          <MonoTag>Section III - Verification Ledger</MonoTag>
          <h2 className="font-display italic text-[24px] sm:text-[28px]">
            Monthly reconciliations.
          </h2>
        </div>
        <div className="rule-thin" />
        <VerificationTable projectId={project.id} records={verification_records} />
        {hasMismatch ? (
          <p className="border-l-4 border-eco-flagged bg-eco-flagged-bg px-4 py-3 font-body text-[13px] text-eco-text-body">
            Record mismatch: at least one stored verification status differs
            from the recalculated engine status.
          </p>
        ) : null}
        <p className="font-mono text-[11px] uppercase tracking-tag text-eco-text-muted pt-3">
          <MetricLabel metric="distribution">Distribution</MetricLabel> shown
          reflects a demo investor share of verified project revenue.{" "}
          {USDC_OPTIONAL_DISCLOSURE}
        </p>
      </section>
    </main>
  );
}

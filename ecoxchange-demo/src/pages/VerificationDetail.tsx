import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { BackLink } from "../components/ui/BackLink.js";
import { MonoTag } from "../components/ui/MonoTag.js";
import { MetricLabel } from "../components/ui/MetricExplainer.js";
import { ReconciliationFigure } from "../components/verification/ReconciliationFigure.js";
import { loadVerification } from "../data/index.js";
import type { Project, VerificationRecord } from "../data/types.js";
import { useDemoMode } from "../state/demoMode.js";
import { formatMonthLong, formatNullableUsd } from "../utils/formatters.js";
import {
  DEMO_ALLOCATION,
  USDC_OPTIONAL_DISCLOSURE,
} from "../utils/demo-config.js";

interface LoadedVerification {
  project: Project;
  record: VerificationRecord;
}

export function VerificationDetail() {
  const { id = "", period = "" } = useParams();
  const { mode } = useDemoMode();
  const [data, setData] = useState<LoadedVerification | null | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setData(undefined);
    setError(null);
    loadVerification(id, period, { variant: mode })
      .then((result) => {
        if (mounted) setData(result);
      })
      .catch((err) => {
        if (mounted) setError((err as Error).message);
      });
    return () => {
      mounted = false;
    };
  }, [id, mode, period]);

  if (error) {
    return (
      <main className="mx-auto max-w-site px-6 sm:px-8 py-16 space-y-4">
        <BackLink to={`/project/${id}`} label="Project" />
        <p className="font-body text-eco-text-body">{error}</p>
      </main>
    );
  }

  if (data === undefined) {
    return (
      <main className="mx-auto max-w-site px-6 sm:px-8 py-16 space-y-4">
        <BackLink to={`/project/${id}`} label="Project" />
        <p className="font-body text-eco-text-body">Loading verification record.</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-site px-6 sm:px-8 py-16 space-y-4">
        <BackLink to={`/project/${id}`} label="Project" />
        <p className="font-body text-eco-text-body">
          No verification record found for that period.
        </p>
      </main>
    );
  }

  const { project, record } = data;
  const flagged = record.status === "flagged";
  const investorDistribution =
    record.status === "verified" && record.estimated_revenue !== null
      ? record.estimated_revenue * (DEMO_ALLOCATION.investorSharePct / 100)
      : null;

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-site px-6 sm:px-8 pt-10 sm:pt-14 pb-8 space-y-6">
        <BackLink to={`/project/${id}`} label="Project" />
        <div className="space-y-3">
          <MonoTag>
            Verification record - {formatMonthLong(record.period_start)}
          </MonoTag>
          <h1 className="font-display italic text-[32px] sm:text-[42px] leading-tight">
            Verification detail - {formatMonthLong(record.period_start)}.
          </h1>
          <p className="font-mono text-[11px] sm:text-[12px] uppercase tracking-tag text-eco-text-muted">
            {project.name} - {project.capacity_kw.toLocaleString()} kW DC
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-site px-6 sm:px-8 pb-12 space-y-6">
        <ReconciliationFigure record={record} />
      </section>

      <section className="mx-auto max-w-site px-6 sm:px-8 pb-12 space-y-6">
        <div className="space-y-2">
          <MonoTag>Section IV - Supporting Data</MonoTag>
          <h2 className="font-display italic text-[22px] sm:text-[26px]">
            Underlying inputs.
          </h2>
        </div>
        <div className="rule-thin" />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <DataColumn
            title="Irradiance"
            rows={[
              [
                <MetricLabel key="ghi" metric="ghi">GHI</MetricLabel>,
                record.ghi_kwh_m2 === null || record.ghi_kwh_m2 === undefined
                  ? "Data required"
                  : `${record.ghi_kwh_m2.toFixed(1)} kWh/m2`,
              ],
              ["Source", "Satellite irradiance model"],
              ["Latitude", `${project.latitude.toFixed(2)} N`],
              ["Longitude", `${Math.abs(project.longitude).toFixed(2)} W`],
            ]}
          />
          <DataColumn
            title="Distribution"
            rows={[
              ["Project Revenue", formatNullableUsd(record.estimated_revenue)],
              [
                <MetricLabel key="ppa" metric="ppa_rate">PPA Rate</MetricLabel>,
                `$${project.ppa_rate_per_kwh.toFixed(3)}/kWh`,
              ],
              [
                <MetricLabel key="share" metric="investor_share">
                  Investor Share
                </MetricLabel>,
                `${DEMO_ALLOCATION.investorSharePct.toFixed(1)}%`,
              ],
              [
                <MetricLabel key="dist" metric="distribution">
                  Investor Distribution
                </MetricLabel>,
                formatNullableUsd(investorDistribution),
              ],
              ["Settlement", "USD; optional USDC where eligible"],
            ]}
          />
          <DataColumn
            title="Engine"
            rows={[
              ["Version", record.engine_version || "Demo v0.1.0"],
              ["Tilt", `${project.tilt_deg} deg`],
              ["Azimuth", `${project.azimuth_deg} deg`],
              [
                <MetricLabel key="module" metric="module_efficiency">
                  Module Efficiency
                </MetricLabel>,
                `${(project.module_efficiency * 100).toFixed(1)}%`,
              ],
              [
                <MetricLabel key="losses" metric="system_losses">
                  System Losses
                </MetricLabel>,
                `${(project.system_losses * 100).toFixed(0)}%`,
              ],
            ]}
          />
        </div>
        <p className="font-body text-[12px] leading-6 text-eco-text-body">
          {USDC_OPTIONAL_DISCLOSURE}
        </p>
      </section>

      {record.verification_mismatch ? (
        <section className="mx-auto max-w-site px-6 sm:px-8 pb-8">
          <div className="border-l-4 border-eco-flagged bg-eco-flagged-bg p-6 space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-tag text-eco-flagged">
              Record mismatch
            </p>
            <p className="font-body text-[14px] leading-6 text-eco-text-body">
              The stored verification status differs from the status recalculated
              from inverter, utility, expected production, and tolerance data.
            </p>
          </div>
        </section>
      ) : null}

      {flagged ? (
        <section className="mx-auto max-w-site px-6 sm:px-8 pb-16">
          <div className="border-l-4 border-eco-flagged bg-eco-flagged-bg p-6 space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-tag text-eco-flagged">
              Flag reason
            </p>
            <ul className="space-y-2">
              {record.flag_reasons.map((reason) => (
                <li
                  key={reason}
                  className="font-body text-[14px] text-eco-text-body leading-relaxed"
                >
                  {reason}
                </li>
              ))}
            </ul>
            <p className="font-mono text-[10px] uppercase tracking-tag text-eco-text-muted pt-2">
              Distribution held for review in this demo record.
            </p>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function DataColumn({
  title,
  rows,
}: {
  title: string;
  rows: Array<[ReactNode, string]>;
}) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-tag text-eco-olive">
        {title}
      </p>
      <dl className="space-y-2">
        {rows.map(([key, value], index) => (
          <div
            key={index}
            className="flex items-baseline justify-between gap-4 border-b border-eco-border pb-2"
          >
            <dt className="font-mono text-[11px] uppercase tracking-tag text-eco-text-muted">
              {key}
            </dt>
            <dd className="font-body text-[14px] text-eco-text-primary text-right">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

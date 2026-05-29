import { useParams } from "react-router-dom";
import { BackLink } from "../components/ui/BackLink.js";
import { MonoTag } from "../components/ui/MonoTag.js";
import { ReconciliationFigure } from "../components/verification/ReconciliationFigure.js";
import { loadVerification } from "../data/index.js";
import { useDemoMode } from "../state/demoMode.js";
import {
  formatMonthLong,
  formatUsd,
} from "../utils/formatters.js";

const INVESTOR_SHARE = 0.02;
const TOLERANCE_CONFIG = {
  inv_vs_expected: "±15%",
  inv_vs_utility: "±10%",
  util_vs_expected: "±20%",
};

export function VerificationDetail() {
  const { id = "", period = "" } = useParams();
  const { mode } = useDemoMode();
  const data = loadVerification(id, period, mode);

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

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-site px-6 sm:px-8 pt-10 sm:pt-14 pb-8 space-y-6">
        <BackLink to={`/project/${id}`} label="Project" />
        <div className="space-y-3">
          <MonoTag>
            Verification record · {formatMonthLong(record.period_start)}
          </MonoTag>
          <h1 className="font-display italic text-[32px] sm:text-[42px] leading-tight">
            Verification detail — {formatMonthLong(record.period_start)}.
          </h1>
          <p className="font-mono text-[11px] sm:text-[12px] uppercase tracking-tag text-eco-text-muted">
            {project.name} · {project.capacity_kw.toLocaleString()} kW DC
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-site px-6 sm:px-8 pb-12 space-y-6">
        <ReconciliationFigure record={record} />
      </section>

      {/* Supporting data 3-column */}
      <section className="mx-auto max-w-site px-6 sm:px-8 pb-12 space-y-6">
        <div className="space-y-2">
          <MonoTag>§ IV · Supporting data</MonoTag>
          <h2 className="font-display italic text-[22px] sm:text-[26px]">
            Underlying inputs.
          </h2>
        </div>
        <div className="rule-thin" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <DataColumn
            title="Irradiance"
            rows={[
              ["GHI", `${record.ghi_kwh_m2.toFixed(1)} kWh/m²`],
              ["Source", "NASA POWER"],
              ["Model", "Hay-Davies"],
              ["Latitude", `${project.latitude.toFixed(2)}°N`],
              ["Longitude", `${Math.abs(project.longitude).toFixed(2)}°W`],
            ]}
          />
          <DataColumn
            title="Distribution"
            rows={[
              ["Project Revenue", formatUsd(record.estimated_revenue)],
              ["PPA Rate", `$${project.ppa_rate_per_kwh.toFixed(3)}/kWh`],
              [
                "Investor Share",
                `${(INVESTOR_SHARE * 100).toFixed(1)}%`,
              ],
              [
                "Investor Distribution",
                formatUsd(record.estimated_revenue * INVESTOR_SHARE),
              ],
              ["Settlement", "USD; USDC optional"],
            ]}
          />
          <DataColumn
            title="Engine"
            rows={[
              ["Version", "v0.1.0"],
              ["Tilt", `${project.tilt_deg}°`],
              ["Azimuth", `${project.azimuth_deg}°`],
              [
                "Module Efficiency",
                `${(project.module_efficiency * 100).toFixed(1)}%`,
              ],
              [
                "System Losses",
                `${(project.system_losses * 100).toFixed(0)}%`,
              ],
              ["Tolerances", "Inv↔Exp " + TOLERANCE_CONFIG.inv_vs_expected],
            ]}
          />
        </div>
      </section>

      {flagged ? (
        <section className="mx-auto max-w-site px-6 sm:px-8 pb-16">
          <div className="border-l-4 border-eco-flagged bg-eco-flagged-bg p-6 space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-tag text-eco-flagged">
              ▲ Flag reason
            </p>
            <ul className="space-y-2">
              {record.flag_reasons.map((r, i) => (
                <li
                  key={i}
                  className="font-body text-[14px] text-eco-text-body leading-relaxed"
                >
                  {r}
                </li>
              ))}
            </ul>
            <p className="font-mono text-[10px] uppercase tracking-tag text-eco-text-muted pt-2">
              Distribution withheld pending review · Engine v0.1.0
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
  rows: Array<[string, string]>;
}) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-tag text-eco-olive">
        {title}
      </p>
      <dl className="space-y-2">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-4 border-b border-eco-border pb-2"
          >
            <dt className="font-mono text-[11px] uppercase tracking-tag text-eco-text-muted">
              {k}
            </dt>
            <dd className="font-body text-[14px] text-eco-text-primary text-right">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

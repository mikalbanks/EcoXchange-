import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Mail } from "lucide-react";
import { fetchReport } from "../data/onboarding.js";
import type { BacktestReportResponse } from "../utils/onboarding-types.js";
import { StatCard } from "../components/StatCard.js";
import { ProductionChartLazy as ProductionChart } from "../components/ProductionChartLazy.js";
import { DataSourceAttribution } from "../compliance/components/DataSourceAttribution.js";
import { CostComparisonTable } from "../components/onboarding/CostComparisonTable.js";
import {
  CardSkeleton,
  ChartSkeleton,
  Shimmer,
  StatCardSkeleton,
} from "../components/Skeleton.js";
import { formatMwh, formatPct, formatUsd } from "../utils/formatters.js";
import type { VerificationRecord } from "../utils/types.js";

function reportRecordsToVerification(
  monthly: BacktestReportResponse["report"]["monthly"],
): VerificationRecord[] {
  return monthly.map((m) => ({
    period_start: m.month + "-01",
    inverter_kwh: m.inverter_kwh ?? m.expected_kwh,
    expected_kwh: m.expected_kwh,
    utility_kwh: null,
    inv_vs_expected_pct: m.inv_vs_expected_pct ?? 0,
    inv_vs_utility_pct: null,
    util_vs_expected_pct: null,
    status: m.status ?? "verified",
    flag_reasons: m.flag_reasons,
    estimated_revenue: m.estimated_revenue_usd ?? 0,
    ghi_kwh_m2: m.ghi_kwh_m2,
  }));
}

export function OnboardingReport() {
  const { id = "" } = useParams();
  const [data, setData] = useState<BacktestReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport(id)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          to={`/onboard/status/${id}`}
          className="text-medGreen hover:text-darkBg transition-colors duration-150"
        >
          ← Back to status
        </Link>
        <div className="rounded-md bg-amber-50 border border-flagAmber/40 px-4 py-3 text-flagAmber">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <Shimmer className="h-9 w-96 max-w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ChartSkeleton />
        <CardSkeleton lines={4} />
      </div>
    );
  }

  const r = data.report;
  const records = reportRecordsToVerification(r.monthly);

  return (
    <div className="space-y-8 animate-fade-in">
      <Link
        to={`/onboard/status/${id}`}
        className="inline-flex items-center gap-1 text-medGreen hover:text-darkBg transition-colors duration-150"
      >
        <ArrowLeft className="h-4 w-4" /> Back to status
      </Link>

      <div>
        <h1 className="font-heading text-3xl text-darkBg">
          EcoXchange Developer Backtest Report
        </h1>
        <p className="text-textMuted mt-1">
          {r.system.name} · {r.system.location} ·{" "}
          {r.system.capacity_kw_dc.toLocaleString()} kW DC
        </p>
        <p className="text-xs text-textMuted mt-1">
          {r.system.configuration} · commissioned {r.system.commissioning_date}
          {" · "}
          {r.summary.irradiance_source} satellite data
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Annual Output"
          value={formatMwh(r.summary.annual_expected_mwh)}
          sublabel={r.summary.period_tested}
        />
        <StatCard
          label="Capacity Factor"
          value={`${r.summary.capacity_factor_pct.toFixed(1)}%`}
        />
        <StatCard
          label={
            r.summary.has_real_inverter_data ? "Verified Months" : "Months Tested"
          }
          value={
            r.summary.has_real_inverter_data
              ? `${r.summary.months_verified ?? 0} / ${r.summary.months_tested}`
              : `${r.summary.months_tested}`
          }
          sublabel={
            r.summary.has_real_inverter_data
              ? `Mean dev ${formatPct(r.summary.mean_deviation_pct ?? 0)}`
              : "satellite-only"
          }
        />
      </div>

      <div className="bg-white rounded-lg border border-paleGreen/60 p-5">
        <h2 className="font-heading text-xl text-darkBg mb-3">
          Monthly Production
        </h2>
        <ProductionChart records={records} />
        <DataSourceAttribution
          sources={[
            { name: "NASA POWER", type: "satellite" },
            { name: "EcoXchange Verification Engine", type: "model" },
          ]}
          engineVersion="v2.0.0"
          isEstimate
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="PPA Rate"
          value={
            r.financials.ppa_rate_per_kwh !== null
              ? `$${r.financials.ppa_rate_per_kwh.toFixed(3)}/kWh`
              : "—"
          }
        />
        <StatCard
          label="Estimated Annual Revenue"
          value={formatUsd(r.financials.estimated_annual_revenue_usd ?? 0)}
        />
        <StatCard
          label="Yield on Equity (est.)"
          value={
            r.financials.estimated_yield_on_equity_pct !== null
              ? `${r.financials.estimated_yield_on_equity_pct.toFixed(1)}%`
              : "—"
          }
          sublabel="modeled, illustrative"
        />
      </div>

      <div>
        <h2 className="font-heading text-xl text-darkBg mb-3">
          EcoXchange Cost Advantage
        </h2>
        <CostComparisonTable />
      </div>

      <div className="bg-white rounded-lg border border-paleGreen/60 p-5">
        <h2 className="font-heading text-xl text-darkBg mb-3">
          What happens next
        </h2>
        <ol className="space-y-2 text-sm text-textDark list-decimal list-inside">
          <li>{r.next_steps.step_1}</li>
          <li>{r.next_steps.step_2}</li>
          <li>{r.next_steps.step_3}</li>
          <li>{r.next_steps.step_4}</li>
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href={`mailto:${r.next_steps.contact_email}?subject=ESN%20Backtest%20${id}%20-%20Proceed%20to%20LOI`}
            className="inline-flex items-center gap-2 rounded-md bg-medGreen text-white px-4 py-2 hover:bg-darkBg transition-colors duration-150"
          >
            <Mail className="h-4 w-4" /> Proceed to LOI
          </a>
          <a
            href={data.report_meta.json_signed_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-medGreen text-medGreen px-4 py-2 hover:bg-medGreen hover:text-white transition-colors duration-150"
          >
            <Download className="h-4 w-4" /> Download JSON
          </a>
          <span className="text-xs text-textMuted">
            Contact: {r.next_steps.contact_name} —{" "}
            {r.next_steps.contact_email}
          </span>
        </div>
      </div>

      <p className="text-xs text-textMuted">
        Generated {r.generated_at} · engine v{r.engine_version} ·{" "}
        irradiance source: {r.summary.irradiance_source}. Expected generation
        figures are estimates based on standard solar physics models and do not
        constitute a guarantee of future production.
      </p>
    </div>
  );
}

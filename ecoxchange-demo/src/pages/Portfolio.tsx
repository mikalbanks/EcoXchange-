import { StatBand, type StatItem } from "../components/layout/StatBand.js";
import { MonoTag } from "../components/ui/MonoTag.js";
import { RectButton } from "../components/ui/RectButton.js";
import { VerificationBadge } from "../components/ui/VerificationBadge.js";
import { useDemoMode } from "../state/demoMode.js";
import { loadPortfolio } from "../data/index.js";
import {
  formatMwh,
  formatPct,
  formatUsd,
  formatUsdRate,
} from "../utils/formatters.js";

const INVESTOR_AMOUNT = 50_000;
const INVESTOR_SHARE = 0.02;

export function Portfolio() {
  const { mode } = useDemoMode();
  const cards = loadPortfolio(mode);
  const card = cards[0]!;
  const { project, summary, latest_record, months_verified, months_flagged } = card;

  const ytdRevenue =
    summary.total_revenue_estimate * INVESTOR_SHARE;
  const monthlyDistribution = latest_record.estimated_revenue * INVESTOR_SHARE;
  const total = months_verified + months_flagged;

  const stats: StatItem[] = [
    {
      label: "Total Invested",
      value: formatUsd(INVESTOR_AMOUNT),
      sublabel: `${(INVESTOR_SHARE * 100).toFixed(1)}% ownership share`,
    },
    {
      label: "Latest Monthly Distribution",
      value: formatUsd(monthlyDistribution),
      sublabel: `${new Date(latest_record.period_start + "T00:00:00Z").toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })} · ${formatPct(latest_record.inv_vs_expected_pct)} vs expected`,
    },
    {
      label: "YTD Distributions",
      value: formatUsd(ytdRevenue),
      sublabel: `${formatMwh(summary.annual_production_mwh)} delivered`,
    },
    {
      label: "Verification Status",
      value: `${months_verified}/${total}`,
      sublabel:
        months_flagged > 0
          ? `${months_flagged} flagged · review pending`
          : "All months reconciled",
    },
  ];

  return (
    <main className="bg-white">
      {/* Hero band */}
      <section className="mx-auto max-w-site px-6 sm:px-8 pt-10 sm:pt-16 pb-8 space-y-4">
        <MonoTag>
          Investor Portal · Reg D 506(c) · Accredited Investors Only
        </MonoTag>
        <h1 className="font-display italic text-[36px] sm:text-[48px] md:text-[56px] leading-[1.05]">
          Portfolio overview.
        </h1>
        <p className="font-body text-[15px] sm:text-[16px] text-eco-text-body max-w-prose leading-relaxed">
          A live view of your fractional position in the Savannah 5MW community solar
          project. Every month's distribution is reconciled three ways — inverter
          telemetry, utility meter data, and satellite irradiance — before payout.
        </p>
      </section>

      {/* Dark stat band */}
      <StatBand stats={stats} />

      {/* Project card */}
      <section className="mx-auto max-w-site px-6 sm:px-8 py-12 sm:py-16">
        <div className="flex items-end justify-between mb-6">
          <MonoTag>§ I · Your Projects</MonoTag>
          <MonoTag className="text-eco-text-muted">1 Holding</MonoTag>
        </div>
        <div className="rule-thin mb-6" />

        <article className="border border-eco-border p-6 sm:p-8 space-y-6">
          <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <h2 className="font-display italic text-[26px] sm:text-[30px]">
                {project.name}
              </h2>
              <p className="font-mono text-[11px] sm:text-[12px] uppercase tracking-tag text-eco-text-muted">
                {project.latitude.toFixed(2)}°N · {Math.abs(project.longitude).toFixed(2)}°W ·{" "}
                {project.capacity_kw.toLocaleString()} kW DC · Community Solar
              </p>
            </div>
            <VerificationBadge
              status={latest_record.status}
              obsCount={total}
              periodStart={latest_record.period_start}
            />
          </header>

          <div className="rule-thin" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <KeyMetric
              label="Annual Production"
              value={formatMwh(summary.annual_production_mwh)}
            />
            <KeyMetric
              label="Capacity Factor"
              value={`${summary.capacity_factor_pct.toFixed(1)}%`}
            />
            <KeyMetric
              label="PPA Rate"
              value={`${formatUsdRate(summary.ppa_rate)}/kWh`}
            />
            <KeyMetric label="Est. Net IRR" value="7.8%" sublabel="20-yr modeled" />
          </div>

          <div className="rule-thin" />

          <div className="pt-2">
            <RectButton
              to={`/project/${project.id}`}
              variant="secondary"
              arrow
            >
              View Project
            </RectButton>
          </div>
        </article>
      </section>
    </main>
  );
}

function KeyMetric({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[10px] uppercase tracking-tag text-eco-text-muted">
        {label}
      </p>
      <p className="font-display text-[22px] sm:text-[24px] font-bold text-eco-text-primary leading-none">
        {value}
      </p>
      {sublabel ? (
        <p className="font-body text-[12px] text-eco-text-muted">{sublabel}</p>
      ) : null}
    </div>
  );
}

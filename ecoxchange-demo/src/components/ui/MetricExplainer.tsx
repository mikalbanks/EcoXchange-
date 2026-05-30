import type { ReactNode } from "react";

export type MetricKey =
  | "capacity_factor"
  | "ppa_rate"
  | "investor_share"
  | "annual_production"
  | "expected_production"
  | "deviation"
  | "confidence_score"
  | "system_losses"
  | "module_efficiency"
  | "ghi"
  | "verification_status"
  | "distribution";

const EXPLAINERS: Record<MetricKey, string> = {
  capacity_factor:
    "How much energy the solar project produced compared with running at full capacity all year.",
  ppa_rate:
    "The contracted revenue rate paid for each kilowatt-hour of solar production.",
  investor_share:
    "The demo ownership percentage used to estimate this investor's share of verified project revenue.",
  annual_production:
    "The solar energy generated or annualized from available monthly production records.",
  expected_production:
    "The model output for the period using project specs, location, system losses, and satellite irradiance.",
  deviation:
    "The percentage difference between actual production and expected or utility-meter production.",
  confidence_score:
    "An investor-language signal for data completeness and alignment across production data sources.",
  system_losses:
    "Modeled energy losses from equipment, wiring, temperature, soiling, and similar system factors.",
  module_efficiency:
    "The modeled panel conversion efficiency used by the expected-production calculation.",
  ghi:
    "Global horizontal irradiance: the amount of sunlight available at the project site for the period.",
  verification_status:
    "Whether required production data reconciled within tolerance, needs review, or requires more data.",
  distribution:
    "The investor's demo share of verified project revenue for the period.",
};

export function MetricLabel({
  metric,
  children,
}: {
  metric: MetricKey;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 align-baseline">
      <span>{children}</span>
      <span
        tabIndex={0}
        title={EXPLAINERS[metric]}
        aria-label={`${String(children)}: ${EXPLAINERS[metric]}`}
        className="inline-flex h-4 w-4 items-center justify-center border border-eco-line text-[10px] font-mono text-eco-mid"
      >
        i
      </span>
    </span>
  );
}

export function metricHelp(metric: MetricKey): string {
  return EXPLAINERS[metric];
}

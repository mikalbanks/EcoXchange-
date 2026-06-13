import { useCallback, useState } from "react";
import type { BacktestRequest, DeveloperIntakeData } from "@shared/developer-backtest";
import {
  DEFAULT_DEGRADATION_RATE,
  DEFAULT_SYSTEM_LOSSES,
} from "@shared/developer-backtest";
import { DEMO_DEVELOPER_PROJECT } from "@/lib/demo-projects";

export type IntakeState = Partial<DeveloperIntakeData>;

const EMPTY: IntakeState = {
  module_type: "monocrystalline",
  module_efficiency: 0.2,
  azimuth_deg: 180,
  racking_type: "open_rack",
  dc_ac_ratio: 1.2,
  inverter_brand: "solaredge",
  has_monitoring_access: false,
  offtake_type: "ppa",
  ppa_escalator: 2,
  system_losses: DEFAULT_SYSTEM_LOSSES,
  degradation_rate: DEFAULT_DEGRADATION_RATE,
};

/** Rough IANA timezone from longitude (US-centric, good enough for intake). */
export function timezoneFromLongitude(lon: number): string {
  if (lon <= -100 && lon > -115) return "America/Denver";
  if (lon <= -115) return "America/Los_Angeles";
  if (lon <= -87 && lon > -100) return "America/Chicago";
  if (lon <= -67 && lon > -87) return "America/New_York";
  const offset = Math.round(lon / 15);
  return `Etc/GMT${offset <= 0 ? "+" : "-"}${Math.abs(offset)}`;
}

/** Industry rule of thumb for fixed-tilt: tilt ≈ latitude × 0.76. */
export function suggestedTilt(latitude: number): number {
  return Math.round(Math.abs(latitude) * 0.76);
}

/**
 * Cross-step intake state. Held in React state (NOT localStorage) so the user
 * can move back and forth through the wizard without losing entries.
 */
export function useIntakeForm() {
  const [data, setData] = useState<IntakeState>(EMPTY);

  const patch = useCallback((values: Partial<DeveloperIntakeData>) => {
    setData((prev) => ({ ...prev, ...values }));
  }, []);

  const loadDemo = useCallback(() => {
    setData({ ...DEMO_DEVELOPER_PROJECT });
  }, []);

  const reset = useCallback(() => setData(EMPTY), []);

  const buildRequest = useCallback(
    (backtestMonths = 12): BacktestRequest => ({
      project: data as DeveloperIntakeData,
      backtest_months: backtestMonths,
    }),
    [data],
  );

  return { data, patch, loadDemo, reset, buildRequest };
}

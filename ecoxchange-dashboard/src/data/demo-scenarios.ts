// Guided demo scenarios for the developer "Run Demo" flow (/developer/demo).
//
// Each scenario carries a complete IntakeForm prefill plus a 12-month
// backtest table so the whole flow works with zero backends running —
// the seed months are what the progress visualization steps through when
// the pvlib engine (VITE_ENGINE_URL) is not configured.
//
// Savannah maps from data/demo-savannah.json (single source of truth for
// that site); Billerica and Phoenix are authored here with monthly shapes
// cross-checked against the pvlib-service test fixtures for the same
// coordinates (Billerica CF ~16.6% strong seasonality, Phoenix CF ~22%
// flat profile with a July monsoon dip).

import demoSavannah from "./demo-savannah.json";
import type { ProjectBundle } from "../utils/types.js";
import {
  DEFAULT_INTAKE,
  type IntakeForm,
} from "../utils/onboarding-types.js";

export type DemoScenarioId = "savannah_5mw" | "billerica_2mw" | "phoenix_1mw";

export interface ScenarioMonth {
  month: string; // "2024-01"
  ghi_kwh_m2: number;
  expected_kwh: number;
  inverter_kwh: number;
  deviation_pct: number;
  status: "verified" | "flagged" | "pending";
}

export interface ScenarioSummary {
  annual_mwh: number;
  capacity_factor_pct: number;
  best_month: { month: string; kwh: number };
  worst_month: { month: string; kwh: number };
  seasonal_ratio: number;
}

export interface DemoScenario {
  id: DemoScenarioId;
  label: string;
  tagline: string;
  location_label: string;
  state_program: string | null;
  intake: IntakeForm;
  months: ScenarioMonth[];
  summary: ScenarioSummary;
}

const HOURS_PER_YEAR = 8760;

export function buildScenarioSummary(
  months: ScenarioMonth[],
  capacityKwDc: number,
): ScenarioSummary {
  const totalKwh = months.reduce((s, m) => s + m.expected_kwh, 0);
  const annualKwh = months.length > 0 ? (totalKwh * 12) / months.length : 0;
  let best = months[0];
  let worst = months[0];
  for (const m of months) {
    if (m.expected_kwh > best.expected_kwh) best = m;
    if (m.expected_kwh < worst.expected_kwh) worst = m;
  }
  return {
    annual_mwh: Math.round(annualKwh / 100) / 10,
    capacity_factor_pct:
      capacityKwDc > 0
        ? Math.round((annualKwh / (capacityKwDc * HOURS_PER_YEAR)) * 1000) / 10
        : 0,
    best_month: { month: best.month, kwh: best.expected_kwh },
    worst_month: { month: worst.month, kwh: worst.expected_kwh },
    seasonal_ratio:
      worst.expected_kwh > 0
        ? Math.round((best.expected_kwh / worst.expected_kwh) * 100) / 100
        : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Savannah 5 MW — mapped from demo-savannah.json
// ─────────────────────────────────────────────────────────────────────────

const savannah = demoSavannah as ProjectBundle;

const savannahMonths: ScenarioMonth[] = savannah.verification_records.map(
  (r) => ({
    month: r.period_start.slice(0, 7),
    ghi_kwh_m2: r.ghi_kwh_m2 ?? 0,
    expected_kwh: r.expected_kwh,
    inverter_kwh: r.inverter_kwh,
    deviation_pct: r.inv_vs_expected_pct,
    status: r.status,
  }),
);

const savannahIntake: IntakeForm = {
  ...DEFAULT_INTAKE,
  developer_name: "Alex Rivera",
  developer_email: "alex.rivera@example.com",
  developer_company: "Coastal Solar Partners",
  project_name: savannah.project.name,
  latitude: savannah.project.latitude,
  longitude: savannah.project.longitude,
  capacity_kw_dc: savannah.project.capacity_kw,
  tilt_deg: savannah.project.tilt_deg,
  azimuth_deg: savannah.project.azimuth_deg,
  module_efficiency: savannah.project.module_efficiency,
  system_losses: savannah.project.system_losses,
  commissioning_date: savannah.project.commissioning_date,
  inverter_brand: "solaredge",
  offtake_type: "community_solar",
  ppa_rate_per_kwh: savannah.project.ppa_rate_per_kwh,
  ppa_escalator: 0.02,
  equity_raise_target: 2_500_000,
};

// ─────────────────────────────────────────────────────────────────────────
// Billerica 2 MW — MA SMART community solar, strong New England seasonality
// ─────────────────────────────────────────────────────────────────────────

// [month, ghi kWh/m², expected kWh, deviation %]
const BILLERICA_TABLE: Array<[string, number, number, number]> = [
  ["2024-01", 55, 150_200, 1.2],
  ["2024-02", 75, 185_400, -0.8],
  ["2024-03", 110, 255_100, 2.1],
  ["2024-04", 140, 290_600, -1.4],
  ["2024-05", 165, 320_300, 0.9],
  ["2024-06", 175, 330_800, 1.7],
  ["2024-07", 180, 334_900, -2.2],
  ["2024-08", 160, 310_200, 0.4],
  ["2024-09", 125, 260_400, -1.1],
  ["2024-10", 90, 205_700, 1.8],
  ["2024-11", 55, 145_300, -0.5],
  ["2024-12", 45, 127_900, 1.0],
];

// ─────────────────────────────────────────────────────────────────────────
// Phoenix 1 MW — commercial rooftop PPA, flat desert profile
// ─────────────────────────────────────────────────────────────────────────

const PHOENIX_TABLE: Array<[string, number, number, number]> = [
  ["2024-01", 105, 130_400, 0.6],
  ["2024-02", 120, 140_100, -1.3],
  ["2024-03", 165, 170_600, 1.1],
  ["2024-04", 200, 185_300, 0.2],
  ["2024-05", 230, 195_800, -0.9],
  ["2024-06", 235, 190_200, 1.5],
  ["2024-07", 215, 179_700, -2.6],
  ["2024-08", 200, 175_400, 0.8],
  ["2024-09", 175, 165_100, 1.9],
  ["2024-10", 145, 155_600, -0.4],
  ["2024-11", 110, 130_200, 0.7],
  ["2024-12", 95, 119_800, -1.6],
];

function monthsFromTable(
  table: Array<[string, number, number, number]>,
): ScenarioMonth[] {
  return table.map(([month, ghi, expected, deviation]) => ({
    month,
    ghi_kwh_m2: ghi,
    expected_kwh: expected,
    inverter_kwh: Math.round(expected * (1 + deviation / 100)),
    deviation_pct: deviation,
    status: "verified" as const,
  }));
}

const billericaMonths = monthsFromTable(BILLERICA_TABLE);
const phoenixMonths = monthsFromTable(PHOENIX_TABLE);

const billericaIntake: IntakeForm = {
  ...DEFAULT_INTAKE,
  developer_name: "Alex Rivera",
  developer_email: "alex.rivera@example.com",
  developer_company: "Merrimack Valley Solar",
  project_name: "Billerica MA Community Solar 2MW",
  latitude: 42.56,
  longitude: -71.27,
  capacity_kw_dc: 2000,
  tilt_deg: 25,
  azimuth_deg: 180,
  module_efficiency: 0.2,
  system_losses: 0.14,
  commissioning_date: "2023-06-01",
  inverter_brand: "enphase",
  offtake_type: "community_solar",
  ppa_rate_per_kwh: 0.098, // MA SMART rate
  ppa_escalator: 0.02,
  equity_raise_target: 1_500_000,
};

const phoenixIntake: IntakeForm = {
  ...DEFAULT_INTAKE,
  developer_name: "Alex Rivera",
  developer_email: "alex.rivera@example.com",
  developer_company: "Sonoran Rooftop Energy",
  project_name: "Phoenix AZ Commercial Rooftop 1MW",
  latitude: 33.45,
  longitude: -112.07,
  capacity_kw_dc: 1000,
  tilt_deg: 15,
  azimuth_deg: 180,
  module_efficiency: 0.2,
  system_losses: 0.14,
  commissioning_date: "2022-09-01",
  inverter_brand: "solaredge",
  offtake_type: "ppa",
  ppa_rate_per_kwh: 0.075,
  ppa_escalator: 0.025,
  equity_raise_target: 800_000,
};

// ─────────────────────────────────────────────────────────────────────────
// Public catalog
// ─────────────────────────────────────────────────────────────────────────

export const DEMO_SCENARIOS: Record<DemoScenarioId, DemoScenario> = {
  savannah_5mw: {
    id: "savannah_5mw",
    label: "Savannah Community Solar 5MW",
    tagline: "Flagship community solar reference site",
    location_label: "Savannah, GA",
    state_program: "Georgia Power Community Solar",
    intake: savannahIntake,
    months: savannahMonths,
    summary: buildScenarioSummary(
      savannahMonths,
      savannah.project.capacity_kw,
    ),
  },
  billerica_2mw: {
    id: "billerica_2mw",
    label: "Billerica MA Community Solar 2MW",
    tagline: "MA SMART program, strong seasonal swing",
    location_label: "Billerica, MA",
    state_program: "MA SMART",
    intake: billericaIntake,
    months: billericaMonths,
    summary: buildScenarioSummary(billericaMonths, 2000),
  },
  phoenix_1mw: {
    id: "phoenix_1mw",
    label: "Phoenix AZ Commercial Rooftop 1MW",
    tagline: "C&I rooftop PPA, high desert capacity factor",
    location_label: "Phoenix, AZ",
    state_program: null,
    intake: phoenixIntake,
    months: phoenixMonths,
    summary: buildScenarioSummary(phoenixMonths, 1000),
  },
};

export const DEMO_SCENARIO_LIST: DemoScenario[] =
  Object.values(DEMO_SCENARIOS);

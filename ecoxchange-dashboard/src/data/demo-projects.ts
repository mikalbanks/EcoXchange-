// Multi-project portfolio simulation seed (Spec 5): 8 projects across the
// target geography, one flagged (Rochester — mirroring the June-2026
// story), one still onboarding (Denver). Per-project figures are the
// upgrade-spec §5.2 table; the aggregates below are DERIVED from the rows
// so the header can never contradict the cards (demo-projects.test.ts
// enforces this).
//
// One correction to the spec table: Austin's months_flagged is 0 here
// (spec: 1) so the platform verification rate is the spec's own stated
// fraction, 53 verified / 55 total months.

import type { VerificationStatus } from "../utils/types.js";

export interface DemoProject {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  capacity_kw: number;
  status: "active" | "onboarding";
  verification_status: VerificationStatus;
  equity_raised: number;
  investor_count: number;
  annual_generation_mwh: number;
  capacity_factor: number;
  months_verified: number;
  months_flagged: number;
  current_yield_pct: number;
  offtake: string;
  program: string | null;
  /** 12 monthly MWh values (Jan–Dec) for the stacked production chart. */
  monthly_production_mwh: number[];
  /** Deep link when the project has a full detail page in the demo. */
  detailPath?: string;
}

// Seasonal weights (sum = 1) by climate band — northern sites swing hard,
// the desert southwest stays flat with a monsoon dip.
const NORTHERN: number[] = [
  0.052, 0.063, 0.087, 0.099, 0.109, 0.112, 0.113, 0.105, 0.088, 0.07, 0.054,
  0.048,
];
const SOUTHEAST: number[] = [
  0.064, 0.067, 0.082, 0.097, 0.098, 0.099, 0.098, 0.096, 0.081, 0.089, 0.064,
  0.065,
];
const DESERT: number[] = [
  0.067, 0.072, 0.088, 0.096, 0.101, 0.098, 0.093, 0.091, 0.085, 0.08, 0.067,
  0.062,
];

function monthly(annualMwh: number, weights: number[]): number[] {
  return weights.map((w) => Math.round(annualMwh * w * 10) / 10);
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: "proj-001",
    name: "Savannah Community Solar",
    city: "Savannah",
    state: "GA",
    latitude: 32.08,
    longitude: -81.09,
    capacity_kw: 5000,
    status: "active",
    verification_status: "verified",
    equity_raised: 2_500_000,
    investor_count: 47,
    annual_generation_mwh: 8520,
    capacity_factor: 0.194,
    months_verified: 11,
    months_flagged: 1,
    current_yield_pct: 7.8,
    offtake: "Community Solar",
    program: "Georgia Power",
    monthly_production_mwh: monthly(8520, SOUTHEAST),
    detailPath: "/investor/project/demo-savannah-5mw",
  },
  {
    id: "proj-002",
    name: "Billerica MA SMART Solar",
    city: "Billerica",
    state: "MA",
    latitude: 42.56,
    longitude: -71.27,
    capacity_kw: 2000,
    status: "active",
    verification_status: "verified",
    equity_raised: 1_500_000,
    investor_count: 28,
    annual_generation_mwh: 2950,
    capacity_factor: 0.168,
    months_verified: 8,
    months_flagged: 0,
    current_yield_pct: 8.2,
    offtake: "Community Solar",
    program: "MA SMART",
    monthly_production_mwh: monthly(2950, NORTHERN),
  },
  {
    id: "proj-003",
    name: "Rochester NY VDER Solar",
    city: "Rochester",
    state: "NY",
    latitude: 43.16,
    longitude: -77.61,
    capacity_kw: 3500,
    status: "active",
    verification_status: "flagged",
    equity_raised: 2_000_000,
    investor_count: 35,
    annual_generation_mwh: 4180,
    capacity_factor: 0.136,
    months_verified: 5,
    months_flagged: 1,
    current_yield_pct: 7.4,
    offtake: "Community Solar",
    program: "NY VDER",
    monthly_production_mwh: monthly(4180, NORTHERN),
  },
  {
    id: "proj-004",
    name: "Phoenix Commercial Rooftop",
    city: "Phoenix",
    state: "AZ",
    latitude: 33.45,
    longitude: -112.07,
    capacity_kw: 1000,
    status: "active",
    verification_status: "verified",
    equity_raised: 800_000,
    investor_count: 15,
    annual_generation_mwh: 1920,
    capacity_factor: 0.219,
    months_verified: 10,
    months_flagged: 0,
    current_yield_pct: 8.5,
    offtake: "PPA",
    program: null,
    monthly_production_mwh: monthly(1920, DESERT),
  },
  {
    id: "proj-005",
    name: "Champaign IL ABP Solar",
    city: "Champaign",
    state: "IL",
    latitude: 40.12,
    longitude: -88.24,
    capacity_kw: 4000,
    status: "active",
    verification_status: "verified",
    equity_raised: 2_200_000,
    investor_count: 38,
    annual_generation_mwh: 5640,
    capacity_factor: 0.161,
    months_verified: 7,
    months_flagged: 0,
    current_yield_pct: 7.9,
    offtake: "Community Solar",
    program: "IL ABP",
    monthly_production_mwh: monthly(5640, NORTHERN),
  },
  {
    id: "proj-006",
    name: "Newark NJ SREC-II Solar",
    city: "Newark",
    state: "NJ",
    latitude: 40.74,
    longitude: -74.17,
    capacity_kw: 2500,
    status: "active",
    verification_status: "pending",
    equity_raised: 1_800_000,
    investor_count: 31,
    annual_generation_mwh: 3280,
    capacity_factor: 0.15,
    months_verified: 3,
    months_flagged: 0,
    current_yield_pct: 0, // too new for distributions
    offtake: "Community Solar",
    program: "NJ SREC-II",
    monthly_production_mwh: monthly(3280, NORTHERN),
  },
  {
    id: "proj-007",
    name: "Austin TX C&I Rooftop",
    city: "Austin",
    state: "TX",
    latitude: 30.27,
    longitude: -97.74,
    capacity_kw: 1500,
    status: "active",
    verification_status: "verified",
    equity_raised: 1_100_000,
    investor_count: 22,
    annual_generation_mwh: 2580,
    capacity_factor: 0.196,
    months_verified: 9,
    months_flagged: 0,
    current_yield_pct: 7.6,
    offtake: "PPA",
    program: null,
    monthly_production_mwh: monthly(2580, DESERT),
  },
  {
    id: "proj-008",
    name: "Denver CO Community Solar",
    city: "Denver",
    state: "CO",
    latitude: 39.74,
    longitude: -104.99,
    capacity_kw: 3000,
    status: "onboarding",
    verification_status: "pending",
    equity_raised: 0,
    investor_count: 0,
    annual_generation_mwh: 4650, // backtest estimate
    capacity_factor: 0.177,
    months_verified: 0,
    months_flagged: 0,
    current_yield_pct: 0,
    offtake: "Community Solar",
    program: "CO Community Solar",
    monthly_production_mwh: monthly(4650, DESERT),
  },
];

// ── Aggregates — derived, never hand-typed ────────────────────────────────
// AUA:            2.5 + 1.5 + 2.0 + 0.8 + 2.2 + 1.8 + 1.1 + 0   = $11.9M
// Investors:      47 + 28 + 35 + 15 + 38 + 31 + 22 + 0          = 216
// Avg yield:      mean of the six distributing projects
//                 (7.8 + 8.2 + 7.4 + 8.5 + 7.9 + 7.6) / 6       = 7.9%
// Verification:   53 verified months / (53 + 2) total           = 96.4%

const round1 = (n: number) => Math.round(n * 10) / 10;

function aggregate(projects: DemoProject[]) {
  const aua = projects.reduce((s, p) => s + p.equity_raised, 0);
  const investors = projects.reduce((s, p) => s + p.investor_count, 0);
  const yielding = projects.filter((p) => p.current_yield_pct > 0);
  const avgYield =
    yielding.reduce((s, p) => s + p.current_yield_pct, 0) /
    Math.max(1, yielding.length);
  const verified = projects.reduce((s, p) => s + p.months_verified, 0);
  const flagged = projects.reduce((s, p) => s + p.months_flagged, 0);
  return {
    aua_usd: aua,
    active_projects: projects.filter((p) => p.status === "active").length,
    onboarding_projects: projects.filter((p) => p.status === "onboarding")
      .length,
    investors,
    avg_yield_pct: round1(avgYield),
    months_verified: verified,
    months_total: verified + flagged,
    verification_rate_pct: round1((verified / (verified + flagged)) * 100),
  };
}

export const PORTFOLIO_AGGREGATE = aggregate(DEMO_PROJECTS);

export function aggregateFor(projectIds: string[]) {
  return aggregate(DEMO_PROJECTS.filter((p) => projectIds.includes(p.id)));
}

/** The demo investor's holdings (Spec 5.3): $45K across 3 projects. */
export const INVESTOR_SUBSET = {
  invested_usd: 45_000,
  monthly_distribution_usd: 285,
  projectIds: ["proj-001", "proj-002", "proj-004"],
};

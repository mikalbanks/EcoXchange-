// NREL PVDAQ system 9068 (Greeley, CO) — the demo asset whose production leg is
// MEASURED rather than modelled.
//
// Every other demo dataset in this directory is synthetic. This one is not: the
// `inverter_kwh` figures are aggregated from 5-minute AC power in the public
// PVDAQ research dataset, which no part of this codebase generated. That is the
// point of it — `demo-savannah.json` derives its inverter series from its
// expected series (`scripts/generate-realistic-seed.mjs`), so the two legs are
// algebraically dependent and reconciling them proves nothing.
//
// Read `PVDAQ_9068.provenance` before putting any of these numbers in front of
// anyone. The three legs do not have equal standing:
//
//   inverter  cited      measured telemetry
//   expected  estimated  Engine A (pvlib) on NASA POWER irradiance
//   utility   estimated  MODELLED from the inverter leg — not a measurement
//
// Two of three legs are independent. Describing this as validated three-source
// reconciliation would be an overstatement; the accurate version is that the
// production leg is real and the meter leg is not yet.
//
// Regenerate with: python3 verification-engine/scripts/build_pvdaq_demo.py

import bundle from "./demo-pvdaq-9068.json";
import type { VerificationStatus } from "../utils/types.js";

/** How a number was arrived at (standing rule #7 — cited vs. estimated). */
export type ProvenanceBasis = "cited" | "estimated";

export interface LegProvenance {
  basis: ProvenanceBasis;
  source: string;
  note: string;
}

export interface MeasuredVerificationRecord {
  period_start: string;
  period_end: string;
  inverter_kwh: number;
  utility_kwh: number;
  expected_kwh: number;
  inv_vs_expected_pct: number | null;
  inv_vs_utility_pct: number | null;
  util_vs_expected_pct: number | null;
  status: VerificationStatus;
  flag_reasons: string[];
  /** Share of expected 5-minute intervals actually present. Below the
   *  tolerance_config minimum the period is PENDING, never a verdict. */
  data_completeness_pct: number;
  estimated_revenue: number;
}

export interface MeasuredProjectBundle {
  project: {
    id: string;
    name: string;
    location: string;
    latitude: number;
    longitude: number;
    timezone: string;
    capacity_kw: number;
    ac_capacity_kw: number;
    array_type: string;
    commissioning_date: string;
    ppa_rate_per_kwh: number;
    status: string;
    telemetry_year: number;
    engine_config_hash: string;
  };
  provenance: Record<"inverter_kwh" | "expected_kwh" | "utility_kwh", LegProvenance>;
  tolerance_config: Record<string, number>;
  verification_records: MeasuredVerificationRecord[];
  summary: {
    annual_production_mwh: number;
    capacity_factor_pct: number;
    months_verified: number;
    months_flagged: number;
    months_pending: number;
    months_reconciled: number;
    total_revenue_estimate: number;
    ppa_rate: number;
  };
}

export const PVDAQ_9068 = bundle as unknown as MeasuredProjectBundle;

export const PVDAQ_9068_RECORDS = PVDAQ_9068.verification_records;

/** The one leg backed by measurement. Anything else is a model output. */
export const MEASURED_LEG = "inverter_kwh" as const;

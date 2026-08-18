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
import type {
  ProjectBundle,
  VerificationRecord,
  VerificationStatus,
} from "../utils/types.js";

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

export const PVDAQ_9068_PROJECT_ID = PVDAQ_9068.project.id;

/**
 * Adapt the measured bundle to the shared `ProjectBundle` shape so existing
 * project surfaces can render it without special-casing.
 *
 * Several fields in `ProjectMeta` have no measured counterpart in the PVDAQ record
 * and are carried as MODELLING INPUTS, not site facts: `module_efficiency`
 * (CdTe nameplate assumption) and `system_losses` (the PVWatts reference stack
 * Engine A ran with). `tilt_deg` is 0 because the array tracks — the tilt varies
 * through the day and a fixed number would misdescribe it. Financial fields are
 * intentionally zeroed in the public adapter because this research asset has no
 * EcoXchange offering or contract attached.
 */
export function toProjectBundle(): ProjectBundle {
  const p = PVDAQ_9068.project;
  return {
    project: {
      id: p.id,
      name: p.name,
      location: p.location,
      latitude: p.latitude,
      longitude: p.longitude,
      capacity_kw: p.capacity_kw,
      tilt_deg: 0,
      azimuth_deg: 180,
      module_efficiency: 0.18,
      system_losses: 0.14,
      commissioning_date: p.commissioning_date,
      offtake_type: "not_attached",
      ppa_rate_per_kwh: 0,
      status: "active",
    },
    verification_records: PVDAQ_9068_RECORDS.map(toVerificationRecord),
    summary: {
      annual_production_mwh: PVDAQ_9068.summary.annual_production_mwh,
      capacity_factor_pct: PVDAQ_9068.summary.capacity_factor_pct,
      months_verified: PVDAQ_9068.summary.months_verified,
      months_flagged: PVDAQ_9068.summary.months_flagged,
      total_revenue_estimate: 0,
      ppa_rate: 0,
    },
  };
}

function toVerificationRecord(r: MeasuredVerificationRecord): VerificationRecord {
  return {
    period_start: r.period_start,
    inverter_kwh: r.inverter_kwh,
    expected_kwh: r.expected_kwh,
    utility_kwh: r.utility_kwh,
    // A period with no computable deviation carries NaN, never 0. Rendering a
    // missing comparison as "0.0%" is the exact failure this dataset replaces.
    inv_vs_expected_pct: r.inv_vs_expected_pct ?? Number.NaN,
    inv_vs_utility_pct: r.inv_vs_utility_pct,
    util_vs_expected_pct: r.util_vs_expected_pct,
    status: r.status,
    flag_reasons: r.flag_reasons,
    estimated_revenue: 0,
  };
}

import type { PlantBacktestResult } from "../utils/types.js";
import { getSupabase } from "../db/client.js";
import {
  getEffectiveParameters,
  getModuleEfficiency,
} from "../backtest/parameters.js";
import { lastOfMonth } from "../utils/dates.js";

const REFERENCE_PPA_RATE = 0.035; // $/kWh — placeholder used only for est. revenue display

const DEFAULT_TOLERANCES = {
  inv_vs_expected_upper_pct: 15,
  inv_vs_expected_lower_pct: -15,
  inv_vs_utility_pct: 10,
  util_vs_expected_upper_pct: 20,
  util_vs_expected_lower_pct: -20,
  min_data_completeness_pct: 90,
};

export interface StoreReferenceOptions {
  maxProjects: number;
}

export interface StoreReferenceStats {
  projectsInserted: number;
  recordsInserted: number;
  skipped: number;
}

/**
 * Spec §4.1. Select top N plants by smallest |deviation| among those within
 * ±10%, write each as a projects row with status='reference', then write
 * verification_records per month with EIA-actual as the inverter proxy.
 */
export async function storeReferenceProjects(
  results: PlantBacktestResult[],
  options: StoreReferenceOptions,
): Promise<StoreReferenceStats> {
  const supabase = getSupabase();

  const best = results
    .filter((r) => r.withinTenPercent)
    .sort(
      (a, b) => Math.abs(a.deviationPct) - Math.abs(b.deviationPct),
    )
    .slice(0, options.maxProjects);

  let projectsInserted = 0;
  let recordsInserted = 0;
  let skipped = 0;

  for (const r of best) {
    const p = r.plant;
    const params = getEffectiveParameters(p);
    const project = {
      name: `${p.name} (USPVDB Reference)`,
      latitude: p.latitude,
      longitude: p.longitude,
      capacity_kw_dc: p.capacity_dc_mw * 1000,
      tilt_deg: params.tilt,
      azimuth_deg: params.azimuth,
      module_efficiency: getModuleEfficiency(p.panel_technology),
      system_losses: 0.14,
      degradation_rate: 0.0075,
      commissioning_date: `${p.commissioning_year}-07-01`,
      inverter_brand: "solaredge", // placeholder — not relevant for reference plants
      inverter_api_key_ref: "reference",
      inverter_plant_id: p.eia_plant_id,
      offtake_type: "ppa",
      status: "reference",
    };

    const { data: inserted, error } = await supabase
      .from("projects")
      .insert(project)
      .select("id")
      .single();
    if (error || !inserted) {
      skipped += 1;
      continue;
    }
    projectsInserted += 1;
    const projectId = (inserted as { id: string }).id;

    const records: Record<string, unknown>[] = [];
    for (const m of r.monthlyExpected) {
      if (m.actual_mwh === null) continue;
      const inverterKwh = m.actual_mwh * 1000;
      const devPct =
        m.expected_kwh > 0
          ? ((inverterKwh - m.expected_kwh) / m.expected_kwh) * 100
          : 0;
      const y = parseInt(m.month.slice(0, 4), 10);
      const mo = parseInt(m.month.slice(5, 7), 10);
      records.push({
        project_id: projectId,
        period_start: m.month,
        period_end: lastOfMonth(y, mo),
        inverter_kwh: inverterKwh,
        utility_kwh: null,
        expected_kwh: m.expected_kwh,
        inv_vs_expected_pct: devPct,
        inv_vs_utility_pct: null,
        util_vs_expected_pct: null,
        status: Math.abs(devPct) <= 15 ? "verified" : "flagged",
        flag_reasons: [],
        tolerance_config: DEFAULT_TOLERANCES,
        estimated_revenue: inverterKwh * REFERENCE_PPA_RATE,
        engine_version: "0.1.0",
      });
    }
    if (records.length > 0) {
      const { error: recErr } = await supabase
        .from("verification_records")
        .insert(records);
      if (!recErr) recordsInserted += records.length;
    }
  }

  return { projectsInserted, recordsInserted, skipped };
}

import {
  calculateExpectedGeneration,
  type DailyIrradiance,
} from "./physics.js";
import {
  getEffectiveParameters,
  getModuleEfficiency,
} from "./parameters.js";
import { callMcp } from "./mcp-client.js";
import type {
  JoinedPlantRecord,
  MonthResult,
  PlantBacktestResult,
} from "../utils/types.js";
import { firstOfMonth, lastOfMonth } from "../utils/dates.js";

interface IrradianceDailyTool {
  records: Array<{
    date: string;
    ghi_kwh_m2: number;
    dni_kwh_m2?: number;
    dhi_kwh_m2?: number;
  }>;
  source_used: string;
}

function toDailyIrradiance(
  raw: IrradianceDailyTool["records"],
): DailyIrradiance[] {
  return raw.map((d) => ({
    date: d.date,
    ghi_kwh_m2: d.ghi_kwh_m2,
    // The irradiance MCP tool returns GHI + POA in its happy path; DNI/DHI
    // may not be present. Default to a 70/30 split (matches the onboarding
    // processor) — Hay-Davies inside calculateExpectedGeneration uses
    // beam_horizontal = GHI - DHI, so the split mostly drives the diffuse
    // weighting rather than the beam magnitude.
    dni_kwh_m2: d.dni_kwh_m2 ?? d.ghi_kwh_m2 * 0.7,
    dhi_kwh_m2: d.dhi_kwh_m2 ?? d.ghi_kwh_m2 * 0.3,
  }));
}

export interface BacktestPlantOptions {
  irradianceMcpUrl: string;
  systemLosses?: number;
  degradationRate?: number;
}

const HOURS_PER_YEAR = 8760;

export async function backtestPlant(
  plant: JoinedPlantRecord,
  opts: BacktestPlantOptions,
): Promise<PlantBacktestResult> {
  const params = getEffectiveParameters(plant);
  const year = plant.production_year;

  // The irradiance MCP caps each call at 365 days. Leap years would trip a
  // single Jan 1 → Dec 31 request, so we always split into two half-year calls.
  const halves = [
    { start: `${year}-01-01`, end: `${year}-06-30` },
    { start: `${year}-07-01`, end: `${year}-12-31` },
  ];
  const recordsAll: IrradianceDailyTool["records"] = [];
  let sourceUsed = "";
  for (const half of halves) {
    const ir = await callMcp<IrradianceDailyTool>(
      opts.irradianceMcpUrl,
      "irradiance_get_daily",
      {
        lat: plant.latitude,
        lon: plant.longitude,
        start_date: half.start,
        end_date: half.end,
        source: "auto",
      },
    );
    recordsAll.push(...ir.records);
    sourceUsed = ir.source_used;
  }
  const irradiance: IrradianceDailyTool = {
    records: recordsAll,
    source_used: sourceUsed,
  };
  const daysAll = toDailyIrradiance(irradiance.records);

  const moduleEff = getModuleEfficiency(plant.panel_technology);
  const losses = opts.systemLosses ?? 0.14;
  const degRate = opts.degradationRate ?? 0.0075;
  const commissioning = `${plant.commissioning_year}-07-01`;

  const monthly: MonthResult[] = [];
  for (let m = 1; m <= 12; m++) {
    const monthStart = firstOfMonth(year, m);
    const monthEnd = lastOfMonth(year, m);
    const monthDays = daysAll.filter(
      (d) => d.date >= monthStart && d.date <= monthEnd,
    );
    const expected = calculateExpectedGeneration({
      capacity_kw_dc: plant.capacity_dc_mw * 1000,
      tilt_deg: params.tilt,
      azimuth_deg: params.azimuth,
      module_efficiency: moduleEff,
      system_losses: losses,
      degradation_rate: degRate,
      commissioning_date: commissioning,
      latitude: plant.latitude,
      longitude: plant.longitude,
      period_start: monthStart,
      period_end: monthEnd,
      daily_irradiance: monthDays,
    });
    const adjustedKwh = expected.expected_kwh * params.trackingBoost;
    const actualMwh = plant.actual_monthly_mwh[m - 1] ?? null;
    monthly.push({
      month: monthStart,
      expected_kwh: adjustedKwh,
      expected_mwh: adjustedKwh / 1000,
      actual_mwh: actualMwh && actualMwh > 0 ? actualMwh : null,
    });
  }

  const annualExpectedMwh = monthly.reduce((s, m) => s + m.expected_mwh, 0);
  const annualActualMwh = plant.actual_annual_mwh;
  const deviationPct =
    annualActualMwh > 0
      ? ((annualExpectedMwh - annualActualMwh) / annualActualMwh) * 100
      : 0;
  const expectedCF =
    plant.capacity_dc_mw > 0
      ? (annualExpectedMwh / (plant.capacity_dc_mw * HOURS_PER_YEAR / 1000 * 1000)) *
        100
      : 0;
  // simpler: annual_expected_mwh / (cap_mw * 8760) * 100
  const expectedCfClean =
    plant.capacity_dc_mw > 0
      ? (annualExpectedMwh / (plant.capacity_dc_mw * HOURS_PER_YEAR)) * 100
      : 0;
  void expectedCF;

  return {
    plant,
    monthlyExpected: monthly,
    annualExpectedMwh,
    annualActualMwh,
    deviationPct,
    expectedCapacityFactor: expectedCfClean,
    actualCapacityFactor: plant.actual_capacity_factor_pct,
    irradianceSource: irradiance.source_used,
    trackingBoostApplied: params.trackingBoost,
    withinTenPercent: Math.abs(deviationPct) <= 10,
    withinFifteenPercent: Math.abs(deviationPct) <= 15,
  };
}

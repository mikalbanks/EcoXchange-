/**
 * Virtual SCADA Pipeline
 * ======================
 * Orchestrates the full satellite-to-yield pipeline:
 *
 *   GOES-16 / NASA POWER  →  Perez Model  →  pvlib Chain  →  P_ac  →  Yield Ledger
 *   ─────────────────────────────────────────────────────────────────────────────────
 *   1. Fetch irradiance data from NASA POWER API
 *   2. Compute solar position + Perez transposition + tracker geometry
 *   3. Run single-diode DC model + Sandia inverter → P_ac (kW)
 *   4. Persist irradiance & power telemetry to PostgreSQL via Drizzle
 *   5. Aggregate hourly yield → yield_ledger (energy_kwh × PPA_rate → revenue)
 *
 * All data persisted in PostgreSQL. No in-memory demos.
 */
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "../../db";
import {
  spvs,
  irradianceTelemetry,
  powerTelemetry,
  yieldLedger,
  type SPV,
} from "../../db/schema";
import { fetchNasaPowerHourly, type NasaPowerHourlyData } from "./nasaPower";
import {
  computePower,
  solarPosition,
  DEFAULT_SYSTEM,
  type SystemConfig,
} from "./solarModel";

export interface IngestionResult {
  spvId: number;
  irradianceRecords: number;
  powerRecords: number;
  yieldRecords: number;
  totalEnergyKwh: number;
  totalRevenueUsd: number;
}

/**
 * Run the full SCADA pipeline for a given SPV and date range.
 */
export async function runScadaPipeline(
  spv: SPV,
  startDate: string, // YYYYMMDD
  endDate: string
): Promise<IngestionResult> {
  const systemConfig: SystemConfig = {
    ...DEFAULT_SYSTEM,
    capacityKw: spv.capacityKw,
    numModules: Math.ceil((spv.capacityKw * 1000) / DEFAULT_SYSTEM.modulePowerW),
    inverterPacMaxKw: spv.capacityKw / DEFAULT_SYSTEM.dcAcRatio,
  };

  // ── Step 1: Fetch satellite / weather data from NASA POWER ──
  console.log(`[SCADA] Fetching NASA POWER data for SPV "${spv.name}" (${startDate}–${endDate})...`);
  const weatherData = await fetchNasaPowerHourly(
    spv.latitude,
    spv.longitude,
    startDate,
    endDate
  );
  console.log(`[SCADA] Received ${weatherData.length} hourly records from NASA POWER.`);

  if (weatherData.length === 0) {
    return {
      spvId: spv.id,
      irradianceRecords: 0,
      powerRecords: 0,
      yieldRecords: 0,
      totalEnergyKwh: 0,
      totalRevenueUsd: 0,
    };
  }

  // ── Step 2–3: Compute irradiance → power for each hourly record ──
  const irradianceRows: (typeof irradianceTelemetry.$inferInsert)[] = [];
  const powerRows: (typeof powerTelemetry.$inferInsert)[] = [];

  for (const record of weatherData) {
    const sunPos = solarPosition(record.timestamp, spv.latitude, spv.longitude);

    // Store irradiance telemetry
    irradianceRows.push({
      spvId: spv.id,
      timestamp: record.timestamp,
      ghiWm2: record.ghiWm2,
      dniWm2: record.dniWm2,
      dhiWm2: record.dhiWm2,
      solarZenithDeg: sunPos.zenith,
      solarAzimuthDeg: sunPos.azimuth,
      airTemperatureC: record.airTemperatureC,
      windSpeedMs: record.windSpeedMs,
      cloudFraction: record.cloudFraction,
      source: "nasa_power",
      rawPayload: record as unknown as Record<string, unknown>,
    });

    // Compute P_ac through the full pvlib chain
    const result = computePower(
      record.timestamp,
      spv.latitude,
      spv.longitude,
      record.ghiWm2,
      record.dniWm2,
      record.dhiWm2,
      record.airTemperatureC,
      record.windSpeedMs,
      systemConfig
    );

    powerRows.push({
      spvId: spv.id,
      timestamp: record.timestamp,
      poaGlobalWm2: result.poaGlobalWm2,
      cellTemperatureC: result.cellTemperatureC,
      dcPowerKw: result.dcPowerKw,
      acPowerKw: result.acPowerKw,
      inverterEfficiency: result.inverterEfficiency,
      capacityFactor: result.capacityFactor,
    });
  }

  // ── Step 4: Persist telemetry to PostgreSQL via Drizzle ──
  console.log(`[SCADA] Persisting ${irradianceRows.length} irradiance + ${powerRows.length} power records...`);

  // Batch insert in chunks of 100 to avoid query size limits
  const BATCH_SIZE = 100;
  for (let i = 0; i < irradianceRows.length; i += BATCH_SIZE) {
    await db.insert(irradianceTelemetry).values(irradianceRows.slice(i, i + BATCH_SIZE));
  }
  for (let i = 0; i < powerRows.length; i += BATCH_SIZE) {
    await db.insert(powerTelemetry).values(powerRows.slice(i, i + BATCH_SIZE));
  }

  // ── Step 5: Aggregate hourly yield → yield_ledger ──
  const yieldRows: (typeof yieldLedger.$inferInsert)[] = [];
  const ppaRateUsdPerKwh = spv.ppaRateCentsKwh / 100;
  let totalEnergyKwh = 0;
  let totalRevenueUsd = 0;

  for (const pRow of powerRows) {
    // Each record is 1-hour interval → energy (kWh) = P_ac (kW) × 1 h
    const energyKwh = pRow.acPowerKw;
    const revenue = energyKwh * ppaRateUsdPerKwh;
    totalEnergyKwh += energyKwh;
    totalRevenueUsd += revenue;

    const periodStart = pRow.timestamp;
    const periodEnd = new Date(periodStart.getTime() + 3600_000);

    yieldRows.push({
      spvId: spv.id,
      periodStart,
      periodEnd,
      periodType: "hourly",
      energyKwh,
      revenueUsd: revenue,
      yieldPerToken: revenue / spv.totalTokens,
      avgCapacityFactor: pRow.capacityFactor,
    });
  }

  for (let i = 0; i < yieldRows.length; i += BATCH_SIZE) {
    await db.insert(yieldLedger).values(yieldRows.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `[SCADA] Pipeline complete: ${totalEnergyKwh.toFixed(1)} kWh, $${totalRevenueUsd.toFixed(2)} revenue.`
  );

  return {
    spvId: spv.id,
    irradianceRecords: irradianceRows.length,
    powerRecords: powerRows.length,
    yieldRecords: yieldRows.length,
    totalEnergyKwh,
    totalRevenueUsd,
  };
}

/**
 * Seed a default 4.7 MW SPV if none exists.
 */
export async function seedDefaultSpv(): Promise<SPV> {
  const existing = await db.select().from(spvs).limit(1);
  if (existing.length > 0) return existing[0];

  const [newSpv] = await db
    .insert(spvs)
    .values({
      name: "Desert Sun Solar I SPV",
      location: "Tucson, AZ",
      latitude: 32.2226,
      longitude: -110.9747,
      capacityKw: 4700,
      trackingType: "single_axis",
      ppaRateCentsKwh: 3.5, // $0.035/kWh PPA strike price
      regDExemption: "506c",
      totalTokens: 10000,
      tokenPriceUsd: 100,
    })
    .returning();

  console.log(`[SCADA] Seeded default SPV: "${newSpv.name}" (ID: ${newSpv.id})`);
  return newSpv;
}

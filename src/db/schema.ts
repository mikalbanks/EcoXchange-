import {
  pgTable,
  serial,
  text,
  timestamp,
  doublePrecision,
  integer,
  boolean,
  varchar,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// ─── SPV (Special Purpose Vehicle) ──────────────────────────────────────────
// Each SPV represents a tokenized solar project offered under Reg D 506(c).
export const spvs = pgTable("spvs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  location: varchar("location", { length: 256 }).notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  capacityKw: doublePrecision("capacity_kw").notNull(), // e.g. 4700 for 4.7 MW
  trackingType: varchar("tracking_type", { length: 64 }).notNull().default("single_axis"),
  ppaRateCentsKwh: doublePrecision("ppa_rate_cents_kwh").notNull(), // PPA strike price
  regDExemption: varchar("reg_d_exemption", { length: 32 }).notNull().default("506c"),
  totalTokens: integer("total_tokens").notNull().default(10000),
  tokenPriceUsd: doublePrecision("token_price_usd").notNull().default(100),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Accredited Investors ───────────────────────────────────────────────────
export const investors = pgTable("investors", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  name: varchar("name", { length: 256 }).notNull(),
  accreditedVerified: boolean("accredited_verified").notNull().default(false),
  verificationMethod: varchar("verification_method", { length: 128 }), // e.g. "income", "net_worth", "series_65"
  verifiedAt: timestamp("verified_at"),
  tokensOwned: integer("tokens_owned").notNull().default(0),
  spvId: integer("spv_id").references(() => spvs.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Satellite Irradiance Telemetry ─────────────────────────────────────────
// Raw GHI / DNI / DHI values derived from GOES-16 + NASA POWER via Perez model.
export const irradianceTelemetry = pgTable(
  "irradiance_telemetry",
  {
    id: serial("id").primaryKey(),
    spvId: integer("spv_id")
      .references(() => spvs.id)
      .notNull(),
    timestamp: timestamp("timestamp").notNull(),
    ghiWm2: doublePrecision("ghi_wm2").notNull(), // Global Horizontal Irradiance (W/m²)
    dniWm2: doublePrecision("dni_wm2").notNull(), // Direct Normal Irradiance (W/m²)
    dhiWm2: doublePrecision("dhi_wm2").notNull(), // Diffuse Horizontal Irradiance (W/m²)
    solarZenithDeg: doublePrecision("solar_zenith_deg").notNull(),
    solarAzimuthDeg: doublePrecision("solar_azimuth_deg").notNull(),
    airTemperatureC: doublePrecision("air_temperature_c").notNull(),
    windSpeedMs: doublePrecision("wind_speed_ms").notNull(),
    cloudFraction: doublePrecision("cloud_fraction"), // 0..1 from GOES-16
    source: varchar("source", { length: 64 }).notNull().default("nasa_power"),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_irradiance_spv_ts").on(table.spvId, table.timestamp),
  ]
);

// ─── Power Generation Telemetry ─────────────────────────────────────────────
// AC power output computed via pvlib: POA irradiance → cell temp → DC → inverter → P_ac.
export const powerTelemetry = pgTable(
  "power_telemetry",
  {
    id: serial("id").primaryKey(),
    spvId: integer("spv_id")
      .references(() => spvs.id)
      .notNull(),
    timestamp: timestamp("timestamp").notNull(),
    poaGlobalWm2: doublePrecision("poa_global_wm2").notNull(), // Plane-of-Array irradiance
    cellTemperatureC: doublePrecision("cell_temperature_c").notNull(),
    dcPowerKw: doublePrecision("dc_power_kw").notNull(),
    acPowerKw: doublePrecision("ac_power_kw").notNull(), // P_ac after inverter losses
    inverterEfficiency: doublePrecision("inverter_efficiency").notNull(),
    capacityFactor: doublePrecision("capacity_factor").notNull(), // P_ac / P_rated
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_power_spv_ts").on(table.spvId, table.timestamp),
  ]
);

// ─── Yield Ledger ───────────────────────────────────────────────────────────
// Aggregated financial yield per SPV per period (hourly / daily).
export const yieldLedger = pgTable(
  "yield_ledger",
  {
    id: serial("id").primaryKey(),
    spvId: integer("spv_id")
      .references(() => spvs.id)
      .notNull(),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    periodType: varchar("period_type", { length: 16 }).notNull(), // "hourly" | "daily"
    energyKwh: doublePrecision("energy_kwh").notNull(),
    revenueUsd: doublePrecision("revenue_usd").notNull(), // energyKwh * PPA rate
    yieldPerToken: doublePrecision("yield_per_token").notNull(), // revenueUsd / totalTokens
    avgCapacityFactor: doublePrecision("avg_capacity_factor").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_yield_spv_period").on(table.spvId, table.periodStart),
  ]
);

// ─── Type Exports ───────────────────────────────────────────────────────────
export type SPV = typeof spvs.$inferSelect;
export type NewSPV = typeof spvs.$inferInsert;
export type Investor = typeof investors.$inferSelect;
export type IrradianceTelemetry = typeof irradianceTelemetry.$inferSelect;
export type PowerTelemetry = typeof powerTelemetry.$inferSelect;
export type YieldLedger = typeof yieldLedger.$inferSelect;

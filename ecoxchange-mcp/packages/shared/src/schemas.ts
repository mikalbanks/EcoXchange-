import { z } from "zod";

export const SupportedBrandSchema = z.enum([
  "solaredge",
  "enphase",
  "fronius",
  "sma",
]);

export const DataQualitySchema = z.enum(["GOOD", "ESTIMATED", "MISSING"]);

export const IntervalResolutionSchema = z.enum([
  "15min",
  "30min",
  "hourly",
  "daily",
]);

export const IrradianceSourceNameSchema = z.enum([
  "nasa_power",
  "nrel_nsrdb",
  "solargis",
]);

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be ISO 8601 YYYY-MM-DD");

export const IsoMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Month must be ISO 8601 YYYY-MM");

export const LatSchema = z.number().min(-90).max(90);
export const LonSchema = z.number().min(-180).max(180);
export const TiltSchema = z.number().min(0).max(90);
export const AzimuthSchema = z.number().min(0).max(360);

export const PlantProductionRecordSchema = z.object({
  plant_id: z.string(),
  timestamp_utc: z.string(),
  interval_minutes: z.number(),
  energy_kwh: z.number(),
  brand: SupportedBrandSchema,
  data_source: z.string(),
  quality_flag: DataQualitySchema,
});

export const PlantSystemInfoSchema = z.object({
  plant_id: z.string(),
  brand: SupportedBrandSchema,
  capacity_kwdc: z.number(),
  capacity_kwac: z.number().optional(),
  tilt_deg: z.number(),
  azimuth_deg: z.number(),
  lat: z.number(),
  lon: z.number(),
  timezone: z.string(),
  commission_date: z.string(),
  inverter_model: z.string().optional(),
});

export const IrradianceRecordSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  date: z.string(),
  ghi_kwh_m2: z.number(),
  poa_kwh_m2: z.number().optional(),
  air_temp_c: z.number().optional(),
  source: IrradianceSourceNameSchema,
  data_version: z.string().optional(),
});

export const IrradianceCoverageResultSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  available_sources: z.array(IrradianceSourceNameSchema),
  recommended_source: IrradianceSourceNameSchema,
  earliest_date: z.string(),
  latest_date: z.string(),
  notes: z.string().optional(),
});

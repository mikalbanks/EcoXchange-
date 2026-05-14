export type SupportedBrand = "solaredge" | "enphase" | "fronius" | "sma";

export type DataQuality = "GOOD" | "ESTIMATED" | "MISSING";

export type IrradianceSourceName = "nasa_power" | "nrel_nsrdb" | "solargis";

export type IntervalResolution = "15min" | "30min" | "hourly" | "daily";

export interface PlantProductionRecord {
  plant_id: string;
  timestamp_utc: string;
  interval_minutes: number;
  energy_kwh: number;
  brand: SupportedBrand;
  data_source: string;
  quality_flag: DataQuality;
}

export interface PlantSystemInfo {
  plant_id: string;
  brand: SupportedBrand;
  capacity_kwdc: number;
  capacity_kwac?: number;
  tilt_deg: number;
  azimuth_deg: number;
  lat: number;
  lon: number;
  timezone: string;
  commission_date: string;
  inverter_model?: string;
}

export interface IrradianceRecord {
  lat: number;
  lon: number;
  date: string;
  ghi_kwh_m2: number;
  poa_kwh_m2?: number;
  air_temp_c?: number;
  source: IrradianceSourceName;
  data_version?: string;
}

export interface IrradianceCoverageResult {
  lat: number;
  lon: number;
  available_sources: IrradianceSourceName[];
  recommended_source: IrradianceSourceName;
  earliest_date: string;
  latest_date: string;
  notes?: string;
}

import { parse } from "csv-parse/sync";

export type IntervalGranularity = "15min" | "hourly" | "daily" | "monthly";

export type DetectedFormat = "standard" | "pvdaq_ac_power" | "pvdaq_meter" | "power_generic";

export interface ScadaInterval {
  timestamp: Date;
  productionKwh: number;
  capacityFactor?: number;
}

export interface NormalizedInterval {
  periodStart: Date;
  periodEnd: Date;
  productionMwh: number;
  capacityFactor: number | null;
  granularity: IntervalGranularity;
  source: string;
}

export interface CsvParseResult {
  success: boolean;
  records: ScadaInterval[];
  fieldMapping: FieldMapping[];
  validation: CsvValidation;
  errors: string[];
  detectedGranularity: IntervalGranularity;
  detectedFormat: DetectedFormat;
  formatLabel: string;
}

export interface FieldMapping {
  csvColumn: string;
  mapsTo: string | null;
  status: "mapped" | "skipped";
}

export interface CsvValidation {
  totalRows: number;
  validRows: number;
  skippedRows: number;
  dateRange: { start: string; end: string } | null;
  gapsDetected: number;
  duplicatesDetected: number;
  unit: "kwh" | "mwh";
  granularity: IntervalGranularity;
  coveragePercent: number;
}

export interface IScadaConnector {
  readonly name: string;
  readonly slug: string;
  parseUpload(fileBuffer: Buffer, filename: string): CsvParseResult;
  normalizeToSchema(records: ScadaInterval[], granularity: IntervalGranularity, capacityMw: number, source: string): NormalizedInterval[];
  fetchIntervals(projectId: string, startDate: Date, endDate: Date): Promise<NormalizedInterval[]>;
  assessDataQuality(validation: CsvValidation): "HIGH" | "MEDIUM" | "LOW";
}

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}(T|\s)/,
  /^\d{2}\/\d{2}\/\d{4}/,
  /^\d{4}\/\d{2}\/\d{2}/,
  /^\d{2}-\d{2}-\d{4}/,
];

function parseDate(value: string): Date | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();

  const mmddyyyy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mmddyyyy) {
    const d = new Date(`${mmddyyyy[3]}-${mmddyyyy[1]}-${mmddyyyy[2]}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : d;
  }

  const mmddyyyyTime = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (mmddyyyyTime) {
    const [, mm, dd, yyyy, hh, min, sec] = mmddyyyyTime;
    const d = new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${hh.padStart(2, "0")}:${min}:${(sec || "00")}Z`);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;

  return null;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function headerContainsAny(normalized: string, tokens: string[]): boolean {
  return tokens.some(t => normalized.includes(t));
}

function detectDateColumn(headers: string[]): string | null {
  const exactKeywords = ["date", "timestamp", "time", "period", "datetime", "period_start", "periodstart", "measdatetime", "meas_datetime", "measured_on", "measure_date"];
  for (const h of headers) {
    if (exactKeywords.includes(normalizeHeader(h))) return h;
  }
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (headerContainsAny(norm, ["date", "time", "measured"])) return h;
  }
  return null;
}

function detectProductionColumn(headers: string[]): { column: string; unit: "kwh" | "mwh" } | null {
  const lower = headers.map(h => h.toLowerCase().trim());

  const mwhKeywords = ["production_mwh", "productionmwh", "mwh", "energy_mwh", "output_mwh"];
  for (let i = 0; i < lower.length; i++) {
    if (mwhKeywords.includes(lower[i])) return { column: headers[i], unit: "mwh" };
  }

  const kwhKeywords = ["production_kwh", "productionkwh", "kwh", "energy_kwh", "output_kwh", "production"];
  for (let i = 0; i < lower.length; i++) {
    if (kwhKeywords.includes(lower[i])) return { column: headers[i], unit: "kwh" };
  }

  return null;
}

interface PowerColumnResult {
  column: string;
  format: DetectedFormat;
  formatLabel: string;
}

function detectPowerColumn(headers: string[]): PowerColumnResult | null {
  const normalized = headers.map(h => normalizeHeader(h));

  for (let i = 0; i < normalized.length; i++) {
    const n = normalized[i];
    if (n.includes("meter_power") || n.includes("meterpower") || n.includes("meter_ac") ||
        n.includes("grid_power") || n.includes("export_power") || n.includes("net_power") ||
        n.includes("measured_power") || (n.includes("meter") && n.includes("kw"))) {
      return { column: headers[i], format: "pvdaq_meter", formatLabel: "PVDAQ Meter Power (kW → kWh)" };
    }
  }

  for (let i = 0; i < normalized.length; i++) {
    const n = normalized[i];
    if (n.includes("ac_power") || n.includes("acpower") || n === "pac" || n === "p_ac" ||
        n.includes("inverter_power") || (n.includes("ac") && n.includes("power"))) {
      return { column: headers[i], format: "pvdaq_ac_power", formatLabel: "PVDAQ AC Power (kW → kWh)" };
    }
  }

  for (let i = 0; i < normalized.length; i++) {
    const n = normalized[i];
    if (n === "power" || n === "power_kw" || n === "output_kw" ||
        n.includes("gen_power") || n.includes("generation_kw")) {
      return { column: headers[i], format: "power_generic", formatLabel: "Power Data (kW → kWh)" };
    }
  }

  return null;
}

function detectCapacityFactorColumn(headers: string[]): string | null {
  const keywords = ["capacity_factor", "capacityfactor", "cf", "cap_factor"];
  const lower = headers.map(h => h.toLowerCase().trim());
  for (let i = 0; i < lower.length; i++) {
    if (keywords.includes(lower[i])) return headers[i];
  }
  return null;
}

function detectPvdaqFormatFromFilename(filename: string): DetectedFormat | null {
  const lower = filename.toLowerCase();
  if (lower.includes("ac_power")) return "pvdaq_ac_power";
  if (lower.includes("meter_data") || lower.includes("meter_pf")) return "pvdaq_meter";
  return null;
}

export function detectGranularity(records: ScadaInterval[]): IntervalGranularity {
  if (records.length < 2) return "monthly";

  const gaps: number[] = [];
  for (let i = 1; i < Math.min(records.length, 20); i++) {
    gaps.push(records[i].timestamp.getTime() - records[i - 1].timestamp.getTime());
  }
  gaps.sort((a, b) => a - b);
  const medianGapMs = gaps[Math.floor(gaps.length / 2)];

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  if (medianGapMs <= 20 * MINUTE) return "15min";
  if (medianGapMs <= 2 * HOUR) return "hourly";
  if (medianGapMs <= 7 * DAY) return "daily";
  return "monthly";
}

function computePeriodEnd(start: Date, granularity: IntervalGranularity): Date {
  const end = new Date(start);
  switch (granularity) {
    case "15min":
      end.setUTCMinutes(end.getUTCMinutes() + 15);
      break;
    case "hourly":
      end.setUTCHours(end.getUTCHours() + 1);
      break;
    case "daily":
      end.setUTCDate(end.getUTCDate() + 1);
      break;
    case "monthly":
      end.setUTCMonth(end.getUTCMonth() + 1);
      if (end.getUTCDate() !== 1) end.setUTCDate(1);
      break;
  }
  return end;
}

function computeCoveragePct(records: ScadaInterval[], granularity: IntervalGranularity): number {
  if (records.length < 2) return 100;
  const start = records[0].timestamp.getTime();
  const end = records[records.length - 1].timestamp.getTime();
  const spanMs = end - start;
  if (spanMs <= 0) return 100;

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  let expectedIntervalMs: number;
  switch (granularity) {
    case "15min": expectedIntervalMs = 15 * MINUTE; break;
    case "hourly": expectedIntervalMs = HOUR; break;
    case "daily": expectedIntervalMs = DAY; break;
    case "monthly": expectedIntervalMs = 30 * DAY; break;
  }

  const expectedCount = Math.floor(spanMs / expectedIntervalMs) + 1;
  return Math.min(100, Math.round((records.length / expectedCount) * 100));
}

function granularityToHours(granularity: IntervalGranularity): number {
  switch (granularity) {
    case "15min": return 0.25;
    case "hourly": return 1;
    case "daily": return 24;
    case "monthly": return 24 * 30;
  }
}

export class CsvConnector implements IScadaConnector {
  readonly name = "CSV Upload";
  readonly slug = "csv-upload";

  parseUpload(fileBuffer: Buffer, filename: string): CsvParseResult {
    const errors: string[] = [];
    const emptyResult = (errs: string[], totalRows = 0): CsvParseResult => ({
      success: false,
      records: [],
      fieldMapping: [],
      validation: { totalRows, validRows: 0, skippedRows: totalRows, dateRange: null, gapsDetected: 0, duplicatesDetected: 0, unit: "kwh", granularity: "monthly", coveragePercent: 0 },
      errors: errs,
      detectedGranularity: "monthly",
      detectedFormat: "standard",
      formatLabel: "Standard CSV",
    });

    let rawRecords: Record<string, string>[];
    try {
      rawRecords = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return emptyResult([`Failed to parse CSV: ${msg}`]);
    }

    if (rawRecords.length === 0) {
      return emptyResult(["CSV file is empty or has no data rows"]);
    }

    const headers = Object.keys(rawRecords[0]);
    const dateCol = detectDateColumn(headers);
    const prodCol = detectProductionColumn(headers);
    const powerCol = !prodCol ? detectPowerColumn(headers) : null;
    const cfCol = detectCapacityFactorColumn(headers);

    const isPowerMode = !prodCol && !!powerCol;
    const filenameHint = detectPvdaqFormatFromFilename(filename);
    let detectedFormat: DetectedFormat = "standard";
    let formatLabel = "Standard CSV";

    if (isPowerMode && powerCol) {
      detectedFormat = powerCol.format;
      formatLabel = powerCol.formatLabel;
    } else if (filenameHint && !prodCol) {
      detectedFormat = filenameHint;
      formatLabel = filenameHint === "pvdaq_ac_power" ? "PVDAQ AC Power (kW → kWh)" : "PVDAQ Meter Power (kW → kWh)";
    }

    if (!dateCol) {
      errors.push("No date/timestamp column detected. Expected column named: date, timestamp, time, period, datetime, or measdatetime");
    }
    if (!prodCol && !powerCol) {
      errors.push("No production or power column detected. Expected: production_kwh, production_mwh, kwh, mwh, ac_power, meter_power, or power_kw");
    }

    const valueCol = prodCol ? prodCol.column : powerCol?.column;
    const fieldMapping: FieldMapping[] = headers.map(h => {
      if (dateCol && h === dateCol) return { csvColumn: h, mapsTo: "periodStart", status: "mapped" as const };
      if (valueCol && h === valueCol) {
        if (isPowerMode) {
          return { csvColumn: h, mapsTo: "productionKwh (kW→kWh)", status: "mapped" as const };
        }
        const label = prodCol!.unit === "mwh" ? "productionMwh" : "productionMwh (÷1000)";
        return { csvColumn: h, mapsTo: label, status: "mapped" as const };
      }
      if (cfCol && h === cfCol) return { csvColumn: h, mapsTo: "capacityFactor", status: "mapped" as const };
      return { csvColumn: h, mapsTo: null, status: "skipped" as const };
    });

    if (errors.length > 0) {
      return {
        success: false,
        records: [],
        fieldMapping,
        validation: { totalRows: rawRecords.length, validRows: 0, skippedRows: rawRecords.length, dateRange: null, gapsDetected: 0, duplicatesDetected: 0, unit: prodCol?.unit || "kwh", granularity: "monthly", coveragePercent: 0 },
        errors,
        detectedGranularity: "monthly",
        detectedFormat,
        formatLabel,
      };
    }

    const records: ScadaInterval[] = [];
    let skippedRows = 0;
    const seenTimestamps = new Set<string>();
    let duplicatesDetected = 0;

    for (let i = 0; i < rawRecords.length; i++) {
      const row = rawRecords[i];
      const dateVal = row[dateCol!];
      const rawVal = row[valueCol!];

      const date = parseDate(dateVal);
      if (!date) {
        skippedRows++;
        continue;
      }

      const numVal = parseFloat(rawVal);
      if (isNaN(numVal)) {
        skippedRows++;
        continue;
      }

      if (numVal < 0) {
        if (!isPowerMode) {
          skippedRows++;
          continue;
        }
      }

      const tsKey = date.toISOString();
      if (seenTimestamps.has(tsKey)) {
        duplicatesDetected++;
        skippedRows++;
        continue;
      }
      seenTimestamps.add(tsKey);

      let productionKwh: number;
      const clampedVal = isPowerMode ? Math.max(0, numVal) : numVal;
      if (isPowerMode) {
        productionKwh = clampedVal;
      } else {
        productionKwh = prodCol!.unit === "mwh" ? clampedVal * 1000 : clampedVal;
      }

      let capacityFactor: number | undefined;
      if (cfCol && row[cfCol]) {
        const cf = parseFloat(row[cfCol]);
        if (!isNaN(cf)) capacityFactor = cf;
      }

      records.push({ timestamp: date, productionKwh, capacityFactor });
    }

    records.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const granularity = detectGranularity(records);

    if (isPowerMode && records.length > 1) {
      const deltas: number[] = [];
      for (let i = 1; i < records.length; i++) {
        const diffMs = records[i].timestamp.getTime() - records[i - 1].timestamp.getTime();
        if (diffMs > 0) deltas.push(diffMs);
      }
      const medianDeltaMs = deltas.length > 0
        ? deltas.sort((a, b) => a - b)[Math.floor(deltas.length / 2)]
        : granularityToHours(granularity) * 3600000;
      const intervalHours = medianDeltaMs / 3600000;

      for (let i = 0; i < records.length; i++) {
        records[i].productionKwh = records[i].productionKwh * intervalHours;
      }
    } else if (isPowerMode && records.length === 1) {
      const hoursPerInterval = granularityToHours(granularity);
      records[0].productionKwh = records[0].productionKwh * hoursPerInterval;
    }

    let gapsDetected = 0;
    if (records.length > 1) {
      const intervals = records.map((r, i) => i > 0 ? r.timestamp.getTime() - records[i - 1].timestamp.getTime() : 0).filter(d => d > 0);
      if (intervals.length > 0) {
        const medianInterval = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)];
        for (const interval of intervals) {
          if (interval > medianInterval * 1.8) gapsDetected++;
        }
      }
    }

    const dateRange = records.length > 0 ? {
      start: records[0].timestamp.toISOString().slice(0, 10),
      end: records[records.length - 1].timestamp.toISOString().slice(0, 10),
    } : null;

    const coveragePercent = computeCoveragePct(records, granularity);

    return {
      success: records.length > 0,
      records,
      fieldMapping,
      validation: {
        totalRows: rawRecords.length,
        validRows: records.length,
        skippedRows,
        dateRange,
        gapsDetected,
        duplicatesDetected,
        unit: "kwh",
        granularity,
        coveragePercent,
      },
      errors: records.length === 0 ? ["No valid records after parsing"] : [],
      detectedGranularity: granularity,
      detectedFormat,
      formatLabel,
    };
  }

  normalizeToSchema(records: ScadaInterval[], granularity: IntervalGranularity, capacityMw: number, source: string): NormalizedInterval[] {
    return records.map(r => {
      const periodStart = new Date(r.timestamp);
      const periodEnd = computePeriodEnd(periodStart, granularity);
      const productionMwh = r.productionKwh / 1000;
      const hoursInPeriod = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60);
      const cf = capacityMw > 0 && hoursInPeriod > 0
        ? productionMwh / (capacityMw * hoursInPeriod)
        : null;

      return {
        periodStart,
        periodEnd,
        productionMwh,
        capacityFactor: cf !== null ? Number(cf.toFixed(6)) : (r.capacityFactor ?? null),
        granularity,
        source,
      };
    });
  }

  async fetchIntervals(projectId: string, startDate: Date, endDate: Date): Promise<NormalizedInterval[]> {
    const { storage } = await import("../storage");
    const production = await storage.getProductionByProject(projectId);
    const filtered = production.filter(p => {
      if (p.source !== "CSV_UPLOAD" && p.source !== "SCADA" && p.source !== "MANUAL") return false;
      const ps = new Date(p.periodStart);
      const pe = new Date(p.periodEnd);
      return pe > startDate && ps < endDate;
    });

    return filtered.map(p => {
      const periodStart = new Date(p.periodStart);
      const periodEnd = new Date(p.periodEnd);
      const durationMs = periodEnd.getTime() - periodStart.getTime();
      const HOUR = 60 * 60 * 1000;
      const DAY = 24 * HOUR;

      let granularity: IntervalGranularity;
      if (durationMs <= 20 * 60 * 1000) granularity = "15min";
      else if (durationMs <= 2 * HOUR) granularity = "hourly";
      else if (durationMs <= 2 * DAY) granularity = "daily";
      else granularity = "monthly";

      return {
        periodStart,
        periodEnd,
        productionMwh: parseFloat(p.productionMwh),
        capacityFactor: p.capacityFactor ? parseFloat(p.capacityFactor) : null,
        granularity,
        source: p.source,
      };
    });
  }

  assessDataQuality(validation: CsvValidation): "HIGH" | "MEDIUM" | "LOW" {
    const { validRows, skippedRows, gapsDetected, duplicatesDetected, coveragePercent } = validation;
    const totalIssues = skippedRows + gapsDetected + duplicatesDetected;
    const issueRate = validRows > 0 ? totalIssues / validRows : 1;

    if (coveragePercent >= 95 && issueRate < 0.02 && gapsDetected === 0) return "HIGH";
    if (coveragePercent >= 80 && issueRate < 0.1 && gapsDetected <= 3) return "MEDIUM";
    return "LOW";
  }
}

export const csvConnector = new CsvConnector();

import { parse } from "csv-parse/sync";

export interface ScadaInterval {
  timestamp: Date;
  productionKwh: number;
  capacityFactor?: number;
}

export interface CsvParseResult {
  success: boolean;
  records: ScadaInterval[];
  fieldMapping: FieldMapping[];
  validation: CsvValidation;
  errors: string[];
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
}

export interface IScadaConnector {
  readonly name: string;
  readonly slug: string;
  parseUpload(fileBuffer: Buffer, filename: string): CsvParseResult;
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

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;

  return null;
}

function detectDateColumn(headers: string[]): string | null {
  const dateKeywords = ["date", "timestamp", "time", "period", "datetime", "period_start", "periodstart"];
  for (const h of headers) {
    if (dateKeywords.includes(h.toLowerCase().trim())) return h;
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

function detectCapacityFactorColumn(headers: string[]): string | null {
  const keywords = ["capacity_factor", "capacityfactor", "cf", "cap_factor"];
  const lower = headers.map(h => h.toLowerCase().trim());
  for (let i = 0; i < lower.length; i++) {
    if (keywords.includes(lower[i])) return headers[i];
  }
  return null;
}

export class CsvConnector implements IScadaConnector {
  readonly name = "CSV Upload";
  readonly slug = "csv-upload";

  parseUpload(fileBuffer: Buffer, filename: string): CsvParseResult {
    const errors: string[] = [];

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
      return {
        success: false,
        records: [],
        fieldMapping: [],
        validation: { totalRows: 0, validRows: 0, skippedRows: 0, dateRange: null, gapsDetected: 0, duplicatesDetected: 0, unit: "kwh" },
        errors: [`Failed to parse CSV: ${msg}`],
      };
    }

    if (rawRecords.length === 0) {
      return {
        success: false,
        records: [],
        fieldMapping: [],
        validation: { totalRows: 0, validRows: 0, skippedRows: 0, dateRange: null, gapsDetected: 0, duplicatesDetected: 0, unit: "kwh" },
        errors: ["CSV file is empty or has no data rows"],
      };
    }

    const headers = Object.keys(rawRecords[0]);
    const dateCol = detectDateColumn(headers);
    const prodCol = detectProductionColumn(headers);
    const cfCol = detectCapacityFactorColumn(headers);

    if (!dateCol) {
      errors.push("No date/timestamp column detected. Expected column named: date, timestamp, time, period, or datetime");
    }
    if (!prodCol) {
      errors.push("No production column detected. Expected column named: production_kwh, production_mwh, kwh, mwh, or production");
    }

    const fieldMapping: FieldMapping[] = headers.map(h => {
      if (dateCol && h === dateCol) return { csvColumn: h, mapsTo: "periodStart", status: "mapped" as const };
      if (prodCol && h === prodCol.column) {
        const label = prodCol.unit === "mwh" ? "productionMwh" : "productionMwh (÷1000)";
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
        validation: { totalRows: rawRecords.length, validRows: 0, skippedRows: rawRecords.length, dateRange: null, gapsDetected: 0, duplicatesDetected: 0, unit: prodCol?.unit || "kwh" },
        errors,
      };
    }

    const records: ScadaInterval[] = [];
    let skippedRows = 0;
    const seenTimestamps = new Set<string>();
    let duplicatesDetected = 0;

    for (let i = 0; i < rawRecords.length; i++) {
      const row = rawRecords[i];
      const dateVal = row[dateCol!];
      const prodVal = row[prodCol!.column];

      const date = parseDate(dateVal);
      if (!date) {
        skippedRows++;
        continue;
      }

      const prodNum = parseFloat(prodVal);
      if (isNaN(prodNum) || prodNum < 0) {
        skippedRows++;
        continue;
      }

      const tsKey = date.toISOString();
      if (seenTimestamps.has(tsKey)) {
        duplicatesDetected++;
        skippedRows++;
        continue;
      }
      seenTimestamps.add(tsKey);

      const productionKwh = prodCol!.unit === "mwh" ? prodNum * 1000 : prodNum;

      let capacityFactor: number | undefined;
      if (cfCol && row[cfCol]) {
        const cf = parseFloat(row[cfCol]);
        if (!isNaN(cf)) capacityFactor = cf;
      }

      records.push({ timestamp: date, productionKwh, capacityFactor });
    }

    records.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

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
        unit: prodCol!.unit,
      },
      errors: records.length === 0 ? ["No valid records after parsing"] : [],
    };
  }
}

export const csvConnector = new CsvConnector();

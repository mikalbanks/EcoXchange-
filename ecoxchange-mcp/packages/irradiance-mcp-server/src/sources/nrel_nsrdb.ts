import axios from "axios";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type { IrradianceRecord } from "@ecoxchange/shared";
import type { IrradianceSource } from "./base.js";
import type { GetDailyParams, CoverageResult } from "../types.js";
import { sourceRequest } from "./http.js";
import {
  NREL_NSRDB_BASE_URL,
  NREL_NSRDB_EARLIEST,
  REQUEST_TIMEOUT_MS,
} from "../constants.js";
import { isoYesterdayUtc } from "../dates.js";
import { ghiToPoa } from "../poa.js";

interface NrelDownloadResponse {
  outputs?: {
    downloadUrl?: string;
    message?: string;
  };
  metadata?: {
    status?: number;
  };
  errors?: string[];
}

const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 24; // 2 minutes

export class NrelNsrdbSource implements IrradianceSource {
  readonly name = "nrel_nsrdb";

  async getDailyRecords(
    params: GetDailyParams,
  ): Promise<IrradianceRecord[]> {
    const apiKey = process.env.NREL_API_KEY;
    if (!apiKey) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `NREL_API_KEY environment variable is required for nrel_nsrdb source.`,
      );
    }

    const startYear = parseInt(params.start_date.slice(0, 4), 10);
    const endYear = parseInt(params.end_date.slice(0, 4), 10);
    const years = Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i,
    );

    const submitted = await sourceRequest<NrelDownloadResponse>("NREL NSRDB", {
      method: "POST",
      url: `${NREL_NSRDB_BASE_URL}/nsrdb_psm3_download.json`,
      params: { api_key: apiKey },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: new URLSearchParams({
        wkt: `POINT(${params.lon} ${params.lat})`,
        names: years.join(","),
        attributes: "ghi,air_temperature",
        leap_day: "false",
        utc: "true",
        interval: "60",
      }).toString(),
    });

    const downloadUrl = submitted.outputs?.downloadUrl;
    if (!downloadUrl) {
      throw new McpError(
        ErrorCode.InternalError,
        `NREL NSRDB did not return a downloadUrl. Errors: ${(submitted.errors ?? []).join("; ")}`,
      );
    }

    const csv = await pollAndFetch(downloadUrl);
    return parseNrelCsv(csv, params);
  }

  async checkCoverage(_lat: number, _lon: number): Promise<CoverageResult> {
    return {
      available: true,
      earliest_date: NREL_NSRDB_EARLIEST,
      latest_date: isoYesterdayUtc(),
      resolution: "hourly",
    };
  }
}

async function pollAndFetch(url: string): Promise<string> {
  for (let i = 0; i < MAX_POLLS; i++) {
    try {
      const res = await axios.get<string>(url, {
        timeout: REQUEST_TIMEOUT_MS,
        responseType: "text",
        validateStatus: (s) => s === 200 || s === 202 || s === 404,
      });
      if (res.status === 200) return res.data;
    } catch {
      // swallow; retry until MAX_POLLS
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new McpError(
    ErrorCode.InternalError,
    `NREL NSRDB download did not complete within ${(POLL_INTERVAL_MS * MAX_POLLS) / 1000}s.`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseNrelCsv(
  csv: string,
  params: GetDailyParams,
): IrradianceRecord[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 4) return [];
  const headerLine = lines[2];
  const headers = headerLine.split(",");
  const idxYear = headers.indexOf("Year");
  const idxMonth = headers.indexOf("Month");
  const idxDay = headers.indexOf("Day");
  const idxGhi = headers.indexOf("GHI");
  const idxTemp = headers.indexOf("Temperature");
  if (idxYear < 0 || idxMonth < 0 || idxDay < 0 || idxGhi < 0) {
    throw new McpError(
      ErrorCode.InternalError,
      `NREL NSRDB CSV missing required columns (Year/Month/Day/GHI).`,
    );
  }

  const dailyGhi = new Map<string, number>();
  const dailyTempSum = new Map<string, { sum: number; n: number }>();
  for (let i = 3; i < lines.length; i++) {
    const cells = lines[i].split(",");
    const y = cells[idxYear];
    const m = cells[idxMonth].padStart(2, "0");
    const d = cells[idxDay].padStart(2, "0");
    const date = `${y}-${m}-${d}`;
    const ghiWm2 = parseFloat(cells[idxGhi]);
    if (!Number.isNaN(ghiWm2)) {
      dailyGhi.set(date, (dailyGhi.get(date) ?? 0) + ghiWm2);
    }
    if (idxTemp >= 0) {
      const t = parseFloat(cells[idxTemp]);
      if (!Number.isNaN(t)) {
        const cur = dailyTempSum.get(date) ?? { sum: 0, n: 0 };
        cur.sum += t;
        cur.n += 1;
        dailyTempSum.set(date, cur);
      }
    }
  }

  const usePoa =
    params.tilt_deg !== undefined && params.azimuth_deg !== undefined;
  const out: IrradianceRecord[] = [];
  for (const [date, sumWm2h] of dailyGhi) {
    if (date < params.start_date || date > params.end_date) continue;
    const ghi_kwh_m2 = sumWm2h / 1000;
    const tempBucket = dailyTempSum.get(date);
    const record: IrradianceRecord = {
      lat: params.lat,
      lon: params.lon,
      date,
      ghi_kwh_m2,
      source: "nrel_nsrdb",
      data_version: "PSM3",
    };
    if (tempBucket && tempBucket.n > 0) {
      record.air_temp_c = tempBucket.sum / tempBucket.n;
    }
    if (usePoa) {
      record.poa_kwh_m2 = ghiToPoa({
        ghi_kwh_m2,
        lat: params.lat,
        lon: params.lon,
        date,
        tilt_deg: params.tilt_deg!,
        azimuth_deg: params.azimuth_deg!,
      });
    }
    out.push(record);
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out;
}

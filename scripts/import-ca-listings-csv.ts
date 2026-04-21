/**
 * Imports CA Q2 listings (or similar) CSV into shared/catalog-projects.data.ts.
 *
 * Usage:
 *   npm run catalog:import -- path/to/file.csv
 *   npm run catalog:import   # defaults to data/catalog/ca-listings.csv
 *
 * Copy your Windows CSV into the repo first, e.g.:
 *   cp ~/Downloads/CA-2026-Q2_Listings_2026-04-21.csv data/catalog/ca-listings.csv
 */

import { parse } from "csv-parse/sync";
import * as fs from "node:fs";
import * as path from "node:path";

import type { CatalogProjectRow, CatalogStage, CatalogTechnology } from "../shared/catalog-projects.types.ts";

const DEFAULT_INPUT = path.join(process.cwd(), "data/catalog/ca-listings.csv");

const TECH_SET = new Set<CatalogTechnology>(["SOLAR", "SOLAR_STORAGE"]);
const STAGE_SET = new Set<CatalogStage>(["PRE_NTP", "NTP", "CONSTRUCTION", "COD"]);

function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[%$]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return base || "project";
}

function pickRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const nk = normalizeHeader(k);
    if (!nk || v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s.length) continue;
    out[nk] = s;
  }
  return out;
}

function numFromCell(s: string | undefined): number | null {
  if (!s?.trim()) return null;
  const cleaned = s.replace(/[, $]/g, "").replace(/%/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function fmtMoney(n: number): string {
  return n.toFixed(2);
}

function fmtCoord(n: number): string {
  return n.toFixed(6);
}

function parseBool(s: string | undefined, fallback: boolean): boolean {
  if (!s?.trim()) return fallback;
  const x = s.trim().toUpperCase();
  if (["Y", "YES", "TRUE", "1"].includes(x)) return true;
  if (["N", "NO", "FALSE", "0"].includes(x)) return false;
  return fallback;
}

function parseTechnology(s: string | undefined): CatalogTechnology {
  const u = (s ?? "SOLAR").trim().toUpperCase().replace(/\s+/g, "_").replace(/\+/g, "_");
  const compact = u.replace(/_/g, "");
  if (compact.includes("STORAGE") || compact.includes("BESS") || u.includes("SOLAR_STORAGE")) return "SOLAR_STORAGE";
  if (TECH_SET.has(u as CatalogTechnology)) return u as CatalogTechnology;
  return "SOLAR";
}

function parseStage(s: string | undefined): CatalogStage {
  const raw = (s ?? "COD").trim().toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (raw === "PRE_NTP" || raw === "PRENTP") return "PRE_NTP";
  if (STAGE_SET.has(raw as CatalogStage)) return raw as CatalogStage;
  const codish = ["OPERATING", "OPERATIONAL", "ONLINE", "COMPLETE", "COD", "COMMISSIONED"];
  if (codish.some((x) => raw.includes(x))) return "COD";
  if (raw.includes("CONSTRUCTION") || raw.includes("BUILD")) return "CONSTRUCTION";
  if (raw.includes("NTP")) return "NTP";
  if (raw.includes("PRE") && raw.includes("NTP")) return "PRE_NTP";
  return "COD";
}

function parseOfftaker(s: string | undefined): CatalogProjectRow["offtakerType"] {
  const u = (s ?? "UTILITY").trim().toUpperCase();
  if (u.includes("COMMUNITY")) return "COMMUNITY_SOLAR";
  if (u.includes("C&I") || u.includes("C_I") || u.includes("COMMERCIAL")) return "C_AND_I";
  if (u.includes("MERCHANT")) return "MERCHANT";
  return "UTILITY";
}

function parseEnum<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  const u = (value ?? fallback).trim().toUpperCase().replace(/\s+/g, "_");
  return (allowed as readonly string[]).includes(u) ? (u as T) : fallback;
}

function capacityMwFrom(row: Record<string, string>): number | null {
  const keysMw = ["capacity_mw", "capacitymw", "mw_ac", "mw", "size_mw", "dc_mw", "ac_mw"];
  for (const k of keysMw) {
    const n = numFromCell(row[k]);
    if (n !== null && n > 0) return n;
  }
  const keysKw = ["capacity_kw", "capacitykw", "kw", "size_kw", "kwp", "kw_ac"];
  for (const k of keysKw) {
    const n = numFromCell(row[k]);
    if (n !== null && n > 0) return n / 1000;
  }
  const textBlob = [
    row.listing,
    row.legal_description,
    row.summary,
    row.description,
    row.notes,
    row.comments,
  ]
    .filter(Boolean)
    .join(" ");
  const fromText = extractMwFromText(textBlob);
  return fromText;
}

/** Pull "12.5 MW", "12.5MW AC", "~20 MW DC" from free text. */
function extractMwFromText(s: string): number | null {
  if (!s?.trim()) return null;
  const re = /(?:~)?\s*([\d,.]+)\s*(?:mw|megawatts?)\b(?:\s*\(?\s*(?:ac|dc)\s*\)?)?/gi;
  let best = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const n = numFromCell(m[1]);
    if (n !== null && n > best) best = n;
  }
  return best > 0 ? best : null;
}

/** Best-effort county/state from CA legal descriptions and addresses. */
function parseCountyStateFromLegal(legal: string | undefined): { county: string | null; state: string | null } {
  if (!legal?.trim()) return { county: null, state: null };
  const s = legal.replace(/\s+/g, " ");

  const countyOf = /\bCounty\s+of\s+([^,]+?)(?:,|\s+State\b|\s+California\b|$)/i.exec(s);
  if (countyOf?.[1]) return { county: countyOf[1].trim(), state: "CA" };

  const xCounty = /\b([^,]+?)\s+County\b/i.exec(s);
  if (xCounty?.[1]) return { county: xCounty[1].trim(), state: "CA" };

  const caZip = /\bCA\b\s*,?\s*9\d{4}\b|\b9\d{4}\s*,?\s*CA\b/i.test(s);
  if (caZip) return { county: null, state: "CA" };

  return { county: null, state: null };
}

function inferStageFromAuction(row: Record<string, string>): CatalogStage | null {
  const blob = [
    row.bid_status,
    row.status_outcome,
    row.status,
    row.phase,
    row.stage,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  if (!blob.trim()) return null;
  if (/CLOSED|COMPLETE|SOLD|AWARD|WINNING|CONSUMM/i.test(blob)) return "COD";
  if (/UNDER\s*CONSTRUCTION|CONSTRUCTION/i.test(blob)) return "CONSTRUCTION";
  if (/NTP|NOTICE\s+TO\s+PROC/i.test(blob)) return "NTP";
  if (/PRE[\s_-]*NTP|EARLY|LISTING\s+ONLY/i.test(blob)) return "PRE_NTP";
  return null;
}

function inferPermittingFromOutcome(row: Record<string, string>): CatalogProjectRow["permittingStatus"] | null {
  const o = (row.status_outcome ?? row.bid_status ?? "").trim().toUpperCase();
  if (!o) return null;
  if (/APPROVED|COMPLETE|CLOSED|AWARD/i.test(o)) return "APPROVED";
  if (/PENDING|REVIEW|SUBMIT/i.test(o)) return "SUBMITTED";
  if (/PROGRESS|ACTIVE/i.test(o)) return "IN_PROGRESS";
  return null;
}

function getFirst(row: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    if (row[k]?.length) return row[k];
  }
  return undefined;
}

function parseLatLonPair(s: string | undefined): { lat: number; lon: number } | null {
  if (!s?.includes(",")) return null;
  const parts = s.split(",").map((p) => p.trim());
  if (parts.length < 2) return null;
  const lat = numFromCell(parts[0]);
  const lon = numFromCell(parts[1]);
  if (lat === null || lon === null) return null;
  return { lat, lon };
}

function csvRowToCatalog(row: Record<string, string>, index: number): CatalogProjectRow {
  const legalText =
    getFirst(row, ["legal_description", "legal_description_property", "site"]) ?? "";

  const name =
    getFirst(row, ["project_name", "name", "site_name", "asset_name", "listing", "title"]) ?? `Project ${index + 1}`;

  const mw = capacityMwFrom(row);
  const capacityMW = mw !== null ? fmtMoney(mw) : "1.00";

  const parsedLoc = parseCountyStateFromLegal(legalText);
  const countyFromCsv = getFirst(row, ["county"]);
  const county = countyFromCsv ?? parsedLoc.county ?? "Unknown";

  const stateRaw = getFirst(row, ["state", "st"]) ?? parsedLoc.state ?? "CA";

  const combined = parseLatLonPair(
    getFirst(row, ["lat_lon", "latlong", "lat_lng", "coordinates", "location", "site_coordinates"]),
  );
  const lat =
    numFromCell(getFirst(row, ["latitude", "lat"])) ?? combined?.lat ?? 36.7783;
  const lng =
    numFromCell(getFirst(row, ["longitude", "lng", "lon"])) ?? combined?.lon ?? -119.4179;

  const taxPct = numFromCell(getFirst(row, ["tax_credit_pct", "itc_pct", "itc"])) ?? 30;

  const winningBidRaw = numFromCell(getFirst(row, ["winning_bid"]));
  const totalCapexRaw =
    numFromCell(getFirst(row, ["total_capex", "capex", "project_cost", "total_cost"])) ??
    winningBidRaw;

  const capexStr =
    totalCapexRaw !== null ? String(Math.round(totalCapexRaw)) : String(Math.round((mw ?? 1) * 1_100_000));

  const taxCreditEstimated =
    totalCapexRaw !== null ? String(Math.round(totalCapexRaw * (taxPct / 100))) : String(Math.round(Number(capexStr) * (taxPct / 100)));
  const equityNeeded =
    totalCapexRaw !== null
      ? String(Math.round(totalCapexRaw - Number(taxCreditEstimated)))
      : String(Math.round(Number(capexStr) - Number(taxCreditEstimated)));

  const pricePerMwhRaw = numFromCell(getFirst(row, ["price_per_mwh", "ppa_", "energy_price", "$/mwh", "mwh_price"]));
  const pricePerMwh = pricePerMwhRaw !== null ? fmtMoney(pricePerMwhRaw) : "45.00";

  const ppaRateFrac = numFromCell(getFirst(row, ["ppa_rate", "contract_rate_frac"]));
  const ppaRate =
    ppaRateFrac !== null ? fmtMoney(ppaRateFrac > 1 ? ppaRateFrac / 100 : ppaRateFrac) : fmtMoney(Number(pricePerMwh) / 1000);

  const auctionParts: string[] = [];
  const bs = getFirst(row, ["bid_status"]);
  const so = getFirst(row, ["status_outcome"]);
  const wb = getFirst(row, ["winning_bid"]);
  const wbd = getFirst(row, ["winning_bidder"]);
  const ci = getFirst(row, ["closing_information"]);
  if (bs) auctionParts.push(`Bid status: ${bs}`);
  if (so) auctionParts.push(`Outcome: ${so}`);
  if (wb) auctionParts.push(`Winning bid: ${wb}`);
  if (wbd) auctionParts.push(`Bidder: ${wbd}`);
  if (ci) auctionParts.push(`Closing: ${ci}`);
  const auctionFooter = auctionParts.length ? `\n${auctionParts.join(". ")}.` : "";

  const summary =
    getFirst(row, ["summary", "description", "notes", "comments"]) ??
    (legalText.trim().length > 0
      ? `${name}. ${legalText.trim()}${auctionFooter}`
      : `${name} — California auction listing imported from CSV.${auctionFooter}`.trim());

  const escalationRaw = getFirst(row, ["escalation_rate", "escalation_pct", "esc_pct"]);
  const escalationNum = numFromCell(escalationRaw);
  const escalationType: "FIXED" | "ESCALATING" =
    escalationNum !== null && escalationNum > 0 ? "ESCALATING" : "FIXED";
  const escalationRate =
    escalationNum !== null ? fmtMoney(escalationNum > 1 ? escalationNum : escalationNum * 100) : "0";

  const inferredStage =
    inferStageFromAuction(row) ??
    parseStage(getFirst(row, ["stage", "phase", "status_stage"]));

  const inferredPermitting =
    inferPermittingFromOutcome(row) ??
    parseEnum(getFirst(row, ["permitting_status", "permits"]), [
      "APPROVED",
      "IN_PROGRESS",
      "SUBMITTED",
      "UNKNOWN",
    ], "UNKNOWN");

  const auctionNotesParts: string[] = [];
  if (winningBidRaw !== null && totalCapexRaw !== null && Math.abs(winningBidRaw - totalCapexRaw) < 1e-6) {
    auctionNotesParts.push(`Recorded winning bid used as illustrative total capital proxy.`);
  }
  const capitalNotesCombined =
    [getFirst(row, ["capital_notes", "notes_capital"]), auctionNotesParts.join(" ")].filter(Boolean).join(" ").trim() || null;

  return {
    slug: `${slugify(name)}-${index + 1}`,
    name,
    technology: parseTechnology(getFirst(row, ["technology", "tech", "type"])),
    stage: inferredStage,
    state: stateRaw.slice(0, 2).toUpperCase(),
    county,
    latitude: fmtCoord(lat),
    longitude: fmtCoord(lng),
    capacityMW,
    offtakerType: parseOfftaker(getFirst(row, ["offtaker_type", "offtaker", "buyer_type"])),
    interconnectionStatus: parseEnum(getFirst(row, ["interconnection_status", "interconnection"]), [
      "IA_EXECUTED",
      "APPLIED",
      "STUDY",
      "READY_TO_BUILD",
      "UNKNOWN",
    ], "UNKNOWN"),
    permittingStatus: inferredPermitting,
    siteControlStatus: parseEnum(getFirst(row, ["site_control_status", "site_control"]), [
      "LEASE",
      "OWNED",
      "OPTION",
      "LOI",
      "NONE",
    ], "NONE"),
    feocAttested: parseBool(getFirst(row, ["feoc_attested", "feoc"]), false),
    ppaRate,
    monthlyDebtService: getFirst(row, ["monthly_debt_service", "debt_service_monthly"]) ?? "0",
    monthlyOpex: getFirst(row, ["monthly_opex", "opex_monthly"]) ?? "0",
    reserveRate: getFirst(row, ["reserve_rate", "reserve_pct"]) ?? "0.05",
    summary,
    totalCapex: capexStr,
    taxCreditType: parseEnum(getFirst(row, ["tax_credit_type"]), ["ITC", "PTC", "UNKNOWN"], "ITC"),
    taxCreditEstimated,
    taxCreditTransferabilityReady: parseBool(getFirst(row, ["transferability_ready", "itc_transfer"]), true),
    equityNeeded,
    capitalNotes: capitalNotesCombined,
    offtakerName:
      getFirst(row, ["offtaker_name", "counterparty", "utility", "winning_bidder"]) ?? "TBD",
    pricePerMwh,
    escalationType,
    escalationRate,
  };
}

function escapeString(s: string): string {
  return JSON.stringify(s);
}

function emitTs(rows: CatalogProjectRow[]): string {
  const lines: string[] = [];
  lines.push(`import type { CatalogProjectRow } from "./catalog-projects.types.ts";`);
  lines.push("");
  lines.push(`/** Canonical project rows — generated by scripts/import-ca-listings-csv.ts */`);
  lines.push("");
  lines.push(`export const CATALOG_PROJECTS: CatalogProjectRow[] = [`);

  for (const r of rows) {
    lines.push(`  {`);
    lines.push(`    slug: ${escapeString(r.slug)},`);
    lines.push(`    name: ${escapeString(r.name)},`);
    lines.push(`    technology: ${escapeString(r.technology)},`);
    lines.push(`    stage: ${escapeString(r.stage)},`);
    lines.push(`    state: ${escapeString(r.state)},`);
    lines.push(`    county: ${escapeString(r.county)},`);
    lines.push(`    latitude: ${escapeString(r.latitude)},`);
    lines.push(`    longitude: ${escapeString(r.longitude)},`);
    lines.push(`    capacityMW: ${escapeString(r.capacityMW)},`);
    lines.push(`    offtakerType: ${escapeString(r.offtakerType)},`);
    lines.push(`    interconnectionStatus: ${escapeString(r.interconnectionStatus)},`);
    lines.push(`    permittingStatus: ${escapeString(r.permittingStatus)},`);
    lines.push(`    siteControlStatus: ${escapeString(r.siteControlStatus)},`);
    lines.push(`    feocAttested: ${r.feocAttested},`);
    lines.push(`    ppaRate: ${escapeString(r.ppaRate)},`);
    lines.push(`    monthlyDebtService: ${escapeString(r.monthlyDebtService)},`);
    lines.push(`    monthlyOpex: ${escapeString(r.monthlyOpex)},`);
    lines.push(`    reserveRate: ${escapeString(r.reserveRate)},`);
    lines.push(`    summary: ${escapeString(r.summary)},`);
    lines.push(`    totalCapex: ${escapeString(r.totalCapex)},`);
    lines.push(`    taxCreditType: ${escapeString(r.taxCreditType)},`);
    lines.push(`    taxCreditEstimated: ${escapeString(r.taxCreditEstimated)},`);
    lines.push(`    taxCreditTransferabilityReady: ${r.taxCreditTransferabilityReady},`);
    lines.push(`    equityNeeded: ${escapeString(r.equityNeeded)},`);
    lines.push(`    capitalNotes: ${r.capitalNotes === null ? "null" : escapeString(r.capitalNotes)},`);
    lines.push(`    offtakerName: ${escapeString(r.offtakerName)},`);
    lines.push(`    pricePerMwh: ${escapeString(r.pricePerMwh)},`);
    lines.push(`    escalationType: ${escapeString(r.escalationType)},`);
    lines.push(`    escalationRate: ${escapeString(r.escalationRate)},`);
    lines.push(`  },`);
  }

  lines.push(`];`);
  lines.push("");
  return lines.join("\n");
}

function main() {
  const inputPath = path.resolve(process.argv[2] ?? DEFAULT_INPUT);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input CSV not found: ${inputPath}`);
    console.error("Copy your file into the repo and pass the path, or place it at data/catalog/ca-listings.csv");
    process.exit(1);
  }

  const csvText = fs.readFileSync(inputPath, "utf8");
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const mapped = records.map((rec, i) => csvRowToCatalog(pickRow(rec), i));

  const below = mapped.filter((r) => parseFloat(r.capacityMW) < 1);
  if (below.length) {
    console.warn(`Warning: ${below.length} row(s) below 1 MW AC — they remain in the catalog but are excluded from investor browse by catalogProjectsAtLeast1Mw().`);
  }

  const outPath = path.join(process.cwd(), "shared/catalog-projects.data.ts");
  fs.writeFileSync(outPath, emitTs(mapped), "utf8");
  console.log(`Wrote ${mapped.length} projects to ${outPath}`);
}

main();

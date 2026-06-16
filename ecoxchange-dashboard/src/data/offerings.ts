import demoOfferingJson from "./demo-offering.json";
import { supabase } from "../lib/supabase.js";
import type {
  Offering,
  OfferingProject,
  OfferingSummary,
  OfferingVerificationSummary,
  ProjectDocument,
} from "../types/offerings.js";

const demoOffering = demoOfferingJson as OfferingSummary;

// Columns the offering summary needs from the joined `projects` row.
const PROJECT_COLS =
  "latitude, longitude, capacity_kw_dc, tilt_deg, azimuth_deg, inverter_brand, commissioning_date, offtake_type";

// supabase-js returns a to-one embed as either an object or a single-element
// array depending on how it infers the relationship. Normalize to one object.
function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function deriveVerificationSummary(
  projectId: string,
): Promise<OfferingVerificationSummary | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("verification_records")
    .select("status, period_start, inverter_kwh")
    .eq("project_id", projectId)
    .order("period_start", { ascending: false });
  if (error || !data || data.length === 0) return null;

  const rows = data as {
    status: "verified" | "flagged" | "pending";
    period_start: string;
    inverter_kwh: number | null;
  }[];

  return {
    total_months_verified: rows.filter((r) => r.status === "verified").length,
    latest_status: rows[0].status,
    latest_period: rows[0].period_start,
    cumulative_kwh_verified: rows
      .filter((r) => r.status === "verified")
      .reduce((sum, r) => sum + (r.inverter_kwh ?? 0), 0),
  };
}

export async function getOfferingBySlug(
  slug: string,
): Promise<OfferingSummary | null> {
  if (!supabase) {
    return slug === demoOffering.slug ? demoOffering : null;
  }

  const { data, error } = await supabase
    .from("offerings")
    .select(`*, project:projects (${PROJECT_COLS}), documents:project_documents (*)`)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getOfferingBySlug: ${error.message}`);
  if (!data) return null;

  const row = data as Offering & {
    project: OfferingProject | OfferingProject[] | null;
    documents: ProjectDocument[] | null;
  };

  const verification_summary = await deriveVerificationSummary(row.project_id);

  return {
    ...row,
    project: firstOrSelf(row.project) as OfferingProject,
    documents: row.documents ?? [],
    verification_summary,
  };
}

export async function getOpenOfferings(): Promise<Offering[]> {
  if (!supabase) {
    return [demoOffering];
  }
  const { data, error } = await supabase
    .from("offerings")
    .select("*")
    .in("status", ["open", "coming_soon"])
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getOpenOfferings: ${error.message}`);
  return (data ?? []) as Offering[];
}

import { supabase } from "./client.js";
import type { VerificationSourceLeg } from "./types.js";

const TABLE = "verification_source_legs";

type NewSourceLeg = Omit<VerificationSourceLeg, "id" | "created_at">;

function validateSourceLeg(leg: NewSourceLeg): void {
  if (leg.basis === "derived" && !leg.depends_on_source) {
    throw new Error("A derived verification source leg must identify depends_on_source");
  }
  const calculated = leg.expected_intervals > 0
    ? (leg.observed_intervals / leg.expected_intervals) * 100
    : 0;
  if (Math.abs(calculated - leg.coverage_pct) > 0.01) {
    throw new Error("verification source leg coverage_pct does not match its interval counts");
  }
}

/** Stores one evidence leg without overwriting a historical determination. */
export async function storeVerificationSourceLeg(
  leg: NewSourceLeg,
): Promise<VerificationSourceLeg> {
  validateSourceLeg(leg);
  const { data, error } = await supabase.from(TABLE).insert(leg).select().single();
  if (error) throw new Error(`storeVerificationSourceLeg: ${error.message}`);
  if (!data) throw new Error("storeVerificationSourceLeg: no row returned");
  return data as VerificationSourceLeg;
}

export async function getVerificationSourceLegs(
  verificationRecordId: string,
): Promise<VerificationSourceLeg[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("verification_record_id", verificationRecordId)
    .order("source", { ascending: true });
  if (error) throw new Error(`getVerificationSourceLegs: ${error.message}`);
  return (data ?? []) as VerificationSourceLeg[];
}

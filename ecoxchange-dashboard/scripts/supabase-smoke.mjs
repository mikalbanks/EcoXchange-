// Smoke test: exercise the dashboard's Supabase queries server-side against the
// live project (using the anon key) to confirm RLS lets them through and the
// shapes match what the UI consumes. Run from the dashboard dir:
//   node --env-file=.env scripts/supabase-smoke.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}
const supabase = createClient(url, key);

const { data: projects, error } = await supabase
  .from("projects")
  .select("id, name, latitude, longitude, capacity_kw_dc, status")
  .eq("status", "active");
if (error) throw error;
console.log(`projects: ${projects.length} active`);
for (const p of projects) {
  console.log(`  ${p.id}  ${p.name}  ${p.capacity_kw_dc}kW`);
}

const ids = projects.map((p) => p.id);
const { data: recs, error: rerr } = await supabase
  .from("verification_records")
  .select(
    "project_id, period_start, status, inverter_kwh, expected_kwh, estimated_revenue",
  )
  .in("project_id", ids)
  .order("period_start", { ascending: true });
if (rerr) throw rerr;
console.log(`verification_records: ${recs.length}`);
const first = recs[0];
const last = recs[recs.length - 1];
console.log(
  `  first: ${first.period_start} status=${first.status} inv=${first.inverter_kwh} rev=${first.estimated_revenue}`,
);
console.log(
  `  last:  ${last.period_start} status=${last.status} inv=${last.inverter_kwh} rev=${last.estimated_revenue}`,
);

const total = recs.reduce((s, r) => s + (r.estimated_revenue ?? 0), 0);
const annualKwh =
  recs.length > 0
    ? (recs.reduce((s, r) => s + (r.inverter_kwh ?? 0), 0) * 12) / recs.length
    : 0;
console.log(`computed:`);
console.log(`  total revenue:    $${total.toLocaleString()}`);
console.log(`  annualized kWh:   ${Math.round(annualKwh).toLocaleString()}`);
console.log(`  investor 2% lifetime: $${Math.round(total * 0.02).toLocaleString()}`);
console.log(`  investor 2% monthly:  $${Math.round((last.estimated_revenue ?? 0) * 0.02).toLocaleString()}`);

console.log("\nOK");

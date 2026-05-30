import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log("Supabase env vars are not configured; smoke test skipped.");
  process.exit(0);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const { data: projects, error: projectError } = await supabase
  .from("projects")
  .select("id, status")
  .eq("status", "active")
  .limit(10);

if (projectError) {
  throw new Error(`projects query failed: ${projectError.message}`);
}

const ids = (projects ?? []).map((project) => project.id);
let recordCount = 0;

if (ids.length > 0) {
  const { count, error: recordError } = await supabase
    .from("verification_records")
    .select("project_id", { count: "exact", head: true })
    .in("project_id", ids);

  if (recordError) {
    throw new Error(`verification_records query failed: ${recordError.message}`);
  }
  recordCount = count ?? 0;
}

console.log(
  `Supabase smoke passed: ${ids.length} active project(s), ${recordCount} verification record(s).`,
);

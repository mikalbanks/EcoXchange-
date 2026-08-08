/**
 * Lazily-initialised Supabase client for the Polymesh module.
 *
 * Deliberately NOT `../db/client.js`. That module throws at import time when
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are absent, which is fine for the
 * CLI but fatal for anything the Express server imports — the server must boot
 * with Supabase unconfigured and degrade to in-memory. `backtest-supabase-writer.ts`
 * hit exactly this and documents the same workaround; this is the reusable form
 * of it, scoped to Layer A and Layer C.
 *
 * `requireClient()` throws only when it is actually called, so importing this
 * file is always safe.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// `undefined` = not yet probed, `null` = probed and disabled (env missing).
let cached: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** The service-role client, or null when Supabase is unconfigured. */
export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached =
    url && key
      ? createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  return cached;
}

/** For call sites that cannot proceed without persistence. */
export function requireClient(): SupabaseClient {
  const client = getSupabase();
  if (!client) {
    throw new Error(
      "Polymesh persistence requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return client;
}

/** Test seam: drops the memoised client so env changes take effect. */
export function resetSupabaseForTests(): void {
  cached = undefined;
}

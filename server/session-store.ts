/**
 * Session store selection, built so the session layer can never take auth down.
 *
 * History: `DATABASE_URL` pointed at a paused Supabase project, so the Supavisor
 * pooler rejected every connection with "Tenant or user not found". Because
 * express-session runs `store.get` before every handler, that error reached the
 * global error handler and turned *every authenticated request* — including
 * retried logins — into a 500. The whole app looked healthy until you signed in,
 * since users and app data live in MemStorage and need no database at all.
 *
 * Two guards here:
 *   1. A boot-time probe: an unreachable database means we start on memory.
 *   2. A runtime wrapper: if Postgres dies mid-process, the store degrades to
 *      memory instead of propagating the error. Sessions issued before the
 *      switch are lost, which logs users out once — infinitely better than a
 *      site-wide 500.
 */
import session from "express-session";
import MemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import { pool, isDatabaseConfigured, probeDatabase } from "./db";

const MemoryStoreCtor = MemoryStore(session);
const PgStoreCtor = connectPgSimple(session);

const createMemoryStore = () => new MemoryStoreCtor({ checkPeriod: 86400000 });

export type SessionStoreKind = "postgres" | "memory";

let activeKind: SessionStoreKind = "memory";

/** Which backend sessions are actually being served from right now. */
export const getSessionStoreKind = (): SessionStoreKind => activeKind;

/**
 * Wraps a Postgres-backed store so a connection-class failure falls back to an
 * in-process store rather than erroring. Once degraded we stay degraded for the
 * life of the process; flapping between backends would scatter sessions across
 * two stores and log users out unpredictably.
 */
function withMemoryFallback(pgStore: session.Store): session.Store {
  const fallback = createMemoryStore();
  let degraded = false;

  const degrade = (method: string, err: unknown) => {
    if (degraded) return;
    degraded = true;
    activeKind = "memory";
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[session] Postgres store failed during ${method}: ${message}\n` +
        "[session] Falling back to in-memory sessions for the rest of this " +
        "process. Sessions will not survive a restart. Check DATABASE_URL and " +
        "that the Supabase project is not paused.",
    );
  };

  // Delegate to whichever store is live. On a Postgres error we degrade and
  // immediately retry against memory, so the caller still gets a usable result.
  const proxy = new Proxy(pgStore, {
    get(target, prop, receiver) {
      if (prop === "get" || prop === "set" || prop === "destroy" || prop === "touch") {
        return (...args: any[]) => {
          const callback = args[args.length - 1];
          const hasCallback = typeof callback === "function";
          const leading = hasCallback ? args.slice(0, -1) : args;

          const runFallback = () => {
            const fn = (fallback as any)[prop];
            if (typeof fn !== "function") {
              // memorystore implements all four, but stay defensive: report "no
              // session" rather than throwing.
              if (hasCallback) callback(null, undefined);
              return;
            }
            fn.call(fallback, ...leading, (err: unknown, result?: unknown) => {
              if (hasCallback) callback(err ?? null, result);
            });
          };

          if (degraded) return runFallback();

          try {
            return (target as any)[prop].call(
              target,
              ...leading,
              (err: unknown, result?: unknown) => {
                if (err) {
                  degrade(String(prop), err);
                  return runFallback();
                }
                if (hasCallback) callback(null, result);
              },
            );
          } catch (err) {
            degrade(String(prop), err);
            return runFallback();
          }
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  return proxy as session.Store;
}

/**
 * Picks a session store. Postgres when `DATABASE_URL` is set *and* reachable,
 * otherwise in-memory. Note the old code only fell back when `DATABASE_URL` was
 * unset — a set-but-broken URL had no fallback, which is what broke production.
 */
export async function createSessionStore(): Promise<session.Store> {
  if (!isDatabaseConfigured()) {
    console.log("[session] DATABASE_URL not set — using in-memory session store.");
    activeKind = "memory";
    return createMemoryStore();
  }

  const reachable = await probeDatabase();
  if (!reachable) {
    console.error(
      "[session] DATABASE_URL is set but the database is unreachable — using " +
        "in-memory sessions so sign-in keeps working. Sessions will not " +
        "survive a restart.",
    );
    activeKind = "memory";
    return createMemoryStore();
  }

  console.log("[session] Using Postgres session store.");
  activeKind = "postgres";
  return withMemoryFallback(
    new PgStoreCtor({ pool, tableName: "session", createTableIfMissing: true }),
  );
}

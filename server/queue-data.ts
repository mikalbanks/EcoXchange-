/**
 * Interconnection queue rows + analytics: Drizzle when DATABASE_URL is set, else MemStorage demo.
 */
import { db } from "./db";
import { storage } from "./storage";
import { eq, and, gte, sql, asc, or, isNull, inArray } from "drizzle-orm";
import {
  interconnectionQueueEntries,
  queueEntryAnalytics,
  jurisdictionPpaBenchmarks,
  type InterconnectionQueueEntry,
  type QueueEntryAnalytics,
  type InsertQueueEntryAnalytics,
} from "@shared/schema";
import {
  computeQueueEntryAnalytics,
  type QueueAnalyticsResult,
} from "./services/queue-analytics-engine";

export type QueueListFilters = {
  state?: string;
  isoCode?: string;
  minMw?: number;
  status?: "READY" | "ALL";
  limit?: number;
  offset?: number;
};

export type QueueListItem = InterconnectionQueueEntry & {
  analytics: QueueEntryAnalytics | null;
};

function useDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function listJurisdictionPpaForState(
  state: string,
  isoCode?: string,
): Promise<typeof jurisdictionPpaBenchmarks.$inferSelect | undefined> {
  if (!useDb()) return undefined;
  const st = state.trim().toUpperCase();
  const rows = await db
    .select()
    .from(jurisdictionPpaBenchmarks)
    .where(
      and(
        sql`upper(${jurisdictionPpaBenchmarks.state}) = ${st}`,
        isoCode ? eq(jurisdictionPpaBenchmarks.isoCode, isoCode) : sql`true`,
      ),
    )
    .limit(1);
  return rows[0];
}

export async function listQueueEntries(filters: QueueListFilters): Promise<{ items: QueueListItem[]; total: number }> {
  const limit = Math.min(Number(filters.limit) || 50, 100);
  const offset = Number(filters.offset) || 0;

  if (!useDb()) {
    const all = await storage.getAllInterconnectionQueueEntries();
    let rows = all;
    if (filters.state) {
      const s = filters.state.toUpperCase();
      rows = rows.filter((e) => e.state.toUpperCase().includes(s));
    }
    if (filters.isoCode) {
      const iso = filters.isoCode.toUpperCase();
      rows = rows.filter((e) => e.isoCode === iso);
    }
    if (filters.minMw != null && Number.isFinite(filters.minMw)) {
      rows = rows.filter((e) => Number(e.capacityMW ?? 0) >= filters.minMw!);
    }
    if (filters.status === "READY") {
      const readyIds = new Set(
        (await storage.getAllQueueEntryAnalytics())
          .filter((a) => a.computeStatus === "READY")
          .map((a) => a.entryId),
      );
      rows = rows.filter((e) => readyIds.has(e.id));
    }
    const total = rows.length;
    const paged = rows.slice(offset, offset + limit);
    const items: QueueListItem[] = await Promise.all(
      paged.map(async (e) => ({
        ...e,
        analytics: (await storage.getQueueEntryAnalyticsByEntryId(e.id)) ?? null,
      })),
    );
    return { items, total };
  }

  const conditions = [];
  if (filters.state) {
    conditions.push(sql`upper(${interconnectionQueueEntries.state}) like ${"%" + filters.state.toUpperCase() + "%"}`);
  }
  if (filters.isoCode) {
    conditions.push(eq(interconnectionQueueEntries.isoCode, filters.isoCode.toUpperCase()));
  }
  if (filters.minMw != null && Number.isFinite(filters.minMw)) {
    conditions.push(gte(interconnectionQueueEntries.capacityMW, String(filters.minMw)));
  }

  const entryFilter = conditions.length ? and(...conditions) : undefined;

  if (filters.status === "READY") {
    const ready = await db
      .select({ entryId: queueEntryAnalytics.entryId })
      .from(queueEntryAnalytics)
      .where(eq(queueEntryAnalytics.computeStatus, "READY"));
    const readyIdList = ready.map((r) => r.entryId);
    if (readyIdList.length === 0) return { items: [], total: 0 };
    const readyFilter = and(entryFilter, inArray(interconnectionQueueEntries.id, readyIdList)) as any;
    const countRows = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(interconnectionQueueEntries)
      .where(readyFilter);
    const total = countRows[0]?.c ?? 0;
    const entryRows = await db
      .select()
      .from(interconnectionQueueEntries)
      .where(readyFilter)
      .orderBy(asc(interconnectionQueueEntries.state), asc(interconnectionQueueEntries.projectName))
      .limit(limit)
      .offset(offset);
    const ids = entryRows.map((e) => e.id);
    const analyticsRows = ids.length
      ? await db
          .select()
          .from(queueEntryAnalytics)
          .where(inArray(queueEntryAnalytics.entryId, ids))
      : [];
    const byEntry = new Map(analyticsRows.map((a) => [a.entryId, a]));
    const items: QueueListItem[] = entryRows.map((e) => ({ ...e, analytics: byEntry.get(e.id) ?? null }));
    return { items, total };
  }

  const countRows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(interconnectionQueueEntries)
    .where(entryFilter);
  const total = countRows[0]?.c ?? 0;

  const entryRows = await db
    .select()
    .from(interconnectionQueueEntries)
    .where(entryFilter)
    .orderBy(asc(interconnectionQueueEntries.state), asc(interconnectionQueueEntries.projectName))
    .limit(limit)
    .offset(offset);

  const entryIds = entryRows.map((e) => e.id);
  if (entryIds.length === 0) return { items: [], total };

  const analyticsRows = await db
    .select()
    .from(queueEntryAnalytics)
    .where(inArray(queueEntryAnalytics.entryId, entryIds));

  const byEntry = new Map(analyticsRows.map((a) => [a.entryId, a]));
  const items: QueueListItem[] = entryRows.map((e) => ({ ...e, analytics: byEntry.get(e.id) ?? null }));

  return { items, total };
}

export async function getQueueEntryDetail(id: string): Promise<QueueListItem | null> {
  if (!useDb()) {
    const e = await storage.getInterconnectionQueueEntry(id);
    if (!e) return null;
    const analytics = (await storage.getQueueEntryAnalyticsByEntryId(e.id)) ?? null;
    return { ...e, analytics };
  }
  const [e] = await db.select().from(interconnectionQueueEntries).where(eq(interconnectionQueueEntries.id, id));
  if (!e) return null;
  const [a] = await db.select().from(queueEntryAnalytics).where(eq(queueEntryAnalytics.entryId, id));
  return { ...e, analytics: a ?? null };
}

async function loadJurisdictionForEntry(entry: InterconnectionQueueEntry) {
  if (!useDb()) return null;
  const st = (entry.state || "").trim();
  if (!st) return null;
  const rows = await db
    .select()
    .from(jurisdictionPpaBenchmarks)
    .where(
      and(
        sql`upper(${jurisdictionPpaBenchmarks.state}) = ${st.toUpperCase()}`,
        entry.isoCode ? eq(jurisdictionPpaBenchmarks.isoCode, entry.isoCode) : sql`true`,
      ),
    )
    .limit(1);
  return rows[0];
}

export async function computeAndPersistQueueAnalytics(entryId: string): Promise<QueueAnalyticsResult> {
  const entry = useDb()
    ? (await db.select().from(interconnectionQueueEntries).where(eq(interconnectionQueueEntries.id, entryId)))[0]
    : await storage.getInterconnectionQueueEntry(entryId);

  if (!entry) throw new Error("Queue entry not found");

  const j = useDb() ? await loadJurisdictionForEntry(entry) : null;
  const jurisdictionPpa = j
    ? { benchmarkUsdPerMwh: j.benchmarkUsdPerMwh, sourceNote: j.sourceNote }
    : null;

  if (useDb()) {
    await db
      .insert(queueEntryAnalytics)
      .values({ entryId, computeStatus: "RUNNING", errorMessage: null } as any)
      .onConflictDoUpdate({
        target: queueEntryAnalytics.entryId,
        set: { computeStatus: "RUNNING", errorMessage: null },
      });
  } else {
    await storage.upsertQueueEntryAnalytics({
      entryId,
      computeStatus: "RUNNING",
      errorMessage: null,
    } as Partial<QueueEntryAnalytics> & { entryId: string });
  }

  try {
    const result = await computeQueueEntryAnalytics(
      {
        id: entry.id,
        state: entry.state,
        capacityMW: entry.capacityMW,
        latitude: entry.latitude,
        longitude: entry.longitude,
        isoCode: entry.isoCode,
      },
      { jurisdictionPpa },
    );

    const payload: Omit<InsertQueueEntryAnalytics, "id"> = {
      entryId,
      backtestSummary: result.backtestSummary as Record<string, unknown>,
      annualMwhModeled: String(result.annualMwhModeled),
      annualKwhNsrdb: String(result.annualKwhNsrdb),
      irrProxyPct: result.irrProxyPct != null ? String(result.irrProxyPct) : null,
      moicProxy: result.moicProxy != null ? String(result.moicProxy) : null,
      ppaScenario: result.ppaScenario as Record<string, unknown>,
      waterfallSummary: result.waterfallSummary,
      monthlyWaterfallSeries: result.monthlyWaterfallSeries,
      engineVersion: result.engineVersion,
      computeStatus: "READY",
      errorMessage: null,
      computedAt: new Date(),
    };

    if (useDb()) {
      await db
        .insert(queueEntryAnalytics)
        .values(payload as any)
        .onConflictDoUpdate({
          target: queueEntryAnalytics.entryId,
          set: {
            backtestSummary: payload.backtestSummary as any,
            annualMwhModeled: payload.annualMwhModeled,
            annualKwhNsrdb: payload.annualKwhNsrdb,
            irrProxyPct: payload.irrProxyPct,
            moicProxy: payload.moicProxy,
            ppaScenario: payload.ppaScenario as any,
            waterfallSummary: payload.waterfallSummary as any,
            monthlyWaterfallSeries: payload.monthlyWaterfallSeries as any,
            engineVersion: payload.engineVersion,
            computeStatus: "READY",
            errorMessage: null,
            computedAt: payload.computedAt,
          } as any,
        });
    } else {
      await storage.upsertQueueEntryAnalytics({
        ...payload,
      } as Partial<QueueEntryAnalytics> & { entryId: string });
    }

    return result;
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (useDb()) {
      await db
        .update(queueEntryAnalytics)
        .set({ computeStatus: "FAILED", errorMessage: msg, computedAt: new Date() })
        .where(eq(queueEntryAnalytics.entryId, entryId));
    } else {
      await storage.upsertQueueEntryAnalytics({ entryId, computeStatus: "FAILED", errorMessage: msg } as any);
    }
    throw e;
  }
}

export async function runBatchQueueAnalytics(limit: number = 20): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  if (useDb()) {
    const pending = await db
      .select({ id: interconnectionQueueEntries.id })
      .from(interconnectionQueueEntries)
      .leftJoin(queueEntryAnalytics, eq(queueEntryAnalytics.entryId, interconnectionQueueEntries.id))
      .where(
        or(
          isNull(queueEntryAnalytics.id),
          inArray(queueEntryAnalytics.computeStatus, ["PENDING", "FAILED"]),
        ),
      )
      .limit(limit);
    for (const row of pending) {
      try {
        await computeAndPersistQueueAnalytics(row.id);
        processed++;
      } catch (e: any) {
        errors.push(`${row.id}: ${e?.message || e}`);
      }
    }
  } else {
    const all = await storage.getAllInterconnectionQueueEntries();
    for (const e of all) {
      const a = await storage.getQueueEntryAnalyticsByEntryId(e.id);
      if (a && a.computeStatus === "READY") continue;
      if (processed >= limit) break;
      try {
        await computeAndPersistQueueAnalytics(e.id);
        processed++;
      } catch (err: any) {
        errors.push(`${e.id}: ${err?.message || err}`);
      }
    }
  }

  return { processed, errors };
}

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { loadPortfolio, loadProject, loadVerification } from "../data/index.js";
import { liveMode } from "../lib/supabase.js";
import { useDemo } from "./DemoContext.js";
import type {
  Portfolio,
  ProjectBundle,
  ProjectMeta,
  VerificationRecord,
} from "../utils/types.js";

// Single data entry point per spec §6.1. Pages call these methods without
// knowing whether they resolve against Supabase or static demo JSON. The active
// demo scenario ("verified" | "flagged") is injected here so a presenter can
// flip the whole investor experience from the floating demo bar.
interface DataContextValue {
  mode: "supabase" | "demo";
  scenario: "verified" | "flagged";
  getPortfolio: () => Promise<Portfolio>;
  getProject: (id: string) => Promise<ProjectBundle | null>;
  getVerification: (
    id: string,
    period: string,
  ) => Promise<{ project: ProjectMeta; record: VerificationRecord } | null>;
}

const DataContext = createContext<DataContextValue | null>(null);

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { scenario } = useDemo();

  const value = useMemo<DataContextValue>(() => {
    // The flagged scenario is a UX demonstration that reads from static JSON,
    // so it only applies when we're not wired to a live Supabase project.
    const useFlagged = scenario === "flagged" && !liveMode;
    const variant = useFlagged ? "flagged" : "verified";

    return {
      mode: liveMode ? "supabase" : "demo",
      scenario,
      getProject: (id) => loadProject(id, { variant }),
      getVerification: (id, period) =>
        loadVerification(id, period, { variant }),
      getPortfolio: async () => {
        const base = await loadPortfolio();
        if (!useFlagged) return base;
        // Re-derive each project card from the flagged dataset so the portfolio
        // badge, yield, and production flip alongside the detail pages.
        let monthly = 0;
        let lifetime = 0;
        const projects = await Promise.all(
          base.projects.map(async (p) => {
            const bundle = await loadProject(p.id, { variant: "flagged" });
            if (!bundle) return p;
            const recs = bundle.verification_records;
            const latest = recs[recs.length - 1];
            const share = p.investor_share_pct / 100;
            const projMonthly = (latest?.estimated_revenue ?? 0) * share;
            const projLifetime =
              recs.reduce((s, r) => s + r.estimated_revenue, 0) * share;
            monthly += projMonthly;
            lifetime += projLifetime;
            return {
              ...p,
              latest_verification: latest?.status ?? p.latest_verification,
              latest_period: latest?.period_start ?? p.latest_period,
              ytd_production_mwh: round1(
                recs.reduce((s, r) => s + r.inverter_kwh, 0) / 1000,
              ),
              monthly_yield_usd: Math.round(projMonthly),
            };
          }),
        );
        return {
          portfolio: {
            ...base.portfolio,
            monthly_yield_usd: Math.round(monthly) || base.portfolio.monthly_yield_usd,
            lifetime_yield_usd:
              Math.round(lifetime) || base.portfolio.lifetime_yield_usd,
          },
          projects,
        };
      },
    };
  }, [scenario]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}

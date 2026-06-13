import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { liveMode } from "../lib/supabase.js";

// Demo-presentation state. Separate from auth: this only governs how a live
// pitch is driven (which dataset scenario is shown, who the audience is, and
// whether the floating demo bar is visible). Role lives in AuthContext.
export type Scenario = "verified" | "flagged";
export type Audience =
  | "general"
  | "solar_developer"
  | "family_office"
  | "ria_advisor";

interface DemoState {
  demoMode: boolean;
  scenario: Scenario;
  audience: Audience;
}

interface DemoContextValue extends DemoState {
  setScenario: (scenario: Scenario) => void;
  setAudience: (audience: Audience) => void;
  enterDemo: () => void;
  exitDemo: () => void;
}

const STORAGE_KEY = "ecoxchange-demo";

// Default to demo mode whenever Supabase is not configured — the dashboard is
// fully usable on static demo data with zero setup.
const DEFAULT_STATE: DemoState = {
  demoMode: !liveMode,
  scenario: "verified",
  audience: "general",
};

function loadState(): DemoState {
  if (typeof sessionStorage === "undefined") return DEFAULT_STATE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<DemoState>) };
  } catch {
    return DEFAULT_STATE;
  }
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(loadState);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage failures (private mode, quota)
    }
  }, [state]);

  const value = useMemo<DemoContextValue>(
    () => ({
      ...state,
      setScenario: (scenario) => setState((s) => ({ ...s, scenario })),
      setAudience: (audience) => setState((s) => ({ ...s, audience })),
      enterDemo: () => setState((s) => ({ ...s, demoMode: true })),
      exitDemo: () =>
        setState((s) => ({ ...s, demoMode: false, scenario: "verified" })),
    }),
    [state],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within a DemoProvider");
  return ctx;
}

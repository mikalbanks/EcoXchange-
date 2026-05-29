import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { DemoMode } from "../data/types.js";

const STORAGE_KEY = "ecoxchange.demo.mode";

interface DemoModeContextValue {
  mode: DemoMode;
  setMode: (mode: DemoMode) => void;
  toggle: () => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

function readInitial(): DemoMode {
  if (typeof window === "undefined") return "verified";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "flagged" ? "flagged" : "verified";
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DemoMode>(readInitial);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo<DemoModeContextValue>(
    () => ({
      mode,
      setMode,
      toggle: () => setMode((m) => (m === "verified" ? "flagged" : "verified")),
    }),
    [mode],
  );

  return (
    <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>
  );
}

export function useDemoMode(): DemoModeContextValue {
  const ctx = useContext(DemoModeContext);
  if (!ctx) throw new Error("useDemoMode must be used inside <DemoModeProvider>");
  return ctx;
}

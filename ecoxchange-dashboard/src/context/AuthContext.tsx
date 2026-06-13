import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

// Mock auth only. Real authentication (Privy) lands after securities counsel;
// for now we model an "active viewing role" plus a placeholder identity so the
// shell, sidebar, and settings page have something to render.
export type Role = "investor" | "developer";

export interface MockUser {
  name: string;
  email: string;
}

interface AuthContextValue {
  user: MockUser;
  role: Role;
  setRole: (role: Role) => void;
}

const DEFAULT_USER: MockUser = {
  name: "Alex Morgan",
  email: "alex@example.com",
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("investor");

  const value = useMemo<AuthContextValue>(
    () => ({ user: DEFAULT_USER, role, setRole }),
    [role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

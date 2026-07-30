import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { dashboardPathForRole, loginPathWithReturn, safeReturnPath } from "./roles";
import { onUnauthorized } from "./auth-events";

/** Best-effort read of a `{ message }` error body without throwing on HTML. */
async function readMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    try {
      return JSON.parse(text).message ?? text;
    } catch {
      return text;
    }
  } catch {
    return res.statusText;
  }
}

/**
 * Credential problems get the server's message; infrastructure faults do not.
 * A paused database once surfaced on the sign-in form as
 * "(ENOTFOUND) tenant/user postgres.<ref> not found", which tells a user nothing.
 */
async function loginErrorMessage(res: Response): Promise<string> {
  const message = await readMessage(res);
  if (res.status === 401 || res.status === 400) {
    return message || "Please check your credentials and try again.";
  }
  if (res.status === 429) {
    return "Too many sign-in attempts. Please wait a few minutes and try again.";
  }
  console.error(`Login failed with ${res.status}:`, message);
  return "Sign-in is temporarily unavailable. Please try again in a moment.";
}

export interface AuthUser {
  id: string;
  email: string;
  role: "INVESTOR" | "DEVELOPER" | "ADMIN";
  name: string;
  orgName: string | null;
  personaStatus: "not_started" | "pending" | "completed" | "failed";
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role: "INVESTOR" | "DEVELOPER") => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  // If any data request comes back unauthenticated, the session is gone (server
  // restarted, cookie expired). Clear local state and send the user to sign in
  // with their current location remembered, instead of leaving guarded pages
  // rendering error panels against a dead session.
  useEffect(() => {
    return onUnauthorized(() => {
      setUser((current) => {
        if (current) {
          setLocation(loginPathWithReturn(window.location.pathname));
        }
        return null;
      });
    });
  }, [setLocation]);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else if (res.status !== 401) {
        // A 401 means "not signed in", which is normal. Anything else is a
        // backend fault and should not masquerade as a clean logged-out state.
        console.error(`Auth check failed with ${res.status}:`, await readMessage(res));
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      throw new Error(await loginErrorMessage(res));
    }

    const data = await res.json();
    setUser(data.user);

    // Honour ?next= so a deep link survives the sign-in detour.
    const dest = safeReturnPath(window.location.search) ?? dashboardPathForRole(data.user.role);

    setTimeout(() => setLocation(dest), 0);

    return data.user;
  }

  async function signup(email: string, password: string, role: "INVESTOR" | "DEVELOPER") {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, role }),
    });

    if (!res.ok) {
      throw new Error(await loginErrorMessage(res));
    }

    const data = await res.json();
    setUser(data.user);

    setLocation(dashboardPathForRole(data.user.role ?? role));
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    setLocation("/");
  }

  async function refreshUser() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("User refresh failed:", error);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

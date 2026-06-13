import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Sidebar } from "../components/shared/Sidebar.js";
import { FloatingDemoBar } from "../components/shared/FloatingDemoBar.js";
import { ErrorBoundary } from "../components/shared/ErrorBoundary.js";
import { useAuth } from "../context/AuthContext.js";
import { useDemo } from "../context/DemoContext.js";
import { liveMode } from "../lib/supabase.js";

// Role-based application shell: fixed sidebar (240px) on desktop, a slide-in
// drawer on mobile, a slim top header, the routed page, and the floating demo
// bar when demo mode is active.
export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, role } = useAuth();
  const { demoMode } = useDemo();

  return (
    <div className="min-h-screen flex bg-cream">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 shrink-0">
        <div className="fixed inset-y-0 w-60">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 max-w-[80%]">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
          <button
            type="button"
            aria-label="Close menu"
            className="flex-1 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
        </div>
      ) : null}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-darkBg text-white">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open menu"
                className="lg:hidden text-paleGreen hover:text-white"
                onClick={() => setDrawerOpen(true)}
              >
                {drawerOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              <span className="lg:hidden font-heading text-lg">EcoXchange</span>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                  liveMode
                    ? "bg-accentBrt/20 text-accentBrt"
                    : "bg-paleGreen/20 text-paleGreen"
                }`}
                title={
                  liveMode
                    ? "Reading from Supabase"
                    : "Static demo data (set VITE_SUPABASE_URL to go live)"
                }
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    liveMode ? "bg-accentBrt" : "bg-paleGreen"
                  }`}
                />
                {liveMode ? "Live" : "Demo"}
              </span>
              <span className="hidden sm:inline text-sm text-paleGreen capitalize">
                {user.name} · {role}
              </span>
            </div>
          </div>
        </header>

        <main
          className={`flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 ${
            demoMode ? "pb-24" : ""
          }`}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {demoMode ? <FloatingDemoBar /> : null}
    </div>
  );
}

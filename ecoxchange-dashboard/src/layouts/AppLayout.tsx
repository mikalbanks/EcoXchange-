import { useEffect, useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Sidebar } from "../components/shared/Sidebar.js";
import { MobileNav } from "../components/shared/MobileNav.js";
import { FloatingDemoBar } from "../components/shared/FloatingDemoBar.js";
import { DistributionBanner } from "../components/shared/DistributionBanner.js";
import { ErrorBoundary } from "../components/shared/ErrorBoundary.js";
import { WalletIndicator } from "../components/web3/WalletIndicator.js";
import { PageTransition } from "../components/shared/PageTransition.js";
import { DemoModeBanner } from "../compliance/components/DemoModeBanner.js";
import { RegDBanner } from "../compliance/components/RegDBanner.js";
import { AccreditationGate } from "../compliance/components/AccreditationGate.js";
import { DisclaimerFooter } from "../compliance/components/DisclaimerFooter.js";
import { useAuth } from "../context/AuthContext.js";
import { useDemo } from "../context/DemoContext.js";
import { useData } from "../context/DataContext.js";
import {
  NotificationProvider,
  useNotifications,
} from "../context/NotificationContext.js";
import { liveMode } from "../lib/supabase.js";
import demoDistributions from "../data/demo-distributions.json";

// Demo trigger: Presenter controls navigate to /investor?simulate_distribution=1;
// we read-and-clear the param here (inside the provider) and fire the banner
// with the latest demo distribution amount.
function SimulateDistributionTrigger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showDistributionBanner } = useNotifications();
  const { transactionPolicy } = useData();

  useEffect(() => {
    if (searchParams.get("simulate_distribution") !== "1") return;
    if (transactionPolicy.state !== "simulated") {
      const next = new URLSearchParams(searchParams);
      next.delete("simulate_distribution");
      setSearchParams(next, { replace: true });
      return;
    }
    const latest = demoDistributions.history[0];
    showDistributionBanner({ amountUsd: latest?.net_distribution ?? 0 });
    const next = new URLSearchParams(searchParams);
    next.delete("simulate_distribution");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, showDistributionBanner, transactionPolicy.state]);

  return null;
}

// Role-based application shell: fixed sidebar (240px) on desktop, a slide-in
// drawer on mobile, a slim top header, the routed page, and the floating demo
// bar when demo mode is active.
export function AppLayout() {
  return (
    <NotificationProvider>
      <AppLayoutInner />
    </NotificationProvider>
  );
}

function AppLayoutInner() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, role } = useAuth();
  const { demoMode } = useDemo();
  const { transactionPolicy } = useData();

  return (
    <div className="min-h-screen flex bg-cream">
      <SimulateDistributionTrigger />
      <DistributionBanner />
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
        {/* Compliance banners: exactly one renders per compliance mode. */}
        <DemoModeBanner />
        <RegDBanner />
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
              {transactionPolicy.state === "simulated" ? (
                <WalletIndicator />
              ) : (
                <span className="hidden rounded-full border border-white/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-paleGreen sm:inline">
                  No wallet attached
                </span>
              )}
              <span
                className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                  liveMode
                    ? "bg-accentBrt/20 text-accentBrt"
                    : "bg-paleGreen/20 text-paleGreen"
                }`}
                title={
                  liveMode
                    ? "Reading from Supabase"
                    : "Mixed-source pilot demo; review per-source provenance"
                }
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    liveMode ? "bg-accentBrt" : "bg-paleGreen"
                  }`}
                />
                {liveMode ? "Live" : "Pilot Demo"}
              </span>
              <span className="hidden sm:inline text-sm text-paleGreen capitalize">
                {user.name} · {role}
              </span>
            </div>
          </div>
        </header>

        <main
          className={`relative flex-1 w-full lg:max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-10 ${
            role === "investor"
              ? demoMode
                ? "pb-tabbar-demo lg:pb-24"
                : "pb-tabbar lg:pb-10"
              : demoMode
                ? "pb-24"
                : ""
          }`}
        >
          {/* Subliminal leaf watermark — desktop only, opacity 0.03. */}
          <div className="page-watermark" aria-hidden data-testid="page-watermark" />
          <AccreditationGate>
            <ErrorBoundary>
              <PageTransition>
                <Outlet />
              </PageTransition>
            </ErrorBoundary>
            {/* Inside <main> so the mobile tab-bar bottom padding keeps it visible. */}
            <DisclaimerFooter />
          </AccreditationGate>
        </main>
      </div>

      {role === "investor" ? <MobileNav /> : null}
      {demoMode ? <FloatingDemoBar /> : null}
    </div>
  );
}

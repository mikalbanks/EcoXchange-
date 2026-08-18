import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { Header } from "./components/Header.js";
import { AppLayout } from "./layouts/AppLayout.js";
import { Landing } from "./pages/Landing.js";
import { Portfolio } from "./pages/Portfolio.js";
import { Marketplace } from "./pages/investor/Marketplace.js";
import { OfferingSummary } from "./pages/investor/OfferingSummary.js";
import { Calculator } from "./pages/investor/Calculator.js";
import { Impact } from "./pages/investor/Impact.js";
import { Distributions } from "./pages/investor/Distributions.js";
import { SuitabilityOnboarding } from "./pages/SuitabilityOnboarding.js";
import { ProjectDetail } from "./pages/ProjectDetail.js";
import { VerificationDetail } from "./pages/VerificationDetail.js";
import { YieldHistory } from "./pages/investor/YieldHistory.js";
import { Documents } from "./pages/investor/Documents.js";
import { Settings } from "./pages/investor/Settings.js";
import { Onboarding as InvestorOnboarding } from "./pages/investor/Onboarding.js";
import { DemoController } from "./pages/demo/DemoController.js";
import { OnboardingWizard } from "./pages/OnboardingWizard.js";
import { OnboardingStatus } from "./pages/OnboardingStatus.js";
import { OnboardingReport } from "./pages/OnboardingReport.js";
import { ReferenceLibrary } from "./pages/ReferenceLibrary.js";
import { ReferenceDetail } from "./pages/ReferenceDetail.js";

// LOI builder is lazy: an infrequent developer surface whose document
// template shouldn't weigh down the entry bundle.
const DeveloperLOI = lazy(() =>
  import("./pages/DeveloperLOI.js").then((m) => ({ default: m.DeveloperLOI })),
);

// Run Demo flow is lazy: it pulls the Leaflet chunk for the site map, which
// should only download when the guided demo is opened.
const RunDemo = lazy(() =>
  import("./pages/developer/RunDemo.js").then((m) => ({ default: m.RunDemo })),
);
const DemoBacktestResults = lazy(() =>
  import("./pages/developer/BacktestResults.js").then((m) => ({
    default: m.BacktestResults,
  })),
);

// EIA fleet benchmark presentation (Spec 4).
const Benchmark = lazy(() =>
  import("./pages/Benchmark.js").then((m) => ({ default: m.Benchmark })),
);

// EIA catalog is lazy: its 2 MB plant dataset (dynamic import inside the data
// loader) and page chunk only download when someone opens /investor/catalog.
const EiaCatalog = lazy(() =>
  import("./pages/investor/EiaCatalog.js").then((m) => ({
    default: m.EiaCatalog,
  })),
);

// Explorer pages are lazy-loaded so the viem chunk stays off the critical
// path — it only downloads when someone opens /explorer.
const Explorer = lazy(() =>
  import("./pages/Explorer.js").then((m) => ({ default: m.Explorer })),
);
const ExplorerContract = lazy(() =>
  import("./pages/ExplorerContract.js").then((m) => ({
    default: m.ExplorerContract,
  })),
);
// Distribution simulation shares the lazy web3 chunk boundary — its executor
// dynamically imports viem, so /distribute stays off the critical path too.
const Distribute = lazy(() =>
  import("./pages/Distribute.js").then((m) => ({ default: m.Distribute })),
);
// Spec 18 § 2.8 — the Polymesh chain view. Lazy for the same reason: its holder
// chart pulls in the recharts chunk.
const ChainView = lazy(() =>
  import("./pages/ChainView.js").then((m) => ({ default: m.ChainView })),
);
import { CHAIN_VIEW_ENABLED } from "./config/chain-view.js";
import { DemoModeBanner } from "./compliance/components/DemoModeBanner.js";
import { RegDBanner } from "./compliance/components/RegDBanner.js";
import { DisclaimerFooter } from "./compliance/components/DisclaimerFooter.js";
import { PageTransition } from "./components/shared/PageTransition.js";
import {
  PilotTransactionGate,
  ReleaseOneBoundary,
} from "./compliance/components/PilotTransactionGate.js";

// Public/developer routes keep the original top-bar Header layout.
// Compliance banners at top, disclaimer footer at bottom; no accreditation
// gate here (developer portal / public pages are ungated per the spec).
function HeaderLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <DemoModeBanner />
      <RegDBanner />
      <Header />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <PageTransition>{children}</PageTransition>
        <DisclaimerFooter />
      </main>
    </div>
  );
}

// Preserve legacy investor deep links (/project/...) by forwarding them to the
// new role-prefixed routes.
function LegacyProjectRedirect() {
  const { pathname, search } = useLocation();
  return (
    <Navigate to={`/investor${pathname}${search}`} replace />
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/demo" element={<DemoController />} />

        {/* Investor experience — role-based shell */}
        <Route element={<AppLayout />}>
          <Route path="/investor" element={<Portfolio />} />
          <Route
            path="/investor/marketplace"
            element={
              <PilotTransactionGate surface="Offering marketplace">
                <Marketplace />
              </PilotTransactionGate>
            }
          />
          <Route
            path="/investor/catalog"
            element={
              <Suspense fallback={null}>
                <EiaCatalog />
              </Suspense>
            }
          />
          <Route
            path="/investor/offering/:slug"
            element={
              <PilotTransactionGate surface="Offering detail">
                <OfferingSummary />
              </PilotTransactionGate>
            }
          />
          <Route
            path="/investor/calculator"
            element={
              <PilotTransactionGate surface="Investment calculator">
                <Calculator />
              </PilotTransactionGate>
            }
          />
          <Route path="/investor/impact" element={<Impact />} />
          <Route
            path="/investor/distributions"
            element={
              <PilotTransactionGate surface="Distribution history">
                <Distributions />
              </PilotTransactionGate>
            }
          />
          {/* USDC distribution simulation — verification -> oracle -> settlement */}
          <Route
            path="/distribute"
            element={
              <PilotTransactionGate surface="Distribution execution">
                <Suspense fallback={null}>
                  <Distribute />
                </Suspense>
              </PilotTransactionGate>
            }
          />
          <Route path="/investor/project/:id" element={<ProjectDetail />} />
          <Route
            path="/investor/project/:id/verification/:period"
            element={<VerificationDetail />}
          />
          <Route
            path="/investor/project/:id/yields"
            element={
              <PilotTransactionGate surface="Yield history" projectScoped>
                <YieldHistory />
              </PilotTransactionGate>
            }
          />
          <Route
            path="/investor/project/:id/documents"
            element={
              <PilotTransactionGate surface="Offering document vault" projectScoped>
                <Documents />
              </PilotTransactionGate>
            }
          />
          {/* Spec 18 § 2.8 — on-chain record. The spec names /project/:id/chain;
              LegacyProjectRedirect below already rewrites that here, so the
              documented path works without a competing route declaration.

              Gated OFF by default. Until the Polymesh queries are validated
              against a live endpoint the route does not exist at all, so the
              demo build cannot publish an unvalidated verification surface.
              See config/chain-view.ts. */}
          {CHAIN_VIEW_ENABLED ? (
            <Route
              path="/investor/project/:id/chain"
              element={
                <PilotTransactionGate surface="On-chain ownership record" projectScoped>
                  <Suspense fallback={null}>
                    <ChainView />
                  </Suspense>
                </PilotTransactionGate>
              }
            />
          ) : null}
          <Route path="/investor/settings" element={<Settings />} />
          <Route
            path="/investor/onboard"
            element={
              <PilotTransactionGate surface="Investor onboarding">
                <InvestorOnboarding />
              </PilotTransactionGate>
            }
          />
          {/* Smart Contract Explorer (Spec 08) — read-only on-chain transparency */}
          <Route
            path="/explorer"
            element={
              <PilotTransactionGate surface="Ownership record explorer">
                <Suspense fallback={null}>
                  <Explorer />
                </Suspense>
              </PilotTransactionGate>
            }
          />
          <Route
            path="/explorer/:contractType"
            element={
              <PilotTransactionGate surface="Ownership contract explorer">
                <Suspense fallback={null}>
                  <ExplorerContract />
                </Suspense>
              </PilotTransactionGate>
            }
          />
        </Route>

        {/* Standalone suitability questionnaire — focused flow, no sidebar */}
        <Route
          path="/onboarding"
          element={
            <HeaderLayout>
              <PilotTransactionGate surface="Investment suitability workflow">
                <SuitabilityOnboarding />
              </PilotTransactionGate>
            </HeaderLayout>
          }
        />

        {/* Legacy deep-link redirects */}
        <Route path="/project/*" element={<LegacyProjectRedirect />} />

        {/* Developer onboarding + reference library (existing) */}
        <Route
          path="/onboard"
          element={
            <HeaderLayout>
              <OnboardingWizard />
            </HeaderLayout>
          }
        />
        <Route
          path="/onboard/status/:id"
          element={
            <HeaderLayout>
              <OnboardingStatus />
            </HeaderLayout>
          }
        />
        <Route
          path="/onboard/report/:id"
          element={
            <HeaderLayout>
              <OnboardingReport />
            </HeaderLayout>
          }
        />
        {/* EIA fleet benchmark presentation (Spec 4) */}
        <Route
          path="/benchmark"
          element={
            <HeaderLayout>
              <Suspense fallback={null}>
                <Benchmark />
              </Suspense>
            </HeaderLayout>
          }
        />
        {/* Multi-project portfolio simulation (Spec 5) */}
        <Route
          path="/projects"
          element={
            <HeaderLayout>
              <ReleaseOneBoundary
                title="Multi-project portfolio simulator is not part of the pilot path"
                description="Release 1 uses one measured PVDAQ research project and one explicitly selected Savannah stress scenario. The separate eight-project fixture is disabled so it cannot be mistaken for the active investor dataset."
              />
            </HeaderLayout>
          }
        />
        {/* Guided demo flow (Spec 1) — offline-safe pitch backtest */}
        <Route
          path="/developer/demo"
          element={
            <HeaderLayout>
              <Suspense fallback={null}>
                <RunDemo />
              </Suspense>
            </HeaderLayout>
          }
        />
        <Route
          path="/developer/demo/results"
          element={
            <HeaderLayout>
              <Suspense fallback={null}>
                <DemoBacktestResults />
              </Suspense>
            </HeaderLayout>
          }
        />
        {/* Developer LOI builder — non-binding template, counsel review pending */}
        <Route
          path="/developer/loi"
          element={
            <HeaderLayout>
              <PilotTransactionGate surface="Letter of intent builder">
                <Suspense fallback={null}>
                  <DeveloperLOI />
                </Suspense>
              </PilotTransactionGate>
            </HeaderLayout>
          }
        />
        <Route
          path="/reference"
          element={
            <HeaderLayout>
              <ReferenceLibrary />
            </HeaderLayout>
          }
        />
        <Route
          path="/reference/:id"
          element={
            <HeaderLayout>
              <ReferenceDetail />
            </HeaderLayout>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

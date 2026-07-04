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
import { DemoModeBanner } from "./compliance/components/DemoModeBanner.js";
import { RegDBanner } from "./compliance/components/RegDBanner.js";
import { DisclaimerFooter } from "./compliance/components/DisclaimerFooter.js";
import { PageTransition } from "./components/shared/PageTransition.js";

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
          <Route path="/investor/marketplace" element={<Marketplace />} />
          <Route
            path="/investor/offering/:slug"
            element={<OfferingSummary />}
          />
          <Route path="/investor/calculator" element={<Calculator />} />
          <Route path="/investor/impact" element={<Impact />} />
          <Route path="/investor/distributions" element={<Distributions />} />
          {/* USDC distribution simulation — verification -> oracle -> settlement */}
          <Route
            path="/distribute"
            element={
              <Suspense fallback={null}>
                <Distribute />
              </Suspense>
            }
          />
          <Route path="/investor/project/:id" element={<ProjectDetail />} />
          <Route
            path="/investor/project/:id/verification/:period"
            element={<VerificationDetail />}
          />
          <Route
            path="/investor/project/:id/yields"
            element={<YieldHistory />}
          />
          <Route
            path="/investor/project/:id/documents"
            element={<Documents />}
          />
          <Route path="/investor/settings" element={<Settings />} />
          <Route path="/investor/onboard" element={<InvestorOnboarding />} />
          {/* Smart Contract Explorer (Spec 08) — read-only on-chain transparency */}
          <Route
            path="/explorer"
            element={
              <Suspense fallback={null}>
                <Explorer />
              </Suspense>
            }
          />
          <Route
            path="/explorer/:contractType"
            element={
              <Suspense fallback={null}>
                <ExplorerContract />
              </Suspense>
            }
          />
        </Route>

        {/* Standalone suitability questionnaire — focused flow, no sidebar */}
        <Route
          path="/onboarding"
          element={
            <HeaderLayout>
              <SuitabilityOnboarding />
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
        {/* Developer LOI builder — non-binding template, counsel review pending */}
        <Route
          path="/developer/loi"
          element={
            <HeaderLayout>
              <Suspense fallback={null}>
                <DeveloperLOI />
              </Suspense>
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

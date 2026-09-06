import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { Header } from "./components/Header.js";
import { AppLayout } from "./layouts/AppLayout.js";
import { Landing } from "./pages/Landing.js";
import { Bankability } from "./pages/Bankability.js";
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

const DeveloperLOI = lazy(() =>
  import("./pages/DeveloperLOI.js").then((m) => ({ default: m.DeveloperLOI })),
);
const RunDemo = lazy(() =>
  import("./pages/developer/RunDemo.js").then((m) => ({ default: m.RunDemo })),
);
const DemoBacktestResults = lazy(() =>
  import("./pages/developer/BacktestResults.js").then((m) => ({ default: m.BacktestResults })),
);
const Benchmark = lazy(() =>
  import("./pages/Benchmark.js").then((m) => ({ default: m.Benchmark })),
);
const EiaCatalog = lazy(() =>
  import("./pages/investor/EiaCatalog.js").then((m) => ({ default: m.EiaCatalog })),
);
const Explorer = lazy(() =>
  import("./pages/Explorer.js").then((m) => ({ default: m.Explorer })),
);
const ExplorerContract = lazy(() =>
  import("./pages/ExplorerContract.js").then((m) => ({ default: m.ExplorerContract })),
);
const Distribute = lazy(() =>
  import("./pages/Distribute.js").then((m) => ({ default: m.Distribute })),
);
const ChainView = lazy(() =>
  import("./pages/ChainView.js").then((m) => ({ default: m.ChainView })),
);
import { CHAIN_VIEW_ENABLED } from "./config/chain-view.js";
import { DemoModeBanner } from "./compliance/components/DemoModeBanner.js";
import { RegDBanner } from "./compliance/components/RegDBanner.js";
import { DisclaimerFooter } from "./compliance/components/DisclaimerFooter.js";
import { PageTransition } from "./components/shared/PageTransition.js";
import { PilotTransactionGate, ReleaseOneBoundary } from "./compliance/components/PilotTransactionGate.js";

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

function RouteLoading() {
  return <div role="status" aria-live="polite" className="py-12 text-sm text-textMuted">Loading demo…</div>;
}

function LegacyProjectRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={`/investor${pathname}${search}`} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/demo" element={<DemoController />} />
        <Route path="/bankability" element={<Bankability />} />

        <Route element={<AppLayout />}>
          <Route path="/investor" element={<Portfolio />} />
          <Route path="/investor/marketplace" element={<PilotTransactionGate surface="Offering marketplace"><Marketplace /></PilotTransactionGate>} />
          <Route path="/investor/catalog" element={<Suspense fallback={null}><EiaCatalog /></Suspense>} />
          <Route path="/investor/offering/:slug" element={<PilotTransactionGate surface="Offering detail"><OfferingSummary /></PilotTransactionGate>} />
          <Route path="/investor/calculator" element={<PilotTransactionGate surface="Investment calculator"><Calculator /></PilotTransactionGate>} />
          <Route path="/investor/impact" element={<Impact />} />
          <Route path="/investor/distributions" element={<PilotTransactionGate surface="Distribution history"><Distributions /></PilotTransactionGate>} />
          <Route path="/distribute" element={<PilotTransactionGate surface="Distribution execution"><Suspense fallback={null}><Distribute /></Suspense></PilotTransactionGate>} />
          <Route path="/investor/project/:id" element={<ProjectDetail />} />
          <Route path="/investor/project/:id/verification/:period" element={<VerificationDetail />} />
          <Route path="/investor/project/:id/yields" element={<PilotTransactionGate surface="Yield history" projectScoped><YieldHistory /></PilotTransactionGate>} />
          <Route path="/investor/project/:id/documents" element={<PilotTransactionGate surface="Offering document vault" projectScoped><Documents /></PilotTransactionGate>} />
          {CHAIN_VIEW_ENABLED ? (
            <Route path="/investor/project/:id/chain" element={<PilotTransactionGate surface="On-chain ownership record" projectScoped><Suspense fallback={null}><ChainView /></Suspense></PilotTransactionGate>} />
          ) : null}
          <Route path="/investor/settings" element={<Settings />} />
          <Route path="/investor/onboard" element={<PilotTransactionGate surface="Investor onboarding"><InvestorOnboarding /></PilotTransactionGate>} />
          <Route path="/explorer" element={<PilotTransactionGate surface="Ownership record explorer"><Suspense fallback={null}><Explorer /></Suspense></PilotTransactionGate>} />
          <Route path="/explorer/:contractType" element={<PilotTransactionGate surface="Ownership contract explorer"><Suspense fallback={null}><ExplorerContract /></Suspense></PilotTransactionGate>} />
        </Route>

        <Route path="/onboarding" element={<HeaderLayout><PilotTransactionGate surface="Investment suitability workflow"><SuitabilityOnboarding /></PilotTransactionGate></HeaderLayout>} />
        <Route path="/project/*" element={<LegacyProjectRedirect />} />
        <Route path="/onboard" element={<HeaderLayout><OnboardingWizard /></HeaderLayout>} />
        <Route path="/onboard/status/:id" element={<HeaderLayout><OnboardingStatus /></HeaderLayout>} />
        <Route path="/onboard/report/:id" element={<HeaderLayout><OnboardingReport /></HeaderLayout>} />
        <Route path="/benchmark" element={<HeaderLayout><Suspense fallback={null}><Benchmark /></Suspense></HeaderLayout>} />
        <Route path="/projects" element={<HeaderLayout><ReleaseOneBoundary title="Multi-project portfolio simulator is not part of the pilot path" description="Release 1 uses one measured PVDAQ research project and one explicitly selected Savannah stress scenario. The separate eight-project fixture is disabled so it cannot be mistaken for the active investor dataset." /></HeaderLayout>} />
        <Route path="/developer/demo" element={<HeaderLayout><Suspense fallback={<RouteLoading />}><RunDemo /></Suspense></HeaderLayout>} />
        <Route path="/developer/demo/results" element={<HeaderLayout><Suspense fallback={<RouteLoading />}><DemoBacktestResults /></Suspense></HeaderLayout>} />
        <Route path="/developer/loi" element={<HeaderLayout><PilotTransactionGate surface="Letter of intent builder"><Suspense fallback={null}><DeveloperLOI /></Suspense></PilotTransactionGate></HeaderLayout>} />
        <Route path="/reference" element={<HeaderLayout><ReferenceLibrary /></HeaderLayout>} />
        <Route path="/reference/:id" element={<HeaderLayout><ReferenceDetail /></HeaderLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

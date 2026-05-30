import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SiteHeader } from "./components/layout/SiteHeader.js";
import { SiteFooter } from "./components/layout/SiteFooter.js";
import { DemoModeProvider } from "./state/demoMode.js";
import { Landing } from "./pages/Landing.js";
import { Portfolio } from "./pages/Portfolio.js";
import { Projects } from "./pages/Projects.js";
import { Methodology } from "./pages/Methodology.js";
import { Rias } from "./pages/Rias.js";
import { SolarDevelopers } from "./pages/SolarDevelopers.js";
import { Onboard } from "./pages/Onboard.js";
import { Reference } from "./pages/Reference.js";
import { ProjectDetail } from "./pages/ProjectDetail.js";
import { VerificationDetail } from "./pages/VerificationDetail.js";

export function App() {
  return (
    <DemoModeProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <SiteHeader />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/methodology" element={<Methodology />} />
              <Route path="/rias" element={<Rias />} />
              <Route path="/developers" element={<SolarDevelopers />} />
              <Route path="/onboard" element={<Onboard />} />
              <Route path="/reference" element={<Reference />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route
                path="/project/:id/verification/:period"
                element={<VerificationDetail />}
              />
              <Route
                path="*"
                element={
                  <main className="mx-auto max-w-site px-6 py-16 space-y-4 text-center">
                    <p className="font-mono text-[11px] uppercase tracking-tag text-eco-text-muted">
                      404 · Not Found
                    </p>
                    <h1 className="font-display italic text-[32px]">
                      Page not found.
                    </h1>
                  </main>
                }
              />
            </Routes>
          </div>
          <SiteFooter />
        </div>
      </BrowserRouter>
    </DemoModeProvider>
  );
}

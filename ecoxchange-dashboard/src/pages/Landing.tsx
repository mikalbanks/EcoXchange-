import { useNavigate } from "react-router-dom";
import { Banknote, SlidersHorizontal, ShieldCheck, Database, FileText, Hammer } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { useDemo } from "../context/DemoContext.js";
import { DemoModeBanner } from "../compliance/components/DemoModeBanner.js";
import { RegDBanner } from "../compliance/components/RegDBanner.js";
import { DisclaimerFooter } from "../compliance/components/DisclaimerFooter.js";
import { LATEST_VERIFICATION_PATH } from "../data/index.js";

export function Landing() {
  const navigate = useNavigate();
  const { setRole } = useAuth();
  const { enterDemo } = useDemo();

  const go = (role: "investor" | "developer", to: string) => {
    setRole(role);
    navigate(to);
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream text-darkBg">
      <DemoModeBanner />
      <RegDBanner />
      <div className="hero-gradient relative flex-1 flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
        <div className="relative flex items-center gap-3 mb-2">
          <img src="/ecoxchange-logo.svg" alt="EcoXchange" className="h-10 w-10" />
          <span className="font-heading text-3xl text-darkBg">EcoXchange</span>
        </div>
        <p className="relative mt-5 font-mono text-xs uppercase tracking-[0.22em] text-medGreen">
          Project Finance & Capital Readiness Demo
        </p>
        <h1 className="relative font-heading text-4xl sm:text-5xl text-center mt-3 text-darkBg max-w-4xl">
          Understand what a renewable project can finance — and what remains to close.
        </h1>
        <p className="relative text-textMuted mt-4 mb-10 text-center max-w-2xl text-base leading-relaxed">
          Enter a project, calculate indicative debt capacity, see the sponsor-equity requirement,
          understand the binding constraint, compare scenarios, and determine the next financing action.
          EcoXchange provides decision support; it is not a lender or underwriter.
        </p>

        <div className="relative w-full max-w-3xl space-y-4">
          <button
            type="button"
            onClick={() => navigate("/bankability")}
            className="w-full bg-white hover:bg-paleGreen/30 rounded-md border-2 border-medGreen p-7 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medGreen focus-visible:ring-offset-2"
          >
            <Banknote className="h-9 w-9 text-accentBrt" />
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-medGreen">Primary workflow</p>
            <h2 className="font-heading text-3xl mt-1 text-darkBg">Project Finance Readiness</h2>
            <p className="text-base text-textMuted mt-2 max-w-2xl">
              Calculate debt capacity and sponsor equity, identify the binding constraint, and compare financing scenarios using the project-finance engine.
            </p>
            <span className="mt-4 inline-block font-mono text-xs uppercase tracking-wide text-accentBrt">
              Open Project Finance Workspace →
            </span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => go("developer", "/onboard")}
              className="bg-white hover:bg-paleGreen/30 rounded-md border border-paleGreen p-6 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medGreen focus-visible:ring-offset-2"
            >
              <Hammer className="h-7 w-7 text-accentBrt" />
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-medGreen">Project intake</p>
              <h2 className="font-heading text-xl mt-1 text-darkBg">Enter Project Data</h2>
              <p className="text-base text-textMuted mt-1">Start from the project record and required finance-readiness inputs.</p>
            </button>

            <button
              type="button"
              onClick={() => {
                enterDemo();
                navigate("/demo");
              }}
              className="bg-white hover:bg-paleGreen/30 rounded-md border border-paleGreen p-6 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medGreen focus-visible:ring-offset-2"
            >
              <SlidersHorizontal className="h-7 w-7 text-accentBrt" />
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-medGreen">Scenario review</p>
              <h2 className="font-heading text-xl mt-1 text-darkBg">Compare Scenarios</h2>
              <p className="text-base text-textMuted mt-1">Walk through the demo path and review how project assumptions change the result.</p>
            </button>
          </div>

          <div className="pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-medGreen mb-3">Secondary platform modules</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button type="button" onClick={() => go("investor", "/investor")} className="bg-white rounded-md border border-paleGreen p-4 text-left hover:bg-paleGreen/20">
                <Database className="h-5 w-5 text-accentBrt" />
                <p className="font-heading text-lg mt-2">Project / Ownership</p>
                <p className="text-sm text-textMuted">Project records and administration.</p>
              </button>
              <button type="button" onClick={() => go("investor", LATEST_VERIFICATION_PATH)} className="bg-white rounded-md border border-paleGreen p-4 text-left hover:bg-paleGreen/20">
                <ShieldCheck className="h-5 w-5 text-accentBrt" />
                <p className="font-heading text-lg mt-2">Verification</p>
                <p className="text-sm text-textMuted">Source-labeled production evidence.</p>
              </button>
              <button type="button" onClick={() => go("investor", "/investor/impact")} className="bg-white rounded-md border border-paleGreen p-4 text-left hover:bg-paleGreen/20">
                <FileText className="h-5 w-5 text-accentBrt" />
                <p className="font-heading text-lg mt-2">Reporting</p>
                <p className="text-sm text-textMuted">Operating and project-level reporting.</p>
              </button>
            </div>
          </div>
        </div>

        <p className="relative mt-10 max-w-2xl text-center text-sm text-textMuted">
          This demo does not fabricate data-center buyer matching, financing commitments, investment availability,
          legal ownership, or payment execution. Secondary ownership, reporting, distribution, and verification modules
          remain demonstrations of the broader platform infrastructure.
        </p>
      </div>

      <div className="bg-cream px-4 sm:px-6 py-6">
        <details className="mx-auto max-w-4xl">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-wide text-medGreen">Read full demo disclosures</summary>
          <DisclaimerFooter />
        </details>
      </div>
    </div>
  );
}

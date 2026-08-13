import { useNavigate } from "react-router-dom";
import { LineChart, Hammer, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { useDemo } from "../context/DemoContext.js";
import { SolarParticles } from "../components/ambient/SolarParticles.js";
import { DemoModeBanner } from "../compliance/components/DemoModeBanner.js";
import { RegDBanner } from "../compliance/components/RegDBanner.js";
import { DisclaimerFooter } from "../compliance/components/DisclaimerFooter.js";
import { LATEST_VERIFICATION_PATH } from "../data/index.js";

// Lightweight role-select entry point. Real auth (Polymath) replaces this after
// securities counsel; for now it just sets the mock role and routes in.
//
// Verification leads: the engine is the product, and the investor and developer
// views are applications of its determination. The card order says so.
export function Landing() {
  const navigate = useNavigate();
  const { setRole } = useAuth();
  const { enterDemo } = useDemo();

  const go = (role: "investor" | "developer", to: string) => {
    setRole(role);
    navigate(to);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <DemoModeBanner />
      <RegDBanner />
      <div className="relative flex-1 flex flex-col items-center justify-center bg-darkBg text-white px-4 py-16 overflow-hidden">
      <SolarParticles
        count={30}
        color="#76C945"
        minSize={1}
        maxSize={3}
        speed={0.3}
        direction="up"
        opacity={0.2}
        connectDistance={100}
      />
      <div className="relative flex items-center gap-3 mb-2">
        <img src="/ecoxchange-logo.svg" alt="EcoXchange" className="h-10 w-10" />
        <span className="font-heading text-3xl">EcoXchange</span>
      </div>
      <h1 className="relative font-heading text-3xl sm:text-4xl text-center mt-4">
        Explore production verification in action.
      </h1>
      <p className="relative text-paleGreen mt-3 mb-10 text-center max-w-xl">
        See how EcoXchange reconciles three independent production sources, issues
        a monthly determination, and carries that result into investor and
        developer workflows.
      </p>

      <div className="relative w-full max-w-3xl space-y-4">
        {/* Primary: the engine itself. Full width and the accent border, so it
            reads as the entry path rather than one of three peers. */}
        <button
          type="button"
          onClick={() => go("investor", LATEST_VERIFICATION_PATH)}
          className="w-full bg-accentBrt/10 hover:bg-accentBrt/20 rounded-xl border-2 border-accentBrt p-6 text-left transition-colors duration-150"
        >
          <ShieldCheck className="h-8 w-8 text-accentBrt" />
          <h2 className="font-heading text-2xl mt-3">Verification Engine</h2>
          <p className="text-sm text-paleGreen mt-1">
            Run a sample monthly reconciliation and inspect a verified or flagged
            determination.
          </p>
          <span className="mt-3 inline-block font-mono text-xs uppercase tracking-wide text-accentBrt">
            Run verification demo →
          </span>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => go("investor", "/investor")}
            className="bg-white/5 hover:bg-white/10 rounded-xl border border-white/15 p-6 text-left transition-colors duration-150"
          >
            <LineChart className="h-7 w-7 text-accentBrt" />
            <h2 className="font-heading text-xl mt-3">Investor Application</h2>
            <p className="text-sm text-paleGreen mt-1">
              See how verified production status informs project reporting and
              distribution eligibility.
            </p>
            <span className="mt-3 inline-block font-mono text-xs uppercase tracking-wide text-paleGreen">
              View investor experience →
            </span>
          </button>

          <button
            type="button"
            onClick={() => go("developer", "/onboard")}
            className="bg-white/5 hover:bg-white/10 rounded-xl border border-white/15 p-6 text-left transition-colors duration-150"
          >
            <Hammer className="h-7 w-7 text-accentBrt" />
            <h2 className="font-heading text-xl mt-3">Developer Application</h2>
            <p className="text-sm text-paleGreen mt-1">
              Submit a project profile and preview the production-backtest
              workflow.
            </p>
            <span className="mt-3 inline-block font-mono text-xs uppercase tracking-wide text-paleGreen">
              View developer experience →
            </span>
          </button>
        </div>

        {/* Presentation controls are a pitch tool, not a way to explore the
            product — demoted from a peer card to a link. */}
        <button
          type="button"
          onClick={() => {
            enterDemo();
            navigate("/demo");
          }}
          className="font-mono text-xs uppercase tracking-wide text-paleGreen/70 underline underline-offset-4 hover:text-paleGreen"
        >
          Open presentation controls
        </button>
      </div>

      <p className="relative mt-10 max-w-xl text-center text-xs text-paleGreen/80">
        This technology demonstration uses simulated project, ownership, and
        financial data. It does not display an actual offering or investment.
      </p>
      </div>

      {/* Light band so the disclaimer footer keeps its cream-palette styling.
          The full legal text stays in the DOM and the accessibility tree —
          <details> collapses it, it does not remove it. */}
      <div className="bg-cream px-4 sm:px-6 py-6">
        <details className="mx-auto max-w-4xl">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-wide text-medGreen">
            Read full demo disclosures
          </summary>
          <DisclaimerFooter />
        </details>
      </div>
    </div>
  );
}

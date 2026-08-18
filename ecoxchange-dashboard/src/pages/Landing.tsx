import { useNavigate } from "react-router-dom";
import { LineChart, Hammer, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { useDemo } from "../context/DemoContext.js";
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
    <div className="min-h-screen flex flex-col bg-cream text-darkBg">
      <DemoModeBanner />
      <RegDBanner />
      <div className="hero-gradient relative flex-1 flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      <div className="relative flex items-center gap-3 mb-2">
        <img src="/ecoxchange-logo.svg" alt="EcoXchange" className="h-10 w-10" />
        <span className="font-heading text-3xl text-darkBg">EcoXchange</span>
      </div>
      <p className="relative mt-5 font-mono text-xs uppercase tracking-[0.22em] text-medGreen">
        Production verification demonstration
      </p>
      <h1 className="relative font-heading text-4xl sm:text-5xl text-center mt-3 text-darkBg">
        Explore production verification in action.
      </h1>
      <p className="relative text-textMuted mt-4 mb-10 text-center max-w-xl text-base leading-relaxed">
        Compare measured inverter production with a weather-adjusted NASA POWER
        model, inspect the provenance of every input, and follow the resulting
        determination into investor and developer workflows.
      </p>

      <div className="relative w-full max-w-3xl space-y-4">
        {/* Primary: the engine itself. Full width and the accent border, so it
            reads as the entry path rather than one of three peers. */}
        <button
          type="button"
          onClick={() => go("investor", LATEST_VERIFICATION_PATH)}
          className="w-full bg-white hover:bg-paleGreen/30 rounded-md border-2 border-medGreen p-6 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medGreen focus-visible:ring-offset-2"
        >
          <ShieldCheck className="h-8 w-8 text-accentBrt" />
          <h2 className="font-heading text-2xl mt-3 text-darkBg">Verification Engine</h2>
          <p className="text-base text-textMuted mt-1">
            Inspect measured PVDAQ production against a pvlib expectation. The
            utility proxy is labeled as derived, not presented as a meter reading.
          </p>
          <span className="mt-3 inline-block font-mono text-xs uppercase tracking-wide text-accentBrt">
            Run verification demo →
          </span>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => go("investor", "/investor")}
            className="bg-white hover:bg-paleGreen/30 rounded-md border border-paleGreen p-6 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medGreen focus-visible:ring-offset-2"
          >
            <LineChart className="h-7 w-7 text-accentBrt" />
            <h2 className="font-heading text-xl mt-3 text-darkBg">Investor Application</h2>
            <p className="text-base text-textMuted mt-1">
              See how source-comparison status informs project reporting and
              distribution eligibility.
            </p>
            <span className="mt-3 inline-block font-mono text-xs uppercase tracking-wide text-medGreen">
              View investor experience →
            </span>
          </button>

          <button
            type="button"
            onClick={() => go("developer", "/onboard")}
            className="bg-white hover:bg-paleGreen/30 rounded-md border border-paleGreen p-6 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medGreen focus-visible:ring-offset-2"
          >
            <Hammer className="h-7 w-7 text-accentBrt" />
            <h2 className="font-heading text-xl mt-3 text-darkBg">Developer Application</h2>
            <p className="text-base text-textMuted mt-1">
              Submit a project profile and preview the production-backtest
              workflow.
            </p>
            <span className="mt-3 inline-block font-mono text-xs uppercase tracking-wide text-medGreen">
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
          className="min-h-11 font-mono text-xs uppercase tracking-wide text-medGreen underline underline-offset-4 hover:text-darkBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medGreen"
        >
          Open presentation controls
        </button>
      </div>

      <p className="relative mt-10 max-w-xl text-center text-sm text-textMuted">
        This technology demonstration uses measured public PVDAQ production with
        modeled and derived comparison inputs. Project ownership, account, and
        financial data are simulated. It does not display an actual offering or
        investment.
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

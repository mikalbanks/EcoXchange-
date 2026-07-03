import { useNavigate } from "react-router-dom";
import { LineChart, Hammer, PlayCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { useDemo } from "../context/DemoContext.js";
import { DemoModeBanner } from "../compliance/components/DemoModeBanner.js";
import { RegDBanner } from "../compliance/components/RegDBanner.js";
import { DisclaimerFooter } from "../compliance/components/DisclaimerFooter.js";

// Lightweight role-select entry point. Real auth (Privy) replaces this after
// securities counsel; for now it just sets the mock role and routes in.
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
      <div className="flex-1 flex flex-col items-center justify-center bg-darkBg text-white px-4 py-16">
      <div className="flex items-center gap-3 mb-2">
        <img src="/ecoxchange-logo.svg" alt="EcoXchange" className="h-10 w-10" />
        <span className="font-heading text-3xl">EcoXchange</span>
      </div>
      <p className="text-paleGreen mb-10 text-center max-w-md">
        Digital securities for renewable energy. Choose how you’d like to explore
        the platform.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
        <button
          type="button"
          onClick={() => go("investor", "/investor")}
          className="bg-white/5 hover:bg-white/10 rounded-xl border border-white/15 p-6 text-left transition-colors duration-150"
        >
          <LineChart className="h-7 w-7 text-accentBrt" />
          <h2 className="font-heading text-xl mt-3">Investor</h2>
          <p className="text-sm text-paleGreen mt-1">
            Portfolio, production, and verified yields.
          </p>
        </button>

        <button
          type="button"
          onClick={() => go("developer", "/onboard")}
          className="bg-white/5 hover:bg-white/10 rounded-xl border border-white/15 p-6 text-left transition-colors duration-150"
        >
          <Hammer className="h-7 w-7 text-accentBrt" />
          <h2 className="font-heading text-xl mt-3">Developer</h2>
          <p className="text-sm text-paleGreen mt-1">
            Onboard a project and run a backtest.
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            enterDemo();
            navigate("/demo");
          }}
          className="bg-white/5 hover:bg-white/10 rounded-xl border border-white/15 p-6 text-left transition-colors duration-150"
        >
          <PlayCircle className="h-7 w-7 text-accentBrt" />
          <h2 className="font-heading text-xl mt-3">Demo Mode</h2>
          <p className="text-sm text-paleGreen mt-1">
            Presentation controls for live pitches.
          </p>
        </button>
      </div>
      </div>

      {/* Light band so the disclaimer footer keeps its cream-palette styling. */}
      <div className="bg-cream px-4 sm:px-6">
        <DisclaimerFooter />
      </div>
    </div>
  );
}

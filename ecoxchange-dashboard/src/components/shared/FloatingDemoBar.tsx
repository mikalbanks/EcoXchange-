import { X } from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { useDemo } from "../../context/DemoContext.js";
import { RoleSwitcher } from "./RoleSwitcher.js";

// Persistent presentation control. Visible on every shell page while demo mode
// is on, so a presenter can flip role and dataset scenario mid-demo without
// navigating away from the current context.
export function FloatingDemoBar() {
  const { role } = useAuth();
  const { scenario, setScenario, exitDemo } = useDemo();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-darkBg text-white border-t border-accentBrt/40 shadow-[0_-2px_12px_rgba(0,0,0,0.18)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2 font-medium">
          <span className="h-2 w-2 rounded-full bg-accentBrt animate-pulse" />
          DEMO MODE
        </span>

        <span className="hidden sm:inline text-paleGreen">
          Viewing as <span className="text-white capitalize">{role}</span>
        </span>

        <RoleSwitcher compact />

        {role === "investor" ? (
          <div className="inline-flex items-center gap-2">
            <span className="text-paleGreen text-xs uppercase tracking-wide">
              Scenario
            </span>
            <div className="inline-flex rounded-md border border-white/20 p-0.5">
              <button
                type="button"
                onClick={() => setScenario("verified")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
                  scenario === "verified"
                    ? "bg-accentBrt text-darkBg"
                    : "text-paleGreen hover:text-white"
                }`}
              >
                Verified
              </button>
              <button
                type="button"
                onClick={() => setScenario("flagged")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
                  scenario === "flagged"
                    ? "bg-flagAmber text-white"
                    : "text-paleGreen hover:text-white"
                }`}
              >
                Flagged
              </button>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={exitDemo}
          className="ml-auto inline-flex items-center gap-1 text-paleGreen hover:text-white transition-colors duration-150"
        >
          <X className="h-4 w-4" /> Exit Demo
        </button>
      </div>
    </div>
  );
}

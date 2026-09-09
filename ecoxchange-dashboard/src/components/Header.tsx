import { Link } from "react-router-dom";
import { liveMode } from "../data/index.js";

export function Header() {
  return (
    <header className="bg-darkBg text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 transition-opacity duration-150 hover:opacity-80">
          <img src="/ecoxchange-logo.svg" alt="EcoXchange" className="h-8 w-8" />
          <div>
            <span className="font-heading text-xl block leading-none">EcoXchange</span>
            <span className="font-mono text-[9px] uppercase tracking-wide text-paleGreen">Project Finance Workspace</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/bankability" className="hidden sm:inline text-sm text-paleGreen hover:text-white transition-colors duration-150">Finance Readiness</Link>
          <Link to="/onboard" className="hidden sm:inline text-sm text-paleGreen hover:text-white transition-colors duration-150">Project Intake</Link>
          <Link to="/benchmark" className="hidden md:inline text-sm text-paleGreen hover:text-white transition-colors duration-150">Benchmark</Link>
          {liveMode ? (
            <Link to="/reference" className="hidden md:inline text-sm text-paleGreen hover:text-white transition-colors duration-150">Reference Library</Link>
          ) : null}
          <span
            className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-medium ${liveMode ? "bg-accentBrt/20 text-accentBrt" : "bg-paleGreen/20 text-paleGreen"}`}
            title={liveMode ? "Reading from Supabase" : "Mixed-source pilot demo; review per-source provenance"}
          >
            <span className={`h-2 w-2 rounded-full ${liveMode ? "bg-accentBrt" : "bg-paleGreen"}`} />
            {liveMode ? "Live" : "Pilot Demo"}
          </span>
        </div>
      </div>
    </header>
  );
}

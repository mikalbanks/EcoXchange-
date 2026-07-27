import { Link } from "react-router-dom";
import { liveMode } from "../data/index.js";

export function Header() {
  return (
    <header className="bg-darkBg text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-3 transition-opacity duration-150 hover:opacity-80"
        >
          <img src="/ecoxchange-logo.svg" alt="EcoXchange" className="h-8 w-8" />
          <span className="font-heading text-xl">EcoXchange</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/reference"
            className="hidden sm:inline text-sm text-paleGreen hover:text-white transition-colors duration-150"
          >
            Reference Library
          </Link>
          <Link
            to="/projects"
            className="hidden sm:inline text-sm text-paleGreen hover:text-white transition-colors duration-150"
          >
            Projects
          </Link>
          <Link
            to="/benchmark"
            className="hidden sm:inline text-sm text-paleGreen hover:text-white transition-colors duration-150"
          >
            Benchmark
          </Link>
          <Link
            to="/developer/demo"
            className="hidden sm:inline text-sm text-paleGreen hover:text-white transition-colors duration-150"
          >
            Run Demo
          </Link>
          <Link
            to="/onboard"
            className="hidden sm:inline text-sm text-paleGreen hover:text-white transition-colors duration-150"
          >
            Developer Onboarding
          </Link>
          <Link
            to="/developer/loi"
            className="hidden sm:inline text-sm text-paleGreen hover:text-white transition-colors duration-150"
          >
            LOI Builder
          </Link>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-medium ${
              liveMode
                ? "bg-accentBrt/20 text-accentBrt"
                : "bg-paleGreen/20 text-paleGreen"
            }`}
            title={
              liveMode
                ? "Reading from Supabase"
                : "Static demo data (set VITE_SUPABASE_URL to go live)"
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                liveMode ? "bg-accentBrt" : "bg-paleGreen"
              }`}
            />
            {liveMode ? "Live" : "Demo"}
          </span>
          <span className="hidden sm:inline text-sm sm:text-base text-paleGreen">
            Investor Dashboard
          </span>
        </div>
      </div>
    </header>
  );
}

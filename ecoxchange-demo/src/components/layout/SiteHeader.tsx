import { Link, NavLink } from "react-router-dom";
import { useDemoMode } from "../../state/demoMode.js";

const NAV = [
  { to: "/", label: "Portfolio" },
  { to: "/project/demo-savannah-5mw", label: "Projects" },
  {
    to: "/project/demo-savannah-5mw/verification/2024-04-01",
    label: "Methodology",
  },
];

export function SiteHeader() {
  const { mode, toggle } = useDemoMode();
  const isFlagged = mode === "flagged";

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-eco-border">
      <div
        aria-hidden
        className="h-[3px] w-full"
        style={{
          background:
            "linear-gradient(90deg, #2E7D52 0%, #76C945 50%, #2E7D52 100%)",
        }}
      />
      <div className="mx-auto max-w-site px-6 sm:px-8 py-4 flex items-center gap-6">
        {/* Logo block */}
        <Link to="/" className="flex flex-col leading-tight shrink-0">
          <span className="font-display italic text-[22px] sm:text-[24px] text-eco-logo">
            EcoXchange
          </span>
          <span className="font-mono text-[9px] sm:text-[10px] tracking-tag uppercase text-eco-text-muted">
            Clean Energy Market
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-7 ml-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `font-body uppercase text-[12px] tracking-nav transition-colors duration-150 ${
                  isActive
                    ? "text-eco-dark"
                    : "text-eco-text-body hover:text-eco-dark"
                }`
              }
              end={item.to === "/"}
            >
              {item.label}
            </NavLink>
          ))}
          <a
            href="#request-access"
            className="font-body uppercase text-[12px] tracking-nav text-eco-dark hover:text-eco-mid transition-colors duration-150"
          >
            Request Access →
          </a>
        </nav>

        {/* Demo toggle */}
        <button
          type="button"
          onClick={toggle}
          className="ml-auto md:ml-0 flex items-center gap-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-tag text-eco-text-muted hover:text-eco-dark transition-colors duration-150"
          aria-pressed={isFlagged}
          aria-label="Toggle demo mode between verified and flagged"
          title="Toggle demo data state"
        >
          <span>Demo</span>
          <span
            className={`inline-block h-3 w-6 border ${
              isFlagged
                ? "bg-eco-flagged-bg border-eco-flagged"
                : "bg-eco-verified-bg border-eco-verified"
            } relative`}
          >
            <span
              className={`absolute top-[1px] h-2 w-2 ${
                isFlagged ? "right-[1px] bg-eco-flagged" : "left-[1px] bg-eco-verified"
              }`}
            />
          </span>
          <span className={isFlagged ? "text-eco-flagged" : "text-eco-verified"}>
            {isFlagged ? "Flagged" : "Verified"}
          </span>
        </button>
      </div>
    </header>
  );
}

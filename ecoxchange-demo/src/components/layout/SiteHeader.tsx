import { Link, NavLink } from "react-router-dom";
import { useDemoMode } from "../../state/demoMode.js";

const NAV = [
  { to: "/portfolio", label: "Portfolio" },
  { to: "/projects", label: "Projects" },
  { to: "/methodology", label: "Methodology" },
  { to: "/rias", label: "For RIAs" },
  { to: "/developers", label: "For Solar Developers" },
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
        <Link to="/" className="flex flex-col leading-tight shrink-0">
          <span className="font-display italic text-[22px] sm:text-[24px] text-eco-logo">
            EcoXchange
          </span>
          <span className="font-mono text-[9px] sm:text-[10px] tracking-tag uppercase text-eco-text-muted">
            Solar Securities Demo
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 ml-auto">
          {NAV.map((item) => (
            <NavItem key={item.to} to={item.to} label={item.label} size="md" />
          ))}
          <NavItem to="/onboard" label="Request Access" size="md" strong />
        </nav>

        <button
          type="button"
          onClick={toggle}
          className="ml-auto lg:ml-0 flex items-center gap-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-tag text-eco-text-muted hover:text-eco-dark transition-colors duration-150"
          aria-pressed={isFlagged}
          aria-label="Toggle demo fallback data between verified and flagged"
          title="Toggle static fallback demo data state"
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
                isFlagged
                  ? "right-[1px] bg-eco-flagged"
                  : "left-[1px] bg-eco-verified"
              }`}
            />
          </span>
          <span className={isFlagged ? "text-eco-flagged" : "text-eco-verified"}>
            {isFlagged ? "Flagged" : "Verified"}
          </span>
        </button>
      </div>

      <nav className="lg:hidden mx-auto max-w-site px-6 sm:px-8 pb-4 overflow-x-auto">
        <div className="flex min-w-max items-center gap-5">
          {NAV.map((item) => (
            <NavItem key={item.to} to={item.to} label={item.label} size="sm" />
          ))}
          <NavItem to="/onboard" label="Request Access" size="sm" strong />
        </div>
      </nav>
    </header>
  );
}

function NavItem({
  to,
  label,
  size,
  strong = false,
}: {
  to: string;
  label: string;
  size: "sm" | "md";
  strong?: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `font-body uppercase tracking-nav transition-colors duration-150 ${
          size === "sm" ? "text-[11px]" : "text-[12px]"
        } ${
          isActive || strong
            ? "text-eco-dark"
            : "text-eco-text-body hover:text-eco-dark"
        }`
      }
      end
    >
      {label}
    </NavLink>
  );
}

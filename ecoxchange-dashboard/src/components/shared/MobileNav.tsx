import { Link, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Store, Coins, Leaf, ShieldCheck } from "lucide-react";
import { LATEST_VERIFICATION_PATH } from "../../data/index.js";

interface NavTab {
  id: string;
  label: string;
  icon: LucideIcon;
  to: string;
  /** Prefix-aware active test so nested routes highlight the right tab. */
  matches: (pathname: string) => boolean;
}

// The five primary investor destinations, mirroring the sidebar's core order.
// Secondary items (Calculator, Recommendations, Ownership Record, Settings, …)
// stay in the hamburger drawer. 5 tabs is the mobile maximum.
const TABS: NavTab[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    to: "/investor",
    matches: (p) => p === "/investor",
  },
  {
    id: "verification",
    label: "Verification",
    icon: ShieldCheck,
    to: LATEST_VERIFICATION_PATH,
    matches: (p) => p.includes("/verification/"),
  },
  {
    id: "projects",
    label: "Projects",
    icon: Store,
    to: "/investor/marketplace",
    matches: (p) =>
      p.startsWith("/investor/marketplace") ||
      p.startsWith("/investor/offering") ||
      p.startsWith("/investor/catalog") ||
      (p.startsWith("/investor/project") && !p.includes("/verification/")),
  },
  {
    id: "distributions",
    label: "Distributions",
    icon: Coins,
    to: "/investor/distributions",
    matches: (p) => p.startsWith("/investor/distributions"),
  },
  {
    id: "impact",
    label: "Impact",
    icon: Leaf,
    to: "/investor/impact",
    matches: (p) => p.startsWith("/investor/impact"),
  },
];

/**
 * Fixed bottom tab bar for viewports below `lg` (1024px). The bottom third of
 * the screen is the thumb zone — primary navigation lives there on mobile.
 */
export function MobileNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 lg:hidden bg-darkBg/95 backdrop-blur-[12px] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="flex h-16 items-center justify-around">
        {TABS.map((tab) => {
          const isActive = tab.matches(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              to={tab.to}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex h-full min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1"
            >
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full bg-accentBrt"
                />
              ) : null}
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={isActive ? "text-accentBrt" : "text-lightGreen"}
              />
              <span
                className={`max-w-full truncate font-mono text-[9px] uppercase tracking-wide ${
                  isActive ? "text-accentBrt" : "text-lightGreen"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

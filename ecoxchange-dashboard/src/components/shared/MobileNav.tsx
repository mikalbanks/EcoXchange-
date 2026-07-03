import { Link, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Store, Coins, Leaf, Link2 } from "lucide-react";

interface NavTab {
  id: string;
  label: string;
  icon: LucideIcon;
  to: string;
  /** Prefix-aware active test so nested routes highlight the right tab. */
  matches: (pathname: string) => boolean;
}

// The four primary investor destinations. Secondary items (Calculator,
// Recommendations, Settings, …) stay in the hamburger drawer.
const TABS: NavTab[] = [
  {
    id: "portfolio",
    label: "Portfolio",
    icon: LayoutDashboard,
    to: "/investor",
    matches: (p) => p === "/investor" || p.startsWith("/investor/project"),
  },
  {
    id: "projects",
    label: "Projects",
    icon: Store,
    to: "/investor/marketplace",
    matches: (p) =>
      p.startsWith("/investor/marketplace") || p.startsWith("/investor/offering"),
  },
  {
    id: "yield",
    label: "Yield",
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
  {
    // Spec 08: on-chain transparency. 5 tabs is the mobile maximum.
    id: "explorer",
    label: "Chain",
    icon: Link2,
    to: "/explorer",
    matches: (p) => p.startsWith("/explorer"),
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
              className="relative flex h-full min-h-[44px] flex-1 flex-col items-center justify-center gap-1"
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
                className={`font-mono text-[10px] uppercase tracking-wider ${
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

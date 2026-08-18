import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Store,
  Calculator as CalculatorIcon,
  Leaf,
  Coins,
  Sparkles,
  FileText,
  Settings as SettingsIcon,
  Hammer,
  PlusCircle,
  BookOpen,
  PlayCircle,
  Link2,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { useDemo } from "../../context/DemoContext.js";
import { useData } from "../../context/DataContext.js";
import { liveMode, LATEST_VERIFICATION_PATH } from "../../data/index.js";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  disabled?: boolean;
  /** Hidden unless a live backend is configured (nothing to show without it). */
  liveOnly?: boolean;
  /** Secondary items, rendered below the core portfolio nav under a heading. */
  group?: "explore";
  /** Hidden unless the explicit fixture-backed Savannah scenario is active. */
  transactionOnly?: boolean;
}

// Core order follows the determination: what the portfolio is, whether this
// month verified, what it is invested in, what that pays out. Browsing tools
// (marketplace, catalog, calculator, recommendations) are a different job and
// sit under Explore so they don't compete with the status the investor came for.
const INVESTOR_NAV: NavItem[] = [
  { to: "/investor", label: "Overview", icon: LayoutDashboard, end: true },
  { to: LATEST_VERIFICATION_PATH, label: "Verification", icon: ShieldCheck },
  { to: "/investor/marketplace", label: "Projects", icon: Store, transactionOnly: true },
  { to: "/investor/distributions", label: "Distributions", icon: Coins, transactionOnly: true },
  { to: "/investor/impact", label: "Impact", icon: Leaf },
  { to: "/investor/documents", label: "Documents", icon: FileText, disabled: true },
  { to: "/explorer", label: "Ownership Record", icon: Link2, transactionOnly: true },
  { to: "/investor/settings", label: "Settings", icon: SettingsIcon },

  { to: "/onboarding", label: "Recommendations", icon: Sparkles, group: "explore", transactionOnly: true },
  { to: "/investor/catalog", label: "Solar Catalog", icon: Sun, group: "explore" },
  { to: "/investor/calculator", label: "Calculator", icon: CalculatorIcon, group: "explore", transactionOnly: true },
];

const DEVELOPER_NAV: NavItem[] = [
  { to: "/onboard", label: "Add Project", icon: PlusCircle },
  { to: "/developer/loi", label: "Letter of Intent", icon: FileText, transactionOnly: true },
  { to: "/reference", label: "Reference Library", icon: BookOpen, liveOnly: true },
  { to: "/developer/settings", label: "Settings", icon: SettingsIcon, disabled: true },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth();
  const { demoMode } = useDemo();
  const { transactionPolicy } = useData();
  const visible = (role === "developer" ? DEVELOPER_NAV : INVESTOR_NAV).filter(
    (item) =>
      (!item.liveOnly || liveMode) &&
      (!item.transactionOnly || transactionPolicy.state === "simulated"),
  );
  const items = visible.filter((item) => !item.group);
  const exploreItems = visible.filter((item) => item.group === "explore");

  return (
    <div className="flex h-full flex-col bg-darkBg text-white">
      <NavLink
        to={role === "developer" ? "/onboard" : "/investor"}
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 py-5 transition-opacity duration-150 hover:opacity-80"
      >
        <img src="/ecoxchange-logo.svg" alt="EcoXchange" className="h-8 w-8" />
        <span className="font-heading text-xl">EcoXchange</span>
      </NavLink>

      <nav className="flex-1 px-3 space-y-1">
        {renderItems(items)}
        {exploreItems.length > 0 ? (
          <>
            <p className="px-3 pb-1 pt-4 font-mono text-[10px] uppercase tracking-[0.08em] text-paleGreen/50">
              Explore
            </p>
            {renderItems(exploreItems)}
          </>
        ) : null}
      </nav>

      <div className="px-3 pb-5 pt-3 border-t border-white/10">
        <NavLink
          to="/demo"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-paleGreen hover:bg-white/5 hover:text-white transition-colors duration-150"
        >
          <PlayCircle className="h-5 w-5" />
          Presenter controls
        </NavLink>
        {demoMode ? (
          <div className="mt-2 flex items-center gap-2 px-3 text-xs text-accentBrt">
            <Hammer className="h-3.5 w-3.5" />
            Demo data active
          </div>
        ) : null}
      </div>
    </div>
  );

  function renderItems(list: NavItem[]) {
    return list.map((item) => {
      const Icon = item.icon;
      if (item.disabled) {
        return (
          <span
            key={item.to}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-paleGreen/50 cursor-not-allowed"
            title="Coming soon"
          >
            <Icon className="h-5 w-5" />
            <span className="flex-1">{item.label}</span>
            <span className="text-[10px] uppercase tracking-wide">Soon</span>
          </span>
        );
      }
      return (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              isActive
                ? "bg-accentBrt/20 text-accentBrt"
                : "text-paleGreen hover:bg-white/5 hover:text-white"
            }`
          }
        >
          <Icon className="h-5 w-5" />
          {item.label}
        </NavLink>
      );
    });
  }
}

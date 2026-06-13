import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  LineChart,
  FileText,
  Settings as SettingsIcon,
  Hammer,
  PlusCircle,
  BookOpen,
  PlayCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { useDemo } from "../../context/DemoContext.js";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  disabled?: boolean;
}

const INVESTOR_NAV: NavItem[] = [
  { to: "/investor", label: "Portfolio", icon: LayoutDashboard, end: true },
  { to: "/investor/performance", label: "Performance", icon: LineChart, disabled: true },
  { to: "/investor/documents", label: "Documents", icon: FileText, disabled: true },
  { to: "/investor/settings", label: "Settings", icon: SettingsIcon },
];

const DEVELOPER_NAV: NavItem[] = [
  { to: "/onboard", label: "Add Project", icon: PlusCircle },
  { to: "/reference", label: "Reference Library", icon: BookOpen },
  { to: "/developer/settings", label: "Settings", icon: SettingsIcon, disabled: true },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth();
  const { demoMode } = useDemo();
  const items = role === "developer" ? DEVELOPER_NAV : INVESTOR_NAV;

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
        {items.map((item) => {
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
        })}
      </nav>

      <div className="px-3 pb-5 pt-3 border-t border-white/10">
        <NavLink
          to="/demo"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-paleGreen hover:bg-white/5 hover:text-white transition-colors duration-150"
        >
          <PlayCircle className="h-5 w-5" />
          Demo Controller
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
}

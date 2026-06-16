import {
  Sprout,
  TrendingUp,
  BarChart3,
  Briefcase,
  Wallet,
  PieChart,
  Leaf,
  Shield,
  Scale,
  Zap,
  Clock,
  Calendar,
  CalendarRange,
  DollarSign,
  Layers,
  Building2,
  Landmark,
  CloudOff,
  Sun,
  HardHat,
  Plug,
  Check,
  X,
  HelpCircle,
  Coins,
  Cpu,
  Circle,
  type LucideIcon,
} from "lucide-react";

// Map the icon names referenced in the questionnaire config to components.
const ICONS: Record<string, LucideIcon> = {
  Sprout, TrendingUp, BarChart3, Briefcase, Wallet, PieChart, Leaf, Shield,
  Scale, Zap, Clock, Calendar, CalendarRange, DollarSign, Layers, Building2,
  Landmark, CloudOff, Sun, HardHat, Plug, Check, X, HelpCircle, Coins, Cpu,
};

export function iconFor(name?: string): LucideIcon {
  return (name && ICONS[name]) || Circle;
}

import { BarChart3, Coins, ShieldCheck, Building2, Compass, Leaf, type LucideIcon } from "lucide-react";
import { PILLAR_META, type ContentPillar } from "../../types/content.js";

const ICONS: Record<string, LucideIcon> = {
  BarChart3, Coins, ShieldCheck, Building2, Compass, Leaf,
};

export function PillarBadge({
  pillar,
  size = "md",
}: {
  pillar: ContentPillar;
  size?: "sm" | "md";
}) {
  const meta = PILLAR_META[pillar];
  const Icon = ICONS[meta.icon] ?? Leaf;
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide ${pad}`}
      style={{ color: meta.color, backgroundColor: `${meta.color}1a` }}
    >
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

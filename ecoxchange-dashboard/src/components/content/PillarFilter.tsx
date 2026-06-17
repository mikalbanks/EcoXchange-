import { PILLAR_META, type ContentPillar } from "../../types/content.js";

export type PillarFilterValue = ContentPillar | "all";

interface Props {
  active: PillarFilterValue;
  onChange: (value: PillarFilterValue) => void;
  available: ContentPillar[]; // pillars that actually have articles
}

export function PillarFilter({ active, onChange, available }: Props) {
  const pillars = (Object.keys(PILLAR_META) as ContentPillar[]).filter((p) =>
    available.includes(p),
  );

  const tab = (value: PillarFilterValue, label: string) => {
    const on = active === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => onChange(value)}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 ${
          on
            ? "bg-darkBg text-white"
            : "bg-white text-darkBg border border-paleGreen hover:border-medGreen"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tab("all", "All")}
      {pillars.map((p) => tab(p, PILLAR_META[p].label))}
    </div>
  );
}

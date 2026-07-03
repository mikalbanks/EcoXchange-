import { useCompliance } from "../ComplianceProvider.js";

/**
 * Persistent Reg D regulatory notice, shown in preview and live compliance
 * modes (demo mode shows DemoModeBanner instead). Text lives in
 * bannerConfig.ts so counsel can revise it in one place.
 */
export function RegDBanner() {
  const { mode, banners } = useCompliance();
  if (mode === "demo") return null;

  return (
    <div
      role="alert"
      aria-label="Regulatory notice"
      className="w-full py-2 px-4 text-center bg-darkBg border-b border-accentBrt/30"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-lightGreen">
        {banners.regD}
      </p>
    </div>
  );
}

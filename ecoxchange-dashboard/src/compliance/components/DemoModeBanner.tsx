import { useCompliance } from "../ComplianceProvider.js";

/**
 * Top-of-page demonstration indicator (demo compliance mode only). Tells
 * reviewers, developers, and anyone evaluating the platform that this is a
 * demonstration with simulated data — intentionally light and unobtrusive.
 * Distinct from the bottom FloatingDemoBar (presentation controls) and the
 * header Live/Demo data pill.
 */
export function DemoModeBanner() {
  const { isDemo, banners } = useCompliance();
  if (!isDemo) return null;

  return (
    <div
      role="status"
      aria-label="Demonstration mode"
      className="w-full py-2 px-4 flex items-center justify-center gap-2 bg-cream border-b border-darkBg/15"
    >
      <span
        className="inline-block w-2 h-2 rounded-full animate-pulse bg-accentBrt"
        aria-hidden="true"
      />
      <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-medGreen text-center">
        {banners.demo}
      </p>
    </div>
  );
}

// Static three-source reconciliation diagram for print (report page 3).
// Deliberately NOT the interactive ReconciliationDiagram component —
// bordered divs and arrow characters only, so html2canvas captures it
// crisply and it reads on paper.

function SourceBox({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="w-[150px] border-2 border-darkBg bg-white px-3 py-2.5 text-center">
      <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-darkBg">
        {title}
      </div>
      <div className="mt-0.5 text-[9px] text-textMuted">{subtitle}</div>
    </div>
  );
}

function FlowLabel({ children }: { children: string }) {
  return (
    <span className="font-mono text-[9px] text-textMuted">{children}</span>
  );
}

export function ReportThreeSourceDiagram() {
  return (
    <div className="border border-paleGreen bg-cream/50 p-5">
      <div className="flex items-center gap-4">
        {/* Sources column */}
        <div className="flex flex-col gap-4">
          <SourceBox title="Inverter" subtitle="SolarEdge / Enphase telemetry" />
          <SourceBox title="Utility Meter" subtitle="Net export via Bayou" />
          <SourceBox title="Satellite" subtitle="NASA POWER · pvlib physics" />
        </div>

        {/* Flow labels + arrows */}
        <div className="flex flex-1 flex-col gap-[42px] text-right">
          <div className="flex items-center justify-end gap-2">
            <FlowLabel>actual kWh produced</FlowLabel>
            <span className="text-[14px] text-darkBg" aria-hidden>
              ─▶
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <FlowLabel>net kWh exported</FlowLabel>
            <span className="text-[14px] text-darkBg" aria-hidden>
              ─▶
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <FlowLabel>expected kWh (physics model)</FlowLabel>
            <span className="text-[14px] text-darkBg" aria-hidden>
              ─▶
            </span>
          </div>
        </div>

        {/* Verdict box */}
        <div className="border-2 border-accentBrt bg-darkBg px-4 py-6 text-center">
          <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-accentBrt">
            Three-Way
          </div>
          <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-accentBrt">
            Verdict
          </div>
          <div className="mt-1.5 text-[9px] text-paleGreen">
            VERIFIED · FLAGGED
          </div>
        </div>
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-textDark">
        When all three inputs are independently sourced and agree within
        tolerance, the engine can return{" "}
        <span className="font-mono font-bold text-medGreen">VERIFIED</span>. If
        an input diverges, the month is{" "}
        <span className="font-mono font-bold text-flagAmber">FLAGGED</span> for
        manual review. A status without source provenance is only a tolerance
        result, not proof of independent operating verification.
      </p>
    </div>
  );
}

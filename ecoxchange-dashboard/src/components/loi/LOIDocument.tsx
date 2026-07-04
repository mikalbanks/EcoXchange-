import type { ReactNode } from "react";
import { formatUsd } from "../../utils/formatters.js";
import {
  INTERCONNECTION_LABELS,
  OFFTAKE_LABELS,
  type LOIData,
} from "../../types/loi.js";

// The seven-section non-binding LOI (polish spec §C.3), paginated into two
// fixed A4 .pdf-page divs so the shared html2canvas -> jsPDF pipeline
// (src/reports/pdf.ts) can rasterize it. Also serves as the on-screen
// preview. ALL LANGUAGE PLACEHOLDER PENDING SECURITIES COUNSEL REVIEW.

function Page({ children, page, total }: { children: ReactNode; page: number; total: number }) {
  return (
    <div
      className="pdf-page relative flex w-[794px] h-[1123px] flex-col bg-white px-16 py-14 text-textDark"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <div className="flex-1">{children}</div>
      <div className="mt-6 flex items-center justify-between border-t border-paleGreen pt-3 font-mono text-[9px] uppercase tracking-[0.08em] text-textMuted">
        <span>EcoXchange · Non-Binding Letter of Intent</span>
        <span>Page {page} of {total}</span>
      </div>
    </div>
  );
}

function SectionHeading({ n, children }: { n: number; children: ReactNode }) {
  return (
    <h3 className="mt-6 font-heading text-[17px] italic text-darkBg">
      {n}. {children}
    </h3>
  );
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-paleGreen/60 py-1.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.04em] text-textMuted">{label}</dt>
      <dd className="font-mono text-[11.5px] tabular-nums text-textDark">{value}</dd>
    </div>
  );
}

function SignatureBlock({ company, name, title }: { company: string; name: string; title: string }) {
  return (
    <div className="mt-6">
      <p className="font-mono text-[11px] font-semibold text-darkBg">{company}</p>
      <div className="mt-8 space-y-4 font-mono text-[10.5px] text-textDark">
        <p>Signature: ________________________________</p>
        <p>Name: {name || "________________________________"}</p>
        <p>Title: {title || "________________________________"}</p>
        <p>Date: ________________________________</p>
      </div>
    </div>
  );
}

export function LOIDocument({ data }: { data: LOIData }) {
  const { developer, project, terms } = data;
  const body = "text-[11.5px] leading-relaxed text-textDark";

  return (
    <>
      <Page page={1} total={2}>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3.5 w-3.5 bg-accentBrt" aria-hidden />
          <span className="font-heading text-xl italic text-darkBg">EcoXchange</span>
        </div>

        <h1 className="mt-8 font-heading text-[26px] italic text-darkBg">
          Non-Binding Letter of Intent
        </h1>
        <div className="mt-3 font-mono text-[11px] text-textMuted">
          <p>
            Between <span className="text-textDark">EcoXchange, Inc.</span> ("Platform") and{" "}
            <span className="text-textDark">{developer.companyName || "[Developer Company]"}</span>{" "}
            ("Developer")
          </p>
          <p className="mt-1">Date: {data.generatedDate}</p>
        </div>

        <SectionHeading n={1}>Purpose</SectionHeading>
        <p className={`mt-2 ${body}`}>
          This Letter of Intent ("LOI") sets forth the mutual interest of the parties in
          exploring a financing relationship whereby EcoXchange would facilitate the raising of
          equity capital for {project.name}, a {project.capacityKwDc.toLocaleString("en-US")} kW
          DC solar energy project located in {project.location} (the "Project"), through
          EcoXchange's regulated digital securities platform.
        </p>
        <p className={`mt-2 ${body}`}>
          This LOI is non-binding and does not create any legal obligation for either party.
          Final terms are subject to mutual due diligence, securities counsel review, and
          execution of definitive agreements.
        </p>

        <SectionHeading n={2}>Project Summary</SectionHeading>
        <dl className="mt-2">
          <TermRow label="Project Name" value={project.name} />
          <TermRow label="Location" value={project.location} />
          <TermRow label="Capacity" value={`${project.capacityKwDc.toLocaleString("en-US")} kW DC`} />
          <TermRow
            label="Estimated Annual Production"
            value={`${project.estimatedAnnualProductionMwh.toLocaleString("en-US")} MWh`}
          />
          <TermRow label="Offtake Structure" value={OFFTAKE_LABELS[project.offtakeType]} />
          {project.ppaRate ? (
            <TermRow label="PPA Rate" value={`$${project.ppaRate.toFixed(3)}/kWh`} />
          ) : null}
          <TermRow
            label="Interconnection Status"
            value={INTERCONNECTION_LABELS[project.interconnectionStatus]}
          />
          <TermRow label="Expected Commissioning" value={project.commissioningDate} />
          <TermRow label="Inverter" value={project.inverterBrand} />
        </dl>

        <SectionHeading n={3}>Proposed EcoXchange Services</SectionHeading>
        <ul className={`mt-2 list-disc space-y-1 pl-5 ${body}`}>
          {terms.servicesIncluded.map((service) => (
            <li key={service.slice(0, 32)}>{service}</li>
          ))}
        </ul>
      </Page>

      <Page page={2} total={2}>
        <SectionHeading n={4}>Proposed Economic Terms</SectionHeading>
        <dl className="mt-2 max-w-lg">
          <TermRow label="Target Equity Raise" value={formatUsd(terms.equityRaiseTarget)} />
          <TermRow
            label="Origination Fee"
            value={`${terms.originationFeePct.toFixed(1)}% of equity raised`}
          />
          <TermRow
            label="Platform Setup Fee"
            value={`${formatUsd(terms.platformSetupFee)} (one-time)`}
          />
          <TermRow
            label="Target Close Timeline"
            value={`${terms.targetCloseWeeks} weeks from offering launch`}
          />
          <TermRow label="Annual Servicing Fee" value="0.5% of AUA" />
        </dl>

        <SectionHeading n={5}>Exclusivity</SectionHeading>
        <p className={`mt-2 ${body}`}>
          During the {terms.exclusivityDays}-day period following execution of this LOI,
          Developer agrees to engage exclusively with EcoXchange for the purpose of exploring
          the financing arrangement described herein.
        </p>

        <SectionHeading n={6}>Next Steps</SectionHeading>
        <ol className={`mt-2 list-decimal space-y-1 pl-5 ${body}`}>
          <li>Complete EcoXchange's project intake process</li>
          <li>
            Run a 12-month historical production backtest using EcoXchange's verification engine
          </li>
          <li>Engage securities counsel for review of offering documentation</li>
          <li>Prepare and file Form D with the SEC</li>
          <li>Launch the offering to EcoXchange's pre-qualified investor pool</li>
        </ol>

        <SectionHeading n={7}>Non-Binding Nature</SectionHeading>
        <p className={`mt-2 ${body}`}>
          This LOI is intended solely as a summary of the terms and conditions under which the
          parties would be willing to explore a financing relationship. No party shall have any
          legal obligation to the other party with respect to the subject matter hereof unless
          and until definitive agreements have been executed.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-10">
          <SignatureBlock company="EcoXchange, Inc." name="Mikal Banks" title="Founder & CEO" />
          <SignatureBlock
            company={developer.companyName || "[Developer Company]"}
            name={developer.contactName}
            title={developer.contactTitle}
          />
        </div>

        <p className="mt-10 font-mono text-[8.5px] leading-[1.7] text-textMuted">
          Template language pending securities counsel review. This document is a non-binding
          expression of mutual interest only; it is not an offer to sell or a solicitation of an
          offer to buy any security.
        </p>
      </Page>
    </>
  );
}

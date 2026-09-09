import { Header } from "@/components/header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PUBLIC_POSITIONING } from "@/lib/public-positioning";

const FAQS = [
  {
    q: "How does EcoXchange estimate debt capacity?",
    a: "EcoXchange models project cash flow available for debt service, applies the selected DSCR requirement, compares DSCR-sized debt with the applicable LTC ceiling, and identifies the binding financing constraint. The result is indicative decision support, not a lender commitment.",
  },
  {
    q: "How is sponsor equity estimated?",
    a: "The model compares total project uses with modeled permanent sources such as senior debt and eligible tax-credit proceeds. The remaining requirement is shown as indicative sponsor equity. Actual closing equity can change with lender terms, project costs, reserves, tax treatment, timing, and diligence.",
  },
  {
    q: "What projects are eligible?",
    a: "The deepest current finance-readiness support is for U.S. contracted renewable projects, with a V0 focus on solar PV projects in the 1–20 MW range. Other technologies, sizes, merchant exposure, or unusual capital structures require project-specific review.",
  },
  {
    q: "What project data is required?",
    a: "Core inputs include project size, capex, generation assumptions, contracted revenue terms, operating costs, tax-credit assumptions, debt terms, reserves, transaction costs, development status, and relevant project contracts. Missing or estimated inputs should remain explicitly labeled.",
  },
  {
    q: "Is EcoXchange a lender, underwriter, or broker?",
    a: "No. EcoXchange is renewable-project capital infrastructure and provides project-finance decision support, project qualification, and coordination. We do not approve loans, guarantee financing, or present ourselves as a securities underwriter. If a transaction requires regulated securities activity, that activity must be handled through appropriately registered partners where required.",
  },
  {
    q: "What happens after a project is analyzed?",
    a: "The next step depends on the project’s binding constraint and remaining capital gap. A project may need additional development work, revised financing assumptions, a capital partner, a long-term clean-energy buyer, or another execution path.",
  },
  {
    q: "What can EcoXchange offer clean-energy buyers?",
    a: "EcoXchange can organize qualified renewable-project supply around buyer requirements such as geography, technology, MW, development stage, contracted revenue, and environmental-attribute availability. Potential structures can include PPAs, project-linked REC/EAC forwards, utility programs, or other long-term clean-energy commitments where project rights are actually available.",
  },
  {
    q: "Can EcoXchange guarantee a buyer commitment?",
    a: "No. Buyer interest and transaction structure depend on project fit, buyer procurement requirements, project rights, market rules, diligence, and negotiation. EcoXchange can coordinate the pathway but does not guarantee a commitment.",
  },
  {
    q: "How are RECs or other environmental attributes verified?",
    a: "EcoXchange tracks project-linked environmental-attribute context, including existing contractual claims, program obligations, registry information, and available production evidence. We do not represent RECs/EACs as available when they are already committed to a state program, utility, offtaker, buyer, or other counterparty.",
  },
  {
    q: "What role does production verification play?",
    a: "Production verification is evidence infrastructure. It compares available measured and modeled production information with disclosed source provenance so clean-energy buyers, capital partners, and project stakeholders can receive clearer ongoing reporting. It does not itself create financing or prove environmental-attribute ownership.",
  },
  {
    q: "How do capital partners use EcoXchange?",
    a: "Capital partners can review standardized project facts, finance-readiness outputs, modeled debt capacity, sponsor-equity need, development status, and diligence context before deciding whether to engage. EcoXchange helps organize and coordinate the project information; each capital partner performs its own underwriting and diligence.",
  },
];

export default function FaqPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main public-main-narrow">
        <section className="public-hero">
          <p className="public-eyebrow">Frequently asked questions</p>
          <h1 className="public-title">Project finance, capital gaps, buyers, and evidence.</h1>
          <p className="public-copy">{PUBLIC_POSITIONING}</p>
        </section>

        <section className="public-section">
          <div className="public-faq-panel">
            <Accordion type="single" collapsible>
              {FAQS.map((item, i) => (
                <AccordionItem key={item.q} value={`faq-${i}`} className="border-border">
                  <AccordionTrigger className="text-left font-serif text-lg">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <p className="mb-12 font-mono text-[0.6rem] text-muted-foreground/70">
          Informational and decision-support platform. No lender commitment, guaranteed financing, guaranteed buyer commitment, or guaranteed environmental-attribute availability is created through this site.
        </p>
      </main>
    </div>
  );
}

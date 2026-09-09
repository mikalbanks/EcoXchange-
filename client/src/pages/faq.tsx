import { Header } from "@/components/header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_GROUPS = [
  {
    label: "Developers",
    items: [
      { q: "What projects does EcoXchange work with?", a: "The current finance-readiness product is designed around U.S. renewable projects, with the deepest current modeling support for contracted solar projects in the 1–20 MW range. Other technologies and structures require project-specific review." },
      { q: "Does EcoXchange lend money or underwrite projects?", a: "No. EcoXchange provides project-finance decision support and coordination infrastructure. We estimate indicative financeability and help organize next steps; we do not make lender commitments, guarantee financing, or act as the project's underwriter." },
      { q: "How is sponsor equity estimated?", a: "The finance-readiness model compares modeled project uses with permanent sources such as DSCR-constrained debt and eligible tax-credit proceeds. The remaining requirement is shown as indicative sponsor equity. Actual closing equity depends on lender terms, tax treatment, project costs, reserves, timing, and diligence." },
      { q: "What information is required?", a: "Core inputs include project size, capex, generation assumptions, contracted revenue, operating costs, tax-credit assumptions, debt terms, reserves, and transaction costs. EcoXchange labels assumptions and missing information rather than treating estimates as known facts." },
      { q: "What happens after a project is analyzed?", a: "The next step depends on the binding constraint. A project may need better project data, different capital-stack assumptions, a capital partner, a clean-energy buyer, or further development work before financing is practical." },
    ],
  },
  {
    label: "Clean-Energy Buyers",
    items: [
      { q: "What types of renewable projects can EcoXchange source?", a: "EcoXchange is building a qualified project pipeline focused on new renewable generation. Project availability is not fabricated: technology, location, size, stage, contractual status, and buyer fit are confirmed project by project." },
      { q: "Can EcoXchange source local or project-linked RECs/EACs?", a: "Potentially, when the underlying environmental attributes are actually available. EcoXchange will not represent RECs/EACs as available if they are already committed to a state program, utility, offtaker, buyer, or other contractual counterparty." },
      { q: "How is double counting prevented?", a: "The project record must identify existing contractual claims, program obligations, registry status, and attribute ownership before a buyer-facing structure is presented. Environmental-attribute tracking is an infrastructure capability, not a claim that every project has uncommitted attributes." },
      { q: "Can projects support PPAs, REC forwards, or utility structures?", a: "Potential structures can include PPAs, project-linked REC/EAC forwards, utility programs, and other long-term clean-energy commitments. The structure depends on project rights, buyer requirements, market rules, and applicable contracts." },
    ],
  },
  {
    label: "Capital Partners",
    items: [
      { q: "How are projects screened?", a: "EcoXchange reviews project facts, contracted revenue, development status, financeability assumptions, and source provenance. The platform can highlight constraints and missing diligence but does not replace lender, investor, legal, tax, or technical diligence." },
      { q: "What financial information is available?", a: "Finance-readiness outputs can include modeled debt capacity, DSCR, tax-credit value, sponsor-equity requirement, capital-stack scenarios, sensitivities, and the financial constraint that binds the modeled case." },
      { q: "What role does EcoXchange play in a financing?", a: "EcoXchange structures project information, identifies the remaining capital requirement, coordinates appropriate financing options, and supports the workflow between project sponsors and capital partners. It does not guarantee a transaction." },
      { q: "When are registered securities partners involved?", a: "When a financing activity requires a registered broker-dealer, capital acquisition broker, or other appropriately registered securities intermediary, that regulated activity must be handled through the appropriate partner rather than represented as an unregistered EcoXchange placement service." },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main public-main-narrow">
        <section className="public-hero">
          <p className="public-eyebrow">Frequently asked</p>
          <h1 className="public-title">Questions by customer group.</h1>
          <p className="public-copy">
            EcoXchange serves renewable-project developers, clean-energy buyers, and capital partners through one project-capital workflow.
          </p>
        </section>

        {FAQ_GROUPS.map((group, groupIndex) => (
          <section key={group.label} className="public-section">
            <div className="public-section-header">
              <span className="public-section-label">§ {groupIndex + 1}</span>
              <h2 className="public-section-title">{group.label}</h2>
            </div>
            <div className="public-faq-panel">
              <Accordion type="single" collapsible>
                {group.items.map((item, i) => (
                  <AccordionItem key={item.q} value={`${group.label}-${i}`} className="border-border">
                    <AccordionTrigger className="text-left font-serif text-lg">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        ))}

        <p className="mb-12 font-mono text-[0.6rem] text-muted-foreground/70">
          Informational and decision-support platform. No lender commitment, guaranteed financing, live securities offering, or guaranteed environmental-attribute availability is created through this site.
        </p>
      </main>
    </div>
  );
}

import { Header } from "@/components/header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What is available in the current pilot?",
    a: "A production-verification workflow that compares available project evidence, exposes source provenance, and issues a verified, flagged, or pending engine determination. Release 1 does not include an open offering, investment acceptance, ownership administration, or payment execution.",
  },
  {
    q: "Is an EcoXchange offering open now?",
    a: "No. The public product is a pilot and demonstration environment. It does not accept funds or investment commitments and does not create a legal agreement.",
  },
  {
    q: "What sources does the engine compare?",
    a: "The target design uses inverter telemetry, utility-originated evidence, and modeled expected generation. Each leg is labeled measured, modeled, derived, simulated, or unconfirmed. Availability and independence are evaluated per project and period.",
  },
  {
    q: "Does VERIFIED mean every source was independently measured?",
    a: "No. VERIFIED means the values available to the engine reconciled within the configured tolerance. The provenance panel must still be reviewed. A derived, simulated, or unconfirmed leg is not promoted to an independent measurement.",
  },
  {
    q: "Does a determination trigger a distribution?",
    a: "Not in Release 1. The measured PVDAQ demo has no offering or distribution attached. A separate Savannah stress scenario can illustrate transaction UX, but every financial and payment value there is explicitly simulated.",
  },
  {
    q: "What happens when utility data is unavailable?",
    a: "The record remains pending or uses a clearly disclosed derived proxy for comparison, depending on the demonstration. A proxy is never labeled as a utility measurement and does not establish three-source independence.",
  },
  {
    q: "Are pilot pricing and turnaround times published?",
    a: "No. Data access, timing, responsibilities, and any commercial terms are confirmed separately in writing after a project-fit review. The public site is not a quote or financing commitment.",
  },
  {
    q: "What legal or investment structure will a future product use?",
    a: "No structure is offered through this pilot. Any future securities product, eligibility rules, fees, tax treatment, documents, and payment mechanics require project-specific legal and operating approval before publication.",
  },
  {
    q: "How can a project operator start?",
    a: "Submit a permitted 1–20 MW U.S. solar project for a pilot-fit review. Do not send API keys through the preview form; source access and security requirements are agreed separately.",
  },
];

export default function FaqPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main public-main-narrow">
        <section className="public-hero">
          <p className="public-eyebrow">Frequently asked</p>
          <h1 className="public-title">
            Questions worth
            <br />
            <em>answering.</em>
          </h1>
          <p className="public-copy">
            What an investor or developer typically asks before — or after — a first conversation.
          </p>
        </section>

        <section className="public-section">
          <div className="public-faq-panel">
            <Accordion type="single" collapsible>
              {FAQS.map((item, i) => (
                <AccordionItem key={item.q} value={`item-${i}`} className="border-border">
                  <AccordionTrigger className="text-left font-serif text-lg">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <p className="mt-10 font-mono text-[0.6rem] text-muted-foreground/70">
            Pilot information only. No offering is currently open, and no investment, payment, or legal agreement
            is created through this site.
          </p>
        </section>
      </main>
    </div>
  );
}

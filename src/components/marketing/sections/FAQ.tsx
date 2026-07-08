import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Container, SectionHeading } from "@/components/marketing/site/primitives";

const faqs = [
  { q: "What kind of businesses do you work with?", a: "Operations-heavy businesses where data is scattered across multiple tools — hospitality, multi-location operators, real estate, fitness, coaches and creators, and local service businesses. If your team uses several systems to get through the week, this is built for you." },
  { q: "How fast is this really?", a: "Live in 48 hours or the setup fee comes back. You'll typically see the first caught lead inside week one." },
  { q: "Do I need to understand AI to work with you?", a: "No. The point is that you don't have to. I translate AI capability into clear systems that fit how your business already works. You stay focused on running the business." },
  { q: "Do you still build websites and marketing?", a: "Yes — when they plug into the larger system. A site that captures leads but doesn't connect to anything is the old way. I build sites and marketing engines that feed into the same source of truth as everything else." },
  { q: "What does an engagement look like?", a: "Three phases: discovery and architecture, build and integrate, then launch and improve. Most engagements continue on a retainer because operations keep changing. Smaller scopes — an audit, a single dashboard, one automation — are also a good place to start." },
  { q: "Do you build custom AI tools?", a: "Yes. Internal assistants, intake bots, knowledge bots, custom GPTs, and AI workflows that read your real data and return plain-English answers with sources." },
  { q: "How much does it cost?", a: "It depends on scope. A focused audit or single automation is a small commitment. A full operational platform is a larger one. I scope honestly after a discovery call — no surprise invoices." },
  { q: "How do we get started?", a: "Send a short note through the form below or email hello@supremeteammedia.com. We'll set up a call, walk through your current setup, and figure out the right first step." },
];

export function FAQ() {
  return (
    <section id="faq" className="relative border-t border-[hsl(var(--line))] bg-[hsl(var(--bone-2))] py-20 md:py-28">
      <Container className="max-w-4xl">
        <SectionHeading eyebrow="FAQ" title="The questions owners actually ask" />
        <Accordion type="single" collapsible className="mt-10 divide-y divide-[hsl(var(--line))] border-y border-[hsl(var(--line))]">
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`} className="border-0">
              <AccordionTrigger className="font-display py-5 text-left text-[1.15rem] text-foreground hover:no-underline [&[data-state=open]>svg]:text-[hsl(var(--gold))]">{f.q}</AccordionTrigger>
              <AccordionContent className="pb-6 text-[0.98rem] leading-relaxed text-[hsl(var(--ink-soft))]">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  );
}
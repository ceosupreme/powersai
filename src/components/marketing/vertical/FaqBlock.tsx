import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Container } from "@/components/marketing/site/primitives";
import type { FaqEntry } from "@/hooks/useVerticalLanders";

export function FaqBlock({ faq }: { faq: FaqEntry[] }) {
  if (!faq?.length) return null;
  return (
    <section className="relative border-t border-[hsl(var(--line))] bg-[hsl(var(--bone))] py-20 md:py-24">
      <Container className="max-w-4xl">
        <span className="eyebrow">FAQ</span>
        <h2 className="font-display mt-4 max-w-3xl text-foreground" style={{ fontSize: "clamp(1.75rem,3.5vw,2.6rem)", lineHeight: 1.1 }}>
          Questions owners actually ask.
        </h2>
        <Accordion type="single" collapsible className="mt-10 divide-y divide-[hsl(var(--line))] border-y border-[hsl(var(--line))]">
          {faq.map((f, i) => (
            <AccordionItem key={`${f.q}-${i}`} value={`item-${i}`} className="border-0">
              <AccordionTrigger className="font-display py-5 text-left text-[1.1rem] text-foreground hover:no-underline [&[data-state=open]>svg]:text-[hsl(var(--gold))]">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="pb-6 text-[0.98rem] leading-relaxed text-[hsl(var(--ink-soft))]">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  );
}
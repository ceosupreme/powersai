import { Container, Eyebrow, SectionTitle } from "../primitives";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const ITEMS = [
  {
    q: "Can I hire you just for a website or design project?",
    a: "Yes. A website, identity, graphic design project, or campaign can stand on its own. You do not need to purchase automation or an ongoing engagement.",
  },
  {
    q: "Can you improve something we've already started?",
    a: "Yes. We can begin by reviewing the existing work and agreeing on what to keep, improve, or rebuild.",
  },
  {
    q: "Do we need AI or a new software platform?",
    a: "No. The job determines the tools. AI and automation are used when they make sense for the agreed work, not added to every project by default.",
  },
  {
    q: "How are pricing and timing handled?",
    a: "They depend on scope, existing assets, integrations, and the level of ongoing support. You'll receive a proposal with deliverables, price, milestones, and responsibilities before work starts.",
  },
  {
    q: "Who will I work with?",
    a: "You'll work directly with Sean on direction and implementation. Any additional specialist involvement is discussed as part of the engagement.",
  },
  {
    q: "What happens after launch?",
    a: "The proposal defines handoff, support, ownership or licensing, third-party costs, and any ongoing work. Those terms are agreed for the specific project.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="studio-section">
      <Container>
        <Eyebrow>Questions</Eyebrow>
        <SectionTitle>Before you get in touch.</SectionTitle>
        <div className="mt-10 max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {ITEMS.map((it, i) => (
              <AccordionItem key={it.q} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="studio-display py-5 text-left text-[1.02rem] hover:no-underline">
                  {it.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[0.98rem] leading-relaxed text-muted-foreground">
                  {it.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Container>
    </section>
  );
}

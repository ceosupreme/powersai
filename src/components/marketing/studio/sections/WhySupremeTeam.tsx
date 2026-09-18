import { Container, Eyebrow, SectionTitle } from "../primitives";

const REASONS = [
  { title: "Strategy and execution in one place.", body: "The thinking does not disappear into a deck before the real work begins. Direction stays connected to what gets designed, built, and launched." },
  { title: "Creative + technical instead of choosing one.", body: "Brand, interface, campaign, workflow, and implementation decisions can support the same business goal instead of fighting across separate silos." },
  { title: "Founder-led rather than a sales handoff.", body: "You work directly with Sean on the brief, decisions, and delivery—with additional specialist support defined when a project needs it." },
  { title: "AI where it improves the work.", body: "AI and automation are capabilities, not a compulsory answer. The process and outcome determine whether they belong in the solution." },
];

export function WhySupremeTeam() {
  return (
    <section className="studio-section bg-[hsl(var(--cobalt-pale))]">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5"><Eyebrow>Why Supreme Team</Eyebrow><SectionTitle>One connected partner for work that crosses disciplines.</SectionTitle></div>
          <div className="divide-y divide-[hsl(var(--cobalt)/0.2)] border-y border-[hsl(var(--cobalt)/0.2)] lg:col-span-7">
            {REASONS.map((reason, index) => (
              <article key={reason.title} className="grid gap-3 py-6 md:grid-cols-[52px_1fr]">
                <span className="studio-display text-primary">0{index + 1}</span>
                <div><h3 className="studio-display text-[1.4rem] leading-tight">{reason.title}</h3><p className="mt-3 text-[1rem] leading-relaxed text-muted-foreground">{reason.body}</p></div>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
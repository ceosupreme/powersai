import { Container, Eyebrow, SectionTitle } from "../primitives";

const REASONS = [
  { title: "Strategy stays connected to the work.", body: "The person helping shape the direction also helps write, design, build, and launch it. Good decisions do not get lost between teams." },
  { title: "Creative and technical decisions support the same goal.", body: "Your brand, website, campaign, copy, and systems can work together instead of being solved in separate silos." },
  { title: "You work directly with the founder.", body: "Sean stays involved from the first conversation through delivery, with specialist support added only when the project calls for it." },
  { title: "Technology earns its place.", body: "AI and automation are used when they remove friction or improve the work—not because every project needs them." },
];

export function WhySupremeTeam() {
  return (
    <section className="studio-section bg-[hsl(var(--cobalt-pale))]">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5"><Eyebrow>Why Supreme Team</Eyebrow><SectionTitle>One partner who can see the whole business problem.</SectionTitle></div>
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
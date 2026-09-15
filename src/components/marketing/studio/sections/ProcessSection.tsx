import { Container, Eyebrow, SectionTitle } from "../primitives";

const STEPS = [
  {
    n: "1",
    title: "Define the job.",
    body: "Clarify the goal, audience, required deliverables, and what a good result needs to do.",
  },
  {
    n: "2",
    title: "Design and build.",
    body: "Review the direction early, work in clear milestones, and see the work as it develops.",
  },
  {
    n: "3",
    title: "Launch and hand over.",
    body: "Check the agreed functionality, explain how to use what was built, and define any next phase.",
  },
];

const ENGAGEMENTS = [
  {
    title: "A focused project",
    body: "A defined website, identity, campaign or system—with scope and price agreed before work begins.",
  },
  {
    title: "Ongoing collaboration",
    body: "Continuing creative, marketing or technical work with agreed priorities, responsibilities and capacity.",
  },
  {
    title: "Agency support",
    body: "Hands-on project help for teams that need additional creative or implementation capacity. Scope and role defined together.",
  },
];

export function ProcessSection() {
  return (
    <section id="process" className="studio-section">
      {/* legacy alias: older links pointed at #how-it-starts */}
      <span id="how-it-starts" aria-hidden className="block h-0" />
      <Container>
        <Eyebrow>How we work</Eyebrow>
        <SectionTitle>Start with a clear brief. Finish with something useful.</SectionTitle>

        <ol className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((s) => (
            <li key={s.n} className="border-t border-border pt-5">
              <span className="studio-display block text-[1.8rem] text-[hsl(var(--cobalt))]">{s.n}</span>
              <h3 className="studio-display mt-2 text-[1.1rem]">{s.title}</h3>
              <p className="mt-3 text-[0.98rem] leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {ENGAGEMENTS.map((e) => (
            <div key={e.title} className="rounded-xl border border-border bg-[hsl(var(--surface))] p-6">
              <h3 className="studio-display text-[1.05rem]">{e.title}</h3>
              <p className="mt-3 text-[0.94rem] leading-relaxed text-muted-foreground">{e.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

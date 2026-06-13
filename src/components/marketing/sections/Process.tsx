import { Container, SectionHeading } from "@/components/marketing/site/primitives";

const phases = [
  { n: "01", title: "Audit", body: "Find the highest-leverage AI system to build first — and the costs you're quietly absorbing today." },
  { n: "02", title: "Map", body: "Diagram your tools, data flows, and handoffs so the build plugs in cleanly without disrupting your team." },
  { n: "03", title: "Build", body: "Stand up the first working system — assistants, dashboards, automations — wired into your real data." },
  { n: "04", title: "Launch", body: "Roll it out to the people who'll use it. Train, document, and prove the value in week one." },
  { n: "05", title: "Optimize", body: "Sharpen it against real usage. Each iteration compounds — the system gets tighter and more useful every week." },
];

export function Process() {
  return (
    <section id="process" className="section-light relative border-t border-border py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="Process"
          title="Audit → Map → Build → Launch → Optimize"
          sub="A clear path from scattered tools to a working AI operating system. Most engagements start small — one dashboard, one automation, one assistant — and compound from there."
        />
        <ol className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {phases.map((p) => (
            <li key={p.n} className="hover-lift relative rounded-md border border-border bg-panel p-5">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-accent">Phase {p.n}</span>
              <h3 className="font-display mt-3 text-[1.15rem] leading-snug text-foreground">{p.title}</h3>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-muted-foreground">{p.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
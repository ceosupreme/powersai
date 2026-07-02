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
    <section id="process" className="relative border-t border-[hsl(var(--line))] py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="Process"
          title="Audit → Map → Build → Launch → Optimize"
          sub="A clear path from scattered tools to a working AI operating system. Most engagements start small — one dashboard, one automation, one assistant — and compound from there."
        />
        <div className="relative mt-12">
          <div aria-hidden className="absolute left-6 right-6 top-8 hidden h-px bg-[hsl(var(--gold)/0.4)] lg:block" style={{ backgroundImage: "linear-gradient(to right, hsl(var(--gold)/0.6) 50%, transparent 0%)", backgroundSize: "8px 1px", backgroundRepeat: "repeat-x" }} />
          <ol className="relative grid snap-x grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-5">
          {phases.map((p) => (
            <li key={p.n} className="card-lift relative snap-start p-5">
              <span className="font-mono-label inline-flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--bone))] ring-1 ring-[hsl(var(--gold)/0.5)]" style={{ color: "hsl(var(--gold))", fontSize: "0.7rem" }}>{p.n}</span>
              <h3 className="font-display mt-4 text-[1.2rem] leading-snug text-foreground">{p.title}</h3>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-[hsl(var(--ink-soft))]">{p.body}</p>
            </li>
          ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
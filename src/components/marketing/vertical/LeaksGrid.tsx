import { Container } from "@/components/marketing/site/primitives";
import { Reveal } from "@/components/marketing/site/Reveal";
import type { LeakCard } from "@/hooks/useVerticalLanders";
import type { LeakVectorLite } from "@/hooks/useVerticalLander";

export function LeaksGrid({ leaks, extras }: { leaks: LeakCard[]; extras: LeakVectorLite[] }) {
  const cards = [
    ...leaks.map((l) => ({ title: l.title, line: l.line, note: l.dollar_note })),
    ...extras.slice(0, 2).map((e) => ({ title: e.name, line: e.benchmark ?? "", note: "—" })),
  ];
  return (
    <section className="relative border-t border-[hsl(var(--line))] bg-[hsl(var(--bone-2))] py-20 md:py-24">
      <Container>
        <Reveal>
          <span className="eyebrow">How your money leaks</span>
          <h2 className="font-display mt-4 max-w-3xl text-foreground" style={{ fontSize: "clamp(1.75rem,3.5vw,2.6rem)", lineHeight: 1.1 }}>
            Three places the money walks out — every week.
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={`${c.title}-${i}`} delay={80 + i * 60}>
              <article className="card-lift h-full p-6">
                <h3 className="font-display text-[1.15rem] leading-snug text-foreground">{c.title}</h3>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-[hsl(var(--ink-soft))]">{c.line}</p>
                <p className="font-mono-label mt-5" style={{ color: "hsl(var(--rust))" }}>{c.note}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
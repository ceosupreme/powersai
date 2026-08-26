import { Container } from "@/components/marketing/site/primitives";
import { Reveal } from "@/components/marketing/site/Reveal";
import type { HowItWorksStep } from "@/hooks/useVerticalLander";

const STEPS: { badge: string; label: string; line: string }[] = [
  { badge: "01", label: "Detect", line: "Deterministic checks read your real data — every day, no dashboards." },
  { badge: "02", label: "Dollarize", line: "Every finding gets a dollar figure with the math shown — no guessing." },
  { badge: "03", label: "Assign", line: "The right owner gets a specific task with the source cited." },
  { badge: "04", label: "Verify", line: "The system re-checks and closes the loop — proof, weekly." },
];

export function PluggedRow({
  steps,
  liveInLine,
}: {
  steps?: HowItWorksStep[] | null;
  liveInLine?: string | null;
} = {}) {
  const custom = steps?.length
    ? steps.map((s, i) => ({
        badge: String(i + 1).padStart(2, "0"),
        label: s.title,
        line: s.body ?? "",
      }))
    : null;
  const rows = custom ?? STEPS;
  const cols = rows.length === 3 ? "md:grid-cols-3" : rows.length >= 5 ? "md:grid-cols-3 lg:grid-cols-5" : "md:grid-cols-4";

  return (
    <section id="process" className="relative border-t border-[hsl(var(--line))] bg-[hsl(var(--bone))] py-20 md:py-24">
      <Container>
        <Reveal>
          <span className="eyebrow">How it gets plugged</span>
          <h2 className="font-display mt-4 max-w-3xl text-foreground" style={{ fontSize: "clamp(1.75rem,3.5vw,2.6rem)", lineHeight: 1.1 }}>
            Four steps. Every leak. Every week.
          </h2>
        </Reveal>
        <div className="relative mt-10">
          <div aria-hidden className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px md:block" style={{ backgroundImage: "linear-gradient(to right, hsl(var(--gold)) 50%, transparent 0%)", backgroundSize: "10px 1px", backgroundRepeat: "repeat-x" }} />
          <div className={`relative grid grid-cols-1 gap-6 ${cols}`}>
            {rows.map((s, i) => (
              <Reveal key={`${s.badge}-${s.label}`} delay={80 + i * 60}>
                <div className="relative rounded-xl bg-[hsl(var(--surface))] p-5 ring-1 ring-[hsl(var(--line))]">
                  <span className="font-mono-label inline-block rounded-full bg-[hsl(var(--gold-tint))] px-2.5 py-1 text-[0.65rem]" style={{ color: "hsl(var(--ink))" }}>{s.badge} · {s.label}</span>
                  {s.line && <p className="mt-4 text-[0.95rem] leading-relaxed text-[hsl(var(--ink-soft))]">{s.line}</p>}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        {liveInLine ? (
          <p className="font-display mt-8 max-w-3xl text-foreground" style={{ fontSize: "clamp(1.1rem,2vw,1.5rem)", lineHeight: 1.3 }}>
            {liveInLine}
          </p>
        ) : (
          <p className="mt-8 max-w-2xl text-[0.95rem] text-[hsl(var(--ink-soft))]">
            Nothing replaced. A human approves every send.
          </p>
        )}
      </Container>
    </section>
  );
}

import { ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/site/primitives";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-t border-[hsl(var(--line))] bg-[hsl(var(--bone-2))] py-24 md:py-28">
      <div className="radial-gold pointer-events-none absolute inset-x-0 top-0 mx-auto h-[360px] max-w-4xl" aria-hidden />
      <Container className="relative max-w-4xl text-center">
        <span className="eyebrow justify-center">Next step</span>
        <h2 className="font-display mt-5 text-balance text-foreground" style={{ fontSize: "clamp(2rem,5vw,3.75rem)", lineHeight: 1.05 }}>
          Find the first AI system your business should build.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[hsl(var(--ink-soft))] md:text-lg">
          A 30-minute call. We map your tools, your bottlenecks, and the single highest-leverage system to build first. No pitch, no obligation.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a href="/free-audit" className="group inline-flex items-center gap-2 rounded-full bg-[hsl(var(--green))] px-7 py-4 text-sm font-medium text-[hsl(var(--bone))] transition-all hover:-translate-y-0.5 hover:shadow-xl">
            Get your free Profit Leak Audit
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </a>
          <a href="#proof" className="group inline-flex items-center gap-2 text-sm font-medium text-foreground underline decoration-[hsl(var(--gold))] decoration-2 underline-offset-8">
            See the BarPulse case study
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </Container>
    </section>
  );
}
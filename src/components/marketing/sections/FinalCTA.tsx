import { ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/site/primitives";

export function FinalCTA() {
  return (
    <section className="relative border-t border-border py-24 md:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[360px] max-w-4xl glow-ember opacity-70 blur-3xl" aria-hidden />
      <Container className="relative max-w-4xl text-center">
        <span className="eyebrow justify-center">Next step</span>
        <h2 className="font-display mt-5 text-balance text-3xl leading-[1.05] tracking-tight text-foreground md:text-5xl">
          Find the first AI system your business should build.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          A 30-minute call. We map your tools, your bottlenecks, and the single highest-leverage system to build first. No pitch, no obligation.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {/* TODO: wire to external scheduler when ready. For now, scrolls to contact form. */}
          <a href="#contact" className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3.5 text-sm font-medium text-accent-foreground shadow-[0_0_30px_-8px_hsl(217_91%_60%/0.7)] transition-opacity hover:opacity-90">
            Book a Free AI Systems Audit <ArrowRight size={14} />
          </a>
          <a href="#proof" className="inline-flex items-center gap-2 rounded-md border border-border-strong px-6 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-panel">
            See the BarPulse case study
          </a>
        </div>
      </Container>
    </section>
  );
}
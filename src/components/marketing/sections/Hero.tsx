import { ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/site/primitives";
import { HeroTriage } from "./HeroTriage";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pb-32 pt-40 md:pb-40 md:pt-56">
      <Container className="relative">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-8">
            <div className="reveal" style={{ animationDelay: "60ms" }}>
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                AI Systems &amp; Operational Intelligence Studio
              </span>
            </div>

            <h1
              className="reveal font-display mt-8 text-balance text-5xl font-medium leading-[1.02] tracking-[-0.02em] text-foreground sm:text-6xl md:text-7xl lg:text-[5.25rem]"
              style={{ animationDelay: "160ms" }}
            >
              See what&apos;s working,{" "}
              <span className="text-accent">what&apos;s slipping</span>, and what
              to do next.
            </h1>

            <p
              className="reveal mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl"
              style={{ animationDelay: "260ms" }}
            >
              One live operating system for owners — your POS, CRM, schedule,
              and tasks, connected.
            </p>

            <div
              className="reveal mt-12 flex flex-wrap items-center gap-4"
              style={{ animationDelay: "360ms" }}
            >
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
              >
                Book a free AI systems audit <ArrowRight size={14} />
              </a>
              <a
                href="#proof"
                className="inline-flex items-center gap-2 rounded-md border border-border-strong px-6 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-panel"
              >
                See the BarPulse case study
              </a>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="reveal relative" style={{ animationDelay: "320ms" }}>
              <HeroTriage />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
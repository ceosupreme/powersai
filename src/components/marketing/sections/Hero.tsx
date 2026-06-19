import { ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/site/primitives";
import { HeroTriage } from "./HeroTriage";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pb-24 pt-32 md:pt-40">
      <div className="pointer-events-none absolute inset-0 bg-grid" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[620px] w-[920px] -translate-x-1/2 glow-ember blur-3xl"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 grain" aria-hidden />

      <Container className="relative">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <div className="reveal" style={{ animationDelay: "60ms" }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent live-dot" />
                AI Systems &amp; Operational Intelligence Studio
              </span>
            </div>

            <h1
              className="reveal font-display mt-6 text-balance text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-[3.6rem] lg:text-[3.9rem]"
              style={{ animationDelay: "160ms" }}
            >
              AI Operations Systems That Show Owners{" "}
              <span className="text-accent">
                What&apos;s Working, What&apos;s Slipping,
              </span>{" "}
              and What To Do Next
            </h1>

            <p
              className="reveal mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-[1.05rem]"
              style={{ animationDelay: "260ms" }}
            >
              Supreme Team Media builds practical AI systems that connect your
              POS, CRM, scheduling, task tools, website, and marketing data into
              one live operating system — so owners can save time, recover missed
              revenue, and make faster decisions.
            </p>

            <div
              className="reveal mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "360ms" }}
            >
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-medium text-accent-foreground shadow-[0_0_30px_-8px_hsl(217_91%_60%/0.7)] transition-opacity hover:opacity-90"
              >
                Book a Free AI Systems Audit <ArrowRight size={14} />
              </a>
              <a
                href="#proof"
                className="inline-flex items-center gap-2 rounded-md border border-border-strong px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-panel"
              >
                See the BarPulse Case Study
              </a>
            </div>

            <p
              className="reveal mt-9 text-sm text-muted-foreground"
              style={{ animationDelay: "460ms" }}
            >
              For owners running on too many disconnected tools. Built for
              hospitality, real estate, fitness, and operations-heavy teams.
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="reveal relative" style={{ animationDelay: "320ms" }}>
              <HeroTriage />
              <span className="absolute -left-1 -top-1 h-3 w-3 border-l border-t border-accent/60" />
              <span className="absolute -right-1 -top-1 h-3 w-3 border-r border-t border-accent/60" />
              <span className="absolute -bottom-1 -left-1 h-3 w-3 border-b border-l border-accent/60" />
              <span className="absolute -bottom-1 -right-1 h-3 w-3 border-b border-r border-accent/60" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
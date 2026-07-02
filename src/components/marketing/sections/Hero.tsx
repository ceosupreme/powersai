import { ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/site/primitives";
import { HeroTriage } from "./HeroTriage";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pb-24 pt-32 md:pb-32 md:pt-44">
      <div aria-hidden className="radial-gold pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <Container className="relative">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-8">
            <div className="reveal" style={{ animationDelay: "60ms" }}>
              <span className="eyebrow">AI Systems &amp; Operational Intelligence Studio</span>
            </div>

            <h1
              className="reveal font-display mt-8 text-balance text-foreground"
              style={{ animationDelay: "160ms" }}
            >
              <span style={{ display: "block", fontSize: "clamp(3rem,7vw,5.75rem)", lineHeight: 1.02, letterSpacing: "-0.03em" }}>
                See what&apos;s working, <span className="font-serif-accent relative" style={{ color: "hsl(var(--rust))" }}>
                  what&apos;s slipping
                  <svg aria-hidden viewBox="0 0 240 12" preserveAspectRatio="none" className="absolute left-0 right-0 -bottom-2 h-3 w-full">
                    <path d="M2 7 Q 60 1 120 6 T 238 5" fill="none" stroke="hsl(var(--rust))" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </span>, and what to do next.
              </span>
            </h1>

            <p
              className="reveal mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl"
              style={{ animationDelay: "260ms" }}
            >
              One live operating system for owners — your POS, CRM, schedule,
              and tasks, connected. And the revenue leaking between them — recovered.
            </p>

            <div
              className="reveal mt-10 rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5"
              style={{ animationDelay: "320ms" }}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  { n: "$108K/yr", k: "1 missed call/day" },
                  { n: "63%", k: "of leads buy from the first responder" },
                  { n: "<5s", k: "reply time" },
                ].map((s) => (
                  <div key={s.k}>
                    <div className="font-mono-label" style={{ color: "hsl(var(--rust))", fontSize: "1.35rem", letterSpacing: "-0.01em" }}>{s.n}</div>
                    <div className="mt-1 text-[0.85rem] text-foreground/80">{s.k}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[0.7rem] italic text-muted-foreground">industry estimates — your audit uses your numbers</p>
            </div>

            <div
              className="reveal mt-12 flex flex-wrap items-center gap-4"
              style={{ animationDelay: "360ms" }}
            >
              <a
                href="#contact"
                className="group inline-flex items-center gap-2 rounded-full bg-[hsl(var(--green))] px-7 py-4 text-sm font-medium text-[hsl(var(--bone))] transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                Get your free Profit Leak Audit
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#proof"
                className="group inline-flex items-center gap-2 text-sm font-medium text-foreground underline decoration-[hsl(var(--gold))] decoration-2 underline-offset-8 hover:decoration-[hsl(var(--green))]"
              >
                See the BarPulse case study
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
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
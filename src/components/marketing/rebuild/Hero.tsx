import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { HeroFlow } from "./HeroFlow";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pb-24 pt-32 md:pb-32 md:pt-40">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-6 md:px-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <span className="eyebrow">FOR OWNER-RUN LOCAL &amp; SERVICE BUSINESSES</span>
          <h1
            className="font-display mt-6 text-balance text-foreground"
            style={{ fontSize: "clamp(2.5rem,6vw,4.5rem)", lineHeight: 1.03, letterSpacing: "-0.03em" }}
          >
            Stop losing leads, time, and money between the systems you already pay for.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            We connect your phones, website, CRM, scheduling, and books — so every inquiry gets answered in seconds, quiet quotes get chased, and you see what needs attention before it gets expensive. Keep the tools your team already uses — we connect the gaps without giving anyone another system to live in.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              to="/free-audit"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--stm-cobalt))] px-7 py-4 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:shadow-xl sm:w-fit"
            >
              Show me what I'm missing
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="max-w-lg text-[0.85rem] text-muted-foreground">
              Free two-minute checkup. My system reads the public side of your business — you don't lift a finger.
            </p>
          </div>

          <div className="mt-6">
            <a
              href="#barpulse"
              className="group inline-flex items-center gap-2 text-sm font-medium text-foreground underline decoration-[hsl(var(--stm-cobalt))] decoration-2 underline-offset-8 hover:decoration-[hsl(var(--stm-cyan))]"
            >
              See how an 8-location group runs on this
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Live in production for a multi-location San Diego hospitality group.
          </p>
        </div>

        <div className="lg:col-span-5">
          <HeroFlow />
        </div>
      </div>
    </section>
  );
}
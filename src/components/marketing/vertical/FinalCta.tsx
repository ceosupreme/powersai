import { ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/site/primitives";
import { Reveal } from "@/components/marketing/site/Reveal";
import type { VerticalLandingPage } from "@/hooks/useVerticalLanders";

export function FinalCta({
  page,
  withSrc,
}: {
  page: VerticalLandingPage;
  withSrc: (u: string) => string;
}) {
  return (
    <section className="relative border-t border-[hsl(var(--line))] bg-[hsl(var(--bone-2))] py-20 md:py-28">
      <Container>
        <div className="max-w-3xl">
          <Reveal>
            <h2 className="font-display text-foreground" style={{ fontSize: "clamp(2rem,4vw,3.25rem)", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
              Let me run the free audit.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[hsl(var(--ink-soft))]">
              Real money leaking → we talk. Nothing → I tell you straight, and you&apos;ve lost nothing.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="mt-10">
              <a
                href={withSrc(page.cta_primary_url)}
                className="group inline-flex items-center gap-2 rounded-full bg-[hsl(var(--green))] px-7 py-4 text-sm font-medium text-[hsl(var(--bone))] transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                {page.cta_primary_label}
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
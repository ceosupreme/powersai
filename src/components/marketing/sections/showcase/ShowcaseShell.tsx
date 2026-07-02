import type { PropsWithChildren, ReactNode } from "react";
import { Container, Eyebrow } from "@/components/marketing/site/primitives";
import { Reveal } from "@/components/marketing/site/Reveal";
import { cn } from "@/lib/utils";

export function ShowcaseShell({
  id, eyebrow, title, sub, bullets, reverse = false, alt = false, children,
}: PropsWithChildren<{
  id: string;
  eyebrow: string;
  title: ReactNode;
  sub: string;
  bullets?: string[];
  reverse?: boolean;
  alt?: boolean;
}>) {
  return (
    <section id={id} className={cn("relative scroll-mt-24 border-t border-[hsl(var(--line))] py-20 md:py-28", alt && "section-alt")}>
      <Container>
        <div className={cn("grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12")}>
          <Reveal className={cn("lg:col-span-5", reverse ? "lg:order-2 lg:col-start-8" : "lg:order-1")}>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 className="font-display mt-4 text-balance text-foreground" style={{ fontSize: "clamp(2rem,4vw,3rem)", lineHeight: 1.05 }}>
              {title}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[hsl(var(--ink-soft))] md:text-[1.05rem]">{sub}</p>
            {bullets && (
              <ul className="mt-6 space-y-2.5">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-[0.95rem] text-foreground">
                    <span className="mt-2 h-2 w-2 shrink-0 bg-[hsl(var(--gold))]" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </Reveal>

          <Reveal delay={150} className={cn("lg:col-span-7", reverse ? "lg:order-1 lg:col-start-1 lg:row-start-1" : "lg:order-2")}>
            {children}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
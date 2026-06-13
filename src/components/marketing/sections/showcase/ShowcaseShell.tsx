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
    <section id={id} className={cn("relative scroll-mt-24 border-t border-border py-20 md:py-28", alt && "section-alt")}>
      <Container>
        <div className={cn("grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12")}>
          <Reveal className={cn("lg:col-span-5", reverse ? "lg:order-2 lg:col-start-8" : "lg:order-1")}>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 className="font-display mt-4 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-foreground md:text-[2.4rem] lg:text-[2.6rem]">
              {title}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-[1.05rem]">{sub}</p>
            {bullets && (
              <ul className="mt-6 space-y-2.5">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-[0.95rem] text-foreground/90">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
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
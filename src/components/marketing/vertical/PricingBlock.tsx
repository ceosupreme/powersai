import { ArrowRight, Check } from "lucide-react";
import { Container } from "@/components/marketing/site/primitives";
import { Reveal } from "@/components/marketing/site/Reveal";
import type { PriceBlock } from "@/hooks/useVerticalLander";

export function PricingBlock({
  block,
  guaranteeLine,
  withSrc,
}: {
  block: PriceBlock;
  guaranteeLine: string | null;
  withSrc: (u: string) => string;
}) {
  const tiers = block.tiers ?? [];
  if (!tiers.length) return null;
  return (
    <section id="pricing" className="relative border-t border-[hsl(var(--line))] bg-[hsl(var(--bone))] py-16 md:py-24">
      <Container>
        <Reveal>
          <span className="eyebrow">Pricing</span>
          {block.intro && (
            <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-[hsl(var(--ink-soft))]">{block.intro}</p>
          )}
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {tiers.map((t, i) => (
            <Reveal key={`${t.name}-${i}`} delay={60 + i * 60}>
              <article className="flex h-full flex-col rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-[1.2rem] leading-snug text-foreground">{t.name}</h3>
                  {t.badge && (
                    <span
                      className="font-mono-label shrink-0 rounded-full bg-[hsl(var(--gold-tint))] px-2.5 py-1 text-[0.6rem]"
                      style={{ color: "hsl(var(--ink))" }}
                    >
                      {t.badge}
                    </span>
                  )}
                </div>
                {t.setup_label && (
                  <div className="font-display mt-4 text-foreground" style={{ fontSize: "1.5rem", lineHeight: 1 }}>
                    {t.setup_label}
                  </div>
                )}
                {t.monthly_label && (
                  <div className="font-mono-label mt-2" style={{ color: "hsl(var(--ink-soft))" }}>
                    {t.monthly_label}
                  </div>
                )}
                {!!t.includes?.length && (
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {t.includes.map((inc, j) => (
                      <li key={`${inc}-${j}`} className="flex items-start gap-2.5 text-[0.9rem] leading-relaxed text-[hsl(var(--ink-soft))]">
                        <Check size={15} className="mt-0.5 shrink-0" style={{ color: "hsl(var(--green))" }} />
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {t.cta_url && (
                  <a
                    href={withSrc(t.cta_url)}
                    className="group mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--green))] px-6 py-3 text-sm font-medium text-[hsl(var(--bone))] transition-all hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    {t.cta_label ?? "Get started"}
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </a>
                )}
              </article>
            </Reveal>
          ))}
        </div>
        {block.footnote && (
          <p className="mt-6 max-w-2xl text-[0.8rem] italic leading-relaxed text-[hsl(var(--ink-soft))]">
            {block.footnote}
          </p>
        )}
        {guaranteeLine && (
          <p
            className="font-display mt-8 max-w-3xl text-foreground"
            style={{ fontSize: "clamp(1.15rem,2.2vw,1.6rem)", lineHeight: 1.25 }}
          >
            {guaranteeLine}
          </p>
        )}
      </Container>
    </section>
  );
}

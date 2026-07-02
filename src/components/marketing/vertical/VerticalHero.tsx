import { ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/site/primitives";
import { Reveal } from "@/components/marketing/site/Reveal";
import type { VerticalLandingPage, AccentColor } from "@/hooks/useVerticalLanders";

const accentVar: Record<AccentColor, string> = {
  rust: "hsl(var(--rust))",
  gold: "hsl(var(--gold))",
  green: "hsl(var(--green))",
};

function renderHeadline(headline: string, accentWord: string, color: string) {
  if (!accentWord) return headline;
  const idx = headline.toLowerCase().indexOf(accentWord.toLowerCase());
  if (idx < 0) return headline;
  const before = headline.slice(0, idx);
  const match = headline.slice(idx, idx + accentWord.length);
  const after = headline.slice(idx + accentWord.length);
  return (
    <>
      {before}
      <span className="font-serif-accent relative" style={{ color }}>
        {match}
        <svg aria-hidden viewBox="0 0 240 12" preserveAspectRatio="none" className="absolute left-0 right-0 -bottom-2 h-3 w-full">
          <path d="M2 7 Q 60 1 120 6 T 238 5" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </span>
      {after}
    </>
  );
}

export function VerticalHero({
  page,
  biz,
  withSrc,
}: {
  page: VerticalLandingPage;
  biz: string | null;
  withSrc: (u: string) => string;
}) {
  const accent = accentVar[page.accent_color];
  return (
    <section className="relative overflow-hidden pb-20 pt-28 md:pb-28 md:pt-40">
      <div aria-hidden className="radial-gold pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <Container className="relative">
        <div className="max-w-4xl">
          <Reveal>
            <span className="eyebrow">{page.display_name} · Profit Leak Recovery</span>
          </Reveal>

          {biz && (
            <Reveal delay={80}>
              <p className="font-mono-label mt-4" style={{ color: "hsl(var(--gold))" }}>
                A note for {biz}
              </p>
            </Reveal>
          )}

          <Reveal delay={160}>
            <h1
              className="font-display mt-6 text-balance text-foreground"
              style={{ fontSize: "clamp(2.5rem,6vw,5rem)", lineHeight: 1.03, letterSpacing: "-0.03em" }}
            >
              {renderHeadline(page.headline, page.headline_accent_word, accent)}
            </h1>
          </Reveal>

          <Reveal delay={240}>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[hsl(var(--ink-soft))] md:text-xl">
              {page.subline}
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-10 inline-flex flex-col rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5">
              <div className="font-display" style={{ color: "hsl(var(--rust))", fontSize: "2rem", lineHeight: 1, letterSpacing: "-0.02em" }}>
                {page.stat_value}
              </div>
              <div className="font-mono-label mt-2" style={{ color: "hsl(var(--ink))" }}>
                {page.stat_label}
              </div>
              <p className="mt-3 text-[0.7rem] italic text-[hsl(var(--ink-soft))]">
                {biz ? `what this looks like for ${biz}` : "estimated — your audit uses your numbers"}
              </p>
            </div>
          </Reveal>

          <Reveal delay={360}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href={withSrc(page.cta_primary_url)}
                className="group inline-flex items-center gap-2 rounded-full bg-[hsl(var(--green))] px-7 py-4 text-sm font-medium text-[hsl(var(--bone))] transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                {page.cta_primary_label}
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </a>
              {page.cta_secondary_url && page.cta_secondary_label && (
                <a
                  href={page.cta_secondary_url}
                  className="group inline-flex items-center gap-2 text-sm font-medium text-foreground underline decoration-[hsl(var(--gold))] decoration-2 underline-offset-8 hover:decoration-[hsl(var(--green))]"
                >
                  {page.cta_secondary_label}
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </a>
              )}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
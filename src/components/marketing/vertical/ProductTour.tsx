import { Container } from "@/components/marketing/site/primitives";
import { Reveal } from "@/components/marketing/site/Reveal";
import type { TourFeature } from "@/hooks/useVerticalLander";

export function ProductTour({ features }: { features: TourFeature[] }) {
  if (!features?.length) return null;
  return (
    <section id="tour" className="relative border-t border-[hsl(var(--line))] bg-[hsl(var(--bone))] py-16 md:py-24">
      <Container>
        <Reveal>
          <span className="eyebrow">The product</span>
          <h2
            className="font-display mt-4 max-w-3xl text-foreground"
            style={{ fontSize: "clamp(1.75rem,3.5vw,2.6rem)", lineHeight: 1.1 }}
          >
            What you actually get to look at.
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((f, i) => (
            <Reveal key={`${f.title}-${i}`} delay={60 + i * 50}>
              <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))]">
                {f.image_url && (
                  <img
                    src={f.image_url}
                    alt={f.image_alt ?? f.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full border-b border-[hsl(var(--line))] bg-[hsl(var(--bone-2))] object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col p-5 md:p-6">
                  <h3 className="font-display text-[1.15rem] leading-snug text-foreground">{f.title}</h3>
                  {f.body && (
                    <p className="mt-3 text-[0.95rem] leading-relaxed text-[hsl(var(--ink-soft))]">{f.body}</p>
                  )}
                  {f.caption && (
                    <p className="font-mono-label mt-5" style={{ color: "hsl(var(--green))" }}>
                      {f.caption}
                    </p>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

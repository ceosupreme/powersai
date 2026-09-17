import { Link } from "react-router-dom";
import { Container, Eyebrow, SectionTitle } from "../primitives";

/**
 * No portrait is supplied, so the visual is a compact typographic nameplate —
 * not an empty image rectangle. The /hire route is a secondary professional
 * path, deliberately kept out of the primary company navigation.
 */
export function Founder() {
  return (
    <section id="about" className="studio-section bg-[hsl(var(--surface))]">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Eyebrow>The person behind the work</Eyebrow>
            <SectionTitle>Marketing roots. Technical reach.</SectionTitle>
            <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-muted-foreground md:text-lg">
              I&apos;m Sean Mayo, founder of Supreme Team Media. Since 2002, the company has connected creative work
              with the practical needs of running and growing a business. Today, that includes websites, branding,
              marketing, and custom AI-powered systems.
            </p>
            <p className="mt-4 max-w-xl text-[1rem] leading-relaxed text-muted-foreground">
              You work directly with me on strategy and implementation. I use modern tools to move quickly, while
              keeping the scope, decisions, and finished work clear.
            </p>
            <p className="studio-label mt-7">
              Bachelor&apos;s degree in Advertising · The Art Institute of California
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl border border-border p-8">
              <span className="studio-display block leading-none" style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)" }}>
                Sean
                <br />
                Mayo
              </span>
              <span className="studio-label mt-5 block">Founder · Supreme Team Media</span>
              <span className="mt-2 block text-[0.9rem] text-muted-foreground">San Diego · Since 2002</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

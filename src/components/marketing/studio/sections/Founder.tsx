import { Link } from "react-router-dom";
import { Container, Eyebrow, SectionTitle } from "../primitives";
import { ProjectMontage } from "../ServiceVisuals";

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
            <Eyebrow>About Sean Mayo</Eyebrow>
            <SectionTitle>Business judgment, creative range, and hands-on execution.</SectionTitle>
            <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-muted-foreground md:text-lg">
              I&apos;m Sean Mayo, founder of Supreme Team Media. Since 2002, I&apos;ve helped connect the way a business
              presents itself with the way it attracts customers and gets work done. Today, that includes websites,
              branding, marketing, copy, and custom business systems.
            </p>
            <p className="mt-4 max-w-xl text-[1rem] leading-relaxed text-muted-foreground">
              You work directly with me from the first decision through implementation. Modern tools help me move
              quickly, but the business goal—not the tool—drives the work.
            </p>
            <p className="studio-label mt-7">
              Bachelor&apos;s degree in Advertising · The Art Institute of California
            </p>
            <p className="mt-4 text-[0.9rem]">
              <Link
                to="/hire"
                className="inline-flex min-h-[24px] items-center gap-1.5 text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
              >
                Hiring Sean? <span aria-hidden>&rarr;</span>
              </Link>
            </p>
          </div>

          <div className="lg:col-span-5"><ProjectMontage /></div>
        </div>
      </Container>
    </section>
  );
}

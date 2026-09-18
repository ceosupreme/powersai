import { Link } from "react-router-dom";
import { Container } from "../primitives";
import {
  BuildIllustration,
  ConnectIllustration,
  DesignIllustration,
  GrowIllustration,
} from "./HeroCardIllustrations";

const BOARD = [
  { word: "DESIGN", capability: "Brand & creative", tone: "plate-tone-lilac", Illustration: DesignIllustration },
  { word: "BUILD", capability: "Websites & apps", tone: "plate-tone-paper", Illustration: BuildIllustration },
  { word: "GROW", capability: "Marketing & content", tone: "plate-tone-sand", Illustration: GrowIllustration },
  { word: "CONNECT", capability: "AI & systems", tone: "plate-tone-green", Illustration: ConnectIllustration },
];

export function Hero() {
  return (
    <section id="top" className="studio-hero overflow-hidden pb-16 pt-[112px] md:pb-24 md:pt-[144px]">
      <Container>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <span className="studio-eyebrow block">Creative · Marketing · Technology</span>
            <h1 className="studio-display mt-6 text-balance" style={{ fontSize: "clamp(3rem, 6.2vw, 5.4rem)" }}>
              Stand out.
              <br />
              Get chosen.
              <br />
              <span className="studio-serif">Work smarter.</span>
            </h1>
            <p className="mt-8 max-w-xl text-[1.1rem] leading-relaxed text-muted-foreground md:text-[1.25rem]">
              Websites, branding, digital marketing, and AI-powered systems. Supreme Team Media brings strategic
              thinking and hands-on execution to what your business needs next.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <a href="#work" className="studio-btn studio-btn-primary">Explore the work</a>
              <a href="#contact" className="studio-btn studio-btn-outline">Discuss a project</a>
            </div>
            <p className="mt-7 text-[0.9rem] text-muted-foreground">
              Founder-led since 2002. Based in San Diego. Available for remote projects.
            </p>
          </div>

          {/* Typographic studio board — brand artwork, not a product screenshot. */}
          <div className="lg:col-span-5">
            <div className="studio-hero-board grid grid-cols-2 gap-3 md:gap-4">
              {BOARD.map((b, index) => (
                <div
                  key={b.word}
                  className={`studio-hero-tile studio-hero-tile-${index + 1} ${b.tone} flex min-h-[160px] flex-col justify-between p-5 md:min-h-[190px]`}
                >
                  <span
                    className="studio-display leading-none"
                    style={{ fontSize: "clamp(1.15rem, 2.4vw, 1.6rem)" }}
                  >
                    {b.word}
                  </span>
                  <b.Illustration className="ml-auto h-[70px] w-full max-w-[150px] opacity-90 md:h-[86px]" />
                  <span className="text-[0.88rem] font-medium leading-snug opacity-80">{b.capability}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[0.85rem] text-muted-foreground">
              Different disciplines. One connected approach.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function ScopeStrip() {
  return (
    <section className="studio-scope-bridge studio-band py-10 md:py-14">
      <Container>
        <p className="studio-display text-balance text-[1.45rem] leading-snug md:text-[2.1rem]">
          Websites <span aria-hidden>·</span> Brands <span aria-hidden>·</span> Campaigns <span aria-hidden>·</span> Systems <span aria-hidden>·</span> Publishing
        </p>
        <div className="mt-5 flex flex-col gap-3 border-t border-[hsl(var(--band-text)/0.2)] pt-5 md:flex-row md:items-baseline md:justify-between md:gap-10">
          <p className="text-[1rem] text-muted-foreground md:max-w-2xl">A new website. A sharper brand. A better campaign. A system that saves steps.</p>
          <p className="text-[0.95rem] text-muted-foreground md:max-w-xs md:text-right">
            Start with the project you need. Connect the pieces when it makes sense.
          </p>
        </div>
      </Container>
    </section>
  );
}

/** Legacy anchor aliases so older links keep landing somewhere sensible. */
export function AnchorAlias({ id, target }: { id: string; target: string }) {
  return <span id={id} data-alias-for={target} aria-hidden className="block h-0" />;
}

export { Link };

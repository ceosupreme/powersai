import { Link } from "react-router-dom";
import { getStudioMedia } from "@/config/studioMedia";
import { BrowserFrame } from "../BrowserFrame";
import { Container } from "../primitives";

const HERO_WORK = [
  { slug: "barpulse", title: "BarPulse", mediaKey: "work-barpulse", className: "studio-hero-proof-1" },
  { slug: "big-paws-club", title: "Big Paws Club", mediaKey: "work-big-paws-club", className: "studio-hero-proof-2" },
  { slug: "kario-voss", title: "Kario Voss", mediaKey: "work-kario-voss", className: "studio-hero-proof-3" },
];

export function Hero() {
  return (
    <section id="top" className="studio-hero overflow-hidden pb-14 pt-[116px] md:pb-20 md:pt-[148px]">
      <Container>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6 xl:col-span-7">
            <span className="studio-eyebrow block">Creative · Marketing · Technology</span>
            <h1 className="studio-display mt-6 text-balance" style={{ fontSize: "clamp(3rem, 6.2vw, 5.4rem)" }}>
              Stand out.
              <br />
              Get chosen.
              <br />
              <span className="studio-serif">Work smarter.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-[1.12rem] leading-relaxed text-muted-foreground md:text-[1.28rem]">
              Supreme Team Media builds the brands, websites, campaigns, and AI-powered systems that help businesses
              attract customers and run better behind the scenes.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/work" className="studio-btn studio-btn-primary">See the work</Link>
              <a href="#contact" className="studio-btn studio-btn-outline">Start a project</a>
            </div>
            <p className="mt-7 text-[0.9rem] text-muted-foreground">
              Founder-led since 2002. Based in San Diego. Available for remote projects.
            </p>
          </div>

          <div className="lg:col-span-6 xl:col-span-5">
            <div className="studio-hero-proof" aria-label="Selected live project previews">
              {HERO_WORK.map((item) => {
                const media = getStudioMedia(item.mediaKey);
                if (!media?.src) return null;
                return (
                  <Link key={item.slug} to={`/work/${item.slug}`} className={`${item.className} group block`} aria-label={`View ${item.title} case study`}>
                    <BrowserFrame>
                      <img src={media.src} alt={media.alt} width={media.width} height={media.height} className="studio-project-image size-full object-cover object-top" />
                    </BrowserFrame>
                    <span className="studio-label mt-2 block">{item.title}</span>
                  </Link>
                );
              })}
            </div>
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
        <p className="studio-display text-balance text-[1.45rem] leading-snug md:text-[2.35rem]">
          Websites <span aria-hidden>·</span> Brands <span aria-hidden>·</span> Campaigns <span aria-hidden>·</span> Systems <span aria-hidden>·</span> Publishing
        </p>
        <div className="mt-5 flex flex-col gap-3 border-t border-[hsl(var(--band-text)/0.2)] pt-5 md:flex-row md:items-baseline md:justify-between md:gap-10">
          <p className="text-[1rem] text-muted-foreground md:max-w-2xl">A clearer website. A stronger brand. Marketing with a reason to act. Systems that save your team time.</p>
          <p className="text-[0.95rem] text-muted-foreground md:max-w-xs md:text-right">
             Start with the problem in front of you. Bring the rest together when the business needs it.
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

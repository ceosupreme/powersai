import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container, Eyebrow, Lede, SectionTitle } from "../primitives";
import { ServiceEntryVisual, type ServiceVisualTone } from "../ServiceVisuals";

const ROWS: {
  title: string;
  headline: string;
  body: string;
  cta: string;
  to: string;
  tone: ServiceVisualTone;
}[] = [
  {
    title: "Websites & digital products",
    headline: "Help people understand your business, trust it, and take the next step.",
    body: "Strategy, website and landing-page copy, UX, design, and development for business sites, campaigns, stores, and digital products.",
    cta: "See website services",
    to: "/services/websites",
    tone: "websites",
  },
  {
    title: "Brand & creative",
    headline: "Make your business easier to recognize, remember, and choose.",
    body: "Positioning, voice, message architecture, identity, and creative assets that keep the brand clear wherever customers meet it.",
    cta: "See brand services",
    to: "/services/brand",
    tone: "brand",
  },
  {
    title: "Marketing & growth",
    headline: "Give the right people a clear reason to pay attention and respond.",
    body: "Campaign strategy and messaging, landing-page copy, email, social and content copy, launch support, and advertising creative.",
    cta: "See marketing services",
    to: "/services/marketing",
    tone: "marketing",
  },
  {
    title: "AI & business systems",
    headline: "Make the work behind the business easier to run.",
    body: "Connect tools, data, and workflows so your team spends less time chasing information, copying updates, and checking routine work.",
    cta: "See systems services",
    to: "/services/ai-systems",
    tone: "systems",
  },
];

export function Capabilities() {
  return (
    <section id="services" className="studio-section bg-[hsl(var(--surface))]">
      {/* legacy alias: older links pointed at #how-we-help */}
      <span id="how-we-help" aria-hidden className="block h-0" />
      <Container>
        <Eyebrow>Services</Eyebrow>
        <SectionTitle>Start with the website. Connect the rest when it helps.</SectionTitle>
        <Lede>Websites are the clearest starting point. Brand, marketing, systems, and publishing remain available as focused engagements or connected work.</Lede>

        <div className="mt-14 divide-y divide-border border-y border-border">
          {ROWS.map((r, i) => (
            <article key={r.title} className={`service-entry service-entry-${r.tone} ${i === 0 ? "service-entry-featured" : ""} grid gap-7 py-9 md:grid-cols-12 md:items-center md:py-12`}>
              <div className="md:col-span-4">
                <span className="studio-display block text-[1rem] text-primary">0{i + 1}</span>
                <h3 className="studio-display mt-3 text-[1.65rem] leading-snug md:text-[2rem]">{r.title}</h3>
              </div>
              <div className="md:col-span-8">
                <ServiceEntryVisual tone={r.tone} />
                <div className="mt-7 md:grid md:grid-cols-[1fr_auto] md:gap-8">
                <div>
                <p className="studio-display text-[1.45rem] leading-snug md:text-[1.8rem]">{r.headline}</p>
                <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed opacity-80">{r.body}</p>
                </div>
                <Link to={r.to} className="mt-6 inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap text-[0.95rem] font-medium text-primary hover:underline md:mt-0">
                  {r.cta} <ArrowRight size={15} />
                </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-6 bg-[hsl(var(--band))] px-6 py-9 text-[hsl(var(--band-text))] md:grid-cols-12 md:gap-10 md:px-10 md:py-12">
          <div className="md:col-span-4">
            <span className="studio-eyebrow" style={{ color: "hsl(var(--band-text) / 0.72)" }}>Publishing &amp; Launch</span>
            <p className="studio-label mt-4" style={{ color: "hsl(var(--band-text) / 0.68)" }}>Books · Apps · Digital products</p>
          </div>
          <div className="md:col-span-8">
            <ServiceEntryVisual tone="publishing" />
            <h3 className="studio-display text-[1.35rem] leading-snug md:text-[1.65rem]">
              Take finished work all the way to release.
            </h3>
            <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-[hsl(var(--band-text)/0.76)]">
              Move from finished manuscript or product to a professional release with production, store-ready assets,
              clear listing copy, submission support, and a practical launch plan.
            </p>
            <Link
              to="/publishing"
              className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-[0.95rem] font-medium text-[hsl(var(--band-text))] hover:underline"
            >
              See publishing services <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <p className="mt-8 text-[0.92rem] text-muted-foreground">
          <Link to="/free-audit" className="underline underline-offset-4 hover:text-foreground">
            Start with a free business checkup
          </Link>
        </p>
      </Container>
    </section>
  );
}

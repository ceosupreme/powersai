import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container, Eyebrow, Lede, SectionTitle } from "../primitives";

const ROWS: {
  title: string;
  headline: string;
  body: string;
  cta: string;
  to: string;
}[] = [
  {
    title: "Websites & digital products",
    headline: "Make the right first impression—and give people a clear next step.",
    body: "Business and brand websites, campaign landing pages, online storefronts, web apps, and interface design. New builds or improvements to an existing experience.",
    cta: "Explore websites",
    to: "/services/websites",
  },
  {
    title: "Brand & creative",
    headline: "Give your business a look people recognize.",
    body: "Brand identity, graphic design, presentation materials, campaign visuals, and content assets that work together across the places your business shows up.",
    cta: "Explore brand & creative",
    to: "/services/brand",
  },
  {
    title: "Marketing & growth",
    headline: "Connect what you offer with the people who need it.",
    body: "Positioning, advertising, landing-page strategy, email and social content, launch campaigns, and event promotion—with a clear purpose and scope.",
    cta: "Explore marketing & growth",
    to: "/services/marketing",
  },
  {
    title: "AI & business systems",
    headline: "Make the work behind the business easier to run.",
    body: "Custom dashboards, internal tools, CRM workflows, reporting, integrations, and AI-assisted processes. Configure the right connections rather than force every business into the same setup.",
    cta: "Explore AI & systems",
    to: "/services/ai-systems",
  },
];

export function Capabilities() {
  return (
    <section id="services" className="studio-section bg-[hsl(var(--surface))]">
      {/* legacy alias: older links pointed at #how-we-help */}
      <span id="how-we-help" aria-hidden className="block h-0" />
      <Container>
        <Eyebrow>Services</Eyebrow>
        <SectionTitle>Start with the outcome. Bring in the disciplines it needs.</SectionTitle>
        <Lede>Five ways into the studio, each built around a clear business job rather than a menu of disconnected deliverables.</Lede>

        <div className="mt-14 divide-y divide-border border-y border-border">
          {ROWS.map((r, i) => (
            <article key={r.title} className="grid gap-7 py-9 md:grid-cols-12 md:items-start md:py-12">
              <div className="md:col-span-4">
                <span className="studio-display block text-[1rem] text-primary">0{i + 1}</span>
                <h3 className="studio-display mt-3 text-[1.65rem] leading-snug md:text-[2rem]">{r.title}</h3>
              </div>
              <div className="md:col-span-8 md:grid md:grid-cols-[1fr_auto] md:gap-8">
                <div>
                <p className="studio-display text-[1.45rem] leading-snug md:text-[1.8rem]">{r.headline}</p>
                <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed opacity-80">{r.body}</p>
                </div>
                <Link to={r.to} className="mt-6 inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap text-[0.95rem] font-medium text-primary hover:underline md:mt-0">
                  {r.cta} <ArrowRight size={15} />
                </Link>
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
            <h3 className="studio-display text-[1.35rem] leading-snug md:text-[1.65rem]">
              Take finished work all the way to release.
            </h3>
            <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-[hsl(var(--band-text)/0.76)]">
              Books, apps, and digital products need packaging, store-ready assets, clear listings, submission support,
              and a launch path. Publishing combines the studio&apos;s creative, technical, and marketing capabilities
              around the release.
            </p>
            <Link
              to="/publishing"
              className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-[0.95rem] font-medium text-[hsl(var(--band-text))] hover:underline"
            >
              Explore publishing <ArrowRight size={15} />
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

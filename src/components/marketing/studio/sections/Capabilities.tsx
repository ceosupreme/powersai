import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container, Eyebrow, Lede, SectionTitle } from "../primitives";
import { requestServiceIntent, type ServiceId } from "../serviceIntent";

const ROWS: {
  n: string;
  title: string;
  headline: string;
  body: string;
  deliverables: string;
  cta: string;
  service: ServiceId;
}[] = [
  {
    n: "01",
    title: "Websites & digital products",
    headline: "Make the right first impression—and give people a clear next step.",
    body: "Business and brand websites, campaign landing pages, online storefronts, web apps, and interface design. New builds or improvements to an existing experience.",
    deliverables: "Websites / Landing pages / E-commerce / Web apps / UI design",
    cta: "Talk about a website or app",
    service: "websites-apps",
  },
  {
    n: "02",
    title: "Brand & creative",
    headline: "Give your business a look people recognize.",
    body: "Brand identity, graphic design, presentation materials, campaign visuals, and content assets that work together across the places your business shows up.",
    deliverables: "Identity / Graphic design / Presentations / Campaign creative / Visual content",
    cta: "Talk about brand or creative work",
    service: "brand-creative",
  },
  {
    n: "03",
    title: "Marketing & growth",
    headline: "Connect what you offer with the people who need it.",
    body: "Positioning, advertising, landing-page strategy, email and social content, launch campaigns, and event promotion—with a clear purpose and scope.",
    deliverables: "Strategy / Advertising / Email & social / Launches / Event promotion",
    cta: "Talk about marketing",
    service: "marketing-growth",
  },
  {
    n: "04",
    title: "AI & business systems",
    headline: "Make the work behind the business easier to run.",
    body: "Custom dashboards, internal tools, CRM workflows, reporting, integrations, and AI-assisted processes. Configure the right connections rather than force every business into the same setup.",
    deliverables: "Dashboards / CRM / Integrations / Automations / AI workflows",
    cta: "Talk about a business system",
    service: "ai-systems",
  },
];

export function Capabilities() {
  return (
    <section id="services" className="studio-section bg-[hsl(var(--surface))]">
      {/* legacy alias: older links pointed at #how-we-help */}
      <span id="how-we-help" aria-hidden className="block h-0" />
      <Container>
        <Eyebrow>What we can build together</Eyebrow>
        <SectionTitle>Creative on the outside. Capable underneath.</SectionTitle>
        <Lede>Hire the studio for one discipline or connect several around the same goal.</Lede>

        <div className="mt-12">
          {ROWS.map((r, i) => (
            <div
              key={r.n}
              className={`grid grid-cols-1 gap-6 border-border py-9 md:grid-cols-12 md:gap-10 ${i === 0 ? "border-t" : "border-t"}`}
            >
              <div className="md:col-span-3">
                <span className="studio-display block text-[2rem] text-[hsl(var(--cobalt))] md:text-[2.5rem]">
                  {r.n}
                </span>
                <h3 className="studio-display mt-2 text-[1.15rem] leading-snug">{r.title}</h3>
              </div>
              <div className="md:col-span-9">
                <p className="studio-display text-[1.25rem] leading-snug md:text-[1.6rem]">{r.headline}</p>
                <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-muted-foreground">{r.body}</p>
                <p className="studio-label mt-5">{r.deliverables}</p>
                <a
                  href="#contact"
                  onClick={() => requestServiceIntent(r.service)}
                  className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-[0.95rem] font-medium text-[hsl(var(--cobalt))] hover:underline"
                >
                  {r.cta} <ArrowRight size={15} />
                </a>
              </div>
            </div>
          ))}
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

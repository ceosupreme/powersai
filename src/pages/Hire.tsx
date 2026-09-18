import { Link } from "react-router-dom";
import { ExternalLink, Mail } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Container, Eyebrow, Lede } from "@/components/marketing/studio/primitives";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { STUDIO_RESUME, RESUME_REQUEST_MAILTO } from "@/config/studioResume";
import { trackStudioEvent } from "@/lib/studioAnalytics";
import { getStudioMedia } from "@/config/studioMedia";
import { BrowserFrame } from "@/components/marketing/studio/BrowserFrame";
import { ProjectPlate } from "@/components/marketing/studio/ProjectPlate";

const LINKEDIN = "https://www.linkedin.com/in/sean-mayo-3055aa287/";

/** Evidence order: creative, marketing and systems work — not an AI-only identity. */
const EVIDENCE_SLUGS = ["kario-voss", "barpulse", "big-paws-club", "coastal-beauties"];

const EXPERIENCE = [
  {
    label: "Creative & brand",
    body:
      "Brand direction, graphic design, campaign creative and content built for businesses and for Sean's own brand work.",
  },
  {
    label: "Marketing & sales",
    body:
      "Positioning, promotion, partnerships, events and audience development — including direct sales and customer-facing work in hospitality.",
  },
  {
    label: "Websites & digital",
    body: "Responsive websites, landing pages and interface work, designed and implemented end to end.",
  },
  {
    label: "Business systems & AI",
    body:
      "Discovery with owners and managers, integrations across operating tools, reporting, and AI-assisted workflows built around how a business actually runs.",
  },
];

export default function Hire() {
  const { projects } = useStudioProjects();
  const evidence = EVIDENCE_SLUGS.map((s) => projects.find((p) => p.slug === s)).filter(Boolean) as typeof projects;

  useStudioHead({
    title: "Hire Sean Mayo — Strategy, creative work, and hands-on implementation",
    description:
      "Sean Mayo, founder of Supreme Team Media since 2002: marketing, sales, hospitality, websites and AI-assisted business systems. For employers and teams considering an individual role, contract, or embedded project.",
    path: "/hire",
  });

  return (
    <div className="stm-studio relative min-h-screen">
      <StudioHeader />
      <main className="pt-[112px] md:pt-[140px]">
        <Container>
          <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
          <Eyebrow>For employers and teams</Eyebrow>
          <h1 className="studio-display mt-5 max-w-4xl text-balance" style={{ fontSize: "clamp(3rem, 6vw, 5.5rem)" }}>
            Sean Mayo — Strategy, creative work, and hands-on implementation.
          </h1>
          <Lede>
            Founder of Supreme Team Media since 2002, with experience across marketing, sales, hospitality, websites,
            and AI-assisted business systems. I turn business needs into work people can use—and collaborate directly
            with the people responsible for it.
          </Lede>
          <p className="mt-5 max-w-2xl text-[1.05rem] text-muted-foreground">
            For employers and teams considering Sean for an individual role, contract, or embedded project.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/?intent=hiring#contact"
              onClick={() => trackStudioEvent("hiring_interest", { id: "discuss_role" })}
              className="studio-btn studio-btn-primary"
            >
              Discuss a role or contract
            </Link>

            {STUDIO_RESUME.file ? (
              <a
                href={STUDIO_RESUME.file}
                download={STUDIO_RESUME.downloadName}
                onClick={() => trackStudioEvent("resume_download", { id: "resume_pdf" })}
                className="studio-btn studio-btn-outline"
              >
                {STUDIO_RESUME.label}
              </a>
            ) : (
              <a
                href={RESUME_REQUEST_MAILTO}
                onClick={() => trackStudioEvent("hiring_interest", { id: "resume_request" })}
                className="studio-btn studio-btn-outline"
              >
                Request résumé <Mail size={14} />
              </a>
            )}

            <a href={LINKEDIN} target="_blank" rel="noreferrer" className="text-[0.95rem] underline underline-offset-4">
              LinkedIn profile <ExternalLink className="inline" size={13} />
            </a>
          </div>
          </div>
          <div className="hire-proof-stack lg:col-span-5" aria-label="Selected project proof">
            {evidence.slice(0, 3).map((project, index) => {
              const media = getStudioMedia(project.mediaKey);
              const src = project.imageUrl || media?.src;
              if (!src) return null;
              return <BrowserFrame key={project.slug} className={`hire-proof-frame hire-proof-frame-${index + 1}`}><img src={src} alt={`${project.title} website`} className="size-full object-cover object-top" /></BrowserFrame>;
            })}
          </div>
          </div>
        </Container>

        {/* Experience across disciplines */}
        <section className="studio-section">
          <Container>
            <h2 className="studio-display text-balance" style={{ fontSize: "clamp(1.7rem, 3vw, 2.4rem)" }}>
              What I bring to a team.
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
              {EXPERIENCE.map((e, index) => (
                <div key={e.label} className={`studio-experience-panel plate-tone-${["lilac", "sand", "paper", "green"][index]} p-7 md:p-9`}>
                  <h3 className="studio-display text-[1.55rem]">{e.label}</h3>
                  <p className="mt-5 text-[1.05rem] leading-relaxed opacity-80">{e.body}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Evidence — real, accurately labelled examples */}
        <section className="studio-section border-y border-border bg-[hsl(var(--surface))]">
          <Container>
            <Eyebrow>Evidence</Eyebrow>
            <h2 className="studio-display mt-4 text-balance" style={{ fontSize: "clamp(1.7rem, 3vw, 2.4rem)" }}>
              Work you can read about and ask about.
            </h2>
            <p className="mt-5 max-w-2xl text-[0.98rem] text-muted-foreground">
              Each example states what it actually is: client work, an owned brand, a historical engagement, or a
              demonstration built with sample data.
            </p>

            <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
              {evidence.map((p) => (
                <ProjectPlate key={p.slug} project={p} />
              ))}
              <article className="studio-project-card bg-[hsl(var(--band))] p-8 text-[hsl(var(--band-text))]">
                <span className="studio-label">Owned internal platform</span>
                <h3 className="studio-display mt-3 text-[1.15rem] leading-snug">
                  STM OS — Supreme Team Media&apos;s own operating platform
                </h3>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
                  The internal platform Sean designed and built to run Supreme Team Media&apos;s own client work:
                  intake, project records, reporting and AI-assisted review in one place.
                </p>
                <p className="mt-3 text-[0.85rem] text-muted-foreground">
                  <span className="studio-label">Role</span> Product design, full build, integrations and ongoing
                  operation.
                </p>
                <p className="mt-3 text-[0.85rem] text-muted-foreground">
                  Internal software, not a client deployment or a product for sale.
                </p>
              </article>
            </div>
          </Container>
        </section>

        {/* Credentials */}
        <section className="studio-section">
          <Container>
            <h2 className="studio-display text-balance" style={{ fontSize: "clamp(1.7rem, 3vw, 2.4rem)" }}>
              Background.
            </h2>
            <dl className="mt-9 max-w-2xl space-y-6">
              <div className="border-t border-border pt-5">
                <dt className="studio-label">Education</dt>
                <dd className="mt-2 text-[0.98rem] text-muted-foreground">
                  Bachelor&apos;s degree in Advertising — The Art Institute of California.
                </dd>
              </div>
              <div className="border-t border-border pt-5">
                <dt className="studio-label">Company</dt>
                <dd className="mt-2 text-[0.98rem] text-muted-foreground">
                  Supreme Team Media, founded 2002. Based in San Diego; available for remote work.
                </dd>
              </div>
              <div className="border-t border-border pt-5">
                <dt className="studio-label">Ways to work together</dt>
                <dd className="mt-2 text-[0.98rem] text-muted-foreground">
                  An individual role, a contract engagement, or an embedded project alongside an existing team. This
                  page is Sean&apos;s own professional introduction — not an arrangement for an agency to perform the
                  role.
                </dd>
              </div>
            </dl>

            <div className="mt-12 border-t border-border pt-8">
              <p className="studio-display text-[1.25rem]">Considering Sean for a role?</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/?intent=hiring#contact"
                  onClick={() => trackStudioEvent("hiring_interest", { id: "discuss_role_footer" })}
                  className="studio-btn studio-btn-primary"
                >
                  Discuss a role or contract
                </Link>
                {!STUDIO_RESUME.file && (
                  <a href={RESUME_REQUEST_MAILTO} className="studio-btn studio-btn-outline">
                    Request résumé <Mail size={14} />
                  </a>
                )}
              </div>
            </div>
          </Container>
        </section>
      </main>
      <StudioFooter />
    </div>
  );
}

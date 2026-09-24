import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import type { StudioCategoryId } from "@/content/studioProjects";
import { StudioFooter } from "./StudioFooter";
import { StudioHeader } from "./StudioHeader";
import { StudioReveal } from "./StudioReveal";
import { ProjectPlate } from "./ProjectPlate";
import { Container, Eyebrow, SectionTitle } from "./primitives";
import { useStudioHead } from "./useStudioHead";
import { ServiceExplainerVisual, ServiceHeroVisual, ServiceMediaBand } from "./ServiceVisuals";
import { OfferSection } from "@/components/marketing/offer/OfferSection";

export type ServicePageContent = {
  eyebrow: string;
  title: string;
  description: string;
  path: string;
  seoTitle: string;
  seoDescription: string;
  intent: string;
  primaryCta: string;
  secondaryCta: string;
  proofSlugs: string[];
  problemTitle: string;
  problems: { title: string; body: string }[];
  outcomesTitle: string;
  outcomesIntro: string;
  outcomes: string[];
  capabilitiesTitle: string;
  capabilities: string[];
  process: { title: string; body: string }[];
  connectedTitle: string;
  connectedBody: string;
  connectedLinks: { label: string; to: string }[];
  faqs: { q: string; a: string }[];
  finalTitle: string;
  finalBody: string;
  tone: "websites" | "brand" | "marketing" | "systems";
};

export function ServicePage({ content }: { content: ServicePageContent }) {
  const { projects, isLoading, isError } = useStudioProjects();
  const proof = content.proofSlugs.map((slug) => projects.find((project) => project.slug === slug)).filter(Boolean);

  useStudioHead({
    title: content.seoTitle,
    description: content.seoDescription,
    path: content.path,
  });

  return (
    <div className={`stm-studio service-page service-page-${content.tone} relative min-h-screen`}>
      <StudioHeader />
      <main>
        <section className="service-hero overflow-hidden pt-[118px] md:pt-[150px]">
          <Container>
            <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <Eyebrow>{content.eyebrow}</Eyebrow>
                <h1 className="studio-display mt-5 max-w-5xl text-balance text-[3rem] leading-[1.01] md:text-[4.6rem] lg:text-[5.7rem]">
                  {content.title}
                </h1>
              </div>
              <div className="lg:col-span-4 lg:pb-2">
                <p className="text-[1.08rem] leading-relaxed text-muted-foreground md:text-[1.2rem]">{content.description}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                  <Link to={`/?intent=${content.intent}#contact`} className="studio-btn studio-btn-primary">
                    {content.primaryCta} <ArrowRight size={16} />
                  </Link>
                  <a href="#service-work" className="studio-btn studio-btn-outline">{content.secondaryCta}</a>
                </div>
              </div>
            </div>
            <div className="mt-14 md:mt-20">
              <ServiceHeroVisual tone={content.tone} />
            </div>
            <div className="service-hero-rule mt-8" aria-hidden />
          </Container>
        </section>

        <StudioReveal>
          <section className="service-visual-explainer-wrap">
            <Container><ServiceExplainerVisual tone={content.tone} /></Container>
          </section>
        </StudioReveal>

        {content.tone === "websites" && <StudioReveal><OfferSection source="services-websites" /></StudioReveal>}

        <StudioReveal>
          <section className="studio-section">
            <Container>
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
                <div className="lg:col-span-5">
                  <Eyebrow>What may be holding you back</Eyebrow>
                  <SectionTitle>{content.problemTitle}</SectionTitle>
                </div>
                <div className="divide-y divide-border lg:col-span-7">
                  {content.problems.map((item, index) => (
                    <article key={item.title} className="grid gap-3 py-6 first:pt-0 md:grid-cols-[48px_1fr] md:gap-5">
                      <span className="studio-display text-[1rem] text-primary">0{index + 1}</span>
                      <div>
                        <h2 className="studio-display text-[1.45rem] leading-tight md:text-[1.7rem]">{item.title}</h2>
                        <p className="mt-3 text-[1rem] leading-relaxed text-muted-foreground">{item.body}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </Container>
          </section>
        </StudioReveal>

        <StudioReveal>
          <section className="service-outcomes studio-band studio-section">
            <Container>
              <div className="grid gap-12 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <Eyebrow style={{ color: "hsl(var(--band-text) / 0.72)" }}>What better looks like</Eyebrow>
                  <h2 className="studio-display mt-4 text-balance text-[2.6rem] leading-[1.05] md:text-[4.2rem]">{content.outcomesTitle}</h2>
                  <p className="mt-6 text-[1.08rem] leading-relaxed text-muted-foreground">{content.outcomesIntro}</p>
                </div>
                <ul className="grid gap-0 border-t border-[hsl(var(--band-text)/0.18)] sm:grid-cols-2 lg:col-span-7">
                  {content.outcomes.map((item, index) => (
                    <li key={item} className="flex min-h-[132px] gap-4 border-b border-[hsl(var(--band-text)/0.18)] p-5 sm:odd:border-r">
                      <span className="studio-display text-primary">0{index + 1}</span>
                      <span className="text-[1.05rem] leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Container>
          </section>
        </StudioReveal>

        <StudioReveal>
          <section className="studio-section bg-[hsl(var(--surface))]">
            <Container>
               <Eyebrow>What we can help with</Eyebrow>
              <SectionTitle>{content.capabilitiesTitle}</SectionTitle>
              <ul className="service-capability-list mt-12 grid gap-x-10 md:grid-cols-2">
                {content.capabilities.map((item, index) => (
                  <li key={item} className="flex items-start gap-4 border-t border-border py-5 text-[1.08rem]">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Container>
          </section>
        </StudioReveal>

        <StudioReveal>
          <section className="service-media-section studio-section">
            <Container>
               <Eyebrow>Built for real use</Eyebrow>
              <SectionTitle>{mediaBandTitle(content.tone)}</SectionTitle>
              <ServiceMediaBand tone={content.tone} />
            </Container>
          </section>
        </StudioReveal>

        <StudioReveal>
          <section id="service-work" className="studio-section">
            <Container>
               <Eyebrow>Related work</Eyebrow>
               <SectionTitle>See this kind of thinking in the work.</SectionTitle>
              {isError ? (
                <p className="mt-8 text-muted-foreground">The projects could not be loaded. You can still browse the full work page.</p>
              ) : isLoading ? (
                <p className="mt-8 text-muted-foreground" role="status">Loading projects…</p>
              ) : (
                <div className="service-proof-grid mt-12 grid gap-7 lg:grid-cols-12">
                  {proof.slice(0, 3).map((project, index) => (
                    <ProjectPlate key={project.slug} project={project} className={`service-proof-item service-proof-item-${index + 1}`} />
                  ))}
                </div>
              )}
              <Link to={`/work?category=${categoryForTone(content.tone)}`} className="studio-btn studio-btn-outline mt-9">
                View related work <ArrowRight size={15} />
              </Link>
            </Container>
          </section>
        </StudioReveal>

        <StudioReveal>
          <section className="studio-section border-y border-border bg-[hsl(var(--cobalt-pale))]">
            <Container>
               <Eyebrow>How we work</Eyebrow>
               <SectionTitle>A clear path from the first conversation to launch.</SectionTitle>
              <ol className="mt-12 grid gap-8 md:grid-cols-3">
                {content.process.map((step, index) => (
                  <li key={step.title} className="border-t-2 border-primary pt-5">
                    <span className="studio-display text-[1.8rem] text-primary">0{index + 1}</span>
                    <h3 className="studio-display mt-4 text-[1.45rem]">{step.title}</h3>
                    <p className="mt-3 text-[1rem] leading-relaxed text-muted-foreground">{step.body}</p>
                  </li>
                ))}
              </ol>
            </Container>
          </section>
        </StudioReveal>

        <StudioReveal>
          <section className="studio-section">
            <Container>
              <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
                <div className="lg:col-span-7">
                   <Eyebrow>Related services</Eyebrow>
                  <SectionTitle>{content.connectedTitle}</SectionTitle>
                  <p className="mt-6 max-w-3xl text-[1.08rem] leading-relaxed text-muted-foreground">{content.connectedBody}</p>
                </div>
                <nav aria-label="Related services" className="divide-y divide-border border-y border-border lg:col-span-5">
                  {content.connectedLinks.map((item) => (
                    <Link key={item.to} to={item.to} className="flex min-h-14 items-center justify-between py-3 text-[1rem] font-medium hover:text-primary">
                      {item.label} <ArrowRight size={15} />
                    </Link>
                  ))}
                </nav>
              </div>
            </Container>
          </section>
        </StudioReveal>

        <StudioReveal>
          <section className="studio-section bg-[hsl(var(--surface))]">
            <Container>
               <Eyebrow>Common questions</Eyebrow>
               <SectionTitle>What you may want to know before we talk.</SectionTitle>
              <Accordion type="single" collapsible className="mt-10 max-w-4xl">
                {content.faqs.map((item, index) => (
                  <AccordionItem key={item.q} value={`service-${index}`}>
                    <AccordionTrigger className="studio-display py-6 text-left text-[1.1rem] hover:no-underline">{item.q}</AccordionTrigger>
                    <AccordionContent className="pb-6 text-[1rem] leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Container>
          </section>
        </StudioReveal>

        <section className="service-final studio-band studio-section">
          <Container>
            <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <Eyebrow style={{ color: "hsl(var(--band-text) / 0.72)" }}>Start a project</Eyebrow>
                <h2 className="studio-display mt-4 text-balance text-[2.7rem] leading-[1.04] md:text-[4.5rem]">{content.finalTitle}</h2>
                <p className="mt-6 max-w-2xl text-[1.08rem] leading-relaxed text-muted-foreground">{content.finalBody}</p>
              </div>
              <div className="lg:col-span-4 lg:text-right">
                <Link to={`/?intent=${content.intent}#contact`} className="studio-btn studio-btn-primary">
                  {content.primaryCta} <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <StudioFooter />
    </div>
  );
}

function mediaBandTitle(tone: ServicePageContent["tone"]): string {
  if (tone === "brand") return "Keep the brand recognizable wherever people meet it.";
  if (tone === "marketing") return "Make the message, landing page, and follow-up feel like one conversation.";
  if (tone === "systems") return "Spend less time chasing information across separate tools.";
  return "Give every visitor a clear experience, on every screen.";
}

function categoryForTone(tone: ServicePageContent["tone"]): StudioCategoryId {
  if (tone === "brand") return "brand-creative";
  if (tone === "marketing") return "marketing-growth";
  if (tone === "systems") return "ai-systems";
  return "websites-apps";
}
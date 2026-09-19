import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { PublishingVisual } from "@/components/marketing/studio/PublishingVisual";
import { StudioReveal } from "@/components/marketing/studio/StudioReveal";
import { Container, Eyebrow, Lede, SectionTitle } from "@/components/marketing/studio/primitives";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const BOOKS = [
  "Manuscript production and content cleanup support",
  "Print and eBook layout and formatting",
  "Cover and launch creative",
  "Metadata, descriptions, and listing assets",
  "Platform and store submission support",
  "Author or book landing page",
  "Email and social launch materials",
];

const APPS = [
  "Launch-readiness review and QA coordination",
  "App icon, screenshots, preview graphics, and listing creative",
  "Store descriptions, release notes, and positioning",
  "Privacy, support, and marketing pages when required",
  "App Store and Google Play submission support",
  "Launch landing page, waitlist, email, and social assets",
  "Release and update support when scoped",
];

const PROCESS = [
  { n: "1", title: "Prepare", body: "Confirm the format, audience, source material, required accounts, and what must be ready for release." },
  { n: "2", title: "Package", body: "Design and format the release, then create the listing, store, and marketing assets." },
  { n: "3", title: "Publish", body: "Prepare and support submission to the agreed platforms, with fewer loose ends at review." },
  { n: "4", title: "Launch", body: "Give the release a clear path through a landing page, email, social campaign, or other agreed support." },
];

const INCLUDED = [
  "Strategy & release planning",
  "Formatting & production design",
  "Cover, identity & store creative",
  "Website or landing page",
  "Listing copy & metadata support",
  "App polish & QA",
  "Submission support",
  "Launch campaign creative",
  "Email, social & advertising assets",
  "Ongoing release support",
];

const DISCIPLINES = [
  { title: "Design", body: "Covers, identity, layouts, screenshots, and campaign creative." },
  { title: "Build", body: "Author sites, landing pages, apps, and digital experiences." },
  { title: "Grow", body: "Positioning, launch campaigns, email, social, and audience paths." },
  { title: "Connect", body: "Workflows, forms, data, automation, and release operations." },
];

const FAQS = [
  { q: "Can you publish a book I’ve already written?", a: "Yes. We can start with an existing manuscript and scope the production, formatting, presentation, submission support, and launch materials it still needs." },
  { q: "Can you help if the app already exists?", a: "Yes. The work can begin with a working build and focus on launch readiness, store assets, listing copy, required support pages, submission coordination, and launch marketing." },
  { q: "Do you guarantee store or platform approval?", a: "No. Supreme Team Media can prepare and support a submission, but the platform controls its requirements, review process, and final approval." },
  { q: "Who owns publishing and store accounts?", a: "The project defines account ownership before submission. Client-controlled accounts are generally preferable when appropriate, so the creator or business retains direct control of the release." },
  { q: "Can specialist editorial, illustration, or compliance work be added?", a: "Yes. Deep editing, illustration, photography, audio, legal review, compliance work, and other specialist services can be separately scoped or coordinated when the release requires them." },
  { q: "Can publishing be combined with a website, brand, or marketing campaign?", a: "Yes. Publishing can be a focused engagement or connect to a broader identity, website, campaign, or business-systems project when that supports the release." },
];

export default function Publishing() {
  useStudioHead({
    title: "Publishing & Launch | Books, Apps & Digital Products | Supreme Team Media",
    description: "Book, app and digital-product publishing support—from production design and store-ready assets to submission support, landing pages and launch marketing.",
    path: "/publishing",
  });

  return (
    <div className="stm-studio relative min-h-screen">
      <StudioHeader />
      <main>
        <section className="overflow-hidden pb-16 pt-[112px] md:pb-24 md:pt-[140px]">
          <Container>
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-7">
                <Eyebrow>Publishing &amp; Launch</Eyebrow>
                <h1 className="studio-display mt-5 max-w-4xl text-balance text-[3rem] leading-[1.02] md:text-[4.5rem] lg:text-[5.25rem]">
                  Turn finished work into something people can buy, download, and use.
                </h1>
                <Lede>
                  Supreme Team Media helps creators and businesses move from manuscript or product build to a polished
                  release—combining production, presentation, platform-ready assets, submission support, and launch marketing.
                </Lede>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link to="/?intent=publishing#contact" className="studio-btn studio-btn-primary">
                    Discuss a publishing project <ArrowRight size={15} />
                  </Link>
                  <a href="#publishing-tracks" className="studio-btn studio-btn-outline">See what&apos;s included</a>
                </div>
              </div>
              <div className="publishing-visual-wrap mx-auto w-full max-w-[620px] lg:col-span-5" aria-hidden="true">
                <PublishingVisual />
              </div>
            </div>
          </Container>
        </section>

        <StudioReveal>
          <section className="publishing-release-visual studio-section studio-band">
            <Container>
              <Eyebrow style={{ color: "hsl(var(--band-text) / 0.72)" }}>Release path</Eyebrow>
              <SectionTitle>Prepare the work. Package the release. Publish with care. Launch with purpose.</SectionTitle>
              <div className="publishing-release-path mt-12" aria-label="Prepare, Package, Publish, Launch">
                {PROCESS.map((step, index) => <div key={step.title}><span>0{index + 1}</span><strong className="studio-display">{step.title}</strong>{index < PROCESS.length - 1 && <i aria-hidden="true">→</i>}</div>)}
              </div>
              <div className="publishing-media-strip mt-12" aria-hidden="true"><div className="release-book"><span>BOOK</span></div><div className="release-app"><span>APP</span></div><div className="release-listing"><span>LISTING</span></div><div className="release-landing"><span>LANDING PAGE</span></div></div>
            </Container>
          </section>
        </StudioReveal>

        <StudioReveal>
          <section id="publishing-tracks" className="studio-section border-y border-border bg-[hsl(var(--surface))]">
            <Container>
              <Eyebrow>Publishing tracks</Eyebrow>
              <SectionTitle>Get the format-specific details right.</SectionTitle>
              <div className="mt-14 grid gap-8 lg:grid-cols-2">
                <Track title="Books & publications" headline="From manuscript to release-ready package." items={BOOKS}>
                  Specialist services such as deep editing, illustration, photography, or audio can be scoped separately.
                </Track>
                <Track title="Apps & digital products" headline="From working build to store-ready launch." items={APPS}>
                  Platform accounts, fees, requirements, and final approval remain controlled by the platform and account owner.
                </Track>
              </div>
              <div className="mt-6 border-t border-border pt-7">
                <p className="studio-label">Digital publications &amp; other releases</p>
                <p className="mt-3 max-w-3xl text-[1rem] leading-relaxed text-muted-foreground">
                  Guides, reports, workbooks, downloadable products, interactive publications, and other digital releases
                   can be packaged, listed, and launched with the same attention to detail.
                </p>
              </div>
            </Container>
          </section>
        </StudioReveal>

        <StudioReveal>
          <section className="studio-section">
            <Container>
              <Eyebrow>Process</Eyebrow>
              <SectionTitle>Prepare. Package. Publish. Launch.</SectionTitle>
              <ol className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                {PROCESS.map((step) => (
                  <li key={step.n} className="border-t border-border pt-5">
                    <span className="studio-display text-[1.8rem] text-[hsl(var(--cobalt))]">{step.n}</span>
                    <h3 className="studio-display mt-2 text-[1.1rem]">{step.title}</h3>
                    <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{step.body}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-8 max-w-2xl text-[0.9rem] text-muted-foreground">
                Timing depends on the format, source materials, platform requirements, review cycles, and agreed scope.
              </p>
            </Container>
          </section>
        </StudioReveal>

        <StudioReveal>
          <section className="studio-section bg-[hsl(var(--cobalt-pale))]">
            <Container>
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
                <div className="lg:col-span-5">
                  <Eyebrow>What can be included</Eyebrow>
                   <SectionTitle>Bring in the support your release actually needs.</SectionTitle>
                  <p className="mt-5 text-[1rem] leading-relaxed text-muted-foreground">
                    A book, app, or digital release can be a focused engagement or connect to a broader brand, website,
                    marketing, or systems project.
                  </p>
                </div>
                <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:col-span-7">
                  {INCLUDED.map((item) => (
                    <li key={item} className="flex gap-3 border-t border-[hsl(var(--cobalt)/0.2)] pt-4 text-[0.95rem]">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-[hsl(var(--cobalt))]" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Container>
          </section>
        </StudioReveal>

        <StudioReveal>
          <section className="studio-band studio-section">
            <Container>
               <Eyebrow style={{ color: "hsl(var(--band-text) / 0.72)" }}>One coordinated release</Eyebrow>
              <h2 className="studio-display mt-4 max-w-4xl text-balance text-[2rem] md:text-[3rem]">
                 The product, presentation, submission, and launch should support one another.
              </h2>
              <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
                {DISCIPLINES.map((item) => (
                  <div key={item.title} className="border-t border-[hsl(var(--band-text)/0.2)] pt-5">
                    <h3 className="studio-display text-[1.2rem]">{item.title}</h3>
                    <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>
                ))}
              </div>
            </Container>
          </section>
        </StudioReveal>

        <StudioReveal>
          <section className="studio-section">
            <Container>
               <Eyebrow>Common questions</Eyebrow>
               <SectionTitle>What to know before we prepare your release.</SectionTitle>
              <Accordion type="single" collapsible className="mt-10 max-w-3xl">
                {FAQS.map((item, index) => (
                  <AccordionItem key={item.q} value={`publishing-${index}`} className="border-border">
                    <AccordionTrigger className="studio-display py-5 text-left text-[1.02rem] hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-[0.98rem] leading-relaxed text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Container>
          </section>
        </StudioReveal>

        <StudioReveal>
          <section className="studio-section border-t border-border bg-[hsl(var(--surface))]">
            <Container>
               <Eyebrow>Talk about your release</Eyebrow>
               <SectionTitle>What are you ready to bring to market?</SectionTitle>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {["Book or publication", "App or digital product", "Something else"].map((label) => (
                  <Link key={label} to="/?intent=publishing#contact" className="studio-btn studio-btn-outline">
                    {label} <ArrowRight size={15} />
                  </Link>
                ))}
              </div>
            </Container>
          </section>
        </StudioReveal>
      </main>
      <StudioFooter />
    </div>
  );
}

function Track({ title, headline, items, children }: { title: string; headline: string; items: string[]; children: string }) {
  return (
    <article className="border-t-2 border-[hsl(var(--cobalt))] pt-6">
      <p className="studio-label">{title}</p>
      <h3 className="studio-display mt-3 text-[1.35rem] leading-snug md:text-[1.55rem]">{headline}</h3>
      <ul className="mt-6 space-y-3 text-[0.95rem] text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <Check className="mt-1 h-4 w-4 shrink-0 text-[hsl(var(--cobalt))]" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 border-t border-border pt-5 text-[0.86rem] leading-relaxed text-muted-foreground">{children}</p>
    </article>
  );
}
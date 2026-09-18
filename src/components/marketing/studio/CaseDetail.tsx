import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import { getStudioMedia } from "@/config/studioMedia";
import { STUDIO_CATEGORY_LABEL, type StudioProject } from "@/content/studioProjects";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { requestServiceIntent, type ServiceId } from "./serviceIntent";
import { BrowserFrame } from "./BrowserFrame";
import { Container } from "./primitives";

const TONE_CLASS: Record<string, string> = {
  lilac: "plate-tone-lilac",
  sand: "plate-tone-sand",
  green: "plate-tone-green",
  paper: "plate-tone-paper",
};

export function CaseDetail({ project }: { project: StudioProject }) {
  const media = getStudioMedia(project.mediaKey);
  const src = project.imageUrl || media?.src || null;
  const tags = project.categories.map((category) => STUDIO_CATEGORY_LABEL[category] ?? category);
  const { projects } = useStudioProjects();
  const currentIndex = projects.findIndex((item) => item.slug === project.slug);
  const nextProject = currentIndex >= 0 && projects.length > 1 ? projects[(currentIndex + 1) % projects.length] : null;
  const nextMedia = nextProject ? getStudioMedia(nextProject.mediaKey) : null;
  const nextSrc = nextProject?.imageUrl || nextMedia?.src || null;
  const scope = project.work?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];

  return (
    <article className="case-study pb-24">
      <section className={`case-hero ${TONE_CLASS[project.plateTone] ?? "plate-tone-paper"}`}>
        <Container>
          <div className="case-hero-copy pt-12 md:pt-20">
            <div className="flex flex-wrap items-center gap-3">
              <span className="studio-eyebrow">{project.classification}</span>
              {project.statusNote && <span className="case-status">Live</span>}
            </div>
            <h1 className="studio-display mt-6 max-w-5xl text-balance">{project.title}</h1>
            {project.summary && <p className="case-summary mt-7 max-w-3xl">{project.summary}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              {project.externalUrl && (
                <a href={project.externalUrl} target="_blank" rel="noreferrer" className="studio-btn studio-btn-primary">
                  Visit live site <ExternalLink size={16} />
                </a>
              )}
              <Link to="/#contact" onClick={() => requestServiceIntent(project.categories[0] as ServiceId)} className="studio-btn studio-btn-outline">
                Discuss a project
              </Link>
            </div>
          </div>

          <div className="case-hero-media mt-12 md:mt-16">
            {src ? (
              <BrowserFrame>
                <img src={src} alt={media?.alt || project.title} width={media?.width} height={media?.height} className="size-full" style={{ objectFit: media?.objectFit ?? "cover", objectPosition: media?.objectPosition ?? "top center" }} />
              </BrowserFrame>
            ) : (
              <div className="studio-plate-face"><span className="studio-display text-4xl">{project.title}</span></div>
            )}
          </div>
        </Container>
      </section>

      <Container>
        <dl className="case-facts">
          <Fact term="Role" desc={project.role || "—"} />
          <Fact term="Disciplines" desc={tags.join(" · ")} />
          <Fact term="Status" desc={project.statusNote || "—"} />
          <Fact term="Live site" desc={project.externalUrl ? "Available" : "—"} />
        </dl>
      </Container>

      {project.brief && (
        <section className="studio-section">
          <Container>
            <p className="studio-eyebrow">The brief</p>
            <blockquote className="case-brief studio-display mt-7 max-w-5xl">{project.brief}</blockquote>
          </Container>
        </section>
      )}

      {(project.role || project.work) && (
        <section className="studio-section bg-[hsl(var(--surface))]">
          <Container>
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
              <div className="lg:col-span-5">
                <p className="studio-eyebrow">What I handled</p>
                <h2 className="studio-display mt-5 text-balance">Strategy through implementation.</h2>
                {project.role && <p className="mt-7 text-[1.15rem] leading-relaxed text-muted-foreground">{project.role}</p>}
              </div>
              <div className="lg:col-span-7">
                {project.work && <p className="text-[1.15rem] leading-relaxed">{project.work}</p>}
                {scope.length > 1 && <ul className="case-scope-list mt-8">{scope.map((item) => <li key={item}>{item}</li>)}</ul>}
              </div>
            </div>
          </Container>
        </section>
      )}

      {src && (
        <section className="studio-section case-visual-study">
          <Container>
            <p className="studio-eyebrow">Visual study</p>
            <h2 className="studio-display mt-5 max-w-4xl text-balance">One real experience, viewed at different scales.</h2>
            <div className="case-study-wide case-scroll-study mt-12">
              <BrowserFrame><img src={src} alt={`${project.title} full website view`} className="size-full" style={{ objectFit: "cover", objectPosition: "top center" }} /></BrowserFrame>
            </div>
            <div className="case-device-study mt-8">
              <BrowserFrame className="case-desktop-crop"><img src={src} alt="" className="size-full" style={{ objectFit: "cover", objectPosition: "center 24%" }} /></BrowserFrame>
              <div className="case-phone-frame" aria-hidden="true"><img src={src} alt="" className="size-full" style={{ objectFit: "cover", objectPosition: "center top" }} /></div>
            </div>
            {media?.disclosure && <p className="mt-4 text-[0.9rem] text-muted-foreground">{media.disclosure}</p>}
          </Container>
        </section>
      )}

      {project.demonstrates && (
        <section className="studio-band studio-section">
          <Container>
            <p className="studio-eyebrow text-[hsl(var(--band-text)/0.72)]">What this demonstrates</p>
            <p className="case-demonstrates studio-display mt-7 max-w-5xl text-balance">{project.demonstrates}</p>
          </Container>
        </section>
      )}

      <section className="studio-section">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="studio-eyebrow">Current status</p>
              <p className="mt-5 text-[1.1rem] leading-relaxed text-muted-foreground">{project.statusNote || "Status not listed."}</p>
              {project.externalUrl && <a href={project.externalUrl} target="_blank" rel="noreferrer" className="studio-btn studio-btn-primary mt-7">Visit site <ExternalLink size={16} /></a>}
            </div>
            {nextProject && (
              <Link to={`/work/${nextProject.slug}`} className="case-next group lg:col-span-7">
                <div className="case-next-media">
                  {nextSrc ? <img src={nextSrc} alt={nextMedia?.alt || nextProject.title} className="size-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]" /> : <div className={`size-full ${TONE_CLASS[nextProject.plateTone]}`} />}
                </div>
                <div className="flex items-end justify-between gap-6 p-6 md:p-8">
                  <div><span className="studio-eyebrow">Next project</span><h2 className="studio-display mt-3 text-[1.8rem] md:text-[2.2rem]">{nextProject.title}</h2></div>
                  <ArrowRight className="shrink-0" aria-hidden />
                </div>
              </Link>
            )}
          </div>
        </Container>
      </section>
    </article>
  );
}

function Fact({ term, desc }: { term: string; desc: string }) {
  return <div><dt className="studio-label">{term}</dt><dd className="mt-2 text-[0.95rem] leading-snug">{desc}</dd></div>;
}
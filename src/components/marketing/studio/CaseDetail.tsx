import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { getStudioMedia } from "@/config/studioMedia";
import { STUDIO_CATEGORY_LABEL, type StudioProject } from "@/content/studioProjects";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { Inquiry } from "./sections/Inquiry";
import { Container } from "./primitives";

const SERVICE_LINKS: Record<string, string> = {
  "websites-apps": "/services/websites",
  "brand-creative": "/services/brand",
  "marketing-growth": "/services/marketing",
  "ai-systems": "/services/ai-systems",
};

export function CaseDetail({ project, backTo }: { project: StudioProject; backTo: string }) {
  const media = getStudioMedia(project.mediaKey);
  const image = project.imageUrl || media?.src;
  const { projects } = useStudioProjects();
  const index = projects.findIndex(item => item.slug === project.slug);
  const next = index >= 0 && projects.length > 1 ? projects[(index + 1) % projects.length] : null;

  return <article className="case-editorial">
    <section className="case-opening">
      <Container>
        <Link to={backTo} className="case-back"><ArrowLeft size={18} aria-hidden /> Back to work</Link>
        <span className="home-eyebrow">{project.classification}</span>
        <h1 className="home-section-title">{project.title}</h1>
        {project.summary && <p className="case-intro">{project.summary}</p>}
        {image && <figure className="case-lead"><img src={image} alt={media?.alt || project.title} width={media?.width} height={media?.height} /></figure>}
      </Container>
    </section>
    {(project.brief || project.role) && <section className="case-brief-role"><Container className="case-two-col">
      {project.brief && <div><span className="home-eyebrow">The brief</span><h2 className="case-subtitle">What it needed.</h2><p>{project.brief}</p></div>}
      {project.role && <div><span className="home-eyebrow">Sean&apos;s role</span><h2 className="case-subtitle">What I handled.</h2><p>{project.role}</p></div>}
    </Container></section>}
    {image && <section className="case-full-media"><Container><span className="home-eyebrow">The work</span><h2 className="case-subtitle">A closer look.</h2><figure><img src={image} alt={media?.alt || project.title} width={media?.width} height={media?.height} /></figure>{media?.disclosure && <figcaption>{media.disclosure}</figcaption>}</Container></section>}
    {(project.work || project.bodyText || project.demonstrates) && <section className="case-detail-band"><Container className="case-detail-layout"><div><span className="home-eyebrow">Design &amp; delivery</span><h2 className="home-section-title">The thinking <em>behind the work.</em></h2></div><div>{project.work && <p className="case-detail-lede">{project.work}</p>}{project.bodyText && <p>{project.bodyText}</p>}{project.demonstrates && <div className="case-demonstrates-line"><span className="home-eyebrow">What this demonstrates</span><p>{project.demonstrates}</p></div>}{project.statusNote && <p className="case-status-note">{project.statusNote}</p>}{project.externalUrl && <a className="case-external" href={project.externalUrl} target="_blank" rel="noreferrer">Visit live site <ExternalLink size={17} aria-hidden /></a>}</div></Container></section>}
    <section className="case-related"><Container><span className="home-eyebrow">Related services</span><h2 className="home-section-title">Where this work <em>connects.</em></h2><div className="case-service-links">{project.categories.map(category => <Link key={category} to={SERVICE_LINKS[category] || "/services/websites"}>{STUDIO_CATEGORY_LABEL[category] ?? category}<ArrowRight size={19} aria-hidden /></Link>)}</div>{next && <Link className="case-next-link" to={`/work/${next.slug}`}><span className="home-eyebrow">Next project</span><strong>{next.title}</strong><ArrowRight size={22} aria-hidden /></Link>}</Container></section>
    <Inquiry source="work" />
  </article>;
}

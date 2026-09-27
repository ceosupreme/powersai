import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Container } from "./primitives";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { EDITORIAL_CASES } from "@/content/studioProjects";
import { getStudioMedia } from "@/config/studioMedia";
import { trackSiteEvent } from "@/lib/studioAnalytics";

export function ServiceWork({ type, order }: { type: "brand" | "marketing"; order: string[] }) {
  const { projects, isLoading, isError } = useStudioProjects();
  const selected = order.map(slug => projects.find(p => p.slug === slug)).filter(p => p !== undefined);
  return <section className="svc-work svc-band-dark" aria-labelledby={`${type}-work-title`}><Container>
    <div className="svc-section-head"><span className="home-eyebrow">0{type === "brand" ? "4" : "5"} / Actual work</span><h2 id={`${type}-work-title`} className="home-section-title">Different businesses.<br/><em>Distinct expressions.</em></h2><p>Work shaped around each business’s audience and purpose.</p></div>
    {isLoading ? <p role="status">Loading work…</p> : isError ? <p role="status">Work could not be loaded. <Link to="/work">Browse all work</Link>.</p> : <div className="svc-work-grid">{selected.map((project, i) => {
      const media = getStudioMedia(project.mediaKey);
      const image = project.imageUrl || media?.src;
      const editorial = EDITORIAL_CASES.find(item => item.slug === project.slug);
      return <article className={`svc-work-item svc-work-item-${i + 1}`} key={project.slug}><Link to={`/work/${project.slug}`} aria-label={`View ${project.title}`} onClick={() => trackSiteEvent({ event_type: "cta_click", label: `${type}_work_${project.slug.replace(/-/g, "_")}` })} className="svc-work-image">{image ? <img src={image} alt={media?.alt ?? project.title} loading="lazy"/> : <span>{project.title}</span>}</Link><div className="svc-work-caption"><div><span>{project.classification}</span><h3>{project.title.split(" — ")[0]}</h3><p>{project.role || editorial?.role || project.summary}</p></div><Link to={`/work/${project.slug}`} aria-label={`Open ${project.title} case study`}><ArrowUpRight aria-hidden/></Link></div></article>;
    })}</div>}
  </Container></section>;
}

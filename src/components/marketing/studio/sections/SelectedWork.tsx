import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Container } from "../primitives";
import { getStudioMedia } from "@/config/studioMedia";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { trackSiteEvent } from "@/lib/studioAnalytics";

const ORDER = ["barpulse", "big-paws-club", "supreme-wellness-club"];

export function SelectedWork() {
  const { projects, isLoading, isError } = useStudioProjects();
  const shown = ORDER.map((slug) => projects.find((project) => project.slug === slug)).filter((p) => p !== undefined);

  return (
    <section id="work" className="home-work" aria-labelledby="home-work-title">
      <span id="proof" aria-hidden className="block h-0" />
      <Container>
        <div className="home-work-head">
          <div><span className="home-eyebrow">04 / Selected work</span><h2 id="home-work-title" className="home-section-title">The work speaks<br /><em>for itself.</em></h2></div>
          <p>From the systems behind a business to the experience customers see first.</p>
        </div>
        {isLoading ? <p role="status" className="home-work-status">Loading work…</p> : isError ? <p role="status" className="home-work-status">Work could not be loaded right now. <Link to="/work">See all work</Link>.</p> : (
          <div className="home-work-grid">
            {shown.map((project, index) => {
              const media = getStudioMedia(project.mediaKey);
              const image = project.imageUrl || media?.src;
              return <article key={project.slug} className={`home-work-project home-work-project-${index + 1}`}>
                <Link to={`/work/${project.slug}`} className="home-work-image" aria-label={`View ${project.title}`} onClick={() => trackSiteEvent({ event_type: "cta_click", label: `home_work_${project.slug.replace(/-/g, "_")}` })}>
                  {image ? <img src={image} alt={media?.alt ?? project.title} loading="lazy" /> : <span>{project.title}</span>}
                </Link>
                <div className="home-work-caption"><div><span>{project.classification}</span><h3>{project.title.split(" — ")[0]}</h3><p>{project.summary}</p></div><Link to={`/work/${project.slug}`} aria-label={`Open ${project.title} case study`} onClick={() => trackSiteEvent({ event_type: "cta_click", label: `home_work_${project.slug.replace(/-/g, "_")}` })}><ArrowUpRight aria-hidden /></Link></div>
              </article>;
            })}
          </div>
        )}
        <Link to="/work" className="home-work-all" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "see_all_work" })}>See all work <ArrowUpRight size={18} aria-hidden /></Link>
      </Container>
    </section>
  );
}
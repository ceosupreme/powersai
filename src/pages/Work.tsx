import { useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Container } from "@/components/marketing/studio/primitives";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { ROUTE_META } from "@/config/routeMeta";
import { getStudioMedia } from "@/config/studioMedia";
import { STUDIO_CATEGORIES, STUDIO_CATEGORY_LABEL, type StudioCategoryId } from "@/content/studioProjects";
import { trackStudioEvent } from "@/lib/studioAnalytics";
import { CONTACT_EMAIL } from "@/lib/siteContact";

const services = [
  { label: "Websites", to: "/services/websites" }, { label: "Brand", to: "/services/brand" },
  { label: "Marketing", to: "/services/marketing" }, { label: "Systems", to: "/services/ai-systems" },
  { label: "Publishing", to: "/publishing" },
];

export default function Work() {
  const { projects, isLoading, isError, isEmpty } = useStudioProjects();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const raw = params.get("type") ?? params.get("category") ?? "all";
  const active = STUDIO_CATEGORIES.some(c => c.id === raw) ? raw as StudioCategoryId : "all";
  const { available, counts, visible } = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach(p => p.categories.forEach(c => { counts[c] = (counts[c] ?? 0) + 1; }));
    return {
      available: STUDIO_CATEGORIES.filter(c => (counts[c.id] ?? 0) > 0),
      counts,
      visible: active === "all" ? projects : projects.filter(p => p.categories.includes(active)),
    };
  }, [projects, active]);
  const activeLabel = active === "all" ? "All work" : STUDIO_CATEGORY_LABEL[active];
  useStudioHead({ title: active === "all" ? ROUTE_META["/work"].title : `${activeLabel} work | Supreme Team Media`, description: ROUTE_META["/work"].description, path: active === "all" ? "/work" : `/work?type=${active}`, canonicalPath: "/work" });
  const onChange = (next: StudioCategoryId | "all") => {
    const updated = new URLSearchParams(params);
    updated.delete("category");
    if (next === "all") updated.delete("type"); else updated.set("type", next);
    setParams(updated);
    if (next !== "all") trackStudioEvent("service_selected", { category: next });
  };
  return <div className="stm-studio curated-work-page min-h-screen"><StudioHeader/><main>
    <section className="curated-work-intro"><Container><span className="home-eyebrow">Selected work / Sean Powers</span><h1 className="home-section-title">Actual work, <em>and what I did on it.</em></h1><p>Websites, brands and systems I have designed and built.</p>
      {!isError && !isLoading && !isEmpty && <div className="curated-work-filters" role="group" aria-label="Filter projects by type"><Button variant="outline" type="button" aria-pressed={active === "all"} onClick={() => onChange("all")}>All <span>{projects.length}</span></Button>{available.map(c => <Button variant="outline" type="button" key={c.id} aria-pressed={active === c.id} onClick={() => onChange(c.id)}>{c.label} <span>{counts[c.id]}</span></Button>)}</div>}
      {!isError && !isLoading && !isEmpty && <p className="curated-work-count" role="status" aria-live="polite">{visible.length} {visible.length === 1 ? "project" : "projects"} in {activeLabel}.</p>}
    </Container></section>
    {isError ? <section className="curated-work-state"><Container><p role="status">Projects couldn&apos;t be loaded. Please refresh, or email {CONTACT_EMAIL}.</p></Container></section> : isLoading ? <section className="curated-work-state"><Container><p role="status">Loading projects…</p></Container></section> : isEmpty ? <section className="curated-work-state"><Container><p role="status">No projects are published yet.</p></Container></section> : visible.map((project,i) => {
      const media = getStudioMedia(project.mediaKey);
      const image = project.imageUrl || media?.src;
      return <section key={project.slug} className={`curated-work-feature ${i % 2 === 0 ? "curated-work-dark" : "curated-work-light"}`} aria-labelledby={`work-title-${project.slug}`}><Container className={`curated-work-layout ${i % 2 === 1 ? "curated-work-reverse" : ""}`}><div className="curated-work-copy"><span className="home-eyebrow">{String(i+1).padStart(2,"0")} / {project.classification}</span><h2 id={`work-title-${project.slug}`} className="home-section-title">{project.title.split(" — ")[0]}</h2><p className="curated-work-summary">{project.summary}</p>{project.work && <p className="curated-work-detail">{project.work}</p>}{project.role && <div className="curated-work-role"><strong>Sean&apos;s role</strong><p>{project.role}</p></div>}<Link className="home-btn-amber" to={`/work/${project.slug}`} state={{from: `${location.pathname}${location.search}`}} onClick={() => trackStudioEvent("project_opened", { id: project.slug })}>View the project <ArrowRight size={17} aria-hidden/></Link></div><Link to={`/work/${project.slug}`} state={{from: `${location.pathname}${location.search}`}} className="curated-work-art" aria-label={`View ${project.title}`}>{image ? <img src={image} alt={media?.alt ?? project.title} loading="lazy"/> : <span className="curated-work-type">{project.title.split(" — ")[0]}</span>}</Link></Container></section>;
    })}
    <section className="curated-work-services"><Container><span className="home-eyebrow">Explore the services</span><h2 className="home-section-title">What can we <em>build together?</em></h2><div className="curated-work-service-rail">{services.map(service => <Link key={service.label} to={service.to}>{service.label}<ArrowRight size={18} aria-hidden/></Link>)}</div></Container></section>
    <Inquiry />
  </main><StudioFooter/></div>;
}
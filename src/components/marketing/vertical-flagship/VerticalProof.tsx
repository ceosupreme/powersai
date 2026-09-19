import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { getStudioMedia } from "@/config/studioMedia";
import type { VerticalConfig } from "./config";

export function VerticalProof({ config, biz }: { config: VerticalConfig; biz?: string | null }) {
  const { projects } = useStudioProjects();
  const selected = config.proofSlugs.map((slug) => projects.find((project) => project.slug === slug)).filter(Boolean);
  const bizQuery = biz ? `&biz=${encodeURIComponent(biz)}` : "";
  return <section className="vertical-proof studio-section"><div className="studio-container"><p className="studio-eyebrow">Capability you can inspect now</p><div className="vertical-section-heading"><h2 className="studio-display">Real work. Transferable capability.</h2><p>These examples show the kind of brand, web, marketing, and systems execution STM already delivers. Your {config.name.toLowerCase()} implementation is scoped around your business.</p></div><div className="vertical-proof-grid">{selected.map((project) => { if (!project) return null; const media = getStudioMedia(project.mediaKey); const src = project.imageUrl || media?.src; return <article key={project.slug}>{src && <Link to={`/work/${project.slug}`} className="vertical-proof-media"><img src={src} alt={media?.alt || project.title} loading="lazy" /></Link>}<p>{project.classification}</p><h3>{project.title}</h3><Link to={`/work/${project.slug}`}>See how we solved it <ArrowRight aria-hidden size={15}/></Link></article>; })}</div><div className="vertical-audit-proof"><div><span className="studio-eyebrow">Interactive proof</span><h3>The free business checkup is live now.</h3><p>Use the public diagnostic to identify where brand, demand, conversion, retention, or systems may deserve attention.</p></div><Link className="studio-btn studio-btn-outline" to={`/free-audit?src=for-${config.slug}${bizQuery}`}>Try the free checkup</Link></div></div></section>;
}
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Mail } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Container } from "@/components/marketing/studio/primitives";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { STUDIO_RESUME, RESUME_REQUEST_MAILTO } from "@/config/studioResume";
import { trackStudioEvent } from "@/lib/studioAnalytics";
import { getStudioMedia } from "@/config/studioMedia";
import { CONTACT_EMAIL } from "@/lib/siteContact";
import { ROUTE_META } from "@/config/routeMeta";

const LINKEDIN = "https://www.linkedin.com/in/supremepowers";
const EVIDENCE_SLUGS = ["barpulse", "big-paws-club", "kario-voss"];
const EXPERIENCE = [
  { label: "Creative & brand", body: "Brand direction, graphic design, campaign creative and content built for businesses and for Sean's own brand work." },
  { label: "Marketing & sales", body: "Positioning, promotion, partnerships, events and audience development — including direct sales and customer-facing work in hospitality." },
  { label: "Websites & digital", body: "Responsive websites, landing pages and interface work, designed and implemented end to end." },
  { label: "Business systems & AI", body: "Discovery with owners and managers, integrations across operating tools, reporting, and AI-assisted workflows built around how a business actually runs." },
];

function ResumeLink({ primary = false }: { primary?: boolean }) {
  return STUDIO_RESUME.file ? <a className={primary ? "home-btn-amber" : "hire-text-link"} href={STUDIO_RESUME.file} download={STUDIO_RESUME.downloadName} onClick={() => trackStudioEvent("resume_download", { id: "resume_pdf" })}>{STUDIO_RESUME.label} <ArrowRight size={17} aria-hidden /></a> : <a className={primary ? "home-btn-amber" : "hire-text-link"} href={RESUME_REQUEST_MAILTO} onClick={() => trackStudioEvent("hiring_interest", { id: "resume_request" })}>Request résumé <Mail size={17} aria-hidden /></a>;
}

export default function Hire() {
  const { projects, isError, isLoading } = useStudioProjects();
  const evidence = EVIDENCE_SLUGS.map(slug => projects.find(project => project.slug === slug)).filter((project): project is NonNullable<typeof project> => Boolean(project));
  useStudioHead({ ...ROUTE_META["/hire"], path: "/hire" });

  return <div className="stm-studio hire-editorial min-h-screen"><StudioHeader /><main>
    <section className="hire-intro"><Container><span className="home-eyebrow">For employers and teams</span><h1 className="home-section-title">Sean Powers — Strategy, creative thinking, <em>and hands-on execution.</em></h1><p className="hire-lede">Founder of Supreme Team Media since 2002, with experience across marketing, sales, hospitality, websites, and AI-assisted business systems. I connect strategy with execution, take ownership of the work, and stay close enough to the business to make sound decisions quickly.</p><p>For employers and teams considering Sean for an individual role, contract, or embedded project.</p><div className="hire-actions"><ResumeLink primary /><a className="hire-text-link" href="#contact" onClick={() => trackStudioEvent("hiring_interest", { id: "discuss_role" })}>Discuss a role or contract <ArrowRight size={17} aria-hidden /></a></div></Container></section>
    <section className="hire-evidence"><Container><span className="home-eyebrow">Selected work</span><h2 className="home-section-title">Real projects. <em>Clear responsibilities.</em></h2>{isError ? <p role="status">Projects couldn&apos;t be loaded right now.</p> : isLoading ? <p role="status">Loading projects…</p> : <div className="hire-projects">{evidence.map(project => { const media = getStudioMedia(project.mediaKey); const image = project.imageUrl || media?.src; return <Link to={`/work/${project.slug}`} key={project.slug} className="hire-project"><div className="hire-project-image">{image ? <img src={image} alt={media?.alt || project.title} loading="lazy" /> : <span>{project.title.split(" — ")[0]}</span>}</div><div className="hire-project-copy"><span className="home-eyebrow">{project.classification}</span><h3>{project.title}</h3>{project.role && <p>{project.role}</p>}<span className="hire-project-link">View project <ArrowRight size={17} aria-hidden /></span></div></Link>; })}</div>}</Container></section>
    <section className="hire-capabilities"><Container><span className="home-eyebrow">Experience</span><h2 className="home-section-title">What I can help <em>a team do.</em></h2><div className="hire-capability-list">{EXPERIENCE.map(item => <div key={item.label}><h3>{item.label}</h3><p>{item.body}</p></div>)}</div><div className="hire-background"><span className="home-eyebrow">Background</span><dl><div><dt>Education</dt><dd>Bachelor&apos;s degree in Advertising — The Art Institute of California.</dd></div><div><dt>Company</dt><dd>Supreme Team Media, founded 2002. Based in San Diego; available for remote work.</dd></div><div><dt>Ways to work together</dt><dd>An individual role, a contract engagement, or an embedded project alongside an existing team. This is Sean&apos;s direct professional introduction for a role—not an agency pitch.</dd></div></dl></div></Container></section>
    <section className="hire-contact-links"><Container><span className="home-eyebrow">Get in touch</span><h2 className="home-section-title">Considering Sean <em>for a role?</em></h2><div className="hire-contact-row"><ResumeLink /><a className="hire-text-link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL} <Mail size={17} aria-hidden /></a><a className="hire-text-link" href={LINKEDIN} target="_blank" rel="noreferrer">LinkedIn profile <ExternalLink size={17} aria-hidden /></a></div></Container></section>
    <Inquiry source="hire" />
  </main><StudioFooter /></div>;
}

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Container } from "@/components/marketing/studio/primitives";
import { OfferSection } from "@/components/marketing/offer/OfferSection";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { getStudioMedia } from "@/config/studioMedia";
import { trackSiteEvent } from "@/lib/studioAnalytics";

const workOrder = ["allmighty-supreme", "coastal-beauties", "kario-voss"];
const steps = ["Service page", "Request service", "What happens next"];
const process = [
  { title: "Copy & direction", body: "We clarify the offer and write the pages around what customers need to know." },
  { title: "Design & build", body: "A mobile-first experience with a clear inquiry path, built for the agreed scope." },
  { title: "Review & launch", body: "One round of revisions, launch on your domain, handover, then 30 days of fixes." },
];
const questions = [
  { q: "What is included with a Launch Site?", a: "Up to eight pages, mobile-first design, an inquiry form with an instant confirmation to the visitor and an alert to the owner, your Google listing and contact details on every page, page titles and structured data, one round of revisions, launch on your domain and 30 days of fixes." },
  { q: "How does the $0-down option work?", a: "It is a 12-month payment plan for the build at $297 a month. After the first 12 months, it becomes $149 a month. If you stop early, the remaining balance of the $2,500 build price is due before handover." },
  { q: "Who owns the site?", a: "The one-time Launch Site is yours at launch. You own the site, domain, content and customer list in writing. On leaving, you get the files and every login. Our hosting, automations and updates stop unless you keep Care." },
  { q: "What does Care cover?", a: "Care is month to month. Its exact support responsibilities are agreed in writing before you start." },
  { q: "What does the Business Site add?", a: "The Business Site includes follow-up sequences, reminders, review requests and a monthly owner report. The exact scope is confirmed in your quote." },
];

function WebsiteWalkthrough() {
  const [active, setActive] = useState(0);
  return <section className="websites-flow" aria-labelledby="websites-flow-title"><Container>
    <div className="websites-flow-head"><span className="home-eyebrow">02 / From visitor to owner</span><h2 id="websites-flow-title" className="home-section-title">The click is only<br /><em>the beginning.</em></h2><p>See how an inquiry moves from a customer’s screen to the business. Select a step to follow it through.</p></div>
    <div className="websites-flow-tabs" role="tablist" aria-label="Website inquiry steps">{steps.map((step, i) => <Button key={step} id={`websites-tab-${i}`} role="tab" aria-selected={active === i} aria-controls="websites-flow-panel" type="button" variant="ghost" onClick={() => setActive(i)} className={active === i ? "is-active" : ""}><span>0{i + 1}</span>{step}</Button>)}</div>
    <div id="websites-flow-panel" role="tabpanel" aria-labelledby={`websites-tab-${active}`} className="websites-flow-stage" key={active}>
      {active === 0 && <div className="websites-demo-browser"><div className="websites-demo-chrome"><i/><i/><i/><span>northcountyhomeservices.com</span></div><div className="websites-demo-service"><div className="websites-demo-nav"><strong>North County Home Services</strong><span>Services &nbsp; About &nbsp; Contact</span></div><div className="websites-demo-body"><span className="home-eyebrow">Service in your neighborhood</span><h3>Help when your home needs it.</h3><p>Find the right service, tell us what is happening, and send your request in a few steps.</p><span className="websites-demo-action">Request service <ArrowRight size={15} aria-hidden /></span></div><div className="websites-demo-bottom"><span>Services</span><span>Our approach</span><span>Get in touch</span></div></div></div>}
      {active === 1 && <div className="websites-phone-wrap"><div className="websites-demo-phone"><div className="websites-phone-top"/><div className="websites-phone-content"><strong>North County Home Services</strong><span className="home-eyebrow">Request service</span><h3>Tell us what you need.</h3><p>A short form makes the next step clear.</p><label>Your name <span>Alex Rivera</span></label><label>Email <span>alex@example.com</span></label><label>What can we help with? <span>Tell us about the project…</span></label><div className="websites-demo-action">Send request <ArrowRight size={15} aria-hidden /></div></div></div><p className="websites-phone-note">The visitor sends the request from their phone. No account or app needed.</p></div>}
      {active === 2 && <div className="websites-email-grid"><article className="websites-email"><div className="websites-email-icon"><Mail size={20} aria-hidden /></div><span className="home-eyebrow">What the visitor receives</span><div className="websites-email-header"><span>From</span> North County Home Services &lt;hello@northcountyhomeservices.com&gt;<br/><span>Subject</span> We got your request</div><pre>{"Hi Alex,\n\nThanks for reaching out to North County Home Services. Your request landed and it is in front of us now.\n\nHere is what happens next: we will look at what you sent and reply by email within one business day with a clear next step — what we recommend, what it would involve, and when we could come out.\n\nOne more thing. This email went out the moment your form came in.\n\nNorth County Home Services\nhello@northcountyhomeservices.com"}</pre></article><article className="websites-email"><div className="websites-email-icon"><Mail size={20} aria-hidden /></div><span className="home-eyebrow">What you receive</span><div className="websites-email-header"><span>Subject</span> New website inquiry — Alex Rivera</div><pre>{"New inquiry from your website.\n\nName: Alex Rivera\nEmail: alex@example.com\nChannel: form\n\nProject note:\nI need help with my website.\n\nOpen the inbox: [private inbox link]"}</pre><p>The owner receives the inquiry details and a link to the private inbox.</p></article></div>}
    </div>
  </Container></section>;
}

function WebsiteWork() {
  const { projects, isLoading, isError } = useStudioProjects();
  const selected = workOrder.map(slug => projects.find(project => project.slug === slug)).filter(p => p !== undefined);
  return <section className="websites-work home-work" aria-labelledby="websites-work-title"><Container>
    <div className="home-work-head"><div><span className="home-eyebrow">04 / Actual work</span><h2 id="websites-work-title" className="home-section-title">Made to be seen.<br/><em>Built to be used.</em></h2></div><p>Three different websites, each shaped around its own audience and purpose.</p></div>
    {isLoading ? <p className="home-work-status" role="status">Loading work…</p> : isError ? <p className="home-work-status" role="status">Work could not be loaded. <Link to="/work">Browse all work</Link>.</p> : <div className="home-work-grid">{selected.map((project, index) => { const media = getStudioMedia(project.mediaKey); const image = project.imageUrl || media?.src; const label = `website_work_${project.slug.replace(/-/g, "_")}`; return <article key={project.slug} className={`home-work-project home-work-project-${index + 1}`}><Link to={`/work/${project.slug}`} className="home-work-image" onClick={() => trackSiteEvent({ event_type: "cta_click", label })} aria-label={`View ${project.title}`}>{image ? <img src={image} alt={media?.alt ?? project.title} loading="lazy"/> : <span>{project.title}</span>}</Link><div className="websites-work-detail" aria-hidden>{image && <img src={image} alt="" loading="lazy"/>}</div><div className="home-work-caption"><div><span>{project.classification}</span><h3>{project.title.split(" — ")[0]}</h3><p>{project.summary}</p></div><Link to={`/work/${project.slug}`} aria-label={`Open ${project.title} case study`} onClick={() => trackSiteEvent({ event_type: "cta_click", label })}><ArrowUpRight aria-hidden/></Link></div></article>; })}</div>}
  </Container></section>;
}

export default function WebsiteServices() {
  const { hash } = useLocation();
  const art = getStudioMedia("service-websites-hero");
  useStudioHead({ title: "Websites That Make the Next Step Easy | Supreme Team Media", description: "A website built for your business, with clear inquiry paths. Compare Launch Site, Business Site, Care and custom options.", path: "/services/websites" });
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    let active = true;
    const align = () => { if (active && Math.abs(el.getBoundingClientRect().top) > 90) el.scrollIntoView({ block: "start", behavior: "instant" }); };
    const frame = requestAnimationFrame(align);
    const observer = new ResizeObserver(align);
    const main = document.querySelector("main");
    if (main) observer.observe(main);
    const done = window.setTimeout(() => { active = false; observer.disconnect(); }, 4000);
    const cancel = () => { active = false; observer.disconnect(); };
    window.addEventListener("wheel", cancel, { once: true, passive: true });
    window.addEventListener("touchstart", cancel, { once: true, passive: true });
    return () => { cancel(); cancelAnimationFrame(frame); clearTimeout(done); window.removeEventListener("wheel", cancel); window.removeEventListener("touchstart", cancel); };
  }, [hash]);
  return <div className="stm-studio websites-page relative min-h-screen"><StudioHeader/><main>
    <section className="websites-hero" aria-labelledby="websites-title"><Container className="websites-hero-layout"><div className="websites-hero-copy"><span className="home-eyebrow">01 / Websites & digital products</span><h1 id="websites-title">Look the part.<br/><em>Make the next<br/>step easy.</em></h1><p>A website built for your business that answers every inquiry in seconds, alerts you, and gives you a clear next step. $2,500, or $0 down at $297 a month.</p><div className="websites-hero-actions"><a href="#website-options" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "website_options" })} className="home-btn-amber">See website options <ArrowRight size={16} aria-hidden/></a><a href="#contact" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "talk_website" })} className="home-btn-ghost">Talk about your website <ArrowRight size={16} aria-hidden/></a></div></div>{art?.src && <div className="websites-hero-art"><img src={art.src} alt={art.alt} width={art.width} height={art.height} fetchPriority="high"/></div>}</Container></section>
    <WebsiteWalkthrough/>
    <OfferSection source="services-websites"/>
    <WebsiteWork/>
    <section className="websites-process" aria-labelledby="websites-process-title"><Container><span className="home-eyebrow">05 / From first draft to handover</span><h2 id="websites-process-title" className="home-section-title">Clear work.<br/><em>Clear ownership.</em></h2><ol className="websites-process-steps">{process.map((item, i) => <li key={item.title}><span>0{i + 1}</span><h3>{item.title}</h3><p>{item.body}</p></li>)}</ol><div className="websites-questions"><div><span className="home-eyebrow">Before we begin</span><h3>Questions worth asking.</h3></div><Accordion type="single" collapsible>{questions.map((item, i) => <AccordionItem key={item.q} value={`q-${i}`}><AccordionTrigger>{item.q}</AccordionTrigger><AccordionContent>{item.a}</AccordionContent></AccordionItem>)}</Accordion></div></Container></section>
    <Inquiry websitePage/>
  </main><StudioFooter/></div>;
}

import { Component, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, CheckCheck, Mail, MessageSquare, Monitor, MousePointer2, Smartphone } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { Testimonials } from "@/components/marketing/studio/Testimonials";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { usePublishedVerticalLanders } from "@/hooks/useVerticalLanders";
import { getStudioMedia } from "@/config/studioMedia";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { ROUTE_META } from "@/config/routeMeta";
import "@/styles/website-studio.css";

const track = (label: string) => trackSiteEvent({ event_type: "cta_click", label });
const requestPlan = (name: string, label: string) => {
  track(label);
  window.dispatchEvent(new CustomEvent("stm:contact-prefill", { detail: `I’d like to discuss ${name} for my business.` }));
};
const workOrder = ["kario-voss", "big-paws-club", "coastal-beauties"];
const industryMedia: Record<string, string> = {
  hvac: "home-industry-hvac", pizza: "home-industry-pizza", medspa: "home-industry-medspa",
};

/** Content is visible by default. Motion is a one-time enhancement, not a loading gate. */
class Reveal extends Component<{ children: ReactNode; className?: string }> {
  private node: HTMLDivElement | null = null;
  private observer?: IntersectionObserver;
  componentDidMount() {
    if (!this.node || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    this.observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { this.node?.classList.add("ws-enter"); this.observer?.disconnect(); }
    }, { threshold: 0.08 });
    this.observer.observe(this.node);
  }
  componentWillUnmount() { this.observer?.disconnect(); }
  render() { return <div ref={node => { this.node = node; }} className={this.props.className}>{this.props.children}</div>; }
}

const journey = [
  { title: "Look worth choosing", label: "First impression", body: "Show what you do, who you help, and why you’re the right fit. Give visitors a reason to stay—not another website to figure out." },
  { title: "Make reaching out easy", label: "The inquiry", body: "A clear next step and a short, phone-friendly form make it easier for someone to ask about the work they need." },
  { title: "Keep the opportunity moving", label: "The response", body: "Their request gets acknowledged. Your team gets the details. The follow-up can continue from one place while you get on with the business." },
];

class CustomerJourney extends Component<Record<string, never>, { active: number }> {
  state = { active: 0 };
  select = (active: number, focus = false) => this.setState({ active }, () => {
    if (focus) document.getElementById(`ws-step-${active}`)?.focus();
  });
  render() {
    const { active } = this.state;
    return <section className="ws-journey ws-dark" aria-labelledby="ws-journey-title">
      <div className="ws-container">
        <Reveal className="ws-section-heading"><div><span className="ws-kicker">More than a first impression</span><h2 id="ws-journey-title">Good looks open the door.<br/><span>Make the next step count.</span></h2></div><p>Your website should make it easier to get a customer—not give you more work to manage.</p></Reveal>
        <div className="ws-journey-layout">
          <div className="ws-step-list" role="tablist" aria-label="Follow the customer journey" aria-orientation="vertical" onKeyDown={event => {
            const next = event.key === "ArrowDown" || event.key === "ArrowRight" ? (active + 1) % 3 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? (active + 2) % 3 : event.key === "Home" ? 0 : event.key === "End" ? 2 : null;
            if (next !== null) { event.preventDefault(); this.select(next, true); }
          }}>
            {journey.map((step, i) => <button key={step.label} id={`ws-step-${i}`} type="button" role="tab" aria-selected={active === i} aria-controls="ws-journey-panel" tabIndex={active === i ? 0 : -1} className={active === i ? "is-active" : ""} onClick={() => this.select(i)}><span className="ws-step-number">0{i + 1}</span><span><strong>{step.title}</strong><span>{step.body}</span></span><ArrowRight aria-hidden size={20}/></button>)}
            <span className="ws-handnote">Try the steps. See what changes.</span>
          </div>
          <div id="ws-journey-panel" role="tabpanel" aria-labelledby={`ws-step-${active}`} className="ws-demo" tabIndex={0}>
            <div className="ws-demo-top"><span className="ws-browser-dots" aria-hidden><i/><i/><i/></span><span>North County Home Services</span><span>{journey[active].label}</span></div>
            <div className="ws-demo-stage" key={active}>
              {active === 0 && <div className="ws-demo-website"><span className="ws-kicker">Here when your home needs us</span><h3>Comfort at home.<br/>Help close by.</h3><p>Heating, cooling and home-service help from a local team. Tell us what you need.</p><span className="ws-demo-cta">Request service <ArrowRight size={16} aria-hidden/></span><div className="ws-demo-services"><span>Heating & cooling</span><span>Repairs</span><span>Maintenance</span></div><Monitor className="ws-demo-watermark" size={160} strokeWidth={.7} aria-hidden/></div>}
              {active === 1 && <div className="ws-demo-inquiry"><div><Smartphone size={25} aria-hidden/><span className="ws-kicker">Easy on a phone, too</span><h3>What can we<br/>help with?</h3><p>Only the details needed to start a conversation.</p></div><div className="ws-demo-form" aria-label="Illustration of a short service inquiry"><div><span>Name</span><strong>Alex Rivera</strong></div><div><span>Email</span><strong>alex@example.com</strong></div><div><span>How can we help?</span><strong>Our AC needs a check.</strong></div><span className="ws-demo-cta">Send request <ArrowRight size={16} aria-hidden/></span></div></div>}
              {active === 2 && <div className="ws-demo-response"><div className="ws-response-intro"><CheckCheck size={30} aria-hidden/><h3>The request is in.<br/>Nobody is left guessing.</h3></div><div className="ws-message"><Mail size={21} aria-hidden/><div><span>To your customer</span><strong>We received your request.</strong><p>Thanks, Alex. Our team will get back to you with the next step.</p></div><Check size={17} aria-hidden/></div><div className="ws-message"><MessageSquare size={21} aria-hidden/><div><span>To your team</span><strong>New inquiry · AC service</strong><p>Alex’s details and request, ready for someone to follow up.</p></div><Check size={17} aria-hidden/></div></div>}
            </div>
            <div className="ws-demo-bottom"><span>One connected customer experience</span><button type="button" onClick={() => this.select((active + 1) % 3)} aria-label={`Show ${journey[(active + 1) % 3].label.toLowerCase()}`}>Next step <ArrowRight size={16} aria-hidden/></button></div>
          </div>
        </div>
      </div>
    </section>;
  }
}

function WebsiteWork() {
  const { projects, isLoading, isError } = useStudioProjects();
  const selected = workOrder.map(slug => projects.find(project => project.slug === slug)).filter(project => project !== undefined);
  return <section id="website-work" className="ws-work" aria-labelledby="ws-work-title"><div className="ws-container">
    <Reveal className="ws-section-heading"><div><span className="ws-kicker">Selected work</span><h2 id="ws-work-title">Different businesses.<br/><span>Not the same website.</span></h2></div><div><p>Artist, lifestyle brand, or local business—the experience should feel like yours.</p><Link className="ws-text-link" to="/work" onClick={() => track("website_all_work")}>Explore the portfolio <ArrowUpRight size={18} aria-hidden/></Link></div></Reveal>
    {isLoading ? <p role="status">Loading selected work…</p> : isError ? <p>Selected work is temporarily unavailable. <Link to="/work">Visit the portfolio.</Link></p> : <div className="ws-work-grid">{selected.map((project, index) => {
      const media = getStudioMedia(project.mediaKey); const src = project.imageUrl || media?.src;
      return <Reveal key={project.slug} className={`ws-project ws-project-${index + 1}`}><Link to={`/work/${project.slug}`} className="ws-project-link" onClick={() => track(`website_work_${project.slug.replace(/-/g, "_")}`)}><div className="ws-project-image">{src ? <img src={src} alt={media?.alt || project.title} width={media?.width || 1920} height={media?.height || 1080} loading="lazy"/> : <span>{project.title}</span>}<span className="ws-project-arrow" aria-hidden><ArrowUpRight size={23}/></span></div><div className="ws-project-caption"><span>{project.classification}</span><h3>{project.title.split(" — ")[0]}</h3><p>{project.role}</p></div></Link></Reveal>;
    })}</div>}
  </div></section>;
}

function IndustryDoors() {
  const { data = [] } = usePublishedVerticalLanders();
  const rows = ["hvac", "pizza", "medspa"].map(slug => data.find(row => row.slug === slug)).filter(row => row !== undefined);
  if (!rows.length) return null;
  return <section className="ws-industries" aria-labelledby="ws-industries-title"><div className="ws-container ws-industry-layout"><Reveal className="ws-industry-intro"><span className="ws-kicker">Your business. Your customers.</span><h2 id="ws-industries-title">Built around<br/>the way <span>you work.</span></h2><p>Estimate requests, catering inquiries, or consultations. Start with the customer journey that fits your business.</p><Link className="ws-text-link" to="/industries">Find your industry <ArrowRight size={17} aria-hidden/></Link></Reveal><div className="ws-industry-cards">{rows.map(row => {
    const media = getStudioMedia(industryMedia[row.slug]);
    return <Link key={row.slug} to={`/for/${row.slug}`} className="ws-industry-card" onClick={() => track(`website_industry_${row.slug}`)}>{media?.src && <img src={media.src} alt={media.alt} width={media.width} height={media.height} loading="lazy"/>}<div><h3>{row.display_name}</h3><span>See your customer’s next step <ArrowUpRight size={18} aria-hidden/></span></div></Link>;
  })}</div></div></section>;
}

const questions = [
  { q: "Can you work with the website I already have?", a: "Yes. We’ll look at what is worth keeping, what is getting in the way, and whether improving it or replacing it makes more sense." },
  { q: "Do you help with the words and images?", a: "Yes. The message, design and customer journey are developed together. We’ll identify what we can use from your existing material and what else the site needs." },
  { q: "What is the difference between monthly and buying outright?", a: "The monthly website runs on our platform as part of your subscription and stops if the service ends. The $2,500 custom build is sold outright. We’ll make the included work and ongoing costs clear before you commit." },
  { q: "What is the commitment for Local Growth?", a: "The initial term is three months, then month to month. The first ten Local Growth clients keep the $297 monthly rate while they remain subscribed; new clients after those places are filled enter at $347. The founding offer includes permission to feature your results." },
  { q: "When can text-back and follow-up start working?", a: "We set up the customer journey with your business details. Text messaging requires carrier registration and approval, so its activation date is confirmed separately from the website launch." },
  { q: "How long will the website take?", a: "We agree on the schedule after reviewing the pages, content and features you need. You’ll know what we need from you and what happens next before work starts." },
];

export default function WebsiteServices() {
  const { hash, search } = useLocation();
  const art = getStudioMedia("service-websites-hero");
  const source = new URLSearchParams(search);
  const pricingQuery = new URLSearchParams();
  for (const key of ["src", "biz", "lang"]) { const value = source.get(key); if (value) pricingQuery.set(key, value); }
  if (!pricingQuery.has("src")) pricingQuery.set("src", "services-websites");
  const pricingHref = `/pricing?${pricingQuery.toString()}`;
  useStudioHead({ ...ROUTE_META["/services/websites"], path: "/services/websites" });
  useEffect(() => {
    if (!hash) return;
    const target = hash === "#website-options" ? "website-options" : hash.slice(1);
    const frame = requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [hash]);
  return <div className="stm-studio ws-page"><StudioHeader/><main>
    <section className="ws-hero" aria-labelledby="websites-title">
      <div className="ws-container ws-hero-intro"><span className="ws-kicker">Websites that work for your business</span><h1 id="websites-title">Built to impress.<br/><span>Ready for business.</span></h1><div className="ws-hero-bottom"><p>A website that makes you look credible, makes it easy to reach you, and helps keep new opportunities moving. Designed around your business—not a template you have to fit.</p><div className="ws-actions"><a href="#website-options" className="ws-button" onClick={() => track("website_options")}>Find your website plan <ArrowRight size={17} aria-hidden/></a><a href="#website-work" className="ws-button ws-button-outline" onClick={() => track("website_view_work")}>See the work <ArrowDownIcon/></a></div></div></div>
      {art?.src && <div className="ws-hero-showcase"><img src={art.src} alt={art.alt} width={art.width} height={art.height} fetchPriority="high"/><div className="ws-showcase-note"><span className="ws-handnote">Make a good first impression.<br/>Make the next step easy.</span><svg viewBox="0 0 94 51" fill="none" aria-hidden><path d="M3 3c9 28 37 39 77 27M70 21l15 7-8 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></div><div className="ws-showcase-strip"><span><Monitor size={17} aria-hidden/>Built for your business</span><span><Smartphone size={17} aria-hidden/>Made for mobile</span><span><MousePointer2 size={17} aria-hidden/>Ready for the next step</span></div></div>}
    </section>
    <CustomerJourney/>
    <WebsiteWork/>
    <Testimonials/>
    <IndustryDoors/>
    <section id="website-options" className="ws-offer ws-dark" aria-labelledby="ws-offer-title"><div className="ws-container"><Reveal className="ws-offer-layout"><div className="ws-offer-copy"><span className="ws-kicker">The website. The follow-up. The support.</span><h2 id="ws-offer-title">More than a launch.<br/><span>A plan for what’s next.</span></h2><p>Local Growth brings your website and everyday customer follow-up together. Less chasing messages. More clarity about who needs a reply.</p><div className="ws-included"><span><Check size={18} aria-hidden/>Website & mobile experience</span><span><Check size={18} aria-hidden/>Missed-call text-back</span><span><Check size={18} aria-hidden/>Booking & one inbox</span><span><Check size={18} aria-hidden/>Review requests & follow-up</span><span><Check size={18} aria-hidden/>Monthly report</span></div></div><div className="ws-offer-price"><span className="ws-kicker">Local Growth · Founding offer</span><div className="ws-price"><strong>$297</strong><span>/ month</span></div><p className="ws-price-terms">$0 down. Three months to start,<br/>then month to month.</p><a href="#contact" className="ws-button" onClick={() => requestPlan("Local Growth", "website_local_growth_inquiry")}>Talk about Local Growth <ArrowRight size={17} aria-hidden/></a><p className="ws-founding">The first ten clients keep this rate while subscribed, with permission to feature their results. Then $347/month for new clients.</p><Link to={pricingHref} className="ws-text-link" onClick={() => track("website_view_pricing")}>Compare plans and what’s included <ArrowRight size={16} aria-hidden/></Link></div></Reveal><div className="ws-outright"><div><span className="ws-kicker">Prefer to buy it outright?</span><h3>Your custom website. One project.</h3></div><p>Custom builds from <strong>$2,500.</strong><br/>A separate option from the monthly subscription.</p><a href="#contact" className="ws-text-link" onClick={() => requestPlan("an outright custom website build", "website_outright_inquiry")}>Talk through the build <ArrowRight size={17} aria-hidden/></a></div></div></section>
    <section className="ws-process" aria-labelledby="ws-process-title"><div className="ws-container"><Reveal className="ws-section-heading"><div><span className="ws-kicker">A clear path to launch</span><h2 id="ws-process-title">You run the business.<br/><span>We’ll handle the website.</span></h2></div><p>You know your business. We turn that knowledge into the words, design and customer experience it deserves.</p></Reveal><ol className="ws-process-steps"><li><span>01</span><h3>Get the message right.</h3><p>What you do, who you help, and why someone should choose you. That comes before the layout.</p></li><li><span>02</span><h3>Build it around your customers.</h3><p>See the design as it takes shape. Review the pages, the phone experience, and the next step visitors will take.</p></li><li><span>03</span><h3>Launch with a plan.</h3><p>We connect your domain, check the customer journey, and make sure you know what happens after launch.</p></li></ol><div className="ws-faq"><div><span className="ws-kicker">Before we begin</span><h3>A few things you<br/>may be wondering.</h3></div><div>{questions.map(({q,a}) => <details key={q}><summary>{q}<span aria-hidden>+</span></summary><p>{a}</p></details>)}</div></div></div></section>
    <Inquiry servicePage="websites"/>
  </main><StudioFooter/></div>;
}

function ArrowDownIcon() { return <ArrowRight size={17} className="ws-arrow-down" aria-hidden/>; }

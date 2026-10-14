import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { SelectedWork } from "@/components/marketing/studio/sections/SelectedWork";
import { openAtTop } from "@/components/marketing/blog/BlogCard";
import { StarterStrip } from "@/components/marketing/pages/packages/PackageBits";
import { prefillContact } from "@/components/marketing/pages/SitePageBits";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SITE_SERVICES } from "@/components/marketing/studio/siteNav";
import { getStudioMedia } from "@/config/studioMedia";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { ROUTE_META } from "@/config/routeMeta";
import { groupServices, useServicePages } from "@/hooks/useSitePages";
import "@/components/marketing/pages/sitePages.css";
import "@/components/marketing/pages/packages/packages.css";
import "./servicesHub.css";

/**
 * The six service areas as cards, in the order of the Services menu (SITE_SERVICES): what each one
 * gets the customer, three things it includes, and the picture from that area's own page.
 */
const AREAS: Record<string, { headline: string; items: string[]; media: string; short: string }> = {
  "/services/websites": { headline: "A website that turns visitors into customers.", items: ["Business websites and landing pages", "Online stores, memberships and web apps", "Hosting and website care"], media: "service-websites-hero", short: "websites" },
  "/services/brand": { headline: "Make the quality of your business obvious.", items: ["Logo and identity", "Messaging and copywriting", "Print, signage and menus"], media: "brand-materials-spread", short: "brand" },
  "/services/marketing": { headline: "Give people a reason to choose you.", items: ["Local SEO and your Google listing", "Social media and content", "Ads, email and campaigns"], media: "marketing-campaign-scene", short: "marketing" },
  "/services/ai-systems": { headline: "Answer every lead, even at 3\u00a0AM.", items: ["Phone answering and website chat assistants", "Follow-up texts, emails and reminders", "Booking, CRM and owner reports"], media: "home-after-dark", short: "systems" },
  "/publishing": { headline: "Take your finished work all the way to release.", items: ["Book covers and formatting", "Listing copy and keywords", "Launch graphics and emails"], media: "publishing-release-spread", short: "publishing" },
  "/startups": { headline: "Turn the idea into something real.", items: ["Check the idea before you spend", "Name, brand and website", "A plan for the first weeks of launch"], media: "home-next-level", short: "startups" },
};

const WHY = [
  { title: "One plan", body: "Your website, Google listing, marketing and follow-up are planned together, so every piece pushes the same way." },
  { title: "One clear price", body: "You see what's included and what it costs, in writing, before anything starts." },
  { title: "One team to call", body: "The people building it are the people who answer. We reply within one business day." },
];

const QUESTIONS = [
  ["Do I need all of this?", "No. Most businesses start with one or two things, like a better website or a stronger Google listing, and add more once it's paying off. Tell us where you are and we'll recommend the smallest sensible starting point."],
  ["How do I know what I need?", "Run the free business checkup, or send us a note about what's going on. We reply within one business day with a recommendation and a clear price, in writing."],
  ["Can you work with what I already have?", "Yes. We look at your website, Google listing and tools first, keep what's working, and fix or replace what isn't."],
  ["How much does it cost?", "The starter packages begin at $799 one time, or $300 a month with nothing due up front (three months to start). Every price is in writing before anything starts, and the Packages page shows every option."],
  ["Do you only work with businesses in San Diego?", "No. We're based in San Diego County and work with businesses anywhere."],
];

/** /services: the sales page for everything we do, ending with every service by group. */
export default function ServicesHub() {
  useStudioHead({ ...ROUTE_META["/services"], path: "/services" });
  const { data = [], isLoading, isError } = useServicePages();
  const groups = groupServices(data);
  const { hash } = useLocation();
  const hero = getStudioMedia("services-hub-hero");
  // A link to one group (for example /services#photo-video) lands on it once the list has loaded.
  useEffect(() => {
    if (!hash || !groups.length) return;
    requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }));
  }, [hash, groups.length]);
  const track = (label: string) => trackSiteEvent({ event_type: "cta_click", label: `services_hub_${label}` });
  const ask = () => prefillContact("I'm not sure which services I need. Can you help me put together the right mix?");

  return (
    <div className="stm-studio sp-page min-h-screen"><StudioHeader /><main>
      <section className="shub-hero" aria-labelledby="services-title">
        <div className="sp-wrap shub-hero-in">
          <div className="shub-hero-copy">
            <div className="sp-eyebrow">Services</div>
            <h1 id="services-title">Everything your business needs to grow, <em className="sp-accent">under one roof.</em></h1>
            <p className="shub-lead">Marketing, websites, media and the systems behind them, planned together and built by one team. You get a clear price, in writing, before anything starts.</p>
            <div className="sp-actions">
              <Link className="sp-btn sp-btn-gold" to="/pricing#build" onClick={() => track("get_package")}>Get my package <ArrowRight aria-hidden /></Link>
              <Link className="sp-btn sp-btn-ghost" to="/free-audit?src=services-hub" onClick={() => { track("checkup"); openAtTop(); }}>Run my free checkup</Link>
            </div>
            <ul className="shub-trust" aria-label="Why owners trust us">
              <li><strong>500+</strong><span>Businesses trust us</span></li>
              <li><strong>4.9★</strong><span>Client satisfaction</span></li>
              <li><strong>San Diego</strong><span>Our home base</span></li>
            </ul>
          </div>
        </div>
        {hero?.src && <img className="shub-hero-art" src={hero.src} alt={hero.alt} width={hero.width} height={hero.height} fetchPriority="high" style={hero.objectPosition ? { objectPosition: hero.objectPosition } : undefined} />}
      </section>

      <section className="sp-section shub-areas" aria-labelledby="areas-title">
        <div className="sp-wrap">
          <div className="sp-eyebrow">What we do</div>
          <h2 id="areas-title" className="sp-h2">Six ways we grow your business.</h2>
          <p className="sp-sub">Start with one, or let us put them together into one plan. Each has its own page with what's included and how it works.</p>
          <div className="shub-grid">
            {SITE_SERVICES.filter((service) => AREAS[service.to]).map((service) => {
              const area = AREAS[service.to];
              const art = getStudioMedia(area.media);
              return (
                <Link key={service.to} to={service.to} className="shub-card" onClick={() => { track(`area_${area.short}`); openAtTop(); }}>
                  <div className="shub-card-img">{art?.src && <img src={art.src} alt="" width={art.width} height={art.height} loading="lazy" decoding="async" style={art.objectPosition ? { objectPosition: art.objectPosition } : undefined} />}</div>
                  <div className="shub-card-body">
                    <span className="shub-card-kicker">{service.label}</span>
                    <h3>{area.headline}</h3>
                    <ul>{area.items.map((item) => <li key={item}>{item}</li>)}</ul>
                    <span className="shub-card-link">Explore {area.short} <ArrowRight aria-hidden /></span>
                  </div>
                </Link>
              );
            })}
          </div>
          <p className="shub-all">Looking for one specific service? <a href="#every-service" onClick={() => track("see_every_service")}>See all {data.length ? `${data.length} ` : ""}services</a></p>
        </div>
      </section>

      <section className="sp-section sp-dark shub-why" aria-labelledby="why-title">
        <div className="sp-wrap shub-why-grid">
          <div>
            <div className="sp-eyebrow">Why one team</div>
            <h2 id="why-title" className="sp-h2">One team instead of <em className="sp-accent">five vendors.</em></h2>
            <p className="sp-sub">Most owners end up juggling a web designer, an ads person, a social media freelancer and whoever set up the phones. Nothing connects, and nobody owns the result.</p>
            <div className="sp-actions"><a className="sp-btn sp-btn-gold" href="#contact" onClick={() => { track("why_contact"); ask(); }}>Tell us what you need <ArrowRight aria-hidden /></a></div>
          </div>
          <ol className="shub-why-list">
            {WHY.map((item, i) => <li key={item.title}><span>0{i + 1}</span><h3>{item.title}</h3><p>{item.body}</p></li>)}
          </ol>
        </div>
      </section>

      <SelectedWork />

      <section className="sp-section sp-white shub-packages" aria-labelledby="packages-title">
        <div className="sp-wrap">
          <div className="sp-eyebrow">Packages</div>
          <h2 id="packages-title" className="sp-h2">Start with a package.</h2>
          <p className="sp-sub">Four ready-made starting points, each with its price on the card. Or build your own from the full menu.</p>
          <StarterStrip src="services-hub" />
        </div>
      </section>

      <section className="sp-section shub-faq" aria-labelledby="faq-title">
        <div className="sp-wrap shub-faq-grid">
          <div>
            <div className="sp-eyebrow">Questions</div>
            <h2 id="faq-title" className="sp-h2">Before you choose.</h2>
          </div>
          <Accordion type="single" collapsible className="shub-faq-list">
            {QUESTIONS.map(([q, a], i) => <AccordionItem key={q} value={`services-${i}`}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}
          </Accordion>
        </div>
      </section>

      <section id="every-service" className="sp-section sp-white shub-index" aria-labelledby="index-title">
        <div className="sp-wrap">
          <div className="sp-eyebrow">Every service</div>
          <h2 id="index-title" className="sp-h2">Looking for something specific?</h2>
          <p className="sp-sub">Every service we offer, by group. Each one has its own page.</p>
          {isLoading && <p role="status">Loading services…</p>}
          {isError && <p role="status">Services couldn't be loaded right now. Please refresh.</p>}
          <div className="sp-groups">
            {groups.map((g) => (
              <div className="sp-group" key={g.key} id={g.key} style={{ scrollMarginTop: 96 }}>
                <h3>{g.label}</h3>
                {g.items.map((s) => (
                  <Link key={s.slug} to={`/services/${s.slug}`} onClick={() => { track(s.slug.replace(/-/g, "_")); openAtTop(); }}>
                    <span>{s.name}{s.summary && <small>{s.summary}</small>}</span><ArrowRight aria-hidden />
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Inquiry section="service-all" />
    </main><StudioFooter /></div>
  );
}

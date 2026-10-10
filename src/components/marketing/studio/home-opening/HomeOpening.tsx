import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ChevronDown, Cog, Mail, Menu, Monitor, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePublishedVerticalLanders } from "@/hooks/useVerticalLanders";
import { getStudioMedia } from "@/config/studioMedia";
import { CONTACT_EMAIL } from "@/lib/siteContact";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { sanitizeBiz } from "@/pages/VerticalLanding";
import "./homeOpening.css";

const SERVICE_LINKS = [
  { to: "/services/websites", label: "Web Design", description: "Websites that look sharp and turn attention into action.", media: "home-opening-web-design" },
  { to: "/services/marketing", label: "Marketing", description: "Focused campaigns that help the right customers find you.", media: "home-opening-marketing" },
  { to: "/services/ai-systems?intent=sales", label: "Sales", description: "Practical systems for turning interest into real opportunities.", media: "home-opening-sales" },
  { to: "/services/ai-systems?intent=crm", label: "CRM", description: "Keep contacts, conversations and next steps organized.", media: "home-opening-crm" },
  { to: "/services/ai-systems", label: "Automation", description: "Reduce busywork and keep important work moving.", media: "home-opening-automation" },
] as const;

const normalizeSlug = (slug: string) => slug === "bars-restaurants" ? "restaurants" : slug === "taquerias" ? "tacos" : slug === "plumbing-hvac" ? "plumbing" : slug;

function OpeningHeader({ onContact }: { onContact: () => void }) {
  const [open, setOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const industriesRef = useRef<HTMLDivElement | null>(null);
  const { data: landers = [] } = usePublishedVerticalLanders();

  useEffect(() => {
    if (!open && !industriesOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setIndustriesOpen(false);
      toggleRef.current?.focus();
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !industriesRef.current?.contains(target)) {
        setOpen(false);
        setIndustriesOpen(false);
      }
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open, industriesOpen]);

  const closeMenu = () => { setOpen(false); setIndustriesOpen(false); };
  const mark = getStudioMedia("home-opening-mark");

  return (
    <header className="stm-opening-header" ref={industriesRef}>
      <div className="stm-opening-shell stm-opening-header-inner">
        <Link to="/" className="stm-opening-brand" aria-label="Supreme Team Media home">
          {mark?.src && <img src={mark.src} alt="" width={mark.width} height={mark.height} />}
          <span><strong>Supreme Team Media</strong><small>MARKETING • WEBSITES • AI SYSTEMS</small></span>
        </Link>
        <nav aria-label="Primary" className="stm-opening-nav">
          <a href="#services">Services</a>
          <div className="stm-opening-nav-group">
            <Button type="button" variant="ghost" aria-expanded={industriesOpen} onClick={() => setIndustriesOpen((value) => !value)}>Industries <ChevronDown aria-hidden /></Button>
            {industriesOpen && <div className="stm-opening-industries-menu">
              <Link to="/industries" onClick={closeMenu}>All industries</Link>
              {landers.map((item) => <Link key={item.slug} to={`/for/${normalizeSlug(item.slug)}`} onClick={closeMenu}>{item.display_name}</Link>)}
            </div>}
          </div>
          <Link to="/work">Work</Link><Link to="/pricing">Packages</Link><span className="stm-opening-disabled" aria-disabled="true">Blog</span><Link to="/about">About</Link>
        </nav>
        <div className="stm-opening-header-actions">
          <Button type="button" onClick={onContact} className="stm-opening-contact">Contact Us <ArrowRight aria-hidden /></Button>
          <Button ref={toggleRef} type="button" variant="outline" size="icon" className="stm-opening-menu-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? <X /> : <Menu />}</Button>
        </div>
      </div>
      {open && <div className="stm-opening-mobile-menu" ref={menuRef}>
        <a href="#services" onClick={closeMenu}>Services</a><Link to="/industries" onClick={closeMenu}>Industries</Link><Link to="/work" onClick={closeMenu}>Work</Link><Link to="/pricing" onClick={closeMenu}>Packages</Link><span aria-disabled="true">Blog — coming later</span><Link to="/about" onClick={closeMenu}>About</Link>
      </div>}
    </header>
  );
}

function OpeningHero({ onContact }: { onContact: () => void }) {
  const art = getStudioMedia("home-opening-chess");
  const { search } = useLocation();
  const source = new URLSearchParams(search);
  const checkup = new URLSearchParams();
  const existingSrc = source.get("src");
  if (/^[a-z0-9-]{1,80}$/i.test(existingSrc ?? "")) checkup.set("src", existingSrc ?? "");
  else checkup.set("src", "home-opening");
  const biz = sanitizeBiz(source.get("biz"));
  if (biz) checkup.set("biz", biz);

  return <section id="top" className="stm-opening-hero">
    <div className="stm-opening-shell stm-opening-hero-inner">
      <div className="stm-opening-copy">
        <p className="stm-opening-eyebrow">STRATEGY <span>♦</span> MARKETING <span>♦</span> TECHNOLOGY</p>
        <h1><span>Strategy</span><span>turns ideas</span><span>into <em>income.</em></span></h1>
        <p className="stm-opening-subhead">Wealth through intelligent systems.</p>
        <div className="stm-opening-actions">
          <Button type="button" onClick={onContact} className="stm-opening-primary">Contact Us <ArrowRight aria-hidden /></Button>
          <Button asChild variant="outline" className="stm-opening-secondary"><Link to={`/free-audit?${checkup.toString()}`} onClick={() => trackSiteEvent({ event_type: "cta_click", label: "free_business_checkup" })}>Free Business Checkup <ArrowRight aria-hidden /></Link></Button>
        </div>
      </div>
      {art?.src && <div className="stm-opening-scene">
        <picture><source media="(max-width: 760px)" srcSet={art.mobileSrc ?? art.src} /><img src={art.src} alt={art.alt} width={art.width} height={art.height} fetchPriority="high" /></picture>
        <svg className="stm-opening-connectors" viewBox="0 0 1792 826" preserveAspectRatio="none" aria-hidden>
          <g className="stm-opening-connector-base"><path d="M1066 220 H1100 L1218 560"/><path d="M1021 440 H1060 L1218 580"/><path d="M1442 420 H1395 L1270 580"/></g>
          <g className="stm-opening-connector-pulse"><path d="M1066 220 H1100 L1218 560"/><path d="M1021 440 H1060 L1218 580"/><path d="M1442 420 H1395 L1270 580"/></g>
        </svg>
        <div className="stm-opening-labels">
          <div className="stm-opening-callout stm-callout-ai"><strong><b>AI</b> AUTOMATION</strong></div>
          <div className="stm-opening-callout stm-callout-web"><Monitor aria-hidden /><strong>WEB DESIGN</strong></div>
          <div className="stm-opening-callout stm-callout-marketing"><Cog aria-hidden /><strong>MARKETING</strong></div>
        </div>
      </div>}
    </div>
  </section>;
}

function CredibilityStrip() {
  // Draft-only numerical placeholders; not verified claims or structured data.
  const items = [
    { media: "home-opening-trust-people", value: "500+ BUSINESSES", note: "TRUSTED BY", illustrative: true },
    { media: "home-opening-trust-star", value: "4.9★", note: "CLIENT SATISFACTION", illustrative: true },
    { media: "home-opening-trust-shield", value: "SAN DIEGO,", note: "CALIFORNIA", illustrative: false },
  ];
  return <section className="stm-opening-trust" aria-label="Credibility overview"><div className="stm-opening-shell stm-opening-trust-grid">
    {items.map((item) => { const media = getStudioMedia(item.media); return <div key={item.value} className="stm-opening-trust-item" aria-describedby={item.illustrative ? "stm-opening-figures-note" : undefined}>{media?.src && <img src={media.src} alt="" width={media.width} height={media.height} />}<span>{item.media === "home-opening-trust-people" ? <><small>{item.note}</small><strong>{item.value}</strong></> : <><strong>{item.value}</strong><small>{item.note}</small></>}</span></div>; })}
    <p id="stm-opening-figures-note" className="stm-opening-sample">Illustrative figures</p>
  </div></section>;
}

function OpeningServices() {
  return <section id="services" className="stm-opening-services"><div className="stm-opening-shell stm-opening-services-layout">
    <div className="stm-opening-services-heading"><h2>Everything you need to grow in one place.</h2></div>
    <div className="stm-opening-service-grid">{SERVICE_LINKS.map((service) => { const media = getStudioMedia(service.media); return <Link key={service.label} to={service.to} className="stm-opening-service-card">{media?.src && <img src={media.src} alt="" width={media.width} height={media.height} />}<h3>{service.label}</h3><span>Learn More <ArrowRight aria-hidden /></span></Link>; })}</div>
  </div></section>;
}

export function HomeOpening() {
  const [contactOpen, setContactOpen] = useState(false);
  const openContact = () => { setContactOpen(true); trackSiteEvent({ event_type: "cta_click", label: "contact_us" }); };
  return <>
    <OpeningHeader onContact={openContact} />
    <OpeningHero onContact={openContact} />
    <CredibilityStrip />
    <OpeningServices />
    <Dialog open={contactOpen} onOpenChange={setContactOpen}><DialogContent className="stm-opening-dialog"><DialogHeader><DialogTitle>Contact Supreme Team Media</DialogTitle><DialogDescription>Call or email us directly. No form required.</DialogDescription></DialogHeader><div className="stm-opening-phone-pending"><strong>Phone connection pending</strong><span>A public business number has not been confirmed.</span></div><Button asChild className="stm-opening-email"><a href={`mailto:${CONTACT_EMAIL}`}><Mail aria-hidden /> Email Us <span>{CONTACT_EMAIL}</span></a></Button></DialogContent></Dialog>
  </>;
}
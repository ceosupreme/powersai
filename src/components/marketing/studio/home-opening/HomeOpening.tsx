import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ChevronDown, Mail, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePublishedVerticalLanders } from "@/hooks/useVerticalLanders";
import { getStudioMedia } from "@/config/studioMedia";
import { CONTACT_EMAIL } from "@/lib/siteContact";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { sanitizeBiz } from "@/pages/VerticalLanding";
import "./homeOpening.css";

const SERVICE_LINKS = [
  { to: "/services/websites", label: "Web Design", media: "home-opening-web-design" },
  { to: "/services/marketing", label: "Marketing", media: "home-opening-marketing" },
  { to: "/services/ai-systems?intent=sales", label: "Sales", media: "home-opening-sales" },
  { to: "/services/ai-systems?intent=crm", label: "CRM", media: "home-opening-crm" },
  { to: "/services/ai-systems", label: "Automation", media: "home-opening-automation" },
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
          <Button type="button" onClick={onContact} className="stm-opening-contact">Contact Us</Button>
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
        <h1>Strategy<br />turns ideas<br />into <em>income.</em></h1>
        <p className="stm-opening-subhead">Wealth through intelligent systems.</p>
        <div className="stm-opening-actions">
          <Button type="button" onClick={onContact} className="stm-opening-primary">Contact Us <ArrowRight aria-hidden /></Button>
          <Button asChild variant="outline" className="stm-opening-secondary"><Link to={`/free-audit?${checkup.toString()}`} onClick={() => trackSiteEvent({ event_type: "cta_click", label: "free_business_checkup" })}>Free Business Checkup <ArrowRight aria-hidden /></Link></Button>
        </div>
      </div>
      {art?.src && <div className="stm-opening-scene">
        <picture><source media="(max-width: 640px)" srcSet={art.mobileSrc ?? art.src} /><source media="(max-width: 1280px)" srcSet={art.posterSrc ?? art.src} /><img src={art.src} alt={art.alt} width={art.width} height={art.height} fetchPriority="high" /></picture>
        <svg className="stm-opening-connectors" viewBox="0 0 1000 620" aria-hidden><path d="M580 155 C655 155 690 200 720 260"/><path d="M610 322 C690 320 710 330 745 370"/><path d="M820 220 C860 260 860 330 815 402"/></svg>
        <div className="stm-opening-callout stm-callout-ai"><strong><span>AI</span> AUTOMATION</strong></div>
        <div className="stm-opening-callout stm-callout-web"><strong>WEB DESIGN</strong></div>
        <div className="stm-opening-callout stm-callout-marketing"><strong>MARKETING</strong></div>
      </div>}
    </div>
  </section>;
}

function CredibilityStrip() {
  const items = [
    { media: "home-opening-trust-people", value: "500+ businesses", note: "Sample figure — not approved" },
    { media: "home-opening-trust-shield", value: "San Diego based", note: "Founder-led studio" },
    { media: "home-opening-trust-star", value: "4.9 client satisfaction", note: "Sample figure — not approved" },
  ];
  return <section className="stm-opening-trust" aria-label="Credibility overview"><div className="stm-opening-shell stm-opening-trust-grid">
    {items.map((item) => { const media = getStudioMedia(item.media); return <div key={item.value} className="stm-opening-trust-item">{media?.src && <img src={media.src} alt="" width={media.width} height={media.height} />}<span><strong>{item.value}</strong><small>{item.note}</small></span></div>; })}
    <p className="stm-opening-sample">Sample figures</p>
  </div></section>;
}

function OpeningServices() {
  return <section id="services" className="stm-opening-services"><div className="stm-opening-shell stm-opening-services-layout">
    <div className="stm-opening-services-heading"><p>OUR SERVICES</p><h2>Everything<br />you need to grow<br />in <em>one place.</em></h2></div>
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
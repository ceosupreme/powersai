import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ChevronDown, Cog, Globe, Mail, Megaphone, Menu, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePublishedVerticalLanders } from "@/hooks/useVerticalLanders";
import { getStudioMedia } from "@/config/studioMedia";
import { CONTACT_EMAIL } from "@/lib/siteContact";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { sanitizeBiz } from "@/pages/VerticalLanding";
import "./homeOpening.css";

const SERVICE_INDEX = [
  { to: "/services/marketing", num: "01", name: "Marketing", slug: "marketing",
    subs: "Marketing strategy \u00b7 Paid ads \u00b7 Local SEO \u00b7 Social content \u00b7 Landing pages" },
  { to: "/services/websites", num: "02", name: "Web Design", slug: "web_design",
    subs: "Business websites \u00b7 Site redesigns \u00b7 Mobile-first design \u00b7 Conversion-focused pages \u00b7 Hosting and care plans" },
  { to: "/services/brand", num: "03", name: "Media & Creative", slug: "media_creative",
    subs: "Logo and identity \u00b7 Brand messaging \u00b7 Copywriting \u00b7 Photo and video \u00b7 Social templates \u00b7 Print, signage and menus" },
  { to: "/services/ai-systems?intent=sales", num: "04", name: "Sales & CRM", slug: "sales_crm",
    subs: "CRM setup \u00b7 Lead management \u00b7 Online booking \u00b7 Review requests \u00b7 Follow-up sequences \u00b7 Owner reports" },
  { to: "/services/ai-systems", num: "05", name: "Automation", slug: "automation",
    subs: "AI assistants \u00b7 Missed-call text back \u00b7 Email and SMS automation \u00b7 Appointment reminders \u00b7 Tool integrations \u00b7 Custom systems" },
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
  const art = getStudioMedia("home-opening-command-center");
  const { search } = useLocation();
  const source = new URLSearchParams(search);
  const checkup = new URLSearchParams();
  const existingSrc = source.get("src");
  if (/^[a-z0-9-]{1,80}$/i.test(existingSrc ?? "")) checkup.set("src", existingSrc ?? "");
  else checkup.set("src", "home-opening");
  const biz = sanitizeBiz(source.get("biz"));
  if (biz) checkup.set("biz", biz);

  const sceneRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let visible = true;
    const sync = () => scene.classList.toggle("is-paused", !visible || document.hidden);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(scene);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);

  return <section id="top" className="stm-opening-hero stm-command-hero">
    <div className="stm-command-artboard" ref={sceneRef}>
      {art?.src && <div className="stm-command-visual"><picture className="stm-command-background"><source media="(max-width: 760px)" srcSet={art.mobileSrc ?? art.src} /><img src={art.src} alt={art.alt} width={art.width} height={art.height} fetchPriority="high" /></picture><div className="stm-command-mobile-core">BUSINESS<br />GROWTH</div></div>}
      <div className="stm-opening-copy stm-command-copy">
        <h1><span>Grow your</span><span>business.</span><span>Make a bigger</span><span className="stm-command-impact">impact.</span></h1>
        <p className="stm-opening-subhead">Intelligent marketing and media solutions for business growth.</p>
        <div className="stm-opening-actions">
          <Button type="button" onClick={onContact} className="stm-opening-primary">Contact Us <ArrowRight aria-hidden /></Button>
          <Button asChild variant="outline" className="stm-opening-secondary"><Link to={`/free-audit?${checkup.toString()}`} onClick={() => trackSiteEvent({ event_type: "cta_click", label: "free_business_checkup" })}>Free Business Checkup <ArrowRight aria-hidden /></Link></Button>
        </div>
        <div className="stm-command-credibility">
          <div><strong>Since 2001</strong><span>DIGITAL MARKETING</span></div>
          <div><strong>San Diego</strong><span>SERVING ANYWHERE</span></div>
          <div><strong>20+ years</strong><span>ADVERTISING AND DESIGN</span></div>
        </div>
      </div>
      <svg className="stm-command-overlays" viewBox="0 0 1200 675" aria-label="Marketing, Media, Web and Automation connected to Business Growth">
        <g className="stm-command-energy" fill="none" aria-hidden="true">
          <path className="stm-command-energy-gold" d="M688 306 C705 275 880 285 900 262" />
          <path className="stm-command-energy-cyan" d="M819 320 C840 285 900 290 912 262" />
          <path className="stm-command-energy-gold" d="M959 339 C965 300 935 290 930 262" />
          <path className="stm-command-energy-cyan" d="M1115 354 C1105 300 960 300 942 262" />
        </g>
        <g className="stm-command-panel" transform="matrix(.992 .122 -.443 .818 665 349)"><Megaphone x="-21" y="-30" width="26" height="26" /><text x="0" y="22">Marketing</text></g>
        <g className="stm-command-panel" transform="matrix(.990 .141 -.361 .839 800 366)"><Play x="-19" y="-30" width="26" height="26" /><text x="0" y="22">Media</text></g>
        <g className="stm-command-panel" transform="matrix(.989 .146 -.215 .773 946 387)"><Globe x="-17" y="-30" width="26" height="26" /><text x="0" y="22">Web</text></g>
        <g className="stm-command-panel stm-command-panel-wide" transform="matrix(.987 .160 -.113 .786 1107 408)"><Cog x="-15" y="-30" width="26" height="26" /><text x="0" y="22">Automation</text></g>
        <g className="stm-command-core"><text x="921" y="163">BUSINESS</text><text x="921" y="187">GROWTH</text></g>
      </svg>
      <div className="stm-command-mobile-controls">
        <span><Megaphone />Marketing</span><span><Play />Media</span><span><Globe />Web</span><span><Cog />Automation</span>
      </div>
      <div className="stm-command-stories" aria-label="Story scenes">
        <div className="stm-command-story is-current" aria-current="step"><small>1 OF 3</small><strong>Dialed in</strong><p>Marketing, media, web and automation, set up to work as one.</p><span className="stm-command-progress" /></div>
        <div className="stm-command-story" aria-disabled="true"><small>2 OF 3</small><strong>Launched</strong></div>
        <div className="stm-command-story" aria-disabled="true"><small>3 OF 3</small><strong>Standing out</strong></div>
      </div>
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
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("on"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.2 });
    section.querySelectorAll("[data-watch]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return <section id="services" ref={sectionRef} className="stm-svc" aria-label="Services">
    <div className="stm-svc-head" data-watch>
      <div className="stm-svc-rise"><span className="stm-svc-eyebrow">— Services</span></div>
      <h2><span className="stm-svc-rise"><span>Built to move your</span></span><span className="stm-svc-rise"><span>business <em>forward.</em></span></span></h2>
      <div className="stm-svc-rise"><span className="stm-svc-sub">Marketing and media solutions. Pick where your business needs them most.</span></div>
    </div>
    <nav className="stm-svc-menu" aria-label="Service menu">
      {SERVICE_INDEX.map((svc) => <Link key={svc.num} to={svc.to} className="stm-svc-row" data-watch
        onClick={() => trackSiteEvent({ event_type: "cta_click", label: `services_${svc.slug}` })}>
        <span className="stm-svc-num" aria-hidden="true">{svc.num}</span>
        <span className="stm-svc-main">
          <span className="stm-svc-name">{svc.name}</span>
          <span className="stm-svc-subs">{svc.subs}</span>
        </span>
        <span className="stm-svc-arrow" aria-hidden="true"><ArrowRight /></span>
      </Link>)}
    </nav>
    <div className="stm-svc-foot" data-watch>
      <Link to="/pricing" className="stm-svc-btn gold" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "services_see_packages" })}>See packages →</Link>
      <Link to="/free-audit?src=home-services" className="stm-svc-btn wine" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "services_free_checkup" })}>Free Business Checkup →</Link>
    </div>
  </section>;
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
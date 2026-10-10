import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Clock3,
  Cog,
  Handshake,
  Mail,
  MapPin,
  Menu,
  Monitor,
  ShieldCheck,
  Target,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";
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

function useHeroParallax() {
  const heroRef = useRef<HTMLElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const scene = sceneRef.current;
    if (!hero || !scene) return;

    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;

    const render = () => {
      if (document.hidden || !visible || !finePointer.matches || reducedMotion.matches) {
        frame = 0;
        return;
      }
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      scene.style.setProperty("--pointer-x", currentX.toFixed(4));
      scene.style.setProperty("--pointer-y", currentY.toFixed(4));
      if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) frame = requestAnimationFrame(render);
      else frame = 0;
    };
    const requestRender = () => { if (!frame) frame = requestAnimationFrame(render); };
    const reset = () => { targetX = 0; targetY = 0; requestRender(); };
    const move = (event: PointerEvent) => {
      if (!finePointer.matches || reducedMotion.matches) return;
      const bounds = hero.getBoundingClientRect();
      targetX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
      targetY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
      requestRender();
    };
    const preferenceChanged = () => {
      if (reducedMotion.matches || !finePointer.matches) {
        targetX = 0; targetY = 0; currentX = 0; currentY = 0;
        scene.style.setProperty("--pointer-x", "0");
        scene.style.setProperty("--pointer-y", "0");
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
      if (visible) requestRender();
    }, { threshold: 0.05 });

    observer.observe(hero);
    hero.addEventListener("pointermove", move);
    hero.addEventListener("pointerleave", reset);
    finePointer.addEventListener("change", preferenceChanged);
    reducedMotion.addEventListener("change", preferenceChanged);
    return () => {
      observer.disconnect();
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", reset);
      finePointer.removeEventListener("change", preferenceChanged);
      reducedMotion.removeEventListener("change", preferenceChanged);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return { heroRef, sceneRef };
}

function OpeningHero({ onContact }: { onContact: () => void }) {
  const art = getStudioMedia("home-opening-chess");
  const { search } = useLocation();
  const { heroRef, sceneRef } = useHeroParallax();
  const source = new URLSearchParams(search);
  const checkup = new URLSearchParams();
  const existingSrc = source.get("src");
  if (/^[a-z0-9-]{1,80}$/i.test(existingSrc ?? "")) checkup.set("src", existingSrc ?? "");
  else checkup.set("src", "home-opening");
  const biz = sanitizeBiz(source.get("biz"));
  if (biz) checkup.set("biz", biz);

  const benefits = [
    { icon: BarChart3, label: "More customers" },
    { icon: Clock3, label: "Save time" },
    { icon: UsersRound, label: "Happier clients" },
    { icon: TrendingUp, label: "A stronger business" },
  ];

  return <section id="top" className="stm-opening-hero" ref={heroRef}>
    <div className="stm-opening-shell stm-opening-hero-inner">
      <div className="stm-opening-copy">
        <p className="stm-opening-eyebrow">STRATEGY <span>♦</span> MARKETING <span>♦</span> TECHNOLOGY</p>
        <h1>Strategy<br />turns ideas<br />into <em>income.</em></h1>
        <p className="stm-opening-subhead">Websites, marketing and AI systems designed to help you attract customers and keep your business moving.</p>
        <div className="stm-opening-actions">
          <Button type="button" onClick={onContact} className="stm-opening-primary">Contact Us <ArrowRight aria-hidden /></Button>
          <Button asChild variant="outline" className="stm-opening-secondary"><Link to={`/free-audit?${checkup.toString()}`} onClick={() => trackSiteEvent({ event_type: "cta_click", label: "free_business_checkup" })}>Free Business Checkup <ArrowRight aria-hidden /></Link></Button>
        </div>
        <div className="stm-opening-benefits" aria-label="Ways we help">
          {benefits.map(({ icon: Icon, label }) => <div key={label}><Icon aria-hidden /><span>{label}</span></div>)}
        </div>
      </div>
      {art?.src && <div className="stm-opening-scene" ref={sceneRef}>
        <picture><source media="(max-width: 640px)" srcSet={art.mobileSrc ?? art.src} /><source media="(max-width: 1280px)" srcSet={art.posterSrc ?? art.src} /><img src={art.src} alt={art.alt} width={art.width} height={art.height} fetchPriority="high" /></picture>
        <p className="stm-opening-script">A smarter way<br />to grow</p>
        <svg className="stm-opening-connectors" viewBox="0 0 1000 620" aria-hidden><path d="M575 148 C655 150 690 196 724 258"/><path d="M602 324 C680 318 716 334 755 374"/><path d="M824 214 C874 260 870 334 818 408"/></svg>
        <div className="stm-opening-callout stm-callout-ai"><Cog aria-hidden /><span><strong><b>AI</b> Automation</strong><small>Handle the work. Scale smarter.</small></span></div>
        <div className="stm-opening-callout stm-callout-web"><Monitor aria-hidden /><span><strong>Web Design</strong><small>Websites built to work for you.</small></span></div>
        <div className="stm-opening-callout stm-callout-marketing"><Target aria-hidden /><span><strong>Marketing</strong><small>More visibility. Better reach.</small></span></div>
      </div>}
    </div>
  </section>;
}

function CredibilityStrip() {
  const items = [
    { icon: Handshake, value: "Founder-led since 2002", note: "Direct experience" },
    { media: "home-opening-trust-people", value: "500+ businesses", note: "Sample figure — not approved" },
    { media: "home-opening-trust-star", value: "4.9 client satisfaction", note: "Sample figure — not approved" },
    { media: "home-opening-trust-shield", value: "Direct support", note: "Real people" },
    { icon: MapPin, value: "San Diego based", note: "Built around your business" },
  ];
  return <section className="stm-opening-trust" aria-label="Credibility overview"><div className="stm-opening-shell stm-opening-trust-grid">
    {items.map((item) => { const media = item.media ? getStudioMedia(item.media) : null; const Icon = item.icon; return <div key={item.value} className="stm-opening-trust-item">{media?.src ? <img src={media.src} alt="" width={media.width} height={media.height} /> : Icon ? <Icon aria-hidden /> : null}<span><strong>{item.value}</strong><small>{item.note}</small></span></div>; })}
    <p className="stm-opening-trust-script">Real businesses.<br />Real work.</p>
    <p className="stm-opening-sample">Sample figures shown for review</p>
  </div></section>;
}

function OpeningServices() {
  return <section id="services" className="stm-opening-services"><div className="stm-opening-shell">
    <div className="stm-opening-services-heading"><div><p>OUR SERVICES</p><h2>Everything you need<br />to grow in <em>one place.</em></h2></div><Button asChild className="stm-opening-explore"><Link to="/services/websites">Explore Services <ArrowRight aria-hidden /></Link></Button></div>
    <div className="stm-opening-service-grid">{SERVICE_LINKS.map((service) => { const media = getStudioMedia(service.media); return <Link key={service.label} to={service.to} className="stm-opening-service-card">{media?.src && <img src={media.src} alt="" width={media.width} height={media.height} />}<h3>{service.label}</h3><p>{service.description}</p><span>Learn More <ArrowRight aria-hidden /></span></Link>; })}</div>
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
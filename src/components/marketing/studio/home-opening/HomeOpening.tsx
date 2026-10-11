import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, BookOpen, ChevronDown, Cog, Database, Globe, Handshake, Mail, Megaphone, Menu, PenTool, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePublishedVerticalLanders } from "@/hooks/useVerticalLanders";
import { getStudioMedia } from "@/config/studioMedia";
import { CONTACT_EMAIL } from "@/lib/siteContact";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { sanitizeBiz } from "@/pages/VerticalLanding";
import "./homeOpening.css";

const SERVICE_INDEX = [
  { to: "/services/marketing", num: "01", name: "Marketing", slug: "marketing", icon: Megaphone,
    line: "Create demand. Turn attention into customers.",
    subs: ["Marketing strategy", "Paid ads", "Local SEO", "Google Business Profile", "Social media content", "Performance reporting"] },
  { to: "/services/websites", num: "02", name: "Web Design", slug: "web_design", icon: Globe,
    line: "Turn your online presence into a business asset.",
    subs: ["Business websites", "Landing pages", "Site redesigns", "Mobile-first design", "Conversion-focused pages", "Hosting and care plans"] },
  { to: "/services/brand", num: "03", name: "Media", slug: "media", icon: Play,
    line: "Give people something worth remembering.",
    subs: ["Photography", "Video production", "Content creation", "Social content", "Brand storytelling"] },
  { to: "/services/brand", num: "04", name: "Brand", slug: "brand", icon: PenTool,
    line: "Make the quality of your business obvious.",
    subs: ["Logo and identity", "Naming", "Brand messaging", "Copywriting", "Typography and color", "Print, signage and menus"] },
  { to: "/services/ai-systems?intent=sales", num: "05", name: "Sales", slug: "sales", icon: Handshake,
    line: "Turn conversations into revenue.",
    subs: ["Lead capture", "Inquiry handling", "Online booking", "Follow-up sequences", "Review requests"] },
  { to: "/services/ai-systems?intent=sales", num: "06", name: "CRM", slug: "crm", icon: Database,
    line: "Every lead and customer in one clear view.",
    subs: ["CRM setup", "Lead management", "Customer records", "Pipeline tracking", "Owner reports"] },
  { to: "/services/ai-systems", num: "07", name: "Automation", slug: "automation", icon: Cog,
    line: "Take repetitive work off your plate.",
    subs: ["AI assistants", "Missed-call text back", "Email and SMS automation", "Appointment reminders", "Tool integrations", "Custom systems"] },
  { to: "/publishing", num: "08", name: "Publishing", slug: "publishing", icon: BookOpen,
    line: "Take finished work all the way to release.",
    subs: ["Book covers", "Print and ebook formatting", "Listing copy and keywords", "Product pages", "Launch graphics and emails", "Publishing account setup"] },
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

function OpeningServices() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const motionRef = useRef<SVGElement | null>(null);

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

  // The energy thread: path geometry is measured from the real card positions,
  // so it stays seated at every screen width. Hidden under 861px by CSS.
  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const build = () => {
      if (!window.matchMedia("(min-width: 861px)").matches) return;
      const cards = Array.from(wrap.querySelectorAll<HTMLElement>(".stm-svc-card"));
      if (cards.length < 4) return;
      const wr = wrap.getBoundingClientRect();
      if (wr.width < 10 || wr.height < 10) return;
      const rows: { top: number; bottom: number }[] = [];
      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const row = Math.floor(i / 2);
        const top = r.top - wr.top;
        const bottom = r.bottom - wr.top;
        if (!rows[row]) rows[row] = { top, bottom };
        else { rows[row].top = Math.min(rows[row].top, top); rows[row].bottom = Math.max(rows[row].bottom, bottom); }
      });
      const cx = wr.width / 2;
      const sw = Math.min(230, wr.width * 0.19);
      const pts: [number, number][] = [[cx, -24]];
      rows.forEach((row, i) => {
        pts.push([cx, (row.top + row.bottom) / 2]);
        if (i < rows.length - 1) pts.push([cx + (i % 2 === 0 ? -sw : sw), (row.bottom + rows[i + 1].top) / 2]);
      });
      pts.push([cx, rows[rows.length - 1].bottom + 16]);
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const [x, y] = pts[i];
        const py = pts[i - 1][1];
        const k = Math.max(30, (y - py) * 0.45);
        d += i === 1 ? ` C${pts[0][0]} ${py + k} ${x} ${y - k} ${x} ${y}` : ` S${x} ${y - k} ${x} ${y}`;
      }
      svg.setAttribute("viewBox", `0 0 ${wr.width} ${wr.height}`);
      const paths = Array.from(svg.querySelectorAll<SVGPathElement>("path"));
      paths.forEach((p) => p.setAttribute("d", d));
      const core = svg.querySelector<SVGPathElement>(".stm-svc-t-core");
      const len = (core ? core.getTotalLength() : 4000) + 40;
      paths.forEach((p) => p.style.setProperty("--len", String(len)));
      const seams = rows.slice(0, -1).map((row, i) => (row.bottom + rows[i + 1].top) / 2);
      const totalY = pts[pts.length - 1][1] + 24;
      wrap.querySelectorAll<HTMLElement>(".stm-svc-orb").forEach((orb, i) => {
        if (seams[i] == null) return;
        orb.style.left = `${cx + (i % 2 === 0 ? -sw : sw)}px`;
        orb.style.top = `${seams[i]}px`;
        orb.style.setProperty("--fd", `${(3.4 + ((seams[i] + 24) / totalY) * 7).toFixed(2)}s`);
      });
    };

    build();
    if (document.fonts?.ready) document.fonts.ready.then(build).catch(() => undefined);
    let timer = 0;
    const onResize = () => { window.clearTimeout(timer); timer = window.setTimeout(build, 160); };
    window.addEventListener("resize", onResize);
    const gio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        build();
        wrap.classList.add("drawn");
        if (!reduced.matches) window.setTimeout(() => {
          try {
            (motionRef.current as SVGAnimationElement | null)?.beginElement();
            svg.classList.add("pulsing");
          } catch { /* SMIL unavailable: thread still draws, pulse stays off */ }
        }, 3400);
        gio.disconnect();
      });
    }, { threshold: 0.08 });
    gio.observe(wrap);
    return () => { window.removeEventListener("resize", onResize); window.clearTimeout(timer); gio.disconnect(); };
  }, []);

  return <section id="services" ref={sectionRef} className="stm-svc" aria-label="Services">
    <svg className="stm-svc-cap" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0 H1440 V38 C 1150 52 900 64 700 96 C 500 128 300 148 0 112 Z" /></svg>
    <div className="stm-svc-wash a" aria-hidden="true" />
    <div className="stm-svc-wash b" aria-hidden="true" />
    <svg className="stm-svc-corner tr" viewBox="0 0 300 180" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M10 170 C 90 60, 210 40, 296 86" strokeWidth="1" />
      <path d="M26 176 C 104 84, 212 66, 294 104" strokeWidth="1" opacity=".65" />
      <path d="M44 180 C 118 106, 214 92, 292 122" strokeWidth="1" opacity=".38" />
    </svg>
    <svg className="stm-svc-corner bl" viewBox="0 0 300 180" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M10 170 C 90 60, 210 40, 296 86" strokeWidth="1" />
      <path d="M26 176 C 104 84, 212 66, 294 104" strokeWidth="1" opacity=".65" />
    </svg>
    <div className="stm-svc-head" data-watch>
      <span className="stm-svc-note l" aria-hidden="true">Real solutions<br />for a brighter<br />tomorrow</span>
      <span className="stm-svc-note r" aria-hidden="true">Strategy<br />Creative<br />Systems<br />Growth</span>
      <div className="stm-svc-rise"><span className="stm-svc-eyebrow">— Services —</span></div>
      <h2><span className="stm-svc-rise"><span>Built to move your</span></span><span className="stm-svc-rise"><span>business <em>forward.</em></span></span></h2>
      <span className="stm-svc-dock" aria-hidden="true" />
    </div>
    <div className="stm-svc-gridwrap" ref={wrapRef}>
      <svg className="stm-svc-thread" ref={svgRef} viewBox="0 0 1200 1500" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="stm-svc-tg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F6C65A" />
            <stop offset="0.55" stopColor="#E8A13C" />
            <stop offset="1" stopColor="#4FC3E0" />
          </linearGradient>
        </defs>
        <path className="stm-svc-t-halo" />
        <path className="stm-svc-t-body" />
        <path className="stm-svc-t-cy" />
        <path className="stm-svc-t-core" id="stm-svc-tpath" />
        <circle className="stm-svc-t-pulse" r="4.5" fill="#fff">
          <animateMotion ref={motionRef} dur="7s" begin="indefinite" repeatCount="indefinite">
            <mpath href="#stm-svc-tpath" xlinkHref="#stm-svc-tpath" />
          </animateMotion>
        </circle>
      </svg>
      <span className="stm-svc-orb" aria-hidden="true" />
      <span className="stm-svc-orb" aria-hidden="true" />
      <span className="stm-svc-orb" aria-hidden="true" />
      <nav className="stm-svc-grid" aria-label="Service menu">
        {SERVICE_INDEX.map((svc) => <Link key={svc.num} to={svc.to} className="stm-svc-card" data-watch
          onClick={() => trackSiteEvent({ event_type: "cta_click", label: `services_${svc.slug}` })}>
          <span className="stm-svc-cnum" aria-hidden="true">{svc.num}</span>
          <span className="stm-svc-ctop">
            <span className="stm-svc-chip" aria-hidden="true"><svc.icon /></span>
            <span className="stm-svc-ctitle">
              <span className="stm-svc-cname">{svc.name}</span>
              <span className="stm-svc-cline">{svc.line}</span>
            </span>
          </span>
          <span className="stm-svc-clist">
            {svc.subs.map((item) => <span key={item}>{item}</span>)}
          </span>
          <span className="stm-svc-cgo">Explore {svc.name} <ArrowRight aria-hidden /></span>
        </Link>)}
      </nav>
    </div>
    <div className="stm-svc-proofline" data-watch aria-label="Credibility overview">{"Trusted by 500+ businesses · 4.9★ client satisfaction · San Diego, California"}</div>
    <div className="stm-svc-foot" data-watch>
      <span className="stm-svc-fnote l" aria-hidden="true">More possibility.</span>
      <Link to="/pricing" className="stm-svc-btn gold" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "services_see_packages" })}>See packages →</Link>
      <Link to="/free-audit?src=home-services" className="stm-svc-btn wine" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "services_free_checkup" })}>Free Business Checkup →</Link>
      <span className="stm-svc-fnote r" aria-hidden="true">A stronger tomorrow.</span>
    </div>
  </section>;
}

export function HomeOpening() {
  const [contactOpen, setContactOpen] = useState(false);
  const openContact = () => { setContactOpen(true); trackSiteEvent({ event_type: "cta_click", label: "contact_us" }); };
  return <>
    <OpeningHeader onContact={openContact} />
    <OpeningHero onContact={openContact} />
    <OpeningServices />
    <Dialog open={contactOpen} onOpenChange={setContactOpen}><DialogContent className="stm-opening-dialog"><DialogHeader><DialogTitle>Contact Supreme Team Media</DialogTitle><DialogDescription>Call or email us directly. No form required.</DialogDescription></DialogHeader><div className="stm-opening-phone-pending"><strong>Phone connection pending</strong><span>A public business number has not been confirmed.</span></div><Button asChild className="stm-opening-email"><a href={`mailto:${CONTACT_EMAIL}`}><Mail aria-hidden /> Email Us <span>{CONTACT_EMAIL}</span></a></Button></DialogContent></Dialog>
  </>;
}
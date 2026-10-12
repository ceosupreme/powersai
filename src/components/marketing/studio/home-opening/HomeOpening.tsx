import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, BookOpen, Building2, ChevronDown, Cog, Database, Globe, Mail, MapPin, Megaphone, Menu, Monitor, Play, Star, Tag, Users, X } from "lucide-react";
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
  { to: "/services/websites", num: "02", name: "Web Design", slug: "web_design", icon: Monitor,
    line: "Turn your online presence into a business asset.",
    subs: ["Business websites", "Landing pages", "Site redesigns", "Mobile-first design", "Conversion-focused pages", "Hosting and care plans"] },
  { to: "/services/brand", num: "03", name: "Media", slug: "media", icon: Play,
    line: "Give people something worth remembering.",
    subs: ["Photography", "Video production", "Content creation", "Social content", "Brand storytelling"] },
  { to: "/services/brand", num: "04", name: "Brand", slug: "brand", icon: Tag,
    line: "Make the quality of your business obvious.",
    subs: ["Logo and identity", "Naming", "Brand messaging", "Copywriting", "Typography and color", "Print, signage and menus"] },
  { to: "/services/ai-systems?intent=sales", num: "05", name: "Sales", slug: "sales", icon: Users,
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


/** Hero energy routes, traced onto the render's tubes (render pixel space,
 *  tile end first so pulses travel up into the orb), with each route's
 *  measured length. Fired left to right. Pulse colors contrast their tube
 *  (cyan on the gold tubes, gold on the blue one) so they never blend in. */
const COMMAND_ENERGY = [
  { tone: "cyan", delay: "0s", len: 288.5, d: "M1140 479 C1225 464 1310 450 1352 436 C1380 426 1388 408 1387 380" },
  { tone: "cyan", delay: "1.3s", len: 198, d: "M1336 502 C1375 490 1415 472 1440 459 C1458 449 1465 432 1466 382" },
  { tone: "gold", delay: "2.6s", len: 176.4, d: "M1563 524 C1558 498 1530 476 1502 462 C1484 452 1481 430 1480 382" },
  { tone: "cyan", delay: "3.9s", len: 280.2, d: "M1768 532 C1720 494 1650 470 1605 454 C1570 441 1550 424 1549 382" },
] as const;
/** One comet = four strokes sharing a leading edge: blurred glow, faint
 *  long tail, bright colored body, white-hot head. Each runs a single dash
 *  (period 1000, longer than any route) whose offset moves from
 *  (1000 + its length) to (1000 + its length - route/0.75), so every layer's
 *  leading edge travels together and every route lands at the same moment
 *  (75% of the run), keeping the orb flash in sync. */
const ENERGY_LAYERS = [
  { cls: "stm-energy-glow", len: 80 },
  { cls: "stm-energy-tail", len: 120 },
  { cls: "stm-energy-body", len: 52 },
  { cls: "stm-energy-head", len: 22 },
] as const;
const ENERGY_PERIOD = 1000;

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
        <defs>
          <filter id="stm-energy-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.25" /></filter>
          <radialGradient id="stm-energy-flash-fill">
            <stop offset="0" stopColor="#FFF8E6" stopOpacity=".95" />
            <stop offset=".35" stopColor="#F6C65A" stopOpacity=".55" />
            <stop offset="1" stopColor="#F6C65A" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Energy pulses: comets that ride the render's real tubes from each
            tile up into the orb, fired left to right so power is always
            flowing; the orb's base flashes as each one lands. Routes are
            traced in the render's own pixel space (1920x1081) and scaled
            onto the overlay. */}
        <g className="stm-command-energy" fill="none" aria-hidden="true" transform="scale(.625 .62442)">
          {COMMAND_ENERGY.map((route) => (
            <g key={route.d} className={`stm-energy-${route.tone}`} style={{ "--ed": route.delay } as CSSProperties}>
              {ENERGY_LAYERS.map((layer) => (
                <path
                  key={layer.cls}
                  className={layer.cls}
                  d={route.d}
                  filter={layer.cls === "stm-energy-glow" ? "url(#stm-energy-blur)" : undefined}
                  style={{
                    strokeDasharray: `${layer.len} ${ENERGY_PERIOD - layer.len}`,
                    "--d0": `${ENERGY_PERIOD + layer.len}px`,
                    "--d1": `${(ENERGY_PERIOD + layer.len - route.len / 0.75).toFixed(1)}px`,
                  } as CSSProperties}
                />
              ))}
            </g>
          ))}
          <circle className="stm-energy-flash" cx="1468" cy="368" r="40" fill="url(#stm-energy-flash-fill)" />
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

type SvcBox = { l: number; t: number; r: number; b: number };

/** Icon tile colors cycle gold, teal, wine across the menu. */
const SVC_TONES = ["gold", "teal", "wine"] as const;

/**
 * Two loops around a card's rounded edge (20px corners), both starting where
 * its feed line plugs in: one clockwise, one counter-clockwise. With
 * pathLength 100, drawing the first half of each makes the light split at the
 * plug and meet exactly opposite it.
 */
function cardEdgeLoops(w: number, h: number, plugY: number, right: boolean): [string, string] {
  const q = 0.9; // the stroke sits on the card's 1px border
  const R = 20 - q;
  const c = 20; // where each corner's arc begins
  const y = Math.min(Math.max(plugY, c + 1), h - c - 1);
  const f = (n: number) => n.toFixed(2);
  const sx = right ? w - q : q;
  type Seg = { x: number; y: number; arc: boolean };
  const segs: Seg[] = right
    ? [{ x: w - q, y: h - c, arc: false }, { x: w - c, y: h - q, arc: true }, { x: c, y: h - q, arc: false }, { x: q, y: h - c, arc: true },
      { x: q, y: c, arc: false }, { x: c, y: q, arc: true }, { x: w - c, y: q, arc: false }, { x: w - q, y: c, arc: true }, { x: w - q, y, arc: false }]
    : [{ x: q, y: c, arc: false }, { x: c, y: q, arc: true }, { x: w - c, y: q, arc: false }, { x: w - q, y: c, arc: true },
      { x: w - q, y: h - c, arc: false }, { x: w - c, y: h - q, arc: true }, { x: c, y: h - q, arc: false }, { x: q, y: h - c, arc: true }, { x: q, y, arc: false }];
  const step = (to: { x: number; y: number }, arc: boolean, sweep: 0 | 1) => (arc ? ` A${f(R)} ${f(R)} 0 0 ${sweep} ` : " L") + `${f(to.x)} ${f(to.y)}`;
  const cw = `M${f(sx)} ${f(y)}` + segs.map((s) => step(s, s.arc, 1)).join("");
  // Same loop walked backwards: each segment keeps its shape, arcs flip.
  const starts = [{ x: sx, y }, ...segs];
  let ccw = `M${f(sx)} ${f(y)}`;
  for (let k = segs.length - 1; k >= 0; k--) ccw += step(starts[k], segs[k].arc, 0);
  return [cw, ccw];
}

/**
 * The services circuit board, drawn in code from the live layout so it stays
 * sharp and seated at every width. A lit rail runs down each margin (gold
 * left, cyan right) with three lanes branching off it into the row gaps, each
 * ending in a small junction. Every card has its own feed: an engraved line
 * from the nearest rail or lane into its outer edge at the icon, with a hidden
 * lit overlay that runs when the card is hovered (or once as it scrolls in on
 * touch screens). Some engraved circuitry carries on under the cards and
 * disappears beneath their frosted fronts. Flank
 * bundles run in off the top edge (wired to the hero above) and out the
 * bottom edge. Ambient signals are numbered (data-o) and
 * fired one at a time by OpeningServices; nothing runs down the middle, so the
 * cards keep the eye. Phones get one lit rail down each edge and a feed into
 * every card. Each card's edge-trace loops and feed timing are written here
 * too, since they come from the same measurements.
 */
function drawServiceBoard(section: HTMLElement, svg: SVGSVGElement) {
  const S = section.getBoundingClientRect();
  const W = Math.round(S.width);
  const H = Math.round(S.height);
  const gridEl = section.querySelector<HTMLElement>(".stm-svc-grid");
  const head = section.querySelector<HTMLElement>(".stm-svc-head");
  if (W < 10 || H < 10 || !gridEl || !head) return;
  const at = (r: DOMRect): SvcBox => ({ l: r.left - S.left, t: r.top - S.top, r: r.right - S.left, b: r.bottom - S.top });
  const G = at(gridEl.getBoundingClientRect());
  // Layout offsets rather than rects: cards slide in with a transform.
  const cardEls = Array.from(gridEl.querySelectorAll<HTMLElement>(".stm-svc-card"));
  const cards: SvcBox[] = cardEls.map((c) => ({
    l: G.l + c.offsetLeft, t: G.t + c.offsetTop, r: G.l + c.offsetLeft + c.offsetWidth, b: G.t + c.offsetTop + c.offsetHeight,
  }));
  if (cards.length < 2) return;
  // Each card's feed plugs in level with the center of its icon tile.
  const plugY = cardEls.map((c) => {
    const chip = c.querySelector<HTMLElement>(".stm-svc-chip");
    return chip ? 1 + chip.offsetTop + chip.offsetHeight / 2 : 56;
  });
  // Horizontal extent of the actual words (text nodes only; the headline's
  // line wrappers are full-width blocks).
  const textSpan = (el: Element | null) => {
    if (!el) return null;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let l = Infinity;
    let r = -Infinity;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0) { l = Math.min(l, rect.left); r = Math.max(r, rect.right); }
    }
    return l < r ? { l: l - S.left, r: r - S.left } : null;
  };
  const f = (n: number) => n.toFixed(1);
  const pathD = (pts: number[][]) => "M" + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(" L");
  const length = (pts: number[][]) => pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  const desktop = window.matchMedia("(min-width: 861px)").matches;
  const plates: string[] = [];
  const decor: string[] = [];
  const unlit: string[] = [];
  const lit: string[] = [];
  const feeds: string[] = [];
  const comets: string[] = [];
  const pads: string[] = [];
  let fxNext = 0;
  const litLayers = (d: string) => `<path class="lw" d="${d}"/><path class="lh" d="${d}"/><path class="lb" d="${d}"/><path class="lc" d="${d}"/>`;
  // One comet: glow, body and white head sharing a leading edge. A single
  // dash per layer travels from just before the route's start to just past
  // its end (offsets d0 -> d1), so nothing shows between runs.
  const cometPaths = (d: string, L: number, lead: number) => ([["cg", 90], ["cb", 52], ["ch", 18]] as [string, number][]).map(([cls, c]) => {
    const d1 = f(c - L - lead);
    return `<path class="cm ${cls}" d="${d}" style="stroke-dasharray:${c} ${f(L + lead * 2 + 80)};--d0:${c}px;--d1:${d1}px" data-d0="${c}" data-d1="${d1}"/>`;
  }).join("");
  const trace = (pts: number[][]) => { unlit.push(`<path class="u" d="${pathD(pts)}"/>`); };
  // A lit line; with `seq` it also carries an ambient signal, fired in that
  // order, and `fx` names the node that flashes as the signal lands.
  const live = (pts: number[][], tone: "gold" | "cyan", seq?: number, fx?: { id: number; at: number }) => {
    const d = pathD(pts);
    lit.push(`<g class="${tone}">${litLayers(d)}</g>`);
    if (seq == null) return;
    const L = length(pts);
    const lead = 90;
    const dur = desktop ? clamp((L + lead) / 380, 1, 3) : clamp((L + lead) / 520, 1.2, 7.5);
    comets.push(`<g class="cmg ${tone}" data-o="${seq}" data-dur="${dur.toFixed(2)}"${fx ? ` data-fx="${fx.id}" data-fxt="${fx.at}"` : ""}>${cometPaths(d, L, lead)}</g>`);
  };
  const pad = (x: number, y: number) => { pads.push(`<circle class="pu" cx="${f(x)}" cy="${f(y)}" r="4.2"/>`); };
  const via = (x: number, y: number) => { pads.push(`<circle class="pu" cx="${f(x)}" cy="${f(y)}" r="3"/>`); };
  const joint = (x: number, y: number, tone: "gold" | "cyan") => { pads.push(`<circle class="jn ${tone}" cx="${f(x)}" cy="${f(y)}" r="3.4"/>`); };
  // A small glowing junction. `fx` lets a landing signal flash it; `card`
  // ties it to a card's touch-screen power-up.
  const node = (x: number, y: number, tone: "gold" | "cyan", r: number, fx?: number, card?: number) => {
    pads.push(`<g class="fl ${tone}"${fx != null ? ` data-fx="${fx}"` : ""}${card != null ? ` data-i="${card}"` : ""}><circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="url(#stm-fl-${tone})"/><circle class="fr" cx="${f(x)}" cy="${f(y)}" r="${Math.max(3.4, r * 0.34).toFixed(1)}"/><circle class="fc" cx="${f(x)}" cy="${f(y)}" r="${Math.max(1.5, r * 0.14).toFixed(1)}"/></g>`);
  };
  const dots = (x: number, y: number, cols: number, rows: number, step = 10) => {
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) decor.push(`<circle class="dt" cx="${f(x + i * step)}" cy="${f(y + j * step)}" r="1.7"/>`);
  };
  const ring = (x: number, y: number) => { decor.push(`<circle class="rg" cx="${f(x)}" cy="${f(y)}" r="5.5"/><circle class="dt" cx="${f(x)}" cy="${f(y)}" r="1.6"/>`); };
  const plate = (x0: number, y0: number, x1: number, y1: number) => {
    if (x1 - x0 < 40 || y1 - y0 < 60) return;
    plates.push(`<rect class="pl" x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" rx="18"/><rect class="pi" x="${f(x0 + 9)}" y="${f(y0 + 9)}" width="${f(x1 - x0 - 18)}" height="${f(y1 - y0 - 18)}" rx="11"/>`);
  };
  /**
   * A card's own feed, in mirrored space (x measured from the card's side of
   * the screen): an engraved stub from its source line into the card's outer
   * edge, and a hidden lit overlay whose signal comes down the source line
   * and turns into the card. Returns the signal's travel time, which the
   * card's edge trace waits for.
   */
  const feed = (i: number, srcX: number, top: number, srcLit: boolean, withJoint: boolean) => {
    const side = i % 2 === 0 ? "l" : "r";
    const tone = side === "l" ? "gold" : "cyan";
    const X = (x: number) => (side === "l" ? x : W - x);
    const c = cards[i];
    const edge = side === "l" ? c.l : W - c.r;
    const y = c.t + plugY[i];
    if (edge - srcX < 6) return 0.12;
    unlit.push(`<path class="u" d="${pathD([[X(srcX), y], [X(edge), y]])}"/>`);
    if (withJoint) { if (srcLit) joint(X(srcX), y, tone); else pad(X(srcX), y); }
    pads.push(`<circle class="pin ${tone}" cx="${f(X(edge))}" cy="${f(y)}" r="3.6"/>`);
    // Desktop: the stub carries on under the glass to a via beside the icon.
    if (desktop) { trace([[X(edge), y], [X(edge + 22), y]]); via(X(edge + 22), y); }
    const pts = [[X(srcX), Math.max(top, y - 150)], [X(srcX), y], [X(edge + 2), y]];
    const d = pathD(pts);
    const L = length(pts);
    const lead = 60;
    const dur = clamp((L + lead) / 1000, 0.2, 0.42);
    feeds.push(`<g class="fd ${tone}" data-i="${i}" style="--fdur:${dur.toFixed(2)}s">${litLayers(d)}${cometPaths(d, L, lead)}</g>`);
    return dur;
  };
  const sides = ["l", "r"] as const;
  const feedTime = cards.map(() => 0.12);

  if (desktop && cards.length >= 8) {
    const gw = G.r - G.l;
    const cw = cards[0].r - cards[0].l;
    const M = Math.min(G.l, W - G.r);
    const rows = [0, 1, 2, 3].map((i) => ({ t: Math.min(cards[i * 2].t, cards[i * 2 + 1].t), b: Math.max(cards[i * 2].b, cards[i * 2 + 1].b) }));
    const gaps = [0, 1, 2].map((i) => (rows[i].b + rows[i + 1].t) / 2);
    const plugRow = [0, 1, 2, 3].map((i) => cards[i * 2].t + plugY[i * 2]);
    const hb = at(head.getBoundingClientRect());
    const spans = [textSpan(head.querySelector("h2")), textSpan(head.querySelector(".stm-svc-sub"))].filter((x): x is { l: number; r: number } => !!x);
    const K = { l: Math.min(W / 2 - 220, ...spans.map((x) => x.l)) - 34, t: hb.t };
    const trustEls = [section.querySelector<HTMLElement>(".stm-svc-trust"), ...Array.from(section.querySelectorAll<HTMLElement>(".stm-svc-foot a"))].filter((x): x is HTMLElement => !!x);
    const tb = trustEls.map((el) => at(el.getBoundingClientRect()));
    const T = tb.length ? { l: Math.min(...tb.map((x) => x.l)), t: Math.min(...tb.map((x) => x.t)), b: Math.max(...tb.map((x) => x.b)) } : { l: W / 2 - 300, t: G.b + 60, b: G.b + 200 };
    const trust = trustEls[0] ? at(trustEls[0].getBoundingClientRect()) : null;
    const tm = trust ? (trust.t + trust.b) / 2 : T.t + 30;

    // Margin rails: a lit rail down each edge, three lanes branching off it
    // into the row gaps. Lane k turns into gap k, innermost first, so no two
    // lines ever cross. Lit lanes alternate sides down the board.
    const sp = clamp(M * 0.1, 7, 18);
    const sx = clamp(M * 0.2, 9, 110);
    const laneX = [sx + sp * 3.2, sx + sp * 2.2, sx + sp * 1.2];
    const branchY = [G.t - 120, G.t - 98, G.t - 76];
    const lanesFit = M >= 48;
    const inner = lanesFit ? laneX[0] : sx;
    const LIT = { l: [true, false, true], r: [false, true, true] };
    // Ambient order: power comes in off the top on both sides, takes turns
    // down the rails and lanes, and leaves out the bottom.
    const SEQ = { head: { l: 0, r: 1 }, rail: { l: 2, r: 5 }, lane: { l: [4, -1, 6], r: [-1, 3, 7] }, foot: { l: 8, r: 9 } };
    if (M >= 26) {
      sides.forEach((side) => {
        const X = (x: number) => (side === "l" ? x : W - x);
        const tone = side === "l" ? "gold" : "cyan";
        live([[X(sx), -10], [X(sx), H + 10]], tone, SEQ.rail[side]);
        if (!lanesFit) return;
        laneX.forEach((x, k) => {
          const y0 = branchY[k];
          const g = gaps[k];
          const on = LIT[side][k];
          const endX = G.l + cw * (on ? 0.32 : 0.17);
          const pts = [[X(sx), y0], [X(x), y0 + (x - sx)], [X(x), g - 12], [X(x + 12), g], [X(endX), g]];
          joint(X(sx), y0, tone);
          if (on) {
            const id = fxNext++;
            live(pts, tone, SEQ.lane[side][k], { id, at: 0.9 });
            node(X(endX), g, tone, 10, id);
          } else {
            // Unlit lanes dive under the card below and run on under its glass.
            trace([...pts, [X(endX + 26), g + 26], [X(endX + 96), g + 26]]);
            via(X(endX + 96), g + 26);
          }
        });
        if (M >= 70) plate(X(side === "l" ? -30 : laneX[0] + 24), gaps[0] + 54, X(side === "l" ? laneX[0] + 24 : -30), gaps[2] - 54);
        if (M >= 150) {
          // Wide screens: engraved stubs and a dot strip in the free band,
          // kept between the feed lines so nothing crosses.
          const band = laneX[0] + 34;
          const room = M - 24 - band;
          if (room > 40) {
            const bx = band + room * 0.35;
            [[1, 0], [2, 30]].forEach(([r, dx]) => {
              // From below row r's feed to above the next row gap's lane.
              const ya = plugRow[r] + 40;
              const s = gaps[r] - 24 - ya;
              if (s < 80) return;
              const x0 = bx + dx;
              const x1 = dx ? bx + 12 : bx + 18;
              const stub = [[X(x0), ya], [X(x0), ya + s * 0.5], [X(x1), ya + s * 0.5 + Math.abs(x1 - x0)], [X(x1), ya + s]];
              trace(stub); pad(X(x0), ya); pad(X(x1), ya + s);
            });
            dots(side === "l" ? M - 46 : W - M + 26, gaps[2] - 120, 3, 6);
          }
        }
      });
      // Every card's feed: from the innermost line still running beside it
      // (lane r for row r, the rail for the bottom row) into its outer edge.
      cards.forEach((_, i) => {
        const side = i % 2 === 0 ? "l" : "r";
        const row = Math.floor(i / 2);
        const fromLane = lanesFit && row < 3;
        const srcX = fromLane ? laneX[row] : sx;
        const top = fromLane ? branchY[row] + (laneX[row] - sx) + 4 : 0;
        feedTime[i] = feed(i, srcX, top, fromLane ? LIT[side][row] : true, true);
      });
    }

    // Under the glass: pairs of engraved traces cross every row gap from one
    // card's quiet bottom corner into the next card's top padding, enter the
    // top row from above and leave the bottom row below, and two short
    // bridges tie the columns together. The lines show in the gaps and
    // disappear under the frosted cards; they stay in padding and empty
    // corners and are staggered so nothing lines up into a line down a column.
    const colL = [G.l, G.r - cw];
    const pair = (x: number, y0: number, y1: number, jogAt?: number) => {
      [0, 9].forEach((o) => {
        const pts = jogAt == null
          ? [[x + o, y0], [x + o, y1]]
          : [[x + o, y0], [x + o, jogAt - 5], [x + o + 9, jogAt + 4], [x + o + 9, y1]];
        trace(pts);
        via(pts[0][0], pts[0][1]);
        via(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      });
    };
    // Where each pair sits across its column (top entry, gaps 0-2, bottom
    // exit): clear of the Explore links and of the lanes' ends in the gaps.
    const FR = [[0.66, 0.6, 0.72, 0.56, 0.62], [0.5, 0.46, 0.52, 0.44, 0.48]];
    [0, 1].forEach((col) => {
      const x = (k: number) => colL[col] + cw * FR[col][k];
      pair(x(0), G.t - 26, cards[col].t + 18);
      [0, 1, 2].forEach((k) => pair(x(k + 1), cards[k * 2 + col].b - 34, cards[(k + 1) * 2 + col].t + 18, gaps[k]));
      pair(x(4), cards[6 + col].b - 34, G.b + 26);
    });
    [1, 2].forEach((k) => {
      const a = cards[k * 2];
      const b = cards[k * 2 + 1];
      const y = a.b - 12;
      trace([[a.r - 84, y], [b.l + 24, y]]);
      via(a.r - 84, y);
      via(b.l + 24, y);
    });

    // Header flank bundles: three traces run in off the top edge and bend
    // toward the cards; the middle one is lit and carries power down.
    const b = Math.min(K.l - 24, G.l + gw * 0.24);
    const a = Math.max(inner + 36, b - 170);
    const span = b - a;
    const endY = [G.t - 70, G.t - 50, G.t - 30];
    const yd = Math.min(K.t + 14, endY[0] - span - 34);
    if (span >= 30 && b > inner + 70 && yd > 40) {
      sides.forEach((side) => {
        const X = (x: number) => (side === "l" ? x : W - x);
        const tone = side === "l" ? "gold" : "cyan";
        [0, 1, 2].forEach((k) => {
          const o = k * 11;
          const pts = [[X(a + o), -10], [X(a + o), yd], [X(b + o), yd + span], [X(b + o), endY[k]]];
          if (k === 1) {
            const id = fxNext++;
            live(pts, tone, SEQ.head[side], { id, at: 0.9 });
            node(X(b + o), endY[k], tone, 12, id);
          } else { trace(pts); pad(X(b + o), endY[k]); }
        });
        if (a - 50 > inner + 16) dots(side === "l" ? a - 50 : W - a + 30, yd + 26, 3, 5);
        plate(side === "l" ? -30 : W - Math.min(b + 56, K.l - 12), Math.max(96, yd - 60), side === "l" ? Math.min(b + 56, K.l - 12) : W + 30, G.t - 98);
        if (a - 24 > inner + 12) ring(X(a - 24), G.t - 120);
      });
    }

    // Bottom flank bundles: power leaves past the trust row and runs out the
    // bottom edge into the next scene.
    const sx0 = T.l - 36;
    const cBase = Math.max(inner + 30, sx0 - 200);
    const ys = [tm - 16, tm, tm + 16];
    if (sx0 - (cBase + 22 + 12) >= 24) {
      sides.forEach((side) => {
        const X = (x: number) => (side === "l" ? x : W - x);
        const tone = side === "l" ? "cyan" : "gold";
        [0, 1, 2].forEach((k) => {
          const c = cBase + k * 11;
          const pts = [[X(sx0), ys[k]], [X(c + 12), ys[k]], [X(c), ys[k] + 12], [X(c), H + 10]];
          if (k === 1) {
            const id = fxNext++;
            live(pts, tone, SEQ.foot[side], { id, at: 0.04 });
            node(X(sx0), ys[k], tone, 9, id);
          } else { trace(pts); pad(X(sx0), ys[k]); }
        });
        plate(side === "l" ? -30 : W - (cBase + 70), G.b + 46, side === "l" ? cBase + 70 : W + 30, H - 30);
        if (cBase - 50 > inner + 16) dots(side === "l" ? cBase - 50 : W - cBase + 30, tm + 34, 3, 4);
      });
    }
  } else {
    // Phones and small tablets: a lit rail down each edge, and every card
    // plugged into the rail on the side its status light is on.
    const railX = 7;
    live([[railX, -10], [railX, H + 10]], "gold", 0);
    live([[W - railX, -10], [W - railX, H + 10]], "cyan", 1);
    cards.forEach((c, i) => {
      const side = i % 2 === 0 ? "l" : "r";
      feedTime[i] = feed(i, railX, 0, true, false);
      node(side === "l" ? railX : W - railX, c.t + plugY[i], side === "l" ? "gold" : "cyan", 7, undefined, i);
    });
  }

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = `<defs>
    <radialGradient id="stm-fl-gold"><stop offset="0" stop-color="#FFD25E" stop-opacity="1"/><stop offset=".4" stop-color="#FFAE1A" stop-opacity=".5"/><stop offset="1" stop-color="#FFAE1A" stop-opacity="0"/></radialGradient>
    <radialGradient id="stm-fl-cyan"><stop offset="0" stop-color="#9AEBFF" stop-opacity="1"/><stop offset=".4" stop-color="#1CC0EE" stop-opacity=".48"/><stop offset="1" stop-color="#1CC0EE" stop-opacity="0"/></radialGradient>
    <linearGradient id="stm-pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F8F9FB"/><stop offset="1" stop-color="#EBEEF2"/></linearGradient>
  </defs>${plates.join("")}${decor.join("")}${unlit.join("")}${lit.join("")}${feeds.join("")}${comets.join("")}${pads.join("")}`;

  // Each card's edge trace starts where its feed plugs in, timed to begin as
  // the feed's signal arrives.
  cardEls.forEach((el, i) => {
    el.style.setProperty("--edl", `${(feedTime[i] * 0.85).toFixed(2)}s`);
    const edge = el.querySelector<SVGSVGElement>(".stm-svc-edge");
    if (!edge) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const [cw, ccw] = cardEdgeLoops(w, h, plugY[i], i % 2 === 1);
    edge.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const paths = edge.querySelectorAll("path");
    paths[0]?.setAttribute("d", cw);
    paths[1]?.setAttribute("d", ccw);
  });
}

function OpeningServices() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const boardRef = useRef<SVGSVGElement | null>(null);

  // Headline, cards, trust row and buttons reveal as they enter view.
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

  // The board: drawn from the real card positions (redrawn on resize and once
  // fonts load); ambient signals fired one at a time while the section is on
  // screen; each card's feed lit on hover or keyboard focus, or once as the
  // card scrolls in on touch screens. Reduced motion: no signals, no power-up.
  useEffect(() => {
    const section = sectionRef.current;
    const board = boardRef.current;
    if (!section || !board) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const cards = Array.from(section.querySelectorAll<HTMLElement>(".stm-svc-card"));
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id);
    };

    const build = () => drawServiceBoard(section, board);
    build();
    if (document.fonts?.ready) document.fonts.ready.then(build).catch(() => undefined);
    let resizeTimer = 0;
    const schedule = () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(build, 160); };
    window.addEventListener("resize", schedule);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(section);

    // Replays a junction's one-shot flash.
    const flash = (el: Element | null) => {
      if (!el) return;
      el.classList.remove("zap");
      void el.getBoundingClientRect();
      el.classList.add("zap");
    };

    // Ambient signals take turns in the board's order: the next leaves when
    // the last is about 60% of the way, so one or two move at once, and a
    // junction flashes as its signal lands. A short rest after each lap.
    let visible = false;
    let running = false;
    let seq = 0;
    const tick = () => {
      running = false;
      if (reduced.matches || !visible || document.visibilityState !== "visible") return;
      const routes = Array.from(board.querySelectorAll<SVGGElement>(".cmg")).sort((a, b) => Number(a.dataset.o) - Number(b.dataset.o));
      running = true;
      if (routes.length === 0) { later(tick, 800); return; }
      const route = routes[seq % routes.length];
      seq += 1;
      const dur = (Number(route.dataset.dur) || 1.6) * 1000;
      route.querySelectorAll<SVGPathElement>(".cm").forEach((path) => {
        path.animate([
          { strokeDashoffset: `${path.dataset.d0}px`, opacity: 0 },
          { opacity: 1, offset: 0.06 },
          { opacity: 1, offset: 0.9 },
          { strokeDashoffset: `${path.dataset.d1}px`, opacity: 0 },
        ], { duration: dur, easing: "linear" });
      });
      const fx = route.dataset.fx;
      if (fx) later(() => flash(board.querySelector(`.fl[data-fx="${fx}"]`)), dur * (Number(route.dataset.fxt) || 0.9));
      later(tick, Math.max(900, dur * 0.62) + (seq % routes.length === 0 ? 1400 : 0));
    };
    const resume = () => {
      if (running || !visible || reduced.matches) return;
      running = true;
      later(tick, 300);
    };
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      section.classList.toggle("is-paused", !visible);
      resume();
    });
    seen.observe(section);
    document.addEventListener("visibilitychange", resume);

    // A card's own feed: lit while it's hovered or focused.
    const setHot = (i: number, on: boolean) => {
      const fd = board.querySelector<SVGGElement>(`.fd[data-i="${i}"]`);
      if (!fd) return;
      if (on && fd.classList.contains("hot")) return;
      fd.classList.remove("hot");
      if (!on) return;
      void fd.getBoundingClientRect();
      fd.classList.add("hot");
    };
    const unbind: (() => void)[] = [];
    cards.forEach((card, i) => {
      const enter = () => { if (canHover.matches) setHot(i, true); };
      const focus = () => setHot(i, true);
      const leave = () => { if (document.activeElement !== card) setHot(i, false); };
      const blur = () => { if (!card.matches(":hover")) setHot(i, false); };
      card.addEventListener("mouseenter", enter);
      card.addEventListener("mouseleave", leave);
      card.addEventListener("focus", focus);
      card.addEventListener("blur", blur);
      unbind.push(() => {
        card.removeEventListener("mouseenter", enter);
        card.removeEventListener("mouseleave", leave);
        card.removeEventListener("focus", focus);
        card.removeEventListener("blur", blur);
      });
    });

    // Touch screens can't hover: each card powers up once as it scrolls in.
    let powerUp: IntersectionObserver | null = null;
    if (!canHover.matches && !reduced.matches) {
      powerUp = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const card = entry.target as HTMLElement;
          powerUp?.unobserve(card);
          const i = cards.indexOf(card);
          later(() => {
            setHot(i, true);
            card.classList.add("zap");
            later(() => flash(board.querySelector(`.fl[data-i="${i}"]`)), 160);
            later(() => setHot(i, false), 1700);
          }, 250);
        });
      }, { threshold: 0.6 });
      cards.forEach((card) => powerUp?.observe(card));
    }

    return () => {
      window.removeEventListener("resize", schedule);
      window.clearTimeout(resizeTimer);
      ro?.disconnect();
      seen.disconnect();
      powerUp?.disconnect();
      document.removeEventListener("visibilitychange", resume);
      timers.forEach((id) => window.clearTimeout(id));
      unbind.forEach((off) => off());
    };
  }, []);

  return <section id="services" ref={sectionRef} className="stm-svc" aria-label="Services">
    <svg className="stm-svc-board" ref={boardRef} aria-hidden="true" />
    <div className="stm-svc-head" data-watch>
      <div className="stm-svc-rise"><span><span className="stm-svc-eyebrow">Our services</span></span></div>
      <h2><span className="stm-svc-rise"><span>Built to move your</span></span><span className="stm-svc-rise"><span>business <em>forward.</em></span></span></h2>
      <p className="stm-svc-sub">Marketing, media and AI systems that work together to get you more customers, more revenue and more control.</p>
    </div>
    <div className="stm-svc-gridwrap">
      <nav className="stm-svc-grid" aria-label="Service menu">
        {SERVICE_INDEX.map((svc, i) => <Link key={svc.num} to={svc.to} className="stm-svc-card" data-watch data-tone={SVC_TONES[i % 3]} data-side={i % 2 ? "r" : "l"}
          onClick={() => trackSiteEvent({ event_type: "cta_click", label: `services_${svc.slug}` })}>
          <svg className="stm-svc-edge" aria-hidden="true"><path pathLength={100} /><path pathLength={100} /></svg>
          <span className="stm-svc-status" aria-hidden="true">
            <span className="stm-svc-cnum">{svc.num}</span>
            <span className="stm-svc-online">Online</span>
            <i />
          </span>
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
    <div className="stm-svc-trust" data-watch aria-label="Credibility overview">
      <div><Building2 aria-hidden /><span><strong>500+</strong><small>Businesses trust us</small></span></div>
      <div><Star aria-hidden className="star" /><span><strong>{"4.9★"}</strong><small>Client satisfaction</small></span></div>
      <div><MapPin aria-hidden /><span><strong>San Diego</strong><small>Our home base</small></span></div>
    </div>
    <div className="stm-svc-foot" data-watch>
      <Link to="/pricing" className="stm-svc-btn gold" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "services_see_packages" })}>See packages <ArrowRight aria-hidden /></Link>
      <Link to="/free-audit?src=home-services" className="stm-svc-btn wine" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "services_free_checkup" })}>Free Business Checkup <ArrowRight aria-hidden /></Link>
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
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Handshake, MonitorSmartphone, Search, Star } from "lucide-react";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { requestServiceIntent, type ServiceId } from "../serviceIntent";
import "./startingPoint.css";

/**
 * Homepage decision block, right after Work, built as another bay of the
 * services circuit board: four states an owner can place themselves in at a
 * glance (have a site, already ranking, no site yet, hand it all off), each a
 * frosted module fed by the gold or cyan rail, and under them the free
 * business checkup, where they type their business name and city and go
 * straight to their free report. A card either links to a page or jumps to the contact
 * form below with its service preselected (there is no separate reviews page).
 */
type Choice = {
  tone: "gold" | "cyan" | "wine" | "teal";
  icon: typeof Search;
  say: string;
  line: string;
  cta: string;
  track: string;
} & ({ to: string; contact?: never } | { contact: ServiceId; to?: never });

const CHOICES: Choice[] = [
  {
    tone: "cyan",
    icon: Search,
    say: "I already have a website…",
    line: "Let's see if it's actually bringing you customers.",
    cta: "Get my free checkup",
    to: "/free-audit?src=home-start",
    track: "home_start_checkup_card",
  },
  {
    tone: "gold",
    icon: Star,
    say: "My website is already ranking well…",
    line: "Awesome. Now let's help you earn more reviews and keep your Google Business Profile optimized so you stay ahead.",
    cta: "Start with review automation",
    contact: "marketing-growth",
    track: "home_start_reviews",
  },
  {
    tone: "wine",
    icon: MonitorSmartphone,
    say: "I don't have a website yet…",
    line: "No problem. We'll build a professional website that's designed to rank on Google and turn visitors into customers.",
    cta: "Build my website",
    to: "/services/websites",
    track: "home_start_website",
  },
  {
    tone: "teal",
    icon: Handshake,
    say: "I want everything handled…",
    line: "We'll build your website, set up local SEO so nearby customers find you on Google, automate your review requests, and manage your Google Business Profile.",
    cta: "See the packages",
    to: "/pricing",
    track: "home_start_packages",
  },
];

// What the checkup actually does from a name and city: it finds their
// website on their Google listing and checks it too. The ranking against
// the top three is in the full list (after email), so the steps say so.
const CHECKUP_STEPS = [
  "You type in your business name and city.",
  "The tool looks up your Google listing, reviews and website, and finds the top three businesses near you on Google Maps.",
  "Your report shows the top things to fix and roughly what they're costing you each month. Add your email to get the full list, including how you rank against those top three.",
];

/** Same rules the checkup page applies to a business name passed in a link. */
const cleanName = (value: string) => value.replace(/[^\p{L}\p{N}\s&'.-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40);
const cleanCity = (value: string) => value.replace(/[^\p{L}\p{N}\s,.'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60);

/** The site doesn't reset scroll between pages, so links from here open the
 *  next page at its top (after the new page has rendered). */
const openAtTop = () => requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }));

/**
 * The board behind the modules, drawn from the live layout: a gold rail down
 * the left margin and a cyan rail down the right (the services board's
 * colors), an engraved feed from the rail into each card's outer edge at its
 * icon, and both rails turning in to plug into the checkup console. A card's
 * feed lights up while it is hovered or focused.
 */
function drawBoard(section: HTMLElement, svg: SVGSVGElement) {
  const sr = section.getBoundingClientRect();
  const W = section.clientWidth;
  const H = section.clientHeight;
  const box = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { l: r.left - sr.left, t: r.top - sr.top, r: r.right - sr.left, b: r.bottom - sr.top };
  };
  const cards = Array.from(section.querySelectorAll<HTMLElement>(".stm-start-card"));
  const consoleEl = section.querySelector(".stm-start-check");
  if (!cards.length || !consoleEl) return;
  const con = box(consoleEl);
  const narrow = W < 761;
  const xl = narrow ? 7 : Math.max(10, con.l - Math.min(46, con.l * 0.45));
  const xr = narrow ? W - 7 : Math.min(W - 10, con.r + Math.min(46, (W - con.r) * 0.45));
  const plugY = con.t + Math.min(90, (con.b - con.t) / 2);
  const f = (n: number) => n.toFixed(1);
  const R = 14;
  // Rails: in from the top edge, down the margin, then a rounded turn into the console's side.
  const railL = `M${f(xl)} 0 V${f(plugY - R)} Q${f(xl)} ${f(plugY)} ${f(xl + R)} ${f(plugY)} H${f(con.l)}`;
  const railR = `M${f(xr)} 0 V${f(plugY - R)} Q${f(xr)} ${f(plugY)} ${f(xr - R)} ${f(plugY)} H${f(con.r)}`;
  const feeds = cards.map((card, i) => {
    const c = box(card);
    const chip = card.querySelector(".stm-start-chip");
    const y = chip ? (() => { const k = box(chip); return (k.t + k.b) / 2; })() : c.t + 64;
    const left = narrow ? i % 2 === 0 : c.l + (c.r - c.l) / 2 < W / 2;
    const x0 = left ? xl : xr;
    const x1 = left ? c.l : c.r;
    return { i, left, d: `M${f(x0)} ${f(y)} H${f(x1)}`, x0, x1, y };
  });
  // Lit lines use the services board's layers: wide glow, halo, core, white center.
  const lit = (d: string, tone: string) => `<g class="${tone}"><path class="lw" d="${d}"/><path class="lh" d="${d}"/><path class="lb" d="${d}"/><path class="lc" d="${d}"/></g>`;
  // An engraved companion trace beside each rail on wide screens, ending in a via.
  const etch = narrow ? "" : [
    { x: xl - 12, end: plugY - 70 },
    { x: xr + 12, end: plugY - 70 },
  ].filter((e) => e.x > 4 && e.x < W - 4 && e.end > 40).map((e) => `<path class="u" d="M${f(e.x)} 0 V${f(e.end)}"/><circle class="pu" cx="${f(e.x)}" cy="${f(e.end)}" r="3"/>`).join("");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = etch + lit(railL, "gold") + lit(railR, "cyan")
    + feeds.map((fd) => {
      const tone = fd.left ? "gold" : "cyan";
      return `<path class="u" d="${fd.d}"/><g class="fd ${tone}" data-i="${fd.i}"><path class="lh" d="${fd.d}"/><path class="lb" d="${fd.d}"/></g>`
        + `<circle class="pin ${tone}" cx="${f(fd.x1)}" cy="${f(fd.y)}" r="3.6"/><circle class="jn ${tone}" cx="${f(fd.x0)}" cy="${f(fd.y)}" r="4.2"/>`;
    }).join("")
    + `<circle class="plug gold" cx="${f(con.l)}" cy="${f(plugY)}" r="6"/><circle class="plug cyan" cx="${f(con.r)}" cy="${f(plugY)}" r="6"/>`;
}

export function StartingPoint() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const boardRef = useRef<SVGSVGElement | null>(null);
  const navigate = useNavigate();
  const [bizName, setBizName] = useState("");
  const [city, setCity] = useState("");
  const [missing, setMissing] = useState<"name" | "city" | null>(null);

  // Everything is visible by default. Only when motion is allowed and the
  // section is still below the fold does it arm, so the modules and the
  // console can rise in once it scrolls into view.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    if (section.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    section.dataset.armed = "1";
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      section.classList.add("is-in");
    }, { threshold: 0.18 });
    io.observe(section);
    return () => io.disconnect();
  }, []);

  // Draw the board from the real layout, and redraw whenever it changes.
  useEffect(() => {
    const section = sectionRef.current;
    const svg = boardRef.current;
    if (!section || !svg) return;
    // Drawn once the fonts are in, then again only when the layout really changes size.
    let drawn = "";
    let ready = !document.fonts || document.fonts.status === "loaded";
    const draw = () => {
      if (!ready) return;
      const grid = section.querySelector<HTMLElement>(".stm-start-grid");
      const key = `${section.offsetWidth}x${section.offsetHeight}:${grid?.offsetWidth ?? 0}x${grid?.offsetHeight ?? 0}`;
      if (key === drawn) return;
      drawn = key;
      drawBoard(section, svg);
    };
    const start = () => { ready = true; draw(); };
    draw();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(draw) : null;
    ro?.observe(section);
    const fallback = window.setTimeout(start, 1500);
    document.fonts?.ready.then(start).catch(start);
    // A hovered or focused card lights its own feed.
    const cards = Array.from(section.querySelectorAll<HTMLElement>(".stm-start-card"));
    const hot = (i: number, on: boolean) => svg.querySelector(`.fd[data-i="${i}"]`)?.classList.toggle("hot", on);
    const offs = cards.flatMap((card, i) => {
      const enter = () => hot(i, true);
      const leave = () => { if (!card.matches(":focus-within")) hot(i, false); };
      const blur = () => { if (!card.matches(":hover")) hot(i, false); };
      card.addEventListener("pointerenter", enter);
      card.addEventListener("pointerleave", leave);
      card.addEventListener("focusin", enter);
      card.addEventListener("focusout", blur);
      return [() => card.removeEventListener("pointerenter", enter), () => card.removeEventListener("pointerleave", leave), () => card.removeEventListener("focusin", enter), () => card.removeEventListener("focusout", blur)];
    });
    return () => { ro?.disconnect(); window.clearTimeout(fallback); offs.forEach((off) => off()); };
  }, []);

  const runCheckup = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = cleanName(bizName);
    const place = cleanCity(city);
    const field = (key: string) => (e.currentTarget.elements.namedItem(key) as HTMLInputElement | null)?.focus();
    if (!name) { setMissing("name"); field("business"); return; }
    if (!place) { setMissing("city"); field("city"); return; }
    setMissing(null);
    trackSiteEvent({ event_type: "cta_click", label: "home_start_checkup_form" });
    const params = new URLSearchParams({ biz: name, city: place, src: "home-start-band", start: "1" });
    navigate(`/free-audit?${params.toString()}`);
    openAtTop();
  };

  return (
    <section ref={sectionRef} id="start" className="stm-start" aria-labelledby="home-start-title">
      <svg ref={boardRef} className="stm-start-board" aria-hidden="true" data-drawn="" />
      <div className="stm-start-head">
        <div className="stm-start-eyebrow">Start here</div>
        <h2 id="home-start-title">Where are you <em>starting from?</em></h2>
      </div>
      <div className="stm-start-grid">
        {CHOICES.map(({ tone, icon: Icon, say, line, cta, to, contact, track }, index) => (
          <article key={track} className="stm-start-card" data-tone={tone}>
            <svg className="stm-start-edge" aria-hidden="true"><rect x="0" y="0" width="100%" height="100%" rx="20" pathLength={100} /></svg>
            <span className="stm-start-status" aria-hidden="true"><span>0{index + 1}</span><i /></span>
            <span className="stm-start-chip" aria-hidden="true"><Icon /></span>
            <h3>{say}</h3>
            <p>{line}</p>
            {to ? (
              <Link to={to} className="stm-start-go" onClick={() => { trackSiteEvent({ event_type: "cta_click", label: track }); openAtTop(); }}>
                {cta} <ArrowRight aria-hidden />
              </Link>
            ) : (
              <a href="#contact" className="stm-start-go" onClick={() => { if (contact) requestServiceIntent(contact); trackSiteEvent({ event_type: "cta_click", label: track }); }}>
                {cta} <ArrowRight aria-hidden />
              </a>
            )}
          </article>
        ))}
        {/* The checkup console, said plainly: what it is, what they get, what
            happens next. Wide screens: name, line and form on the left, the
            steps on the right. Narrow screens: one column. Submitting opens the
            checkup page, which starts the check straight away with what they
            typed filled in. */}
        <div className="stm-start-check">
          <div className="stm-start-check-copy">
            <div className="stm-start-check-eyebrow">Not sure which one fits?</div>
            <h3>Free business checkup</h3>
            <p className="stm-start-check-lead">Get a free report on how your business shows up on Google and what's costing you customers. It takes about two minutes.</p>
            <form className="stm-start-form" onSubmit={runCheckup} noValidate>
              <label className={missing === "name" ? "is-missing" : undefined}>
                <span>Business name</span>
                <input type="text" name="business" autoComplete="organization" placeholder="e.g. Joe's Pizza" maxLength={40} value={bizName}
                  onChange={(e) => { setBizName(e.target.value); if (missing === "name") setMissing(null); }}
                  aria-invalid={missing === "name"} aria-describedby={missing === "name" ? "stm-start-missing" : undefined} />
              </label>
              <label className={missing === "city" ? "is-missing" : undefined}>
                <span>City</span>
                <input type="text" name="city" autoComplete="address-level2" placeholder="e.g. San Diego, CA" maxLength={60} value={city}
                  onChange={(e) => { setCity(e.target.value); if (missing === "city") setMissing(null); }}
                  aria-invalid={missing === "city"} aria-describedby={missing === "city" ? "stm-start-missing" : undefined} />
              </label>
              <button type="submit" className="stm-start-check-btn">Get my free report <ArrowRight aria-hidden /></button>
              <p className="stm-start-form-note" id="stm-start-missing" role={missing ? "alert" : undefined}>
                {missing === "name" ? "Add your business name so we can find you on Google." : missing === "city" ? "Add your city so we can compare you with businesses near you." : "Your report shows up on screen. No phone call needed."}
              </p>
            </form>
          </div>
          <div className="stm-start-how">
            <div className="stm-start-how-title">What happens next</div>
            <ol className="stm-start-steps">
              {CHECKUP_STEPS.map((step, index) => (
                <li key={step}><b>{index + 1}</b><span>{step}</span></li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

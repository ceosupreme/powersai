import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import "./homeCheckup.css";

/**
 * The free business checkup, as its own homepage section right after the
 * client reviews: the form is on the page, so an owner types their business
 * name and city here and lands on their report. Wide screens: the headline
 * and form on the left, what happens next on the right. Phones: one column.
 */
// What the checkup actually does from a name and city: it finds their
// website on their Google listing and checks it too. The ranking against
// the top three is in the full list (after email), so the steps say so.
const STEPS = [
  "You type in your business name and city.",
  "The tool looks up your Google listing, reviews and website, and finds the top three businesses near you on Google Maps.",
  "Your report shows the top things to fix and roughly what they're costing you each month. Add your email to get the full list, including how you rank against those top three.",
];

/** Same rules the checkup page applies to a business name passed in a link. */
const cleanName = (value: string) => value.replace(/[^\p{L}\p{N}\s&'.-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40);
const cleanCity = (value: string) => value.replace(/[^\p{L}\p{N}\s,.'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60);

/** The site doesn't reset scroll between pages, so the report page opens at its top. */
const openAtTop = () => requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }));

/**
 * The board behind the section, drawn in code from the live layout so it
 * stays seated at every width: the services board's circuitry in night
 * colors, all muted blue-gray. A quiet rail runs down each margin, each
 * plugging into its half of the section (the form on the left, the steps on
 * the right) with an engraved stub, a joint and a pin. Three traces come in
 * off the top edge on each side and bend toward the content, the middle one
 * lit and ending in a glowing node; three more leave out the bottom. Engraved
 * stubs with vias, dot grids, rings and dark plates fill the margins, and a
 * pair of engraved lines crosses the gap between the two halves. Phones get
 * a rail down each edge with a feed into each half. Static: nothing travels.
 */
function drawCheckupBoard(section: HTMLElement, svg: SVGSVGElement) {
  const S = section.getBoundingClientRect();
  const W = Math.round(S.width);
  const H = Math.round(S.height);
  const copy = section.querySelector<HTMLElement>(".stm-checkup-copy");
  const how = section.querySelector<HTMLElement>(".stm-checkup-how");
  const form = section.querySelector<HTMLElement>(".stm-checkup-form input");
  if (W < 10 || H < 10 || !copy || !how) return;
  const at = (el: Element) => { const r = el.getBoundingClientRect(); return { l: r.left - S.left, t: r.top - S.top, r: r.right - S.left, b: r.bottom - S.top }; };
  const C = at(copy);
  const P = at(how);
  const F = form ? at(form) : { l: C.l, t: C.t + 60, r: C.r, b: C.t + 118 };
  const f = (n: number) => n.toFixed(1);
  const pathD = (pts: number[][]) => "M" + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(" L");
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  const desktop = window.matchMedia("(min-width: 861px)").matches && P.t < C.b && P.l > C.r;
  const plates: string[] = [];
  const decor: string[] = [];
  const unlit: string[] = [];
  const lit: string[] = [];
  const pads: string[] = [];
  const litLayers = (d: string) => `<path class="lw" d="${d}"/><path class="lh" d="${d}"/><path class="lb" d="${d}"/><path class="lc" d="${d}"/>`;
  const trace = (pts: number[][]) => { unlit.push(`<path class="u" d="${pathD(pts)}"/>`); };
  const live = (pts: number[][], tone: "gold" | "cyan") => { lit.push(`<g class="${tone}">${litLayers(pathD(pts))}</g>`); };
  const pad = (x: number, y: number) => { pads.push(`<circle class="pu" cx="${f(x)}" cy="${f(y)}" r="4.2"/>`); };
  const via = (x: number, y: number) => { pads.push(`<circle class="pu" cx="${f(x)}" cy="${f(y)}" r="3"/>`); };
  const joint = (x: number, y: number, tone: "gold" | "cyan") => { pads.push(`<circle class="jn ${tone}" cx="${f(x)}" cy="${f(y)}" r="3.4"/>`); };
  const pin = (x: number, y: number, tone: "gold" | "cyan") => { pads.push(`<circle class="pin ${tone}" cx="${f(x)}" cy="${f(y)}" r="3.6"/>`); };
  const node = (x: number, y: number, tone: "gold" | "cyan", r: number) => {
    pads.push(`<g class="fl ${tone}"><circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="url(#stm-ck-${tone})"/><circle class="fr" cx="${f(x)}" cy="${f(y)}" r="${Math.max(3.4, r * 0.34).toFixed(1)}"/><circle class="fc" cx="${f(x)}" cy="${f(y)}" r="${Math.max(1.5, r * 0.14).toFixed(1)}"/></g>`);
  };
  const dots = (x: number, y: number, cols: number, rows: number, step = 10) => {
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) decor.push(`<circle class="dt" cx="${f(x + i * step)}" cy="${f(y + j * step)}" r="1.7"/>`);
  };
  const ring = (x: number, y: number) => { decor.push(`<circle class="rg" cx="${f(x)}" cy="${f(y)}" r="5.5"/><circle class="dt" cx="${f(x)}" cy="${f(y)}" r="1.6"/>`); };
  const plate = (x0: number, y0: number, x1: number, y1: number) => {
    if (x1 - x0 < 40 || y1 - y0 < 60) return;
    plates.push(`<rect class="pl" x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" rx="18"/><rect class="pi" x="${f(x0 + 9)}" y="${f(y0 + 9)}" width="${f(x1 - x0 - 18)}" height="${f(y1 - y0 - 18)}" rx="11"/>`);
  };
  const sides = ["l", "r"] as const;

  if (desktop) {
    const M = Math.min(C.l, W - P.r);
    const sx = clamp(M * 0.2, 9, 110);
    const plug = { l: (F.t + F.b) / 2, r: (P.t + P.b) / 2 };
    const edge = { l: C.l, r: W - P.r };
    sides.forEach((side) => {
      const X = (x: number) => (side === "l" ? x : W - x);
      const tone = side === "l" ? "gold" : "cyan";
      // The rail, and its feed into this side's half.
      live([[X(sx), -10], [X(sx), H + 10]], tone);
      const y = plug[side];
      if (edge[side] - sx > 6) {
        live([[X(sx), y], [X(edge[side] - 2), y]], tone);
        joint(X(sx), y, tone);
        pin(X(edge[side]), y, tone);
      }
      // A second, engraved stub from the rail at another height.
      const y2 = side === "l" ? C.t + 14 : P.b - 30;
      if (edge[side] - sx > 30) { trace([[X(sx), y2], [X(edge[side] - 12), y2]]); pad(X(sx), y2); via(X(edge[side] - 12), y2); }
      // Top bundle: three traces in off the top edge, bending toward the content.
      const top = Math.min(C.t, P.t);
      const a = sx + Math.max(44, M * 0.32);
      const b = a + Math.min(150, Math.max(60, (side === "l" ? C.l + 120 : W - P.r + 120) - a));
      const span = b - a;
      const endY = [top - 70, top - 50, top - 30];
      const yd = endY[0] - span - 30;
      if (yd > 24 && span >= 30) {
        [0, 1, 2].forEach((k) => {
          const o = k * 11;
          const pts = [[X(a + o), -10], [X(a + o), yd], [X(b + o), yd + span], [X(b + o), endY[k]]];
          if (k === 1) { live(pts, tone); node(X(b + o), endY[k], tone, 12); } else { trace(pts); pad(X(b + o), endY[k]); }
        });
        if (M >= 150) dots(side === "l" ? a - 50 : W - a + 30, yd + 26, 3, 5);
      } else if (top > 70) {
        // Not enough room to bend: three short traces straight in off the top edge.
        [0, 1, 2].forEach((k) => {
          const o = k * 11;
          const yEnd = top - 26 - k * 12;
          const pts = [[X(b + o), -10], [X(b + o), yEnd]];
          if (k === 1) { live(pts, tone); node(X(b + o), yEnd, tone, 10); } else { trace(pts); pad(X(b + o), yEnd); }
        });
      }
      // Bottom bundle: three traces out the bottom edge, below this side's half.
      const bottom = Math.max(C.b, P.b);
      const bx = side === "l" ? C.l + 90 : W - P.r + 90;
      if (H - bottom > 70) {
        [0, 1, 2].forEach((k) => {
          const c = bx + k * 11;
          const pts = [[X(c + 60), bottom + 28 + k * 11], [X(c + 12), bottom + 28 + k * 11], [X(c), bottom + 40 + k * 11], [X(c), H + 10]];
          if (k === 1) { live(pts, tone); node(X(c + 60), bottom + 28 + k * 11, tone, 9); } else { trace(pts); pad(X(c + 60), bottom + 28 + k * 11); }
        });
      }
      // Margin furniture: a plate between the rail and the content, stubs with vias, a ring.
      if (M >= 70) plate(X(side === "l" ? -30 : sx + 24), Math.min(C.t, P.t) + 30, X(side === "l" ? sx + 24 : -30), Math.max(C.b, P.b) - 30);
      if (M >= 120) {
        const x0 = sx + 48;
        const ya = plug[side] + 60;
        const s = Math.max(C.b, P.b) - 20 - ya;
        if (s > 80) { trace([[X(x0), ya], [X(x0), ya + s * 0.5], [X(x0 + 14), ya + s * 0.5 + 14], [X(x0 + 14), ya + s]]); pad(X(x0), ya); pad(X(x0 + 14), ya + s); }
        ring(X(sx + 60), plug[side] - 54);
      }
    });
    // Between the two halves: a pair of engraved lines crossing the gap.
    const gx = (C.r + P.l) / 2;
    if (P.l - C.r > 36) {
      [0, 9].forEach((o) => { trace([[gx - 4 + o, P.t - 30], [gx - 4 + o, P.b + 30]]); via(gx - 4 + o, P.t - 30); via(gx - 4 + o, P.b + 30); });
    }
  } else {
    // Phones and small tablets: a lit rail down each edge, the form plugged into
    // the left rail and the steps panel into the right.
    const railX = 7;
    live([[railX, -10], [railX, H + 10]], "gold");
    live([[W - railX, -10], [W - railX, H + 10]], "cyan");
    const yl = (F.t + F.b) / 2;
    if (C.l - railX > 6) { live([[railX, yl], [C.l - 2, yl]], "gold"); joint(railX, yl, "gold"); pin(C.l, yl, "gold"); }
    const yr = P.t + 60;
    if (W - P.r - railX > 6) { live([[W - railX, yr], [P.r + 2, yr]], "cyan"); joint(W - railX, yr, "cyan"); pin(P.r, yr, "cyan"); }
  }

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = `<defs>
    <radialGradient id="stm-ck-gold"><stop offset="0" stop-color="#4A5F86" stop-opacity=".55"/><stop offset="1" stop-color="#4A5F86" stop-opacity="0"/></radialGradient>
    <radialGradient id="stm-ck-cyan"><stop offset="0" stop-color="#4A5F86" stop-opacity=".55"/><stop offset="1" stop-color="#4A5F86" stop-opacity="0"/></radialGradient>
  </defs>${plates.join("")}${decor.join("")}${unlit.join("")}${lit.join("")}${pads.join("")}`;
}

export function HomeCheckup() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const boardRef = useRef<SVGSVGElement | null>(null);
  const navigate = useNavigate();
  const [bizName, setBizName] = useState("");
  const [city, setCity] = useState("");
  const [missing, setMissing] = useState<"name" | "city" | "both" | null>(null);

  // Visible by default. Only when motion is allowed and the section starts
  // fully off screen does it arm, so the two halves rise in as it scrolls into
  // view. Right under the hero its top edge can already be showing on a
  // laptop; then it simply stays put.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    if (section.getBoundingClientRect().top < window.innerHeight) return;
    section.dataset.armed = "1";
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      section.classList.add("is-in");
    }, { threshold: 0.18 });
    io.observe(section);
    return () => io.disconnect();
  }, []);

  // Draw the board from the real layout (once the fonts are in, since text
  // wrapping moves the panels), and again only when the layout changes size.
  useEffect(() => {
    const section = sectionRef.current;
    const svg = boardRef.current;
    if (!section || !svg) return;
    let drawn = "";
    let ready = !document.fonts || document.fonts.status === "loaded";
    const draw = () => {
      if (!ready) return;
      const key = `${section.offsetWidth}x${section.offsetHeight}`;
      if (key === drawn) return;
      drawn = key;
      drawCheckupBoard(section, svg);
    };
    const start = () => { ready = true; draw(); };
    draw();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(draw) : null;
    ro?.observe(section);
    const fallback = window.setTimeout(start, 1500);
    document.fonts?.ready.then(start).catch(start);
    return () => { ro?.disconnect(); window.clearTimeout(fallback); };
  }, []);

  const runCheckup = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = cleanName(bizName);
    const place = cleanCity(city);
    const field = (key: string) => (e.currentTarget.elements.namedItem(key) as HTMLInputElement | null)?.focus();
    if (!name || !place) {
      setMissing(!name && !place ? "both" : !name ? "name" : "city");
      field(!name ? "business" : "city");
      return;
    }
    setMissing(null);
    trackSiteEvent({ event_type: "cta_click", label: "home_checkup_form" });
    const params = new URLSearchParams({ biz: name, city: place, src: "home-checkup", start: "1" });
    navigate(`/free-audit?${params.toString()}`);
    openAtTop();
  };

  return (
    <section ref={sectionRef} id="checkup" className="stm-checkup" aria-labelledby="home-checkup-title">
      <svg ref={boardRef} className="stm-checkup-board" aria-hidden="true" data-drawn="" />
      <div className="stm-checkup-in">
        <div className="stm-checkup-copy">
          <div className="stm-checkup-eyebrow">Free business checkup</div>
          <h2 id="home-checkup-title">See what's costing you <em>customers.</em></h2>
          <p className="stm-checkup-lead">Type in your business name and city. In about two minutes you get a free report on how your business shows up on Google, and the top things to fix.</p>
          <form className="stm-checkup-form" onSubmit={runCheckup} noValidate>
            <label className={missing === "name" || missing === "both" ? "is-missing" : undefined}>
              <span>Business name</span>
              <input type="text" name="business" autoComplete="organization" maxLength={40} value={bizName}
                onChange={(e) => { setBizName(e.target.value); if (missing === "name") setMissing(null); else if (missing === "both") setMissing("city"); }}
                aria-invalid={missing === "name" || missing === "both"} aria-describedby={missing === "name" || missing === "both" ? "stm-checkup-missing" : undefined} />
            </label>
            <label className={missing === "city" || missing === "both" ? "is-missing" : undefined}>
              <span>City</span>
              <input type="text" name="city" autoComplete="address-level2" maxLength={60} value={city}
                onChange={(e) => { setCity(e.target.value); if (missing === "city") setMissing(null); else if (missing === "both") setMissing("name"); }}
                aria-invalid={missing === "city" || missing === "both"} aria-describedby={missing === "city" || missing === "both" ? "stm-checkup-missing" : undefined} />
            </label>
            <button type="submit" className="stm-checkup-btn">Get my free report <ArrowRight aria-hidden /></button>
            <p className={`stm-checkup-note${missing ? " is-error" : ""}`} id="stm-checkup-missing" role={missing ? "alert" : undefined}>
              {missing === "both" ? "Add your business name and city to run the checkup." : missing === "name" ? "Add your business name so we can find you on Google." : missing === "city" ? "Add your city so we can compare you with businesses near you." : "Your report shows up on screen. No phone call needed."}
            </p>
          </form>
        </div>
        <div className="stm-checkup-how">
          <div className="stm-checkup-how-title">What happens next</div>
          <ol className="stm-checkup-steps">
            {STEPS.map((step, index) => (
              <li key={step}><b>{index + 1}</b><span>{step}</span></li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

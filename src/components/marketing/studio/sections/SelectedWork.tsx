import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, ArrowUpRight, Power } from "lucide-react";
import { getStudioMedia } from "@/config/studioMedia";
import { useStudioProjects } from "@/hooks/useStudioProjects";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import "./selectedWork.css";

/**
 * Homepage proof, right after the three story slides: the featured brands as
 * tall panels that switch on one after another when the section scrolls in,
 * each with a LIVE light, while a signal runs along the line beneath them
 * (the same power language as the hero console and the services board).
 *
 * Names, case-study links and live URLs come from the published-project
 * adapter; panel art from studioMedia ("work-panel-*"). BarPulse is software,
 * so its panel is a live title card instead of a photo. Order and the short
 * panel labels are the homepage presentation choices below.
 */
const FEATURED = [
  { slug: "kario-voss", label: "Artist brand", media: "work-panel-kario-voss", tone: "gold" },
  { slug: "coastal-beauties", label: "Lifestyle brand", media: "work-panel-coastal-beauties", tone: "cyan" },
  { slug: "big-paws-club", label: "Brand and guide site", media: "work-panel-big-paws-club", tone: "gold" },
  { slug: "supreme-wellness-club", label: "Wellness brand", media: "work-panel-supreme-wellness-club", tone: "cyan" },
  { slug: "barpulse", label: "AI operations platform", media: null, tone: "gold" },
] as const;

/** Spacing of the power-on sequence (ms): first panel, then one per step. */
const BOOT_START = 260;
const BOOT_STEP = 420;
const BOOT_LENGTH = 460;

function BarPulseCard() {
  // The product's own headline over a heartbeat line that keeps running.
  const beat = "M0 30 H34 L42 30 L48 12 L55 48 L61 20 L66 30 H118 L126 30 L132 12 L139 48 L145 20 L150 30 H202 L210 30 L216 12 L223 48 L229 20 L234 30 H300";
  return (
    <div className="stm-work-bp" aria-hidden="true">
      <span className="stm-work-bp-mark"><span><Activity /></span>BarPulse</span>
      <strong>Find the money your bar is leaking.</strong>
      <svg className="pulse" viewBox="0 0 300 60" preserveAspectRatio="none"><path className="base" d={beat} /><path className="beat" d={beat} /></svg>
    </div>
  );
}

export function SelectedWork() {
  const { projects } = useStudioProjects();
  const sectionRef = useRef<HTMLElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const busRef = useRef<SVGSVGElement | null>(null);
  const panels = FEATURED.flatMap((item) => {
    const project = projects.find((p) => p.slug === item.slug);
    return project ? [{ ...item, project }] : [];
  });

  useEffect(() => {
    const section = sectionRef.current;
    const row = rowRef.current;
    const bus = busRef.current;
    if (!section || !row) return;
    const items = Array.from(row.querySelectorAll<HTMLElement>(".stm-work-panel"));
    if (items.length === 0) return;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };
    const wide = window.matchMedia("(min-width: 1024px)");

    // The line beneath the panels (wide screens): a drop from each panel's
    // base down to one bus, measured from the real columns.
    const drawBus = () => {
      if (!bus) return;
      const W = row.offsetWidth;
      const xs = items.map((el) => el.offsetLeft + el.offsetWidth / 2);
      const y = 40;
      bus.setAttribute("viewBox", `0 0 ${W} 56`);
      bus.innerHTML = `<defs><linearGradient id="stm-work-bus-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0"><stop offset="0" stop-color="#F2A20F"/><stop offset="1" stop-color="#14B5E3"/></linearGradient></defs>`
        + `<path class="b0" d="M0 ${y} H${W}"/><path class="b1" d="M0 ${y} H${W}"/>`
        + xs.map((x, i) => `<path class="dr" data-i="${i}" d="M${x.toFixed(1)} 0 V${y}"/><circle class="nd" data-i="${i}" cx="${x.toFixed(1)}" cy="${y}" r="3.5"/>`).join("")
        + `<path class="cm cg" d="M0 ${y} H${W}"/><path class="cm ch" d="M0 ${y} H${W}"/>`;
    };
    // A signal runs the bus so it reaches each drop as that panel switches on.
    const runBus = () => {
      if (!bus || items.length < 2) return;
      const W = row.offsetWidth;
      const xs = items.map((el) => el.offsetLeft + el.offsetWidth / 2);
      const speed = (xs[1] - xs[0]) / BOOT_STEP;
      const startAt = BOOT_START - xs[0] / speed;
      bus.querySelectorAll<SVGPathElement>(".cm").forEach((path) => {
        const c = path.classList.contains("cg") ? 120 : 46;
        path.style.strokeDasharray = `${c} ${W + c * 2 + 40}`;
        path.animate([{ strokeDashoffset: `${c}px`, opacity: 1 }, { strokeDashoffset: `${c - W - c}px`, opacity: 1 }], { duration: (W + c) / speed, delay: startAt, easing: "linear", fill: "none" });
      });
      items.forEach((_, i) => later(() => bus.querySelector(`.dr[data-i="${i}"]`)?.classList.add("lit"), BOOT_START + i * BOOT_STEP));
      items.forEach((_, i) => later(() => bus.querySelector(`.nd[data-i="${i}"]`)?.classList.add("lit"), BOOT_START + i * BOOT_STEP));
    };
    const allOn = () => {
      items.forEach((el) => el.classList.add("on"));
      bus?.querySelectorAll(".dr, .nd").forEach((el) => el.classList.add("lit"));
      section.classList.add("is-live");
    };
    const boot = (el: HTMLElement, at: number) => {
      later(() => el.classList.add("boot"), at);
      later(() => { el.classList.remove("boot"); el.classList.add("on"); }, at + BOOT_LENGTH);
    };

    drawBus();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      const lit = Array.from(bus?.querySelectorAll(".dr.lit") ?? []).map((el) => (el as SVGElement).dataset.i);
      drawBus();
      lit.forEach((i) => { bus?.querySelector(`.dr[data-i="${i}"]`)?.classList.add("lit"); bus?.querySelector(`.nd[data-i="${i}"]`)?.classList.add("lit"); });
    }) : null;
    ro?.observe(row);
    const cleanup = () => { timers.forEach((t) => window.clearTimeout(t)); ro?.disconnect(); };

    // Reduced motion, no observer support, or already on screen (a deep link
    // to #work): everything is simply on. Otherwise switch the panels off
    // while they're still out of view, then power them up in view.
    const r = row.getBoundingClientRect();
    const inView = r.top < window.innerHeight && r.bottom > 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window) || inView) {
      allOn();
      return cleanup;
    }
    section.dataset.armed = "1";
    let io: IntersectionObserver;
    if (wide.matches) {
      io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        runBus();
        items.forEach((el, i) => boot(el, BOOT_START + i * BOOT_STEP));
        later(() => section.classList.add("is-live"), BOOT_START + items.length * BOOT_STEP + BOOT_LENGTH);
      }, { threshold: 0.35 });
      io.observe(row);
    } else {
      // Phones and tablets: each panel powers on as it scrolls into view.
      let booted = 0;
      io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          boot(entry.target as HTMLElement, 120);
          booted += 1;
          if (booted === items.length) later(() => section.classList.add("is-live"), 120 + BOOT_LENGTH);
        });
      }, { threshold: 0.45 });
      items.forEach((el) => io.observe(el));
    }
    return () => { io.disconnect(); cleanup(); };
  }, [panels.length]);

  return (
    <section ref={sectionRef} id="work" className="stm-work" aria-labelledby="home-work-title">
      <span id="proof" aria-hidden="true" />
      <div className="stm-work-head">
        <div className="stm-work-eyebrow">Our work</div>
        <h2 id="home-work-title">Brands we've <em>switched on.</em></h2>
        <p>Real brands, built by our team and live right now.</p>
      </div>
      <div className="stm-work-stage">
        <div className="stm-work-row" ref={rowRef}>
          {panels.map(({ slug, label, media, tone, project }) => {
            const art = media ? getStudioMedia(media) : null;
            const name = project.title.split(" — ")[0];
            const track = (what: string) => () => trackSiteEvent({ event_type: "cta_click", label: `home_work_${what}${slug.replace(/-/g, "_")}` });
            return (
              <article key={slug} className="stm-work-panel" data-tone={tone}>
                <div className="stm-work-art">
                  {art?.src ? <img src={art.src} alt={art.alt} width={art.width} height={art.height} loading="lazy" /> : <BarPulseCard />}
                </div>
                <span className="stm-work-scan" aria-hidden="true" />
                <span className="stm-work-power" aria-hidden="true"><Power /></span>
                <span className="stm-work-live" aria-hidden="true"><i />Live</span>
                <Link to={`/work/${slug}`} className="stm-work-open" aria-label={`${name}, ${label}: see the project`} onClick={track("")} />
                <div className="stm-work-label">
                  <small>{label}</small>
                  <h3>{name}</h3>
                  {project.externalUrl && (
                    <a className="stm-work-visit" href={project.externalUrl} target="_blank" rel="noopener noreferrer" aria-label={`Visit the ${name} live site`} onClick={track("visit_")}>
                      Visit live site <ArrowUpRight aria-hidden />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <svg ref={busRef} className="stm-work-bus" aria-hidden="true" />
      </div>
      <div className="stm-work-foot">
        <Link to="/work" className="stm-work-btn" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "see_all_work" })}>See all our work <ArrowRight aria-hidden /></Link>
      </div>
    </section>
  );
}

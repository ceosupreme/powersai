import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getStudioMedia } from "@/config/studioMedia";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import "./homeUsps.css";

/**
 * Panels in the homepage slide stack pin while the next panel slides over
 * them. A panel taller than the viewport must pin by its BOTTOM edge (top =
 * viewport − height, negative) or its lower content could never be reached.
 * CSS can't express "own height" in `top`, so this measures the panel and
 * sets --stack-top; ResizeObserver catches image loads and font reflow.
 */
export function useStackPanel(sectionRef: React.MutableRefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const set = () => el.style.setProperty("--stack-top", `${Math.min(0, (window.innerHeight || 0) - el.offsetHeight)}px`);
    set();
    window.addEventListener("resize", set, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(set) : null;
    ro?.observe(el);
    return () => { window.removeEventListener("resize", set); ro?.disconnect(); };
  }, [sectionRef]);
}

/**
 * Slide 1 of the stack: "We create campaigns that get you chosen first."
 * The aerial render (one gold building in a blue city, traffic flowing to
 * it) carries the scene; the headline is live text that lights line by line
 * on scroll, matching the 3 AM slide. Image swaps via "home-chosen-first".
 */
export function ChosenFirst() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const art = getStudioMedia("home-chosen-first");
  useStackPanel(sectionRef);

  // Image and copy fade in when they enter view.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (!("IntersectionObserver" in window)) {
      section.querySelectorAll("[data-watch]").forEach((el) => el.classList.add("on"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("on"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.18 });
    section.querySelectorAll("[data-watch]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Headline lines light as the title climbs the lower half of the screen,
  // reversible on scroll back. Reduced motion gets them lit and still.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const title = section.querySelector<HTMLElement>(".stm-chosen-title");
    const lines = Array.from(section.querySelectorAll<HTMLElement>(".stm-chosen-tline"));
    if (!title || lines.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      lines.forEach((line) => line.classList.add("lit"));
      title.classList.add("lit");
      return;
    }
    const THRESHOLDS = [0.1, 0.45, 0.8];
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight || 1;
      const tp = (vh * 0.9 - title.getBoundingClientRect().top) / (vh * 0.45);
      lines.forEach((line, index) => line.classList.toggle("lit", tp > THRESHOLDS[index]));
      title.classList.toggle("lit", tp > THRESHOLDS[2]);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  return (
    <section ref={sectionRef} id="chosen-first" className="stm-chosen" aria-labelledby="chosen-first-title">
      <div className="stm-chosen-stage">
        <h2 id="chosen-first-title" className="stm-chosen-title">
          <span className="stm-chosen-tline">We create campaigns</span>
          <span className="stm-chosen-tline">that get you</span>
          <span className="stm-chosen-tline">chosen <b>first.</b></span>
        </h2>
        <div className="stm-chosen-frame" data-watch>
          {art?.src && <img src={art.src} alt={art.alt} width={art.width} height={art.height} loading="lazy" />}
        </div>
      </div>
      <div className="stm-chosen-copy" data-watch>
        <p>Ads, local search and reviews working together, so when someone in town needs what you sell, they pick you.</p>
        <div className="stm-chosen-actions">
          <Link to="/services/marketing" className="stm-chosen-btn gold" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "chosen_first_see_marketing" })}>See the marketing <ArrowRight aria-hidden /></Link>
          <Link to="/free-audit?src=home-chosen-first" className="stm-chosen-btn wine" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "chosen_first_free_checkup" })}>Free Business Checkup <ArrowRight aria-hidden /></Link>
        </div>
      </div>
    </section>
  );
}

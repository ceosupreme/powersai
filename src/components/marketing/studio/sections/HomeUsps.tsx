import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { OptionalStudioMedia } from "@/components/marketing/studio/OptionalStudioMedia";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import "./homeUsps.css";

/**
 * Two USP panels that ride the homepage stack after the 3 AM scene. Each is a
 * bundle-plus-outcome message, not a service listing. Art slots are optional:
 * add "home-usp-look" / "home-usp-found" entries to studioMedia and the
 * render appears under the message.
 */
/**
 * Panels in the homepage stack pin while the next panel slides over them.
 * A panel taller than the viewport must pin by its BOTTOM edge (top =
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

function useReveal(sectionRef: React.MutableRefObject<HTMLElement | null>) {
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
    }, { threshold: 0.3 });
    section.querySelectorAll("[data-watch]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sectionRef]);
}

export function UspLook() {
  const sectionRef = useRef<HTMLElement | null>(null);
  useStackPanel(sectionRef);
  useReveal(sectionRef);
  return (
    <section ref={sectionRef} className="stm-usp stm-usp-light" aria-labelledby="usp-look-title">
      <div className="stm-usp-wash" aria-hidden="true" />
      <div className="stm-usp-inner" data-watch>
        <span className="stm-usp-eyebrow">Look the part</span>
        <h2 id="usp-look-title">Look like the best <em>choice</em> in town.</h2>
        <p>Brand, photos, video and your website — one matching look that earns trust before the first call.</p>
        <span className="stm-usp-items">{"Brand and identity · Photo and video · Website design"}</span>
        <div className="stm-usp-actions">
          <Link to="/services/brand" className="stm-usp-btn gold" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "usp_look_cta" })}>See how we do it <ArrowRight aria-hidden /></Link>
        </div>
        <OptionalStudioMedia mediaKey="home-usp-look" />
      </div>
    </section>
  );
}

export function UspFound() {
  const sectionRef = useRef<HTMLElement | null>(null);
  useStackPanel(sectionRef);
  useReveal(sectionRef);
  return (
    <section ref={sectionRef} className="stm-usp stm-usp-dark" aria-labelledby="usp-found-title">
      <div className="stm-usp-pool" aria-hidden="true" />
      <div className="stm-usp-inner" data-watch>
        <span className="stm-usp-eyebrow">Get found</span>
        <h2 id="usp-found-title">Show up first when your town <em>goes looking.</em></h2>
        <p>Marketing, local search and reviews working as one, so nearby customers find you first.</p>
        <span className="stm-usp-items">{"Local SEO · Google Business Profile · Reviews · Paid ads"}</span>
        <div className="stm-usp-actions">
          <Link to="/services/marketing" className="stm-usp-btn gold" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "usp_found_cta" })}>See the marketing <ArrowRight aria-hidden /></Link>
        </div>
        <OptionalStudioMedia mediaKey="home-usp-found" />
      </div>
    </section>
  );
}

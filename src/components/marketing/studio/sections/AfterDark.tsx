import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getStudioMedia } from "@/config/studioMedia";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import "./afterDark.css";

/**
 * The back-end section: one big simple message. The 3 AM render carries the
 * headline and the overnight receipts; the copy below it names the systems
 * and routes to them. Media swaps via the "home-after-dark" studioMedia entry.
 */
export function AfterDark() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const art = getStudioMedia("home-after-dark");

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

  return (
    <section ref={sectionRef} id="after-dark" className="stm-dark" aria-labelledby="after-dark-title">
      <h2 id="after-dark-title" className="stm-dark-srtitle">A website that works while you sleep.</h2>
      <div className="stm-dark-frame" data-watch>
        {art?.src && <img src={art.src} alt={art.alt} width={art.width} height={art.height} loading="lazy" />}
        <div className="stm-dark-floor" aria-hidden="true" />
      </div>
      <div className="stm-dark-copy" data-watch>
        <p>The systems behind your site answer calls, reply to leads and book jobs around the clock.</p>
        <div className="stm-dark-actions">
          <Link to="/services/ai-systems" className="stm-dark-btn gold" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "after_dark_see_systems" })}>See the systems <ArrowRight aria-hidden /></Link>
          <Link to="/free-audit?src=home-after-dark" className="stm-dark-btn wine" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "after_dark_free_checkup" })}>Free Business Checkup <ArrowRight aria-hidden /></Link>
        </div>
      </div>
    </section>
  );
}

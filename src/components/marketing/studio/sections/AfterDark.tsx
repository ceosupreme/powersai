import { useEffect, useRef } from "react";
import { ArrowRight, CalendarDays, MessageSquare, Send, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { getStudioMedia } from "@/config/studioMedia";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import "./afterDark.css";

/**
 * The back-end section: one big simple message. The clean-plate 3 AM render
 * carries the scene; headline and the four overnight receipts are live text
 * seated into the render's empty slots (measured from the image pixels), so
 * copy stays crisp and editable. On phones the receipts become real chips
 * under the image. Media swaps via the "home-after-dark" studioMedia entry.
 */
const RECEIPTS = [
  { label: "Lead captured", time: "Just now", icon: UserRound },
  { label: "Appointment booked", time: "12 minutes ago", icon: CalendarDays },
  { label: "Follow-up sent", time: "28 minutes ago", icon: Send },
  { label: "Inquiry received", time: "1 hour ago", icon: MessageSquare },
] as const;

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
      <div className="stm-dark-stage">
        <h2 id="after-dark-title" className="stm-dark-title" data-watch>
          <span>A website that</span>
          <span><b>works</b> while you sleep.</span>
        </h2>
        <div className="stm-dark-frame" data-watch>
          {art?.src && <img src={art.src} alt={art.alt} width={art.width} height={art.height} loading="lazy" />}
          <div className="stm-dark-floor" aria-hidden="true" />
        </div>
        <ul className="stm-dark-chips" data-watch aria-label="Overnight activity">
          {RECEIPTS.map((item) => (
            <li key={item.label}>
              <span className="stm-dark-chip-ic" aria-hidden="true"><item.icon /></span>
              <span className="stm-dark-chip-tx"><strong>{item.label}</strong><small>{item.time}</small></span>
            </li>
          ))}
        </ul>
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

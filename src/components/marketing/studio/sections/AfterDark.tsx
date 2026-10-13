import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bell, CalendarDays, Database, MessageSquare, Phone, Send, Star, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { getStudioMedia } from "@/config/studioMedia";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { useStackPanel } from "./HomeUsps";
import "./afterDark.css";

/**
 * The back-end section: one big simple message. The clean-plate 3 AM render
 * carries the scene; headline and the four overnight receipts are live text
 * seated into the render's empty slots (measured from the image pixels), so
 * copy stays crisp and editable. On phones the receipts become real chips
 * under the image. Media swaps via the "home-after-dark" studioMedia entry.
 */
/** The night's event pool: the first four scroll in; the rest rotate through
 *  the same four boxes while the section is on screen. Edit freely. */
const RECEIPTS = [
  { label: "Lead captured", time: "Just now", icon: UserRound },
  { label: "Appointment booked", time: "12 minutes ago", icon: CalendarDays },
  { label: "Follow-up sent", time: "28 minutes ago", icon: Send },
  { label: "Inquiry received", time: "1 hour ago", icon: MessageSquare },
  { label: "Missed call texted back", time: "2 minutes ago", icon: Phone },
  { label: "Review request sent", time: "44 minutes ago", icon: Star },
  { label: "Reminder delivered", time: "2 hours ago", icon: Bell },
  { label: "Customer record updated", time: "3 hours ago", icon: Database },
] as const;

export function AfterDark() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const art = getStudioMedia("home-after-dark");
  const [slots, setSlots] = useState<number[]>([0, 1, 2, 3]);
  const queueRef = useRef<number[]>(RECEIPTS.map((_, i) => i).slice(4));
  const allLitRef = useRef(false);

  // First panel of the homepage stack: holds while the next slides over it.
  useStackPanel(sectionRef);

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

  // Chips light from scroll position: each one pops as the scene travels
  // through the viewport, reversible when scrolling back up. Reduced motion
  // gets them all lit and still.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const chipRow = section.querySelector<HTMLElement>(".stm-dark-chips");
    const chips = Array.from(section.querySelectorAll<HTMLElement>(".stm-dark-chips li"));
    const title = section.querySelector<HTMLElement>(".stm-dark-title");
    const titleLines = Array.from(section.querySelectorAll<HTMLElement>(".stm-dark-tline"));
    if (!chipRow || chips.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      chips.forEach((chip) => chip.classList.add("lit"));
      titleLines.forEach((line) => line.classList.add("lit"));
      title?.classList.add("lit");
      return;
    }
    const THRESHOLDS = [0.09, 0.28, 0.47, 0.66];
    const TITLE_THRESHOLDS = [0.1, 0.45, 0.8];
    let ticking = false;
    let chipDocTop = 0; // chip row's document-space top, cached while unpinned
    const update = () => {
      ticking = false;
      const vh = window.innerHeight || 1;
      const scrollY = window.scrollY || 0;
      // Headline lines light as the title climbs the lower half of the screen.
      if (title && titleLines.length > 0) {
        const tr = title.getBoundingClientRect();
        const tp = (vh * 0.9 - tr.top) / (vh * 0.45);
        titleLines.forEach((line, index) => line.classList.toggle("lit", tp > TITLE_THRESHOLDS[index]));
        title.classList.toggle("lit", tp > TITLE_THRESHOLDS[2]);
      }
      const rect = chipRow.getBoundingClientRect();
      // The section pins in the homepage stack, which freezes its rects while
      // the scroll keeps going. Progress therefore runs on the row's document
      // position, cached from the last unpinned frame — identical behavior
      // before the pin, and the late chips still arrive while the scene holds.
      const sectionRect = section.getBoundingClientRect();
      const pinTop = Math.min(0, vh - sectionRect.height);
      const pinned = sectionRect.top <= pinTop + 2;
      if (!pinned) chipDocTop = rect.top + scrollY;
      const top = pinned ? chipDocTop - scrollY : rect.top;
      // 0 once the chip row is fully on screen; the four chips then land
      // about a fifth of a screen apart while the slide holds in place (the
      // stack's 110vh hold), the last leaving about half a screen of rest
      // before the next slide.
      const progress = (vh * 0.85 - top) / vh;
      chips.forEach((chip, index) => chip.classList.toggle("lit", progress > THRESHOLDS[index]));
      allLitRef.current = progress > THRESHOLDS[THRESHOLDS.length - 1];
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  // Once all four chips are lit, the night keeps happening: every few seconds
  // one box crossfades to the next event from the pool, round-robin. Paused
  // off-screen and in hidden tabs; no rotation under reduced motion.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (RECEIPTS.length <= 4) return;
    let slot = 0;
    let swapTimer = 0;
    const id = window.setInterval(() => {
      if (!allLitRef.current || document.visibilityState !== "visible") return;
      const chipNodes = section.querySelectorAll<HTMLElement>(".stm-dark-chips li");
      const s = slot % 4;
      slot += 1;
      const node = chipNodes[s];
      if (node) node.dataset.swap = "1";
      swapTimer = window.setTimeout(() => {
        setSlots((prev) => {
          const incoming = queueRef.current.shift();
          if (incoming === undefined) return prev;
          const next = [...prev];
          queueRef.current.push(next[s]);
          next[s] = incoming;
          return next;
        });
        if (node) delete node.dataset.swap;
      }, 340);
    }, 3600);
    return () => { window.clearInterval(id); window.clearTimeout(swapTimer); };
  }, []);

  return (
    <section ref={sectionRef} id="after-dark" className="stm-dark" aria-labelledby="after-dark-title">
      {/* Desktop: the scene fills exactly one screen and the text column sits
          over its quiet left side. Phones: the text wrapper dissolves
          (display: contents) so the order is headline, scene, cards, copy. */}
      <div className="stm-dark-stage">
        <div className="stm-dark-frame" data-watch>
          {art?.src && <img src={art.src} alt={art.alt} width={art.width} height={art.height} loading="lazy" />}
        </div>
        <ul className="stm-dark-chips" aria-label="Overnight activity">
          {slots.map((poolIndex, slotIndex) => {
            const item = RECEIPTS[poolIndex];
            const Icon = item.icon;
            return (
              <li key={`slot-${slotIndex}`}>
                <svg className="stm-dark-trace" aria-hidden="true"><rect pathLength={100} /></svg>
                <span className="stm-dark-chip-ic" aria-hidden="true"><Icon /></span>
                <span className="stm-dark-chip-tx"><strong>{item.label}</strong><small>{item.time}</small></span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="stm-dark-scrim" aria-hidden="true" />
      <div className="stm-dark-text">
        <h2 id="after-dark-title" className="stm-dark-title">
          <span className="stm-dark-tline">We build websites</span>
          <span className="stm-dark-tline">that <b>work</b></span>
          <span className="stm-dark-tline">while you sleep.</span>
        </h2>
        <div className="stm-dark-copy" data-watch>
          <p>The systems behind your site answer calls, reply to leads and book appointments around the clock.</p>
          <div className="stm-dark-actions">
            <Link to="/services/ai-systems" className="stm-dark-btn gold" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "after_dark_see_systems" })}>See the systems <ArrowRight aria-hidden /></Link>
            <Link to="/free-audit?src=home-after-dark" className="stm-dark-btn wine" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "after_dark_free_checkup" })}>Free Business Checkup <ArrowRight aria-hidden /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

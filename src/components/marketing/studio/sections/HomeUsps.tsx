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

type SlideAction = { label: string; to: string; tone: "gold" | "wine"; track: string; hash?: boolean };

/**
 * One story slide: a render, a three-line headline that lights line by line
 * on scroll (like the 3 AM slide), an optional line and the buttons. The line
 * is only there when it adds to the message; otherwise headline + buttons.
 * Headline copy is live text; images swap via their studioMedia key, with an
 * optional phone version (mobileSrc).
 */
function StorySlide({ id, variant, mediaKey, lines, line, actions }: {
  id: string;
  variant: string;
  mediaKey: string;
  lines: React.ReactNode[];
  line?: string;
  actions: SlideAction[];
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const art = getStudioMedia(mediaKey);
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
    const title = section.querySelector<HTMLElement>(".stm-slide-title");
    const tlines = Array.from(section.querySelectorAll<HTMLElement>(".stm-slide-tline"));
    if (!title || tlines.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      tlines.forEach((el) => el.classList.add("lit"));
      title.classList.add("lit");
      return;
    }
    const THRESHOLDS = [0.1, 0.45, 0.8];
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight || 1;
      const tp = (vh * 0.9 - title.getBoundingClientRect().top) / (vh * 0.45);
      tlines.forEach((el, index) => el.classList.toggle("lit", tp > THRESHOLDS[index]));
      title.classList.toggle("lit", tp > THRESHOLDS[2]);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  return (
    <section ref={sectionRef} id={id} className={`stm-slide ${variant}`} aria-labelledby={`${id}-title`}>
      {/* Desktop: the render fills exactly one screen and the text column sits
          over its quiet left side. Phones: the text wrapper dissolves
          (display: contents) so the order is headline, image, line, buttons. */}
      <div className="stm-slide-frame" data-watch>
        {art?.src && (
          <picture>
            {art.mobileSrc && <source media="(max-width: 760px)" srcSet={art.mobileSrc} />}
            <img src={art.src} alt={art.alt} width={art.width} height={art.height} loading="lazy" />
          </picture>
        )}
      </div>
      <div className="stm-slide-scrim" aria-hidden="true" />
      <div className="stm-slide-text">
        <h2 id={`${id}-title`} className="stm-slide-title">
          {lines.map((content, index) => <span key={index} className="stm-slide-tline">{content}</span>)}
        </h2>
        <div className="stm-slide-copy" data-watch>
          {line && <p>{line}</p>}
          <div className="stm-slide-actions">
            {actions.map((action) => {
              const onClick = () => trackSiteEvent({ event_type: "cta_click", label: action.track });
              const className = `stm-slide-btn ${action.tone}`;
              return action.hash
                ? <a key={action.label} href={action.to} className={className} onClick={onClick}>{action.label} <ArrowRight aria-hidden /></a>
                : <Link key={action.label} to={action.to} className={className} onClick={onClick}>{action.label} <ArrowRight aria-hidden /></Link>;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Slide 1: a man on a bench, stopped cold by glowing screens. The image
 *  says "attention" on its own, so no line — headline and buttons only. */
export function GetAttention() {
  return (
    <StorySlide
      id="get-attention"
      variant="stm-slide-attention"
      mediaKey="home-get-attention"
      lines={["We build websites", "that get", <b key="a">attention.</b>]}
      actions={[
        { label: "See our web design", to: "/services/websites", tone: "gold", track: "get_attention_see_web_design" },
        { label: "Free Business Checkup", to: "/free-audit?src=home-get-attention", tone: "wine", track: "get_attention_free_checkup" },
      ]}
    />
  );
}

/** Slide 3, the finale: the owner on a rooftop at sunrise over the city, his
 *  gold building below and his wins (sales, bookings, reviews) beside him.
 *  "See the results" drops straight into the Work section below. */
export function BoostBrands() {
  return (
    <StorySlide
      id="boost-brands"
      variant="stm-slide-boost"
      mediaKey="home-next-level"
      lines={["We boost brands", "higher,", <b key="f">faster.</b>]}
      line="Supreme Team Media blasts your business to the next level."
      actions={[
        { label: "See the results", to: "#work", tone: "gold", track: "boost_brands_see_results", hash: true },
        { label: "Free Business Checkup", to: "/free-audit?src=home-boost-brands", tone: "wine", track: "boost_brands_free_checkup" },
      ]}
    />
  );
}

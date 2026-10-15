import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { requestServiceIntent, type ServiceId } from "../serviceIntent";
import "./startingPoint.css";

/**
 * Homepage decision block, after the free checkup: four situations an owner
 * can place themselves in at a glance, as a plain list in big type (no boxes,
 * so it reads as a different thing from the services board), each with one
 * line and one next step. A row either links to a page or jumps to the
 * contact form below with its service preselected (there is no separate
 * reviews page).
 */
type Choice = {
  say: string;
  line: string;
  cta: string;
  track: string;
} & ({ to: string; contact?: never } | { contact: ServiceId; to?: never });

const CHOICES: Choice[] = [
  {
    say: "I already have a website…",
    line: "Let's see if it's actually bringing you customers.",
    cta: "Get my free checkup",
    to: "/free-audit?src=home-start",
    track: "home_start_checkup_card",
  },
  {
    say: "My website is already ranking well…",
    line: "Awesome. Now let's help you earn more reviews and keep your Google Business Profile optimized so you stay ahead.",
    cta: "Start with review automation",
    contact: "marketing-growth",
    track: "home_start_reviews",
  },
  {
    say: "I don't have a website yet…",
    line: "No problem. We'll build a professional website that's designed to rank on Google and turn visitors into customers.",
    cta: "Build my website",
    to: "/services/websites",
    track: "home_start_website",
  },
  {
    say: "I want everything handled…",
    line: "We'll build your website, set up local SEO so nearby customers find you on Google, automate your review requests, and manage your Google Business Profile.",
    cta: "See the packages",
    to: "/pricing",
    track: "home_start_packages",
  },
];

/** The site doesn't reset scroll between pages, so links from here open the
 *  next page at its top (after the new page has rendered). */
const openAtTop = () => requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }));

export function StartingPoint() {
  const sectionRef = useRef<HTMLElement | null>(null);

  // Everything is visible by default. Only when motion is allowed and the
  // section is still below the fold does it arm, so the rows can rise in one
  // after another once it scrolls into view.
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

  return (
    <section ref={sectionRef} id="start" className="stm-start" aria-labelledby="home-start-title">
      <div className="stm-start-head">
        <div className="stm-start-eyebrow">Start here</div>
        <h2 id="home-start-title">Where are you <em>starting from?</em></h2>
        <p className="stm-start-sub">Pick the line that sounds like you.</p>
      </div>
      <ol className="stm-start-list">
        {CHOICES.map(({ say, line, cta, to, contact, track }, index) => (
          <li key={track} className="stm-start-row" style={{ "--d": `${index * 0.08}s` } as React.CSSProperties}>
            <span className="stm-start-num" aria-hidden="true">0{index + 1}</span>
            <h3>{say}</h3>
            <div className="stm-start-next">
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
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

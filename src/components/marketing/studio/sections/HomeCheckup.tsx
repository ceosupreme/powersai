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

export function HomeCheckup() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  const [bizName, setBizName] = useState("");
  const [city, setCity] = useState("");
  const [missing, setMissing] = useState<"name" | "city" | null>(null);

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

  const runCheckup = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = cleanName(bizName);
    const place = cleanCity(city);
    const field = (key: string) => (e.currentTarget.elements.namedItem(key) as HTMLInputElement | null)?.focus();
    if (!name) { setMissing("name"); field("business"); return; }
    if (!place) { setMissing("city"); field("city"); return; }
    setMissing(null);
    trackSiteEvent({ event_type: "cta_click", label: "home_checkup_form" });
    const params = new URLSearchParams({ biz: name, city: place, src: "home-checkup", start: "1" });
    navigate(`/free-audit?${params.toString()}`);
    openAtTop();
  };

  return (
    <section ref={sectionRef} id="checkup" className="stm-checkup" aria-labelledby="home-checkup-title">
      <div className="stm-checkup-in">
        <div className="stm-checkup-copy">
          <div className="stm-checkup-eyebrow">Free business checkup</div>
          <h2 id="home-checkup-title">See what's costing you <em>customers.</em></h2>
          <p className="stm-checkup-lead">Type in your business name and city. In about two minutes you get a free report on how your business shows up on Google, and the top things to fix.</p>
          <form className="stm-checkup-form" onSubmit={runCheckup} noValidate>
            <label className={missing === "name" ? "is-missing" : undefined}>
              <span>Business name</span>
              <input type="text" name="business" autoComplete="organization" placeholder="e.g. Joe's Pizza" maxLength={40} value={bizName}
                onChange={(e) => { setBizName(e.target.value); if (missing === "name") setMissing(null); }}
                aria-invalid={missing === "name"} aria-describedby={missing === "name" ? "stm-checkup-missing" : undefined} />
            </label>
            <label className={missing === "city" ? "is-missing" : undefined}>
              <span>City</span>
              <input type="text" name="city" autoComplete="address-level2" placeholder="e.g. San Diego, CA" maxLength={60} value={city}
                onChange={(e) => { setCity(e.target.value); if (missing === "city") setMissing(null); }}
                aria-invalid={missing === "city"} aria-describedby={missing === "city" ? "stm-checkup-missing" : undefined} />
            </label>
            <button type="submit" className="stm-checkup-btn">Get my free report <ArrowRight aria-hidden /></button>
            <p className="stm-checkup-note" id="stm-checkup-missing" role={missing ? "alert" : undefined}>
              {missing === "name" ? "Add your business name so we can find you on Google." : missing === "city" ? "Add your city so we can compare you with businesses near you." : "Your report shows up on screen. No phone call needed."}
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

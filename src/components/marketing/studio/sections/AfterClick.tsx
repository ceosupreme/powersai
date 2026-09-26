import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bell, Check, Mail, Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { Container } from "../primitives";

const STAGES = ["Attract", "Capture", "Follow up", "See what needs attention"] as const;

export function AfterClick() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [manual, setManual] = useState(false);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!inView || !visible || paused || manual || reducedMotion) return;
    const timer = window.setInterval(() => setStage((current) => (current + 1) % STAGES.length), 3800);
    return () => window.clearInterval(timer);
  }, [inView, visible, paused, manual, reducedMotion]);

  const selectStage = (index: number) => {
    setStage(index);
    setManual(true);
    setPaused(true);
  };

  return (
    <section ref={sectionRef} id="after-click" className="after-click" aria-labelledby="after-click-title">
      <Container>
        <div className="after-click-intro">
          <div>
            <span className="after-click-eyebrow">More than a website</span>
            <h2 id="after-click-title" className="studio-display">A website is just the <em>beginning.</em></h2>
          </div>
          <p>Make a strong first impression. Give people an easy way to get in touch. Keep the next step moving while you run the business.</p>
        </div>

        <div className="after-click-stage-row" role="tablist" aria-label="What happens after a customer visits">
          {STAGES.map((label, index) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={stage === index}
              aria-controls="after-click-composition"
              className={cn("after-click-stage", stage === index && "is-active", stage > index && "is-complete")}
              onClick={() => selectStage(index)}
            >
              <span aria-hidden>{stage > index ? <Check size={14} /> : String(index + 1).padStart(2, "0")}</span>
              {label}
            </button>
          ))}
          <span className="after-click-line" aria-hidden><i style={{ width: `${(stage / (STAGES.length - 1)) * 100}%` }} /></span>
        </div>

        <div id="after-click-composition" className={`after-click-composition is-stage-${stage}`} role="tabpanel">
          <div className="after-click-glow" aria-hidden />
          <article className="after-click-request">
            <div className="after-click-windowbar"><span /><span /><span /><small>Service request</small></div>
            <p className="after-click-kicker">Home comfort</p>
            <h3 className="studio-display">AC service request</h3>
            <div className="after-click-formrow"><span>Service needed</span><strong>Cooling system check</strong></div>
            <div className="after-click-formrow"><span>Preferred timing</span><strong>This week</strong></div>
            <div className="after-click-submit">Send request <ArrowRight size={16} aria-hidden /></div>
          </article>

          <svg className="after-click-connector" viewBox="0 0 220 70" aria-hidden>
            <path d="M4 35 C64 35 64 12 110 12 S158 58 216 35" />
          </svg>

          <div className="after-click-status-stack">
            <article className={cn("after-click-status", stage >= 1 && "is-visible", stage === 1 && "is-current")}>
              <span><Mail size={16} aria-hidden /> New inquiry</span>
              <strong>AC service request</strong><small>Preferred: this week</small>
            </article>
            <article className={cn("after-click-status", stage >= 2 && "is-visible", stage === 2 && "is-current")}>
              <span><Check size={16} aria-hidden /> Confirmation sent</span>
              <strong>We received your request.</strong><small>The team will review it and follow up.</small>
            </article>
            <article className={cn("after-click-status", stage >= 3 && "is-visible", stage === 3 && "is-current")}>
              <span><Bell size={16} aria-hidden /> Owner notified</span>
              <strong>New website inquiry</strong><small>Service, timing and source are ready to review.</small>
            </article>
          </div>
        </div>

        <div className="after-click-actions">
          <Link to="/services/websites" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "after_click_websites" })} className="after-click-cta">
            See what your website could do <ArrowRight size={17} aria-hidden />
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="after-click-play"
            aria-label={paused || manual ? "Play automatic stage preview" : "Pause automatic stage preview"}
            onClick={() => { setManual(false); setPaused((current) => !current); }}
          >
            {paused || manual ? <Play aria-hidden /> : <Pause aria-hidden />}
          </Button>
        </div>
      </Container>
    </section>
  );
}
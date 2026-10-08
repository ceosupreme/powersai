import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Menu, Pause, Play, X } from "lucide-react";
import { LightField } from "@/components/review-hero/LightField";
import { ReviewDialogs, type DialogKind } from "@/components/review-hero/Dialogs";
import { SERVICE_LINKS, SERVICE_OBJECTS } from "@/components/review-hero/config";
import "@/components/review-hero/homeHero.css";

export default function HomeHeroReview() {
  const [userPaused, setUserPaused] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [idle, setIdle] = useState(false);
  const paused = userPaused || reduced;
  const menuBtn = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const hero = useRef<HTMLElement>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [menu, setMenu] = useState(false);
  const [services, setServices] = useState(false);
  const scene = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Design preview — Home hero | Supreme Team Media";
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { document.title = prevTitle; meta.remove(); };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    let vis = true;
    const sync = () => setIdle(!vis || document.hidden);
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; sync(); });
    if (hero.current) io.observe(hero.current);
    document.addEventListener("visibilitychange", sync);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);

  useEffect(() => {
    if (!menu) return;
    const closeMenu = (focus: boolean) => { setMenu(false); setServices(false); if (focus) menuBtn.current?.focus(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") closeMenu(true); };
    const down = (e: PointerEvent) => { if (header.current && !header.current.contains(e.target as Node)) closeMenu(false); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", down);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", down); };
  }, [menu]);

  useEffect(() => {
    if (!services || menu) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setServices(false); };
    const down = (e: PointerEvent) => { if (!(e.target as Element).closest?.(".rh-services")) setServices(false); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", down);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", down); };
  }, [services, menu]);

  useEffect(() => {
    const el = scene.current;
    if (!el || paused || !window.matchMedia("(pointer: fine)").matches) { el?.style.setProperty("--px", "0"); el?.style.setProperty("--py", "0"); return; }
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--px", ((e.clientX / window.innerWidth) - 0.5).toFixed(3));
        el.style.setProperty("--py", ((e.clientY / window.innerHeight) - 0.5).toFixed(3));
      });
    };
    window.addEventListener("pointermove", move);
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, [paused]);

  const contact = () => { setMenu(false); setDialog("contact"); };
  const navItems = (
    <>
      <div className="rh-services">
        <button type="button" className="rh-nav-link" aria-expanded={services} onClick={() => setServices((v) => !v)}>Services <ChevronDown size={15} aria-hidden /></button>
        {services && (
          <ul className="rh-services-menu">
            {SERVICE_LINKS.map((s) => <li key={s.to}><Link to={s.to}>{s.label}</Link></li>)}
          </ul>
        )}
      </div>
      <Link className="rh-nav-link" to="/industries">Industries</Link>
      <Link className="rh-nav-link" to="/work">Work</Link>
      <button type="button" className="rh-nav-link" onClick={() => { setMenu(false); setDialog("packages"); }}>Packages</button>
      <button type="button" className="rh-nav-link" onClick={() => { setMenu(false); setDialog("blog"); }}>Blog</button>
      <Link className="rh-nav-link" to="/about">About</Link>
    </>
  );

  return (
    <div className={`rh-root${paused ? " rh-paused" : ""}${idle ? " rh-idle" : ""}`}>
      <header className="rh-header" ref={header}>
        <Link to="/" className="rh-brand">Supreme Team Media</Link>
        <nav aria-label="Primary" className="rh-nav">{navItems}</nav>
        <button type="button" className="rh-btn rh-btn-primary rh-header-cta" onClick={contact}>Contact Us</button>
        <button ref={menuBtn} type="button" className="rh-menu-btn" aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu} onClick={() => setMenu((v) => !v)}>{menu ? <X size={20} /> : <Menu size={20} />}</button>
        {menu && <nav aria-label="Mobile" className="rh-mobile-nav">{navItems}</nav>}
      </header>

      <main>
        <section ref={hero} className="rh-hero" aria-labelledby="rh-title">
          <LightField paused={paused} />
          <div className="rh-copy">
            <h1 id="rh-title" className="rh-title"><span>Get noticed.</span><span>Get chosen.</span><span className="rh-accent">Get more done.</span></h1>
            <p className="rh-lede">We create standout marketing, beautiful websites and smart tools that handle more of the work—built around your business, not the other way around.</p>
            <div className="rh-actions">
              <button type="button" className="rh-btn rh-btn-primary rh-btn-lg" onClick={contact}>Contact Us</button>
              <Link to="/work" className="rh-secondary">View Our Work</Link>
            </div>
          </div>
          <div className="rh-scene" ref={scene} aria-label="Services">
            <ul className="rh-objects">
              {SERVICE_OBJECTS.map((o, i) => (
                <li key={o.label} className={`rh-obj rh-${o.shape}`} style={{ ["--i" as string]: i }}>
                  <span className="rh-face"><span className="rh-label">{o.label}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="rh-motion" onClick={() => setUserPaused((p) => !p)} aria-pressed={paused} disabled={reduced} title={reduced ? "Motion is off by your system setting" : undefined}>
            {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />} {reduced ? "Motion off (system setting)" : paused ? "Play motion" : "Pause motion"}
          </button>
        </section>
      </main>
      <p className="rh-preview-tag">Design preview · not published</p>
      <ReviewDialogs open={dialog} setOpen={setDialog} />
    </div>
  );
}

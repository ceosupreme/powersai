import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowDown, ArrowRight, Check, Plus, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { Container } from "@/components/marketing/studio/primitives";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { ROUTE_META } from "@/config/routeMeta";
import { groupServices, useServicePages, useStarterPackages, type ServicePageRow, type StarterPackageRow } from "@/hooks/useSitePages";
import { packageCart, usePackageCart } from "@/lib/packageCart";
import { ServiceIcon } from "@/components/marketing/pages/SitePageBits";
import { StarterCard } from "@/components/marketing/pages/packages/PackageBits";
import { useArmOnScroll } from "@/hooks/useArmOnScroll";
import { PackageSend } from "@/components/marketing/pages/packages/PackageSend";

const questions = [
  ["Which package should I choose?", "Pick the starter package that matches where your business is today, or build your own from the full menu. Not sure? Send what you have and we'll recommend the smallest sensible starting point."],
  ["How does the $0-down option work?", "On the Standard Web Package, the $0-down plan is $297 a month for 12 months, then $149 a month. If you stop early, the rest of the $2,500 is due before we hand the site over. The Local Growth Package is billed monthly from $300 a month, with nothing due up front. Its first term is three months, then it's month to month."],
  ["What do I own?", "It depends on the package, and you'll know before anything starts. A website you buy outright, including on the $0-down payment plan, is yours once it's paid in full. Sites on a monthly plan run on our platform while you're subscribed."],
  ["Are other costs included?", "You’ll know what is included, what it costs and what happens next before anything starts. Any outside costs, like your domain name or ad spend, are listed in your written price."],
] as const;

/** Switching a service on sends a short signal from it into "Your package": the side panel on wide
 *  screens, the bar at the bottom on phones. It runs once per tap and never under reduced motion. */
function sendSignal(from: HTMLElement, slug: string) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const target = [...document.querySelectorAll<HTMLElement>(".pk-pkg .pk-count, .pk-bar .pk-count")].find((el) => el.getClientRects().length > 0);
  if (!target || typeof from.animate !== "function") return;
  const a = (from.querySelector(".pk-dot") ?? from).getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const x = a.left + a.width / 2, y = a.top + a.height / 2;
  const dx = b.left + b.width / 2 - x, dy = b.top + b.height / 2 - y;
  const distance = Math.hypot(dx, dy);
  if (distance < 12) return;
  const turn = `rotate(${Math.atan2(dy, dx).toFixed(3)}rad)`;
  const spark = document.createElement("span");
  spark.className = "pk-signal";
  spark.setAttribute("aria-hidden", "true");
  spark.style.left = `${x}px`;
  spark.style.top = `${y}px`;
  document.body.appendChild(spark);
  const flight = spark.animate([
    { transform: `translate(0px, 0px) ${turn} scaleX(.3)`, opacity: 0 },
    { transform: `translate(${(dx * 0.12).toFixed(1)}px, ${(dy * 0.12).toFixed(1)}px) ${turn} scaleX(1)`, opacity: 1, offset: 0.15 },
    { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) ${turn} scaleX(.5)`, opacity: 0.85 },
  ], { duration: Math.min(720, 280 + distance * 0.45), easing: "cubic-bezier(.45,.05,.4,1)" });
  const land = () => {
    spark.remove();
    const led = document.querySelector<HTMLElement>(`.pk-pkg li[data-slug="${slug}"] .pk-led`);
    for (const el of [target, led]) {
      if (!el) continue;
      el.classList.remove("pk-hit");
      void el.offsetWidth;
      el.classList.add("pk-hit");
      window.setTimeout(() => el.classList.remove("pk-hit"), 700);
    }
  };
  flight.onfinish = land;
  flight.oncancel = () => spark.remove();
}

/** Shown in the top card until the visitor switches something on. */
const EXAMPLE = ["website-design", "google-business-profile", "review-management", "social-media-content"];
const SAFE_SRC = /^[a-z0-9_-]{1,80}$/i;

type Row = { key: string; name: string; group: string; starter?: boolean };

/** The top card: the visitor's own package once they pick something, an example until then. */
function PackageConsole({ rows, live, onSend }: { rows: Row[]; live: boolean; onSend: () => void }) {
  const shown = rows.slice(0, 4);
  return (
    <div className={`pk-console${live ? "" : " is-example"}`}>
      <div className="pk-console-top"><b>Your package</b><span>{live ? `${rows.length} switched on` : "For example"}</span></div>
      <h2>Built around what your business needs.</h2>
      <ul>
        {shown.map((r, i) => <li key={r.key}><i className={`pk-led${i % 2 ? " cy" : ""}`} aria-hidden="true" /><b>{r.name}</b><small>{r.group}</small></li>)}
        {rows.length > shown.length && <li><i className="pk-led" aria-hidden="true" /><b>{rows.length - shown.length} more</b></li>}
        <li className="pk-add"><a href="#build"><Plus aria-hidden />{live ? "Add anything else" : "Pick your own"}</a></li>
      </ul>
      <div className="pk-console-foot">
        <p><strong>Your price, in writing</strong>Back to you within one business day.</p>
        {live
          ? <button type="button" className="pk-chipbtn" onClick={onSend}>Get my price <ArrowRight aria-hidden /></button>
          : <a className="pk-chipbtn" href="#build">Get my price <ArrowRight aria-hidden /></a>}
      </div>
    </div>
  );
}

/**
 * /pricing, shown as Packages: starter packages by stage, plus every service
 * as a button with a light. Whatever the visitor picks goes into "Your
 * package"; sending it creates a lead and we reply with a written package
 * and price. Nothing is charged on this page.
 */
export default function Pricing() {
  useStudioHead({ ...ROUTE_META["/pricing"], path: "/pricing" });
  const location = useLocation();
  const { data: services = [], isLoading: servicesLoading, isError: servicesError } = useServicePages();
  const { data: starters = [], isLoading: startersLoading, isError: startersError } = useStarterPackages();
  const cart = usePackageCart();
  const [sendOpen, setSendOpen] = useState(false);
  const startersGrid = useRef<HTMLDivElement>(null);
  useArmOnScroll(startersGrid, starters.length > 0);
  const handled = useRef(false);

  const srcParam = new URLSearchParams(location.search).get("src");
  const src = srcParam && SAFE_SRC.test(srcParam) ? srcParam : null;
  const starter: StarterPackageRow | null = starters.find((s) => s.slug === cart.starter) ?? null;
  const picked = cart.services.map((slug) => services.find((s) => s.slug === slug)).filter((s): s is ServicePageRow => !!s);
  const count = picked.length + (starter ? 1 : 0);
  const groups = groupServices(services);
  const rows: Row[] = [
    ...(starter ? [{ key: `starter-${starter.slug}`, name: starter.name, group: "Starter package", starter: true }] : []),
    ...picked.map((s) => ({ key: s.slug, name: s.name, group: s.group_label })),
  ];
  const example: Row[] = EXAMPLE.map((slug) => services.find((s) => s.slug === slug)).filter((s): s is ServicePageRow => !!s).map((s) => ({ key: s.slug, name: s.name, group: s.group_label }));

  const openSend = (from: string) => {
    trackSiteEvent({ event_type: "cta_click", label: `packages_get_price_${from}` });
    setSendOpen(true);
  };
  const start = (pkg: StarterPackageRow) => {
    trackSiteEvent({ event_type: "cta_click", label: `packages_start_${pkg.slug}`.slice(0, 80) });
    packageCart.setStarter(pkg.slug);
    setSendOpen(true);
  };
  const toggle = (s: ServicePageRow, from?: HTMLElement) => {
    const adding = !cart.services.includes(s.slug);
    if (adding) trackSiteEvent({ event_type: "cta_click", label: `packages_add_${s.slug}`.slice(0, 80) });
    packageCart.toggle(s.slug);
    if (adding && from) sendSignal(from, s.slug);
  };

  // Links from other pages: ?add=service-slug lights that service, ?package=slug opens the send step with that
  // starter package. The params come off the address afterwards, so a refresh doesn't add them back.
  useEffect(() => {
    if (handled.current || servicesLoading || startersLoading) return;
    handled.current = true;
    const params = new URLSearchParams(location.search);
    const add = (params.get("add") ?? "").split(",").filter((slug) => services.some((s) => s.slug === slug));
    const pkg = params.get("package");
    if (add.length) packageCart.add(add);
    if (pkg && starters.some((s) => s.slug === pkg)) { packageCart.setStarter(pkg); setSendOpen(true); }
    if (params.has("add") || params.has("package")) {
      params.delete("add");
      params.delete("package");
      const rest = params.toString();
      window.history.replaceState(window.history.state, "", `${location.pathname}${rest ? `?${rest}` : ""}${location.hash}`);
    }
    // The menus load after the page opens, so line the section up again once they're in.
    const id = location.hash.slice(1);
    if (id === "build" || id === "starters") requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
  }, [servicesLoading, startersLoading, services, starters, location.search, location.pathname, location.hash]);

  const summary = rows.map((r) => r.name).join(", ");

  return <div className="stm-studio sp-page pk-page min-h-screen"><StudioHeader/><main>
    <section className="sp-hero" aria-labelledby="packages-title">
      <div className="sp-wrap pk-hero-grid">
        <div>
          <div className="sp-eyebrow">Packages</div>
          <h1 id="packages-title">Let's build the <em className="sp-accent">right package</em> for your business.</h1>
          <p className="sp-lead">Start with one of four ready-made packages, or pick exactly the services you need. Either way, you get a clear price, in writing, before anything starts.</p>
          <div className="sp-actions">
            <a className="sp-btn sp-btn-gold" href="#build" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "packages_hero_build" })}>Build my package <ArrowDown aria-hidden /></a>
            <a className="sp-btn sp-btn-line" href="#starters" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "packages_hero_starters" })}>See starter packages</a>
          </div>
          <div className="pk-trust"><span><i className="pk-led gr" aria-hidden="true" />We reply within one business day</span><span><i className="pk-led" aria-hidden="true" />A clear price, in writing</span></div>
        </div>
        <PackageConsole rows={count ? rows : example} live={count > 0} onSend={() => openSend("top")} />
      </div>
    </section>

    <section id="starters" className="pk-starters" aria-labelledby="starters-title">
      <div className="sp-wrap">
        <div className="pk-head">
          <div><div className="sp-eyebrow">Starter packages</div><h2 id="starters-title" className="sp-h2">Want to start faster? <em className="sp-accent">Pick a starter package.</em></h2></div>
          <p>Each one is built for where your business is right now. We'll fit it to you before anything starts.</p>
        </div>
        {startersLoading && <p role="status" className="pk-empty">Loading packages…</p>}
        {startersError && <p role="status" className="pk-empty">The packages couldn't be loaded right now. Please refresh the page.</p>}
        <div className="pk-grid" ref={startersGrid}>
          {starters.map((pkg, i) => (
            <StarterCard key={pkg.slug} pkg={pkg} index={i} picked={cart.starter === pkg.slug}
              action={<button type="button" className="sp-btn sp-btn-gold" onClick={() => start(pkg)}>{cart.starter === pkg.slug ? "In your package" : "Start with this package"}</button>} />
          ))}
        </div>
        <p className="pk-more">Bigger business, or want everything handled? <a href="#build">Build your own package <ArrowDown aria-hidden /></a></p>
      </div>
    </section>

    <section id="build" className="pk-build sp-dark" aria-labelledby="build-title">
      <div className="sp-wrap">
        <div className="pk-head pk-dark">
          <div><div className="sp-eyebrow">Build your own</div><h2 id="build-title" className="sp-h2">Or pick exactly <em className="sp-accent">what you need.</em></h2></div>
          <p>Tap any service to switch it on. It lights up and goes into your package. Send it when you're ready, and we'll come back with a price.</p>
        </div>
        <div className="pk-build-grid">
          <div>
            {servicesLoading && <p role="status" className="pk-state">Loading services…</p>}
            {servicesError && <p role="status" className="pk-state">The services couldn't be loaded right now. Please refresh the page.</p>}
            <div className="pk-cats">
              {groups.map((g, i) => (
                <div className="pk-cat" key={g.key} role="group" aria-labelledby={`pk-cat-${g.key}`}>
                  <div className="pk-cat-h">
                    <span className={`pk-cat-ic${i % 3 === 1 ? " cy" : ""}`}><ServiceIcon name={g.items[0]?.icon} /></span>
                    <h3 id={`pk-cat-${g.key}`}>{g.label}</h3>
                    <small>{g.items.length} {g.items.length === 1 ? "service" : "services"}</small>
                  </div>
                  <div className="pk-chips">
                    {g.items.map((s) => {
                      const on = cart.services.includes(s.slug);
                      return (
                        <button key={s.slug} type="button" className="pk-chip" aria-pressed={on} onClick={(e) => toggle(s, e.currentTarget)}>
                          <span className="pk-dot" aria-hidden="true" />{s.name}<span className="pk-pm" aria-hidden="true">{on ? <Check /> : <Plus />}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <aside className="pk-pkg" aria-label="Your package">
            <div className="pk-pkg-top"><h3>Your package</h3><span className={`pk-count${count ? "" : " is-zero"}`}>{count}</span></div>
            <p className="pk-hint">Tap a service to add it. Tap it again to take it out.</p>
            {count === 0 ? (
              <p className="pk-empty">Nothing switched on yet. Pick a starter package above, or tap any service.</p>
            ) : (
              <ul aria-live="polite">
                {starter && <li><i className="pk-led cy" aria-hidden="true" /><div><b>{starter.name}</b><small>Starter package</small></div><button type="button" aria-label={`Take out ${starter.name}`} onClick={() => packageCart.setStarter(null)}><X aria-hidden /></button></li>}
                {picked.map((s) => <li key={s.slug} data-slug={s.slug}><i className="pk-led" aria-hidden="true" /><div><b>{s.name}</b><small>{s.group_label}</small></div><button type="button" aria-label={`Take out ${s.name}`} onClick={() => packageCart.remove(s.slug)}><X aria-hidden /></button></li>)}
              </ul>
            )}
            <button type="button" className="sp-btn sp-btn-gold" disabled={!count} onClick={() => openSend("card")}>Get my price <ArrowRight aria-hidden /></button>
            <p className="pk-fine">No payment now. We reply within one business day with your package and a clear price.</p>
          </aside>
        </div>
        <div className="pk-bar">
          <span className={`pk-count${count ? "" : " is-zero"}`} aria-hidden="true">{count}</span>
          <div aria-live="polite"><b>Your package</b><small>{count ? summary : "Tap a service to add it"}</small></div>
          <button type="button" className="sp-btn sp-btn-gold" disabled={!count} onClick={() => openSend("bar")}>Get my price</button>
        </div>
      </div>
    </section>

    <section className="pk-next" aria-labelledby="next-title">
      <div className="sp-wrap">
        <div className="pk-head">
          <div><div className="sp-eyebrow">What happens next</div><h2 id="next-title" className="sp-h2">Send your package. <em className="sp-accent">We'll take it from there.</em></h2></div>
          <p>Starter package or your own list, it works the same way.</p>
        </div>
        <ol className="pk-steps">
          <li><span className="pk-n">1</span><h3>We read it</h3><p>Your list comes straight to us, and we reply personally within one business day.</p></li>
          <li><span className="pk-n">2</span><h3>You get a clear price</h3><p>A written package with the price, what's included and the timeline. If a starter package fits better, we'll say so.</p></li>
          <li><span className="pk-n">3</span><h3>Say yes, and we start</h3><p>Nothing is charged until you approve. Then we get to work, and you always know where things stand.</p></li>
        </ol>
      </div>
    </section>

    <section className="pricing-ownership"><Container><div><span className="home-eyebrow">Ownership and support</span><h2 className="home-section-title">Know what’s yours <em>before you start.</em></h2><p>A website you buy outright, including on the $0-down payment plan, is yours once it's paid in full. Sites on a monthly plan run on our platform while you're subscribed. The agreed scope, support and any outside costs are clear before work starts.</p></div><Accordion type="single" collapsible>{questions.map(([q,a],i) => <AccordionItem key={q} value={`pricing-${i}`}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}</Accordion></Container></section>
    <Inquiry source="pricing"/>
  </main><StudioFooter/>
  <PackageSend open={sendOpen} onOpenChange={setSendOpen} services={services} starters={starters} src={src} />
  </div>;
}

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { useStarterPackages, type StarterPackageRow } from "@/hooks/useSitePages";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { Accent } from "@/components/marketing/pages/SitePageBits";
import "./packages.css";

const label = (v: string) => v.replace(/[^a-z0-9_-]/gi, "_").slice(0, 60);

/** The stage bars: one for starting out, two for getting found, three for ready to grow; cyan for any stage. */
export function StageMeter({ level }: { level: number }) {
  return (
    <span className="pk-meter" aria-hidden="true">
      {[1, 2, 3].map((n) => <i key={n} className={level > 0 ? (n <= level ? "on" : "") : "cy"} />)}
    </span>
  );
}

/** One starter package card. The button underneath depends on where the card sits. */
export function StarterCard({ pkg, action, picked = false }: { pkg: StarterPackageRow; action: ReactNode; picked?: boolean }) {
  return (
    <article className={`pk-card${picked ? " is-picked" : ""}`} aria-label={pkg.name}>
      <div className="pk-stage"><StageMeter level={pkg.stage_level} /><span>{pkg.stage_label}</span></div>
      <h3>{pkg.name}</h3>
      {pkg.tagline && <p className="pk-who">{pkg.tagline}</p>}
      {pkg.items.length > 0 && <ul>{pkg.items.map((item) => <li key={item}><Check aria-hidden />{item}</li>)}</ul>}
      <div className="pk-card-foot">
        <p className="pk-price">{pkg.price_label}<strong>{pkg.price}</strong>{pkg.price_note && <small>{pkg.price_note}</small>}</p>
        {action}
      </div>
    </article>
  );
}

/** The starter packages on an industry page; each card opens the Packages page with that package ready to send. */
export function StarterStrip({ src }: { src: string }) {
  const { data = [] } = useStarterPackages();
  if (!data.length) return null;
  return (
    <>
      <div className="pk-strip">
        {data.map((pkg) => (
          <StarterCard
            key={pkg.slug}
            pkg={pkg}
            action={
              <Link className="sp-btn sp-btn-gold" to={`/pricing?package=${pkg.slug}&src=${src}`} onClick={() => trackSiteEvent({ event_type: "cta_click", label: label(`${src}_package_${pkg.slug}`) })}>
                Start with this package
              </Link>
            }
          />
        ))}
      </div>
      <p className="pk-more">
        Want something different?{" "}
        <Link to={`/pricing?src=${src}#build`} onClick={() => trackSiteEvent({ event_type: "cta_click", label: label(`${src}_build_own`) })}>
          Build your own package <ArrowRight aria-hidden />
        </Link>
      </p>
    </>
  );
}

/** The dark band before the contact form on city pages: starter packages first, build your own second. */
export function PackageBand({ title, accent, body, src }: { title: string; accent?: string; body: string; src: string }) {
  return (
    <section className="sp-band sp-dark">
      <div className="sp-wrap sp-band-in">
        <div>
          <h2><Accent text={title} accent={accent} /></h2>
          <p>{body}</p>
        </div>
        <div className="sp-band-acts">
          <Link className="sp-btn sp-btn-gold" to={`/pricing?src=${src}#starters`} onClick={() => trackSiteEvent({ event_type: "cta_click", label: label(`${src}_starters`) })}>
            See starter packages <ArrowRight aria-hidden />
          </Link>
          <Link className="sp-btn sp-btn-ghost" to={`/pricing?src=${src}#build`} onClick={() => trackSiteEvent({ event_type: "cta_click", label: label(`${src}_build_own`) })}>
            Build my own package
          </Link>
        </div>
      </div>
    </section>
  );
}

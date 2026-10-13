import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getStudioMedia } from "@/config/studioMedia";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import "@/components/marketing/pages/sitePages.css";
import "@/components/marketing/pages/packages/packages.css";

const EXAMPLE = ["Website design", "Local SEO", "Social media content"];

/**
 * The homepage's last word before the contact form: build the right package.
 * The picture is the named media slot "home-packages-photo" (a licensed photo
 * picked with the owner); until it has a photo, the package card carries the panel.
 */
export function HomePackages() {
  const photo = getStudioMedia("home-packages-photo");
  const hasPhoto = !!photo?.src;
  return (
    <section className="hp-close" aria-labelledby="home-packages-title">
      <div className="sp-wrap hp-close-grid">
        <div className={`hp-close-art${hasPhoto ? "" : " is-blank"}`}>
          <div className="hp-close-photo">
            {hasPhoto && photo?.src && <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" />}
          </div>
          <div className="hp-close-float" aria-hidden="true">
            <small>Your package</small>
            <ul>{EXAMPLE.map((name, i) => <li key={name}><i className={`pk-led${i === 1 ? " cy" : ""}`} />{name}</li>)}</ul>
          </div>
        </div>
        <div className="hp-close-text">
          <div className="sp-eyebrow">Let's build yours</div>
          <h2 id="home-packages-title">Let's put together the <em className="sp-accent">right package</em> for your business.</h2>
          <p className="sp-lead">Tell us where you are and what you need. You'll get a clear price, in writing, before anything starts.</p>
          <div className="sp-actions">
            <Link className="sp-btn sp-btn-gold" to="/pricing#build" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "home_packages_build" })}>Get my package <ArrowRight aria-hidden /></Link>
            <Link className="sp-btn sp-btn-line" to="/pricing#starters" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "home_packages_starters" })}>See starter packages</Link>
          </div>
          <p className="pk-trust"><span><i className="pk-led gr" aria-hidden="true" />Sean replies within one business day</span></p>
        </div>
      </div>
    </section>
  );
}

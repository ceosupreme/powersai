import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Container } from "../primitives";
import { trackSiteEvent } from "@/lib/studioAnalytics";

export function PricingTeaser({ websitePage = false }: { websitePage?: boolean }) {
  return <section className="pricing-teaser" aria-labelledby={websitePage ? "website-pricing-title" : "home-pricing-title"}><Container>
    <span className="home-eyebrow">Plans and pricing</span>
    <div className="pricing-teaser-grid">
      <h2 id={websitePage ? "website-pricing-title" : "home-pricing-title"} className="home-section-title">Website options from $2,500, or <em>$0 down at $297/month.</em></h2>
      <div><p>{websitePage ? "Launch with a polished website, or choose a Business Site that keeps opportunities moving after someone reaches out." : "Compare what is included and choose the right starting point for the business."}</p><Link to="/pricing" className="home-btn-amber" onClick={() => trackSiteEvent({ event_type: "cta_click", label: websitePage ? "website_view_pricing" : "home_view_pricing" })}>View pricing <ArrowRight size={16} aria-hidden /></Link></div>
    </div>
  </Container></section>;
}
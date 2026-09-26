import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { usePublishedVerticalLanders } from "@/hooks/useVerticalLanders";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { Container } from "../primitives";
import { getStudioMedia } from "@/config/studioMedia";

const normalize = (slug: string) => slug === "bars-restaurants" ? "restaurants" : slug === "taquerias" ? "tacos" : slug === "plumbing-hvac" ? "plumbing" : slug;

export function HomeIndustries() {
  const { data = [], isLoading, isError } = usePublishedVerticalLanders();
  const rows = data.map((row) => ({ ...row, slug: normalize(row.slug) }));
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const lead = [
    { slug: "hvac", media: "home-industry-hvac", title: "Service business", detail: "HVAC, plumbing, electrical, auto repair and more." },
    { slug: "pizza", media: "home-industry-pizza", title: "Restaurants", detail: "Online ordering, menus, catering and repeat visits." },
    { slug: "medspa", media: "home-industry-medspa", title: "Med spas & wellness", detail: "Consultation requests, forms and a calm client experience." },
  ].filter((item) => bySlug.has(item.slug));
  const secondary = rows.filter((row) => !lead.some((item) => item.slug === row.slug));

  return (
    <section className="home-industries home-industries-v3" aria-labelledby="home-industries-title">
      <Container>
        <div className="home-ind-v3-grid">
          <div className="home-ind-v3-intro">
            <span className="home-hero-v3-kicker">Industries</span>
            <h2 id="home-industries-title">Built for real businesses. Designed to grow.</h2>
            <p>Whether you&apos;re just getting started or ready to scale, pick your industry to see the website, customer experience and follow-up built for the way you work.</p>
            <Link to="/industries" className="home-btn-amber">View all industries <ArrowRight size={16} aria-hidden /></Link>
          </div>
          {isError ? (
            <p className="home-industries-status" role="status">Industry pages couldn&apos;t be loaded. <Link to="/industries">View all industries</Link>.</p>
          ) : isLoading ? (
            <p className="home-industries-status" role="status">Loading industries…</p>
          ) : (
            <div className="home-ind-v3-cards">
              {lead.map((item) => {
                const m = getStudioMedia(item.media);
                return (
                  <Link key={item.slug} to={`/for/${item.slug}`} className="home-ind-v3-card" onClick={() => trackSiteEvent({ event_type: "cta_click", label: `home_industry_${item.slug}` })}>
                    {m?.src && <img src={m.src} alt={m.alt} width={m.width} height={m.height} loading="lazy" />}
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.detail}</p>
                      <span className="home-ind-v3-cta">Explore <ArrowRight size={14} aria-hidden /></span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        {!isLoading && !isError && (
          <div className="home-industries-more">
            {bySlug.has("restaurants") && <Link to="/for/restaurants">Restaurants</Link>}
            {bySlug.has("tacos") && <Link to="/for/tacos">Taco shops / Taquerías</Link>}
            {secondary.filter((row) => !["restaurants", "tacos"].includes(row.slug)).map((row) => <Link key={row.slug} to={`/for/${row.slug}`}>{row.display_name}</Link>)}
          </div>
        )}
      </Container>
    </section>
  );
}
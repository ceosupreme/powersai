import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { usePublishedVerticalLanders } from "@/hooks/useVerticalLanders";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { Container } from "../primitives";

const normalize = (slug: string) => slug === "bars-restaurants" ? "restaurants" : slug === "taquerias" ? "tacos" : slug === "plumbing-hvac" ? "plumbing" : slug;

export function HomeIndustries() {
  const { data = [], isLoading, isError } = usePublishedVerticalLanders();
  const rows = data.map((row) => ({ ...row, slug: normalize(row.slug) }));
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const lead = [
    { slug: "hvac", title: "HVAC & home services", detail: "Clear service paths, faster inquiry capture and an easier handoff to the team." },
    { slug: "pizza", title: "Restaurants & pizza", detail: "A stronger local presence with direct paths to ordering, catering and repeat visits." },
    { slug: "medspa", title: "Med spas & wellness", detail: "Trust-building content and a smoother path from interest to consultation." },
  ].filter((item) => bySlug.has(item.slug));
  const secondary = rows.filter((row) => !lead.some((item) => item.slug === row.slug));

  return (
    <section className="home-industries" aria-labelledby="home-industries-title">
      <Container>
        <div className="home-industries-heading">
          <div><span className="studio-eyebrow">Industries</span><h2 id="home-industries-title" className="studio-display">Built around your business.</h2></div>
          <p>Explore the website, customer experience and follow-up that fit the way you work.</p>
        </div>
        {isError ? (
          <p className="home-industries-status" role="status">Industry pages couldn&apos;t be loaded. <Link to="/industries">View all industries</Link>.</p>
        ) : isLoading ? (
          <p className="home-industries-status" role="status">Loading industries…</p>
        ) : (
          <>
            <div className="home-industries-lead">
              {lead.map((item, index) => (
                <Link key={item.slug} to={`/for/${item.slug}`} onClick={() => trackSiteEvent({ event_type: "cta_click", label: `home_industry_${item.slug}` })}>
                  <span>0{index + 1}</span><h3 className="studio-display">{item.title}</h3><p>{item.detail}</p><ArrowRight aria-hidden />
                </Link>
              ))}
            </div>
            <div className="home-industries-more">
              {bySlug.has("restaurants") && <Link to="/for/restaurants">Restaurants</Link>}
              {bySlug.has("tacos") && <Link to="/for/tacos">Taco shops / Taquerías</Link>}
              {secondary.filter((row) => !["restaurants", "tacos"].includes(row.slug)).map((row) => <Link key={row.slug} to={`/for/${row.slug}`}>{row.display_name}</Link>)}
              <Link to="/industries" className="home-industries-all">View all industries <ArrowRight size={16} aria-hidden /></Link>
            </div>
          </>
        )}
      </Container>
    </section>
  );
}
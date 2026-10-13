import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, Plus } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { openAtTop } from "@/components/marketing/blog/BlogCard";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { useServicePages, useStarterPackages } from "@/hooks/useSitePages";
import { packageCart } from "@/lib/packageCart";
import { Accent, CheckupBand, Crumbs, FAMILIES, ServiceIcon, prefillContact, useIndustryNames } from "@/components/marketing/pages/SitePageBits";
import "@/components/marketing/pages/packages/packages.css";

const SITE = "https://supremeteammedia.com";

/** /services/:slug: one service, read from its service_pages row. */
export default function ServiceDetail() {
  const { slug = "" } = useParams();
  const { data: rows = [], isLoading, isError } = useServicePages();
  const industryNames = useIndustryNames();
  const { data: starters = [] } = useStarterPackages();
  const row = rows.find((r) => r.slug === slug);

  useStudioHead({
    title: row?.meta_title || (row ? `${row.name} | Supreme Team Media` : "Services | Supreme Team Media"),
    description: row?.meta_description || row?.intro || "Websites, marketing, branding and business systems for local businesses across San Diego County.",
    path: `/services/${slug}`,
  });
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }); }, [slug]);

  if (isLoading || isError || !row) {
    return (
      <div className="stm-studio sp-page min-h-screen"><StudioHeader />
        <main><div className="sp-state" role="status">
          {isLoading ? <p>Loading…</p> : <>
            <h1>{isError ? "This page couldn't be loaded." : "This service isn't listed."}</h1>
            <p>{isError ? "Please refresh, or " : "It may have moved. "}<Link to="/services" onClick={openAtTop}>see every service</Link>.</p>
          </>}
        </div></main>
      <StudioFooter /></div>
    );
  }

  const family = FAMILIES[row.family_path] ?? { label: "Services" };
  const related = row.related.map((s) => rows.find((r) => r.slug === s)).filter((r): r is NonNullable<typeof r> => !!r);
  const industries = row.industries.filter((s) => industryNames.has(s));
  const askPrice = () => {
    trackSiteEvent({ event_type: "cta_click", label: `service_price_${row.slug.replace(/-/g, "_")}` });
    prefillContact(`I'd like a price for ${row.name.toLowerCase()}.`);
  };
  const askQuestion = () => {
    trackSiteEvent({ event_type: "cta_click", label: `service_question_${row.slug.replace(/-/g, "_")}` });
    prefillContact(`I have a question about ${row.name.toLowerCase()}.`);
  };
  const partOf = starters.filter((p) => p.services.includes(row.slug));
  // Service and breadcrumb details for search engines ("<" escaped so row text can't close the tag).
  const jsonLd = JSON.stringify([
    { "@context": "https://schema.org", "@type": "Service", name: row.name, description: row.meta_description || row.intro, url: `${SITE}/services/${row.slug}`, provider: { "@type": "Organization", name: "Supreme Team Media", url: SITE }, areaServed: { "@type": "AdministrativeArea", name: "San Diego County" } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Services", item: `${SITE}/services` },
      { "@type": "ListItem", position: 2, name: family.label, item: `${SITE}${row.family_path}` },
      { "@type": "ListItem", position: 3, name: row.name, item: `${SITE}/services/${row.slug}` },
    ] },
  ]).replace(/</g, "\\u003c");

  return (
    <div className="stm-studio sp-page min-h-screen"><StudioHeader /><main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <section className="sp-hero" aria-labelledby="service-title">
        <div className="sp-wrap">
          <Crumbs items={[{ label: "Services", to: "/services" }, { label: family.label, to: row.family_path }, { label: row.name }]} />
          <div className="sp-hero-grid">
            <div>
              <div className="sp-eyebrow">{row.eyebrow || row.name}</div>
              <h1 id="service-title"><Accent text={row.headline} accent={row.headline_accent} /></h1>
              <p className="sp-lead">{row.intro}</p>
              <div className="sp-actions">
                <Link className="sp-btn sp-btn-gold" to={`/pricing?add=${row.slug}&src=service-${row.slug}#build`} onClick={() => { trackSiteEvent({ event_type: "cta_click", label: `service_add_${row.slug.replace(/-/g, "_")}` }); packageCart.add([row.slug]); }}>Add to my package <Plus aria-hidden /></Link>
                <a className="sp-btn sp-btn-line" href="#contact" onClick={askQuestion}>Ask a question</a>
              </div>
              {partOf.length > 0 && (
                <div className="pk-partof">
                  <span>In these starter packages</span>
                  {partOf.map((p) => <Link key={p.slug} to={`/pricing?package=${p.slug}&src=service-${row.slug}`} onClick={() => trackSiteEvent({ event_type: "cta_click", label: `service_package_${p.slug.replace(/-/g, "_")}` })}><i className="pk-led" aria-hidden="true" />{p.name}</Link>)}
                </div>
              )}
            </div>
            <div className="sp-tile" aria-hidden="true">
              <span className="sp-tile-glow" />
              <span className="sp-tile-icon"><ServiceIcon name={row.icon} /></span>
              <span className="sp-tile-dots"><i /><i /><i /><i /><i /></span>
            </div>
          </div>
        </div>
      </section>

      {row.included.length > 0 && (
        <section className="sp-section sp-white" aria-labelledby="service-included">
          <div className="sp-wrap">
            <div className="sp-eyebrow">What's included</div>
            <h2 id="service-included" className="sp-h2">Here's <em className="sp-accent">what you get.</em></h2>
            <ul className="sp-incl">
              {row.included.map((item) => (
                <li key={item.title}><span className="sp-incl-check"><Check aria-hidden /></span><h3>{item.title}</h3><p>{item.body}</p></li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="sp-section sp-soft">
        <div className="sp-wrap sp-fit">
          <div>
            <div className="sp-eyebrow">Who it's for</div>
            {row.audience_heading && <h3>{row.audience_heading}</h3>}
            {row.audience_body && <p>{row.audience_body}</p>}
            <div className="sp-chips">
              {industries.map((s) => <Link key={s} className="sp-chip" to={`/for/${s}`} onClick={openAtTop}>{industryNames.get(s)}</Link>)}
              <Link className="sp-chip" to="/industries" onClick={openAtTop}>All industries <ArrowRight aria-hidden /></Link>
            </div>
          </div>
          {related.length > 0 && (
            <div>
              <div className="sp-eyebrow">Works well with</div>
              <h3>Pair it with these.</h3>
              <div className="sp-rel">
                {related.map((r) => (
                  <Link key={r.slug} to={`/services/${r.slug}`} onClick={() => { trackSiteEvent({ event_type: "cta_click", label: `service_related_${r.slug.replace(/-/g, "_")}` }); openAtTop(); }}>
                    <div><b>{r.name}</b>{r.summary && <small>{r.summary}</small>}</div><ArrowRight aria-hidden />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <CheckupBand
        title="See where your business stands."
        accent="stands."
        body="Your free business checkup shows how your Google listing, reviews and website compare with the top three businesses near you on Google Maps."
        src={`service-${row.slug}`}
        onPrice={askPrice}
      />
      <Inquiry servicePage={family.servicePage} source={family.servicePage ? undefined : "startups"} section={`service-${row.slug}`} />
    </main><StudioFooter /></div>
  );
}

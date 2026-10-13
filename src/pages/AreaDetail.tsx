import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { openAtTop } from "@/components/marketing/blog/BlogCard";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { groupServices, useCityPages, useServicePages } from "@/hooks/useSitePages";
import { Accent, Crumbs, prefillContact, useIndustryNames } from "@/components/marketing/pages/SitePageBits";
import { PackageBand } from "@/components/marketing/pages/packages/PackageBits";

const SITE = "https://supremeteammedia.com";
const clean = (v: string, max: number) => v.replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** The free checkup, with this place already filled in. Same check as the homepage. */
function AreaCheckup({ city, slug }: { city: string; slug: string }) {
  const navigate = useNavigate();
  const [business, setBusiness] = useState("");
  const [place, setPlace] = useState(city);
  const [missing, setMissing] = useState<string | null>(null);
  useEffect(() => setPlace(city), [city]);
  const run = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const biz = clean(business, 120);
    const where = clean(place, 80);
    if (!biz) { setMissing("Add your business name to run the checkup."); return; }
    if (!where) { setMissing("Add your city to run the checkup."); return; }
    setMissing(null);
    trackSiteEvent({ event_type: "cta_click", label: `area_checkup_${slug.replace(/-/g, "_")}` });
    navigate(`/free-audit?${new URLSearchParams({ biz, city: where, src: `area-${slug}`, start: "1" }).toString()}`);
    openAtTop();
  };
  return (
    <form className="sp-check" onSubmit={run} noValidate aria-labelledby="area-check-title">
      <span className="sp-check-kicker">Free business checkup</span>
      <h2 id="area-check-title">How does your {city} business show up on Google?</h2>
      <p>See your Google listing, reviews and website next to the top three businesses near you on Google Maps.</p>
      <label htmlFor="area-check-business">Business name</label>
      <input id="area-check-business" name="business" autoComplete="organization" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Your business name" maxLength={120} />
      <label htmlFor="area-check-city">City</label>
      <input id="area-check-city" name="city" autoComplete="address-level2" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={80} />
      {missing && <p className="sp-check-error" role="alert">{missing}</p>}
      <button type="submit" className="sp-btn sp-btn-gold">Check my business <ArrowRight aria-hidden /></button>
      <p className="sp-check-note">Free. About two minutes. No phone call needed.</p>
    </form>
  );
}

/** /areas/:slug: one city or area we serve, read from its city_pages row. */
export default function AreaDetail() {
  const { slug = "" } = useParams();
  const { data: cities = [], isLoading, isError } = useCityPages();
  const { data: services = [] } = useServicePages();
  const industryNames = useIndustryNames();
  const row = cities.find((c) => c.slug === slug);

  useStudioHead({
    title: row?.meta_title || (row ? `Marketing & Websites in ${row.name} | Supreme Team Media` : "Areas we serve | Supreme Team Media"),
    description: row?.meta_description || row?.intro || "Marketing, websites and follow-up for businesses across San Diego County.",
    path: `/areas/${slug}`,
  });
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }); }, [slug]);

  if (isLoading || isError || !row) {
    return (
      <div className="stm-studio sp-page min-h-screen"><StudioHeader />
        <main><div className="sp-state" role="status">
          {isLoading ? <p>Loading…</p> : <>
            <h1>{isError ? "This page couldn't be loaded." : "This area isn't listed yet."}</h1>
            <p>{isError ? "Please refresh, or " : "We still work there. "}<Link to="/areas" onClick={openAtTop}>see every area we serve</Link>.</p>
          </>}
        </div></main>
      <StudioFooter /></div>
    );
  }

  const groups = groupServices(services);
  const industries = row.industries.filter((s) => industryNames.has(s));
  const nearby = row.nearby.map((s) => cities.find((c) => c.slug === s)).filter((c): c is NonNullable<typeof c> => !!c);
  const askPrice = () => prefillContact(`I run a business in ${row.name} and I'd like a price.`);
  const jsonLd = JSON.stringify([
    { "@context": "https://schema.org", "@type": "ProfessionalService", name: "Supreme Team Media", url: `${SITE}/areas/${row.slug}`, description: row.meta_description || row.intro, areaServed: { "@type": "City", name: `${row.checkup_city}, California` }, address: { "@type": "PostalAddress", addressLocality: "Carlsbad", addressRegion: "CA", addressCountry: "US" } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "About", item: `${SITE}/about` },
      { "@type": "ListItem", position: 2, name: "Areas we serve", item: `${SITE}/areas` },
      { "@type": "ListItem", position: 3, name: row.name, item: `${SITE}/areas/${row.slug}` },
    ] },
  ]).replace(/</g, "\\u003c");

  return (
    <div className="stm-studio sp-page min-h-screen"><StudioHeader /><main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <section className="sp-hero" aria-labelledby="area-title">
        <div className="sp-wrap">
          <Crumbs items={[{ label: "About", to: "/about" }, { label: "Areas we serve", to: "/areas" }, { label: row.name }]} />
          <div className="sp-hero-grid">
            <div>
              <div className="sp-eyebrow">{row.eyebrow || `${row.name}, California`}</div>
              <h1 id="area-title"><Accent text={row.headline} accent={row.headline_accent} /></h1>
              <p className="sp-lead">{row.intro}</p>
              <div className="sp-actions">
                <a className="sp-btn sp-btn-gold" href="#contact" onClick={() => { trackSiteEvent({ event_type: "cta_click", label: `area_talk_${row.slug.replace(/-/g, "_")}` }); askPrice(); }}>Talk to us <ArrowRight aria-hidden /></a>
                <Link className="sp-btn sp-btn-line" to="/pricing" onClick={() => { trackSiteEvent({ event_type: "cta_click", label: `area_pricing_${row.slug.replace(/-/g, "_")}` }); openAtTop(); }}>See what it costs</Link>
              </div>
            </div>
            <AreaCheckup city={row.checkup_city} slug={row.slug} />
          </div>
        </div>
      </section>

      {groups.length > 0 && (
        <section className="sp-section sp-white" aria-labelledby="area-services">
          <div className="sp-wrap">
            <div className="sp-eyebrow">What we do in {row.name}</div>
            <h2 id="area-services" className="sp-h2">Every service, <em className="sp-accent">for {row.name} businesses.</em></h2>
            <p className="sp-sub">Pick one, or tell us what you need and we'll put together the right mix.</p>
            <div className="sp-groups">
              {groups.map((g) => (
                <div className="sp-group" key={g.key}>
                  <h3>{g.label}</h3>
                  {g.items.map((s) => <Link key={s.slug} to={`/services/${s.slug}`} onClick={openAtTop}><span>{s.name}</span><ArrowRight aria-hidden /></Link>)}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="sp-section sp-soft" aria-labelledby="area-industries">
        <div className="sp-wrap">
          <div className="sp-eyebrow">Who we work with</div>
          <h2 id="area-industries" className="sp-h2">{row.name} businesses <em className="sp-accent">we know well.</em></h2>
          <div className="sp-chips" style={{ marginTop: 30 }}>
            {industries.map((s) => <Link key={s} className="sp-chip" to={`/for/${s}`} onClick={openAtTop}>{industryNames.get(s)}</Link>)}
            <Link className="sp-chip" to="/industries" onClick={openAtTop}>All industries <ArrowRight aria-hidden /></Link>
          </div>
          {nearby.length > 0 && (
            <div className="sp-near">
              <span className="sp-near-label">Nearby</span>
              {nearby.map((c) => <Link key={c.slug} className="sp-chip" to={`/areas/${c.slug}`} onClick={openAtTop}><MapPin aria-hidden />{c.name}</Link>)}
              <Link className="sp-link" to="/areas" onClick={openAtTop}>All areas we serve</Link>
            </div>
          )}
        </div>
      </section>

      <PackageBand
        title={`Let's build the right package for your ${row.name} business.`}
        accent={`${row.name} business.`}
        body="Start from a package made for where your business is, or pick exactly what you need. You'll get a clear price, in writing, before anything starts."
        src={`area-${row.slug}`}
      />
      <Inquiry section={`area-${row.slug}`} />
    </main><StudioFooter /></div>
  );
}

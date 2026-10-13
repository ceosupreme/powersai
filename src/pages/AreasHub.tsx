import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { openAtTop } from "@/components/marketing/blog/BlogCard";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { ROUTE_META } from "@/config/routeMeta";
import { groupCities, useCityPages } from "@/hooks/useSitePages";
import { CheckupBand, Crumbs, prefillContact } from "@/components/marketing/pages/SitePageBits";

const firstSentence = (text: string) => (text.match(/^.*?[.!?](\s|$)/)?.[0] ?? text).trim();

/** /areas: every city and area we serve, by region (it sits under About). */
export default function AreasHub() {
  useStudioHead({ ...ROUTE_META["/areas"], path: "/areas" });
  const { data = [], isLoading, isError } = useCityPages();
  const regions = groupCities(data);
  const ask = () => prefillContact("My business is in an area that isn't listed. Do you work there?");
  return (
    <div className="stm-studio sp-page min-h-screen"><StudioHeader /><main>
      <section className="sp-hero sp-hub-hero" aria-labelledby="areas-title">
        <div className="sp-wrap">
          <Crumbs items={[{ label: "About", to: "/about" }, { label: "Areas we serve" }]} />
          <div className="sp-eyebrow">Areas we serve</div>
          <h1 id="areas-title">Serving businesses across <em className="sp-accent">San Diego County.</em></h1>
          <p className="sp-lead">We're based in Carlsbad Village and work with businesses all over the county, plus clients anywhere online. Pick your area to see what we do there and run a free checkup for your business.</p>
        </div>
      </section>
      <section className="sp-section sp-white" aria-label="Cities and areas">
        <div className="sp-wrap">
          {isLoading && <p role="status">Loading areas…</p>}
          {isError && <p role="status">Areas couldn't be loaded right now. Please refresh.</p>}
          <div className="sp-regions" style={{ marginTop: 0 }}>
            {regions.map((r) => (
              <div className="sp-region" key={r.region}>
                <h2>{r.region}</h2>
                <div className="sp-city-grid">
                  {r.items.map((c) => (
                    <Link key={c.slug} className="sp-city" to={`/areas/${c.slug}`} onClick={() => { trackSiteEvent({ event_type: "cta_click", label: `areas_hub_${c.slug.replace(/-/g, "_")}` }); openAtTop(); }}>
                      <b>{c.name}<ArrowRight aria-hidden /></b>
                      {c.is_coastal && <span className="sp-tag">Coast</span>}
                      <small>{firstSentence(c.intro)}</small>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CheckupBand
        title="Don't see your area?"
        accent="your area?"
        body="We work with businesses all over San Diego County and anywhere online. Tell us where you are, or run the free business checkup to see how you show up on Google."
        src="areas-hub"
        priceLabel="Talk to us"
        onPrice={ask}
      />
      <Inquiry section="area-all" />
    </main><StudioFooter /></div>
  );
}

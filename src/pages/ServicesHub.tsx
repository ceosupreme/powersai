import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { openAtTop } from "@/components/marketing/blog/BlogCard";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { ROUTE_META } from "@/config/routeMeta";
import { groupServices, useServicePages } from "@/hooks/useSitePages";
import { CheckupBand, prefillContact } from "@/components/marketing/pages/SitePageBits";

/** /services: every service, by group, each linking to its own page. */
export default function ServicesHub() {
  useStudioHead({ ...ROUTE_META["/services"], path: "/services" });
  const { data = [], isLoading, isError } = useServicePages();
  const groups = groupServices(data);
  const ask = () => prefillContact("I'm not sure which services I need. Can you help me put together the right mix?");
  return (
    <div className="stm-studio sp-page min-h-screen"><StudioHeader /><main>
      <section className="sp-hero sp-hub-hero" aria-labelledby="services-title">
        <div className="sp-wrap">
          <div className="sp-eyebrow">Services</div>
          <h1 id="services-title">Everything we do, <em className="sp-accent">in one place.</em></h1>
          <p className="sp-lead">Websites, Google and reviews, social media, ads, branding, video, follow-up and the systems behind them. Pick a service to see what's included, or tell us what you need and we'll put together the right mix.</p>
          <div className="sp-actions">
            <a className="sp-btn sp-btn-gold" href="#contact" onClick={() => { trackSiteEvent({ event_type: "cta_click", label: "services_hub_contact" }); ask(); }}>Tell us what you need <ArrowRight aria-hidden /></a>
            <Link className="sp-btn sp-btn-line" to="/free-audit?src=services-hub" onClick={() => { trackSiteEvent({ event_type: "cta_click", label: "services_hub_checkup" }); openAtTop(); }}>Run my free checkup</Link>
          </div>
        </div>
      </section>
      <section className="sp-section sp-white" aria-label="All services">
        <div className="sp-wrap">
          {isLoading && <p role="status">Loading services…</p>}
          {isError && <p role="status">Services couldn't be loaded right now. Please refresh.</p>}
          <div className="sp-groups" style={{ marginTop: 0 }}>
            {groups.map((g) => (
              <div className="sp-group" key={g.key}>
                <h2 style={{ marginBottom: 8, font: "800 18px 'Inter Tight',sans-serif", letterSpacing: "-.01em" }}>{g.label}</h2>
                {g.items.map((s) => (
                  <Link key={s.slug} to={`/services/${s.slug}`} onClick={() => { trackSiteEvent({ event_type: "cta_click", label: `services_hub_${s.slug.replace(/-/g, "_")}` }); openAtTop(); }}>
                    <span>{s.name}{s.summary && <small>{s.summary}</small>}</span><ArrowRight aria-hidden />
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      <CheckupBand
        title="Not sure where to start?"
        accent="where to start?"
        body="Run the free business checkup. It shows how your Google listing, reviews and website compare with the top three businesses near you, and the first things to fix."
        src="services-hub"
        priceLabel="Talk to us"
        onPrice={ask}
      />
      <Inquiry section="service-all" />
    </main><StudioFooter /></div>
  );
}

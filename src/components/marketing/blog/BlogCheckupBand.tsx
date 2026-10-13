import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { openAtTop } from "./BlogCard";

/** The free checkup, offered at the end of the blog page and every post. */
export function BlogCheckupBand({ source }: { source: string }) {
  const id = `blog-cta-${source}`;
  return (
    <aside className="stm-blog-cta" aria-labelledby={id}>
      <div>
        <small>Free business checkup</small>
        <h2 id={id}>See how your business shows up on Google.</h2>
        <p>Type in your business name and city. In about two minutes you get a free report on your Google listing, your reviews and your website, with the top things to fix. No phone call needed.</p>
      </div>
      <div className="stm-blog-cta-actions">
        <Link
          to={`/free-audit?src=${source}`}
          className="stm-blog-cta-btn"
          onClick={() => { trackSiteEvent({ event_type: "cta_click", label: `${source}_checkup` }); openAtTop(); }}
        >
          Get my free report <ArrowRight aria-hidden />
        </Link>
        <Link to="/#contact" className="stm-blog-cta-alt" onClick={() => trackSiteEvent({ event_type: "cta_click", label: `${source}_contact` })}>Or talk to us</Link>
      </div>
    </aside>
  );
}

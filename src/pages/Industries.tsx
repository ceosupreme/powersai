import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Container } from "@/components/marketing/studio/primitives";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { BrowserScene, type Interaction } from "@/components/marketing/vertical-v2/IndustryInteraction";
import { getStudioMedia } from "@/config/studioMedia";
import { trackSiteEvent } from "@/lib/studioAnalytics";

type DirectoryRow = { slug: string; display_name: string; subline: string | null; sort_order: number; layout: unknown };
const priority = [
  { slug: "hvac", media: "home-industry-hvac" },
  { slug: "pizza", media: "home-industry-pizza" },
  { slug: "medspa", media: "home-industry-medspa" },
];
const firstSentence = (text: string | null) => {
  const value = (text ?? "").trim();
  return (value.match(/^.*?[.!?](\s|$)/)?.[0] ?? value).trim();
};
function layoutFor(row: DirectoryRow): { hero?: { media?: string | null }; interaction?: Interaction } {
  return row.layout && typeof row.layout === "object" && !Array.isArray(row.layout) ? row.layout as { hero?: { media?: string | null }; interaction?: Interaction } : {};
}
function DirectoryArt({ row, mediaKey }: { row: DirectoryRow; mediaKey?: string }) {
  const [failed, setFailed] = useState(false);
  const layout = layoutFor(row);
  const media = getStudioMedia(mediaKey ?? layout.hero?.media);
  const interaction = layout.interaction;
  const screen = interaction?.kind === "walkthrough" ? interaction.steps?.[0] : interaction?.options?.[0];
  if (media?.src && !failed) return <img src={media.src} alt={media.alt} width={media.width} height={media.height} loading="lazy" onError={() => setFailed(true)} />;
  if (interaction?.business || interaction?.domain || screen?.heading) return <div className="industry-v2 directory-browser"><BrowserScene interaction={interaction} screen={screen} /></div>;
  return <div className="directory-type-art" aria-hidden="true"><span>{row.display_name}</span><ArrowRight size={28} /></div>;
}

export default function Industries() {
  useStudioHead({ title: "Industries | Supreme Team Media", description: "Websites and follow-up built around the way local businesses get customers. Explore published industry pages or tell Sean about your business.", path: "/industries" });
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["industries-v2-directory"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("vertical_landing_pages").select("slug,display_name,subline,sort_order,layout").eq("status", "published").gte("page_version", 2).order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DirectoryRow[];
    },
  });
  const featured = priority.flatMap(item => { const row = rows.find(r => r.slug === item.slug); return row ? [{ row, media: item.media }] : []; });
  const other = rows.filter(row => !priority.some(item => item.slug === row.slug));
  return <div className="stm-studio directory-page min-h-screen"><StudioHeader/><main>
    <section className="directory-intro"><Container><span className="home-eyebrow">Industries / built for your trade</span><h1 className="home-section-title">Built around <em>your business.</em></h1><p>Websites and follow-up built for how each trade actually gets customers. Pick yours, or tell me about a business that is not listed.</p></Container></section>
    <section className="directory-featured" aria-label="Featured industries"><Container>
      {isLoading && <p role="status">Loading industries…</p>}
      {isError && <p role="status">Industries could not be loaded right now. Please try again.</p>}
      <div className="directory-featured-grid">{featured.map(({row,media},i) => <Link className={`directory-feature directory-feature-${i}`} key={row.slug} to={`/for/${row.slug}`} onClick={() => trackSiteEvent({ event_type: "cta_click", label: `industries_${row.slug}` })}><div className="directory-feature-image"><DirectoryArt row={row} mediaKey={media}/></div><div className="directory-feature-caption"><div><span className="home-eyebrow">Explore the industry</span><h2>{row.display_name}</h2><p>{firstSentence(row.subline)}</p></div><ArrowRight aria-hidden size={23}/></div></Link>)}</div>
    </Container></section>
    {!isLoading && !isError && other.length > 0 && <section className="directory-rest" aria-label="More industries"><Container><span className="home-eyebrow">More ways to work together</span><h2 className="home-section-title">Find <em>your field.</em></h2><div className="directory-rest-grid">{other.map((row,i) => <article className={`directory-tile directory-tile-${i % 4}`} key={row.slug}><Link to={`/for/${row.slug}`} className="directory-tile-main" onClick={() => trackSiteEvent({ event_type: "cta_click", label: `industries_${row.slug}` })}><div className="directory-tile-art"><DirectoryArt row={row}/></div><div className="directory-tile-caption"><div><h3>{row.display_name}</h3><p>{firstSentence(row.subline)}</p></div><ArrowRight aria-hidden size={21}/></div></Link>{row.slug === "tacos" && <Link className="directory-es-link" to="/for/tacos?lang=es">Español <ArrowRight size={14} aria-hidden/></Link>}</article>)}</div></Container></section>}
    <section className="directory-invite"><Container><span className="home-eyebrow">Something different?</span><h2 className="home-section-title">Don&apos;t see <em>your business?</em></h2><p>What these pages describe works for almost any local business that takes inquiries. Tell me about yours.</p><Link className="home-btn-amber" to="/?intent=websites&src=industries#contact" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "industries_custom_project" })}>Tell me about yours <ArrowRight size={17} aria-hidden/></Link></Container></section>
  </main><StudioFooter/></div>;
}
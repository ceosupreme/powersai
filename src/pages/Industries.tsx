import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { FLAGSHIP_SLUGS, VERTICALS } from "@/components/marketing/vertical-flagship/config";
import { VerticalHeroVisual } from "@/components/marketing/vertical-flagship/VerticalVisuals";

export default function Industries() {
  useStudioHead({ title: "Industry Growth Systems | Supreme Team Media", description: "Industry-specific brand, website, marketing, conversion, retention and business systems from Supreme Team Media.", path: "/industries" });
  return <div className="stm-studio industries-page"><StudioHeader/><main><section className="industries-hero"><div className="studio-container"><p className="studio-eyebrow">Industries</p><h1 className="studio-display">Industry-specific growth systems, without forcing every business into the same playbook.</h1><p>Each market has different trust signals, buying cycles, tools, and handoffs. The strategy should reflect them.</p></div></section><section className="industries-grid-section"><div className="studio-container industries-grid">{FLAGSHIP_SLUGS.map((slug, index) => { const item = VERTICALS[slug]; return <Link to={`/for/${slug}`} key={slug} className={`industry-tile industry-tile-${slug}`}><span>0{index + 1}</span><VerticalHeroVisual slug={slug}/><h2>{item.name}</h2><p>{item.description}</p><strong>Explore the growth system <ArrowRight aria-hidden size={16}/></strong></Link>; })}</div></section></main><StudioFooter/></div>;
}
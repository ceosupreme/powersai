import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Container } from "@/components/marketing/studio/primitives";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { ROUTE_META } from "@/config/routeMeta";
import { OptionalStudioMedia } from "@/components/marketing/studio/OptionalStudioMedia";

const stages = ["Manuscript or product", "Packaging", "Listing", "Launch materials"];
const descriptions = [
  "Maya brings the final manuscript, author bio, photo and the rights to every image used.",
  "The cover and interior give the recipes a coherent form in print and on screen.",
  "The description, keywords and product page give readers a clear place to discover the release.",
  "Launch graphics and emails carry the same visual language into the announcement.",
];
const questions = [
  ["Do I keep the rights?", "Yes. You retain the rights to your work."],
  ["Who owns the accounts?", "You do. Accounts are set up or used in your own name, with royalties paid directly to you."],
  ["How is it priced?", "The work is scoped and quoted in writing after a short conversation."],
];

function Cover({ small = false }: { small?: boolean }) {
  return <div className={`publish-cover${small ? " publish-cover-small" : ""}`}><span>SALT & HARBOR</span><div className="publish-cover-mark" aria-hidden="true"><i/><i/><i/></div><strong>Recipes<br/>from the <em>Coast</em></strong><small>MAYA TORRES</small></div>;
}
function ProductPage() {
  return <div className="publish-product"><div className="publish-browser-line">THE AUTHOR'S SHOP <span>BOOKS · ABOUT</span></div><div className="publish-product-inner"><Cover small/><div><span>NEW RELEASE</span><h3>Salt & Harbor</h3><p>Recipes from the Coast</p><small>By Maya Torres</small><span className="publish-faux-action">Explore the book <ArrowRight size={14} aria-hidden/></span></div></div></div>;
}
function LaunchGraphic() {
  return <div className="publish-launch"><span>FROM MAYA TORRES</span><strong>A table by<br/><em>the sea.</em></strong><p>SALT & HARBOR<br/>Recipes from the Coast</p><small>COMING TO READERS</small></div>;
}
function Interior() {
  return <div className="publish-interior"><span>SALT & HARBOR / THE RECIPES</span><div><small>CHAPTER TWO · FROM THE COAST</small><h3>The things<br/>we bring <em>home.</em></h3><p>A collection of recipes for slow afternoons, shared tables and the places we return to.</p><hr/><span>02 &nbsp; / &nbsp; Recipes from the Coast</span></div></div>;
}

export default function PublishingServices() {
  const [stage, setStage] = useState(0);
  useStudioHead({ ...ROUTE_META["/publishing"], path: "/publishing" });
  return <div className="stm-studio svc-page publishing-page min-h-screen"><StudioHeader/><main>
    <section className="svc-hero svc-band-light" aria-labelledby="publishing-title"><Container className="svc-hero-grid"><div className="svc-hero-copy"><span className="home-eyebrow">01 / Publishing & launch</span><h1 id="publishing-title">Take your finished work <em>all the way to release.</em></h1><p>Turn a finished book or digital product into a coordinated release people can discover, understand and buy—in accounts you own.</p><div className="svc-actions"><a className="home-btn-amber" href="#contact" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "talk_publishing" })}>Talk about a release <ArrowRight size={16} aria-hidden/></a><Link className="home-btn-ghost" to="/work" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "publishing_see_work" })}>See the work <ArrowRight size={16} aria-hidden/></Link></div></div><div className="svc-hero-media publishing-hero-media"><OptionalStudioMedia mediaKey="publishing-release-spread"/></div></Container></section>
    <section className="svc-section svc-band-dark publishing-sequence" aria-labelledby="publishing-sequence-title"><Container><span className="home-eyebrow">02 / The release sequence</span><h2 id="publishing-sequence-title" className="home-section-title">One release, <em>from start to finish.</em></h2><div className="publish-tabs" role="tablist" aria-label="Release stages" onKeyDown={e => { const next = e.key === "ArrowRight" ? (stage+1)%4 : e.key === "ArrowLeft" ? (stage+3)%4 : e.key === "Home" ? 0 : e.key === "End" ? 3 : null; if (next !== null) { e.preventDefault(); setStage(next); document.getElementById(`publish-tab-${next}`)?.focus(); } }}>{stages.map((name,i) => <Button type="button" variant="ghost" role="tab" id={`publish-tab-${i}`} aria-controls="publish-panel" aria-selected={stage===i} tabIndex={stage===i ? 0 : -1} className={stage===i ? "is-active" : ""} onClick={() => setStage(i)} key={name}><span>0{i+1}</span>{name}</Button>)}</div><div key={stage} className="publish-stage-panel studio-state-panel" role="tabpanel" id="publish-panel" aria-labelledby={`publish-tab-${stage}`}><div><span className="home-eyebrow">Salt & Harbor / {stages[stage]}</span><h3>{stages[stage]}</h3><p>{descriptions[stage]}</p></div><div className="publish-stage-art">{stage === 0 ? <Interior/> : stage === 1 ? <Cover/> : stage === 2 ? <ProductPage/> : <LaunchGraphic/>}</div></div></Container></section>
    <section className="svc-section svc-band-light publishing-deliverables" aria-labelledby="publishing-deliverables-title"><Container><span className="home-eyebrow">03 / The release, in the world</span><h2 id="publishing-deliverables-title" className="home-section-title">Made to belong <em>together.</em></h2><div className="publish-deliverable-grid"><div className="publish-deliverable-main"><Cover/><span>THE COVER</span></div><div className="publish-deliverable-details"><div><Interior/><span>INTERIOR SPREAD</span></div><div><ProductPage/><span>PRODUCT PAGE</span></div><div><LaunchGraphic/><span>LAUNCH GRAPHIC</span></div></div></div></Container></section>
    <section className="svc-section svc-band-dark publishing-kit" aria-labelledby="publishing-kit-title"><Container><span className="home-eyebrow">04 / One coordinated release</span><h2 id="publishing-kit-title" className="home-section-title">The whole kit, <em>ready to travel.</em></h2><p>From the first page to the release announcement, every piece should feel like it comes from the same work.</p><div className="publish-kit-layout"><div><Cover/></div><div><Interior/></div><div><ProductPage/></div><div><LaunchGraphic/></div></div></Container></section>
    <section className="svc-section svc-band-light publishing-scope" aria-labelledby="publishing-scope-title"><Container><span className="home-eyebrow">05 / Scope and ownership</span><h2 id="publishing-scope-title" className="home-section-title">Your work. <em>Your release.</em></h2><div className="publish-scope-grid"><div><h3>Accounts and royalties</h3><p>Amazon KDP, IngramSpark, Gumroad or Etsy accounts are set up or used in your own name. Royalties go directly to you.</p></div><div><h3>What you prepare</h3><p>The final manuscript or product files, your author bio and photo, and rights to every image used.</p></div><div><h3>Approvals</h3><p>Cover direction, interior proof, listing copy and launch assets are each approved before release.</p></div><div><h3>Included in the scoped release</h3><p>Cover design, print and ebook interior formatting, listing copy and keywords, the product page, launch graphics and emails.</p></div><div><h3>Separate unless scoped</h3><p>Writing or editing the manuscript, printing costs, ad spend and third-party fees such as ISBNs or proof copies. You pay those costs directly.</p></div></div><div className="svc-questions"><h3>Questions worth asking.</h3><Accordion type="single" collapsible>{questions.map(([q,a],i) => <AccordionItem key={q} value={`publishing-q-${i}`}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}</Accordion></div></Container></section>
    <Inquiry servicePage="publishing"/>
  </main><StudioFooter/></div>;
}
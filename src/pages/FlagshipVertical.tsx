import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { sanitizeBiz } from "@/pages/VerticalLanding";
import { FLAGSHIP_SLUGS, VERTICALS, isFocus, type VerticalSlug } from "@/components/marketing/vertical-flagship/config";
import { VerticalHeroVisual, JourneyDiagram } from "@/components/marketing/vertical-flagship/VerticalVisuals";
import { VerticalInquiry } from "@/components/marketing/vertical-flagship/VerticalInquiry";
import { VerticalProof } from "@/components/marketing/vertical-flagship/VerticalProof";

export default function FlagshipVertical({ slug: explicitSlug }: { slug?: VerticalSlug }) {
  const params = useParams<{ slug: string }>();
  const slug = explicitSlug ?? (params.slug as VerticalSlug);
  if (!FLAGSHIP_SLUGS.includes(slug)) return <Navigate to="/404" replace />;
  return <VerticalPage slug={slug} />;
}

function VerticalPage({ slug }: { slug: VerticalSlug }) {
  const config = VERTICALS[slug];
  const [params] = useSearchParams();
  const biz = useMemo(() => sanitizeBiz(params.get("biz")), [params]);
  const requestedFocus = isFocus(params.get("focus")) ? params.get("focus") : null;
  const requestedSegment = params.get("segment");
  const defaultSegment = config.segments?.some((segment) => segment.id === requestedSegment) ? requestedSegment ?? undefined : config.segments?.[0]?.id;
  const [segment, setSegment] = useState(defaultSegment);
  const [needs, setNeeds] = useState<string[]>(requestedFocus ? [requestedFocus] : []);
  const [demoStep, setDemoStep] = useState(0);
  const workflow = segment && config.workflowBySegment?.[segment] ? config.workflowBySegment[segment] : config.workflow;
  const bizQuery = biz ? `&biz=${encodeURIComponent(biz)}` : "";
  const freeAudit = `/free-audit?src=for-${slug}${bizQuery}`;
  const contact = `/?src=for-${slug}${bizQuery}#contact`;

  useStudioHead({ title: config.metaTitle, description: config.metaDescription, path: `/for/${slug}` });
  useEffect(() => { setDemoStep(0); }, [segment]);
  const toggleNeed = (id: string) => setNeeds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const segmentSelector = config.segments ? <div className="vertical-segment-block"><p className="studio-label">{config.segmentLabel}</p><div className="vertical-segment-control" role="group" aria-label={config.segmentLabel}>{config.segments.map((item) => <Button key={item.id} type="button" variant="outline" aria-pressed={segment === item.id} onClick={() => setSegment(item.id)}>{item.label}</Button>)}</div></div> : null;

  return <div className={`stm-studio flagship-vertical vertical-${slug}`}>
    <StudioHeader />
    <main>
      <section className="vertical-hero"><div className="studio-container vertical-hero-grid"><div className="vertical-hero-copy"><p className="studio-eyebrow">{config.eyebrow}</p>{biz && <p className="vertical-biz-note">A growth plan for {biz}</p>}<h1 className="studio-display">{config.title}</h1><p className="vertical-hero-lede">{config.description}</p><div className="vertical-hero-actions"><a className="studio-btn studio-btn-primary" href="#diagnostic">{config.primaryLabel} <ArrowDown aria-hidden size={16}/></a><Link className="studio-btn studio-btn-outline" to={freeAudit}>{config.secondaryLabel}</Link></div>{segmentSelector}</div><VerticalHeroVisual slug={slug}/></div></section>

      <section id="diagnostic" className="vertical-diagnostic studio-section"><div className="studio-container"><div className="vertical-section-heading"><div><p className="studio-eyebrow">Start with what is getting in the way</p><h2 className="studio-display">What needs the most attention?</h2></div><p>Choose any that apply. Your selections carry into the inquiry below without changing what you type.</p></div><div className="vertical-diagnostic-grid">{config.needs.map((need, index) => <Button type="button" variant="outline" key={need.id} aria-pressed={needs.includes(need.id)} onClick={() => toggleNeed(need.id)} className="vertical-diagnostic-card"><span>0{index + 1}</span><strong>{need.label}</strong><small>{need.detail}</small>{needs.includes(need.id) && <Check aria-hidden/>}</Button>)}</div></div></section>

      {slug === "real-estate" && <section className="vertical-manifesto"><div className="studio-container"><p>Stop renting every lead.</p><h2 className="studio-display">Build an audience, brand, and database you keep.</h2></div></section>}

      <section className="vertical-growth studio-section"><div className="studio-container"><p className="studio-eyebrow">The growth system</p><div className="vertical-section-heading"><h2 className="studio-display">Every handoff should strengthen the next one.</h2><p>Strategy, creative, marketing, conversion, and operations work better when they share one commercial goal.</p></div><div className="vertical-growth-grid">{config.stages.map((stage, index) => <article key={stage.title} className={requestedFocus && config.needs[index]?.id === requestedFocus ? "is-emphasized" : ""}><span>0{index + 1}</span><h3>{stage.title}</h3><p>{stage.summary}</p><ul>{stage.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div></div></section>

      {config.research && <section className="vertical-research"><div className="studio-container"><p className="studio-eyebrow">Why intake matters</p><blockquote>{config.research.copy}</blockquote><a href={config.research.href} target="_blank" rel="noreferrer">{config.research.label} <ArrowRight aria-hidden size={15}/></a></div></section>}

      <section className="vertical-friction studio-section"><div className="studio-container"><p className="studio-eyebrow">Where growth gets lost</p><div className="vertical-friction-grid">{config.failures.map((failure) => <article key={failure.title}><h2>{failure.title}</h2><p>{failure.body}</p></article>)}</div></div></section>

      <section className="vertical-scope studio-section"><div className="studio-container"><div className="vertical-section-heading"><h2 className="studio-display">One partner across the customer journey.</h2><p>Scope can begin with one priority or cover the connected system. The work is shaped around what the business needs—not a fixed software package.</p></div><div className="vertical-scope-list">{config.scope.map((item) => <span key={item}>{item}</span>)}</div>{config.safety && <p className="vertical-safety">{config.safety}</p>}</div></section>

      <section className="vertical-demo studio-section"><div className="studio-container"><p className="studio-eyebrow">Interactive demo · synthetic sample data</p><div className="vertical-section-heading"><h2 className="studio-display">A {config.name.toLowerCase()} customer journey.</h2><p>Sample workflow—configured to the client’s actual stack. Select a stage to see how the handoffs connect.</p></div><JourneyDiagram stages={workflow} active={demoStep}/><div className="vertical-demo-controls"><Button type="button" variant="outline" onClick={() => setDemoStep((step) => Math.max(0, step - 1))} disabled={demoStep === 0}>Previous</Button><p><strong>{workflow[demoStep]}</strong><span>Stage {demoStep + 1} of {workflow.length}</span></p><Button type="button" onClick={() => setDemoStep((step) => Math.min(workflow.length - 1, step + 1))} disabled={demoStep === workflow.length - 1}>Next stage</Button></div>{slug === "legal" && <p className="vertical-safety">Sample only. Legal intake and conflict requirements remain governed by the firm’s approved systems and processes.</p>}</div></section>

      <VerticalProof config={config}/>

      <section id="inquiry" className="vertical-inquiry studio-section"><div className="studio-container vertical-inquiry-layout"><div><p className="studio-eyebrow">A practical first conversation</p><h2 className="studio-display">Tell me where growth feels disconnected.</h2><p>Choose the priorities you want to address and add any context that matters. You’ll get a direct reply—not an automated sales sequence.</p><Link to={freeAudit} className="vertical-text-link">Prefer a self-guided start? Run the free {config.name.toLowerCase()} check <ArrowRight aria-hidden size={15}/></Link><Link to={contact} className="vertical-text-link">Or use the main project form <ArrowRight aria-hidden size={15}/></Link></div><VerticalInquiry config={config} segment={segment} initialNeeds={needs} biz={biz}/></div></section>

      <section className="vertical-faq studio-section"><div className="studio-container"><p className="studio-eyebrow">Common questions</p><h2 className="studio-display">Know what you are—and are not—buying.</h2><div className="vertical-faq-list">{config.faqs.map((faq) => <details key={faq.q}><summary>{faq.q}</summary><p>{faq.a}</p></details>)}</div></div></section>

      <section className="vertical-final"><div className="studio-container"><p className="studio-eyebrow">Start with the clearest opportunity</p><h2 className="studio-display">Make the next investment work harder.</h2><div><a className="studio-btn studio-btn-primary" href="#inquiry">Send your priorities</a><Link className="studio-btn studio-btn-outline" to={freeAudit}>{config.secondaryLabel}</Link></div></div></section>
    </main><StudioFooter />
  </div>;
}
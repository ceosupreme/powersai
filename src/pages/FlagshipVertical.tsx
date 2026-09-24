import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
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
import { TACO_SPANISH } from "@/components/marketing/vertical-flagship/tacoSpanish";

const PAGE_COPY = {
  en: {
    language: "Language", biz: "A growth plan for", diagnosticEyebrow: "Start with what is getting in the way", diagnosticTitle: "What needs the most attention?", diagnosticBody: "Choose any that apply. Your selections carry into the inquiry below without changing what you type.",
    growthEyebrow: "The growth system", growthTitle: "Every handoff should strengthen the next one.", growthBody: "Strategy, creative, marketing, conversion, and operations work better when they share one commercial goal.",
    friction: "Where growth gets lost", scopeTitle: "One partner across the customer journey.", scopeBody: "Scope can begin with one priority or cover the connected system. The work is shaped around what the business needs—not a fixed software package.",
    demoEyebrow: "Interactive demo · sample workflow", demoTitle: "From ‘tacos near me’ to regular customer", demoBody: "Sample workflow—configured to the client’s actual stack. Select a stage to see how the handoffs connect.", previous: "Previous", next: "Next stage", stage: "Stage", of: "of",
    cateringLabel: "Optional catering path · sample workflow", catering: ["Local business / school / team / party", "Catering page", "Inquiry or order", "Follow-up", "Repeat catering"],
    inquiryEyebrow: "A practical first conversation", inquiryTitle: "Tell me where growth feels disconnected.", inquiryBody: "Choose the priorities you want to address and add any context that matters. You will get a confirmation right away and a personal reply within one business day.", selfGuided: "Prefer a self-guided start? Run the free taco-shop check", mainForm: "Or use the main project form",
    faqEyebrow: "Common questions", faqTitle: "Know what you are—and are not—buying.", finalEyebrow: "Start with the clearest opportunity", finalTitle: "Make the next investment work harder.", finalButton: "Send your priorities",
    proofEyebrow: "Transferable hospitality experience", proofTitle: "Built from real restaurant systems work.", proofBody: "BarPulse was built and operated for an eight-venue San Diego hospitality group, connecting operations, manager workflows, reporting, and existing tools during the historical engagement. That hospitality experience transfers to taco-shop discovery, ordering, follow-up, and owner visibility—it is not presented as a taco-shop case study.", proofCaveat: "Historical implementation only. It does not imply eight current clients or taco-shop results. No confidential venue, staff, or financial details are shown.", proofLink: "See the BarPulse case study",
  },
  es: {
    language: "Idioma", biz: "Un plan de crecimiento para", diagnosticEyebrow: "Empieza por lo que frena el crecimiento", diagnosticTitle: "¿Qué necesita más atención?", diagnosticBody: "Elige todas las opciones que correspondan. Tus selecciones pasan al formulario sin borrar lo que escribas.",
    growthEyebrow: "El sistema de crecimiento", growthTitle: "Cada paso debe fortalecer el siguiente.", growthBody: "La estrategia, creatividad, marketing, conversión y operación funcionan mejor cuando comparten una meta comercial.",
    friction: "Dónde se pierde el crecimiento", scopeTitle: "Un solo equipo para todo el recorrido del cliente.", scopeBody: "El proyecto puede empezar con una prioridad o abarcar el sistema conectado. El alcance se adapta al negocio, no a un paquete fijo de software.",
    demoEyebrow: "Demo interactiva · flujo de ejemplo", demoTitle: "De ‘tacos cerca de mí’ a cliente frecuente", demoBody: "Flujo de ejemplo—se configura según las herramientas reales del cliente. Elige una etapa para ver cómo se conectan los pasos.", previous: "Anterior", next: "Siguiente etapa", stage: "Etapa", of: "de",
    cateringLabel: "Ruta opcional de catering · flujo de ejemplo", catering: ["Negocio local / escuela / equipo / fiesta", "Página de catering", "Consulta o pedido", "Seguimiento", "Catering frecuente"],
    inquiryEyebrow: "Una primera conversación práctica", inquiryTitle: "Cuéntame dónde se desconecta el crecimiento.", inquiryBody: "Elige las prioridades y agrega el contexto importante. Recibirás una confirmación de inmediato y una respuesta personal dentro de un día hábil.", selfGuided: "¿Prefieres empezar por tu cuenta? Haz la revisión gratis", mainForm: "O usa el formulario principal",
    faqEyebrow: "Preguntas comunes", faqTitle: "Ten claro qué estás contratando—y qué no.", finalEyebrow: "Empieza con la oportunidad más clara", finalTitle: "Haz que la próxima inversión rinda más.", finalButton: "Envía tus prioridades",
    proofEyebrow: "Experiencia transferible en hospitalidad", proofTitle: "Construido a partir de trabajo real en sistemas para restaurantes.", proofBody: "BarPulse fue creado y operado para un grupo histórico de ocho locales de hospitalidad en San Diego, conectando operaciones, flujos de gerentes, reportes y herramientas existentes. Esa experiencia se puede aplicar a descubrimiento, pedidos, seguimiento y visibilidad para dueños de taquerías; no se presenta como un caso de éxito de una taquería.", proofCaveat: "Implementación histórica únicamente. No implica ocho clientes actuales ni resultados para taquerías. No se muestran datos confidenciales de locales, personal o finanzas.", proofLink: "Ver el caso BarPulse",
  },
};

export default function FlagshipVertical({ slug: explicitSlug }: { slug?: VerticalSlug }) {
  const params = useParams<{ slug: string }>();
  const slug = explicitSlug ?? (params.slug as VerticalSlug);
  if (!FLAGSHIP_SLUGS.includes(slug)) return <Navigate to="/404" replace />;
  return <VerticalPage slug={slug} />;
}

function VerticalPage({ slug }: { slug: VerticalSlug }) {
  const baseConfig = VERTICALS[slug];
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const language = slug === "tacos" && params.get("lang") === "es" ? "es" : "en";
  const config = slug === "tacos" && language === "es" ? TACO_SPANISH : baseConfig;
  const copy = PAGE_COPY[language];
  const biz = useMemo(() => sanitizeBiz(params.get("biz")), [params]);
  const requestedFocus = isFocus(params.get("focus")) ? params.get("focus") : null;
  const requestedSegment = params.get("segment");
  const defaultSegment = config.segments?.some((segment) => segment.id === requestedSegment) ? requestedSegment ?? undefined : config.segments?.[0]?.id;
  const [segment, setSegment] = useState(defaultSegment);
  const [needs, setNeeds] = useState<string[]>(requestedFocus ? [requestedFocus] : []);
  const [demoStep, setDemoStep] = useState(0);
  const workflow = segment && config.workflowBySegment?.[segment] ? config.workflowBySegment[segment] : config.workflow;
  const stages = segment && config.stagesBySegment?.[segment] ? config.stagesBySegment[segment] : config.stages;
  const bizQuery = biz ? `&biz=${encodeURIComponent(biz)}` : "";
  const freeAudit = `/free-audit?src=for-${slug}${bizQuery}`;
  const contact = `/?src=for-${slug}${bizQuery}#contact`;

  useStudioHead({ title: config.metaTitle, description: config.metaDescription, path: location.pathname, canonicalPath: `/for/${slug}` });
  useEffect(() => { setDemoStep(0); }, [segment]);
  const toggleNeed = (id: string) => setNeeds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const setLanguage = (next: "en" | "es") => {
    const updated = new URLSearchParams(params);
    if (next === "es") updated.set("lang", "es"); else updated.delete("lang");
    window.localStorage.setItem("stm-tacos-language", next);
    setParams(updated, { replace: true });
  };

  const segmentSelector = config.segments ? <div className="vertical-segment-block"><p className="studio-label">{config.segmentLabel}</p><div className="vertical-segment-control" role="group" aria-label={config.segmentLabel}>{config.segments.map((item) => <Button key={item.id} type="button" variant="outline" aria-pressed={segment === item.id} onClick={() => setSegment(item.id)}>{item.label}</Button>)}</div></div> : null;

  return <div className={`stm-studio flagship-vertical vertical-${slug}`}>
    <StudioHeader language={slug === "tacos" ? language : "en"} />
    <main>
      <section className="vertical-hero"><div className="studio-container vertical-hero-grid"><div className="vertical-hero-copy">{slug === "tacos" && <div className="vertical-language" role="group" aria-label={copy.language}><span>{copy.language}</span><Button type="button" variant="outline" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</Button><Button type="button" variant="outline" aria-pressed={language === "es"} onClick={() => setLanguage("es")}>ES</Button></div>}<p className="studio-eyebrow">{config.eyebrow}</p>{biz && <p className="vertical-biz-note">{copy.biz} {biz}</p>}<h1 className="studio-display">{config.title}</h1><p className="vertical-hero-lede">{config.description}</p><div className="vertical-hero-actions"><a className="studio-btn studio-btn-primary" href="#diagnostic">{config.primaryLabel} <ArrowDown aria-hidden size={16}/></a><Link className="studio-btn studio-btn-outline" to={config.heroProofPath ?? freeAudit}>{config.heroProofLabel ?? config.secondaryLabel}</Link>{config.tertiaryLabel && <Link className="vertical-text-link" to={freeAudit}>{config.tertiaryLabel} <ArrowRight aria-hidden size={15}/></Link>}</div>{segmentSelector}</div><VerticalHeroVisual slug={slug} language={language}/></div></section>

      <section id="diagnostic" className="vertical-diagnostic studio-section"><div className="studio-container"><div className="vertical-section-heading"><div><p className="studio-eyebrow">{copy.diagnosticEyebrow}</p><h2 className="studio-display">{copy.diagnosticTitle}</h2></div><p>{copy.diagnosticBody}</p></div><div className="vertical-diagnostic-grid">{config.needs.map((need, index) => <Button type="button" variant="outline" key={need.id} aria-pressed={needs.includes(need.id)} onClick={() => toggleNeed(need.id)} className="vertical-diagnostic-card"><span>0{index + 1}</span><strong>{need.label}</strong><small>{need.detail}</small>{needs.includes(need.id) && <Check aria-hidden/>}</Button>)}</div></div></section>

      {slug === "real-estate" && <section className="vertical-manifesto"><div className="studio-container"><p>Stop renting every lead.</p><h2 className="studio-display">Build an audience, brand, and database you keep.</h2></div></section>}

      <section className="vertical-growth studio-section"><div className="studio-container"><p className="studio-eyebrow">{copy.growthEyebrow}</p><div className="vertical-section-heading"><h2 className="studio-display">{copy.growthTitle}</h2><p>{copy.growthBody}</p></div><div className="vertical-growth-grid">{stages.map((stage, index) => <article key={stage.title} className={requestedFocus && config.needs[index]?.id === requestedFocus ? "is-emphasized" : ""}><span>0{index + 1}</span><h3>{stage.title}</h3><p>{stage.summary}</p><ul>{stage.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div></div></section>

      {config.research && <section className="vertical-research"><div className="studio-container"><p className="studio-eyebrow">Why intake matters</p><blockquote>{config.research.copy}</blockquote><a href={config.research.href} target="_blank" rel="noreferrer">{config.research.label} <ArrowRight aria-hidden size={15}/></a></div></section>}

      <section className="vertical-friction studio-section"><div className="studio-container"><p className="studio-eyebrow">{copy.friction}</p><div className="vertical-friction-grid">{config.failures.map((failure) => <article key={failure.title}><h2>{failure.title}</h2><p>{failure.body}</p></article>)}</div></div></section>

      <section className="vertical-scope studio-section"><div className="studio-container"><div className="vertical-section-heading"><h2 className="studio-display">{copy.scopeTitle}</h2><p>{copy.scopeBody}</p></div><div className="vertical-scope-list">{config.scope.map((item) => <span key={item}>{item}</span>)}</div>{config.safety && <p className="vertical-safety">{config.safety}</p>}</div></section>

      <section className="vertical-demo studio-section"><div className="studio-container"><p className="studio-eyebrow">{slug === "tacos" ? copy.demoEyebrow : "Interactive demo · synthetic sample data"}</p><div className="vertical-section-heading"><h2 className="studio-display">{slug === "tacos" ? copy.demoTitle : `A ${config.name.toLowerCase()} customer journey.`}</h2><p>{slug === "tacos" ? copy.demoBody : "Sample workflow—configured to the client’s actual stack. Select a stage to see how the handoffs connect."}</p></div><JourneyDiagram stages={workflow} active={demoStep}/><div className="vertical-demo-controls"><Button type="button" variant="outline" onClick={() => setDemoStep((step) => Math.max(0, step - 1))} disabled={demoStep === 0}>{copy.previous}</Button><p><strong>{workflow[demoStep]}</strong><span>{copy.stage} {demoStep + 1} {copy.of} {workflow.length}</span></p><Button type="button" onClick={() => setDemoStep((step) => Math.min(workflow.length - 1, step + 1))} disabled={demoStep === workflow.length - 1}>{copy.next}</Button></div>{slug === "tacos" && <div className="vertical-catering-path"><p className="studio-label">{copy.cateringLabel}</p><div>{copy.catering.map((item, index) => <span key={item}>{item}{index < copy.catering.length - 1 && <ArrowRight aria-hidden size={14}/>}</span>)}</div></div>}{slug === "legal" && <p className="vertical-safety">Sample only. Legal intake and conflict requirements remain governed by the firm’s approved systems and processes.</p>}</div></section>

      {slug === "restaurants" && <section className="vertical-hospitality-proof studio-section"><div className="studio-container vertical-hospitality-proof-grid"><div><p className="studio-eyebrow">Direct hospitality experience</p><h2 className="studio-display">Built inside a real multi-venue operation.</h2><p>BarPulse was built and operated for an eight-venue San Diego hospitality group, connecting operational information, management workflows, reporting, and integrations including Toast, 7shifts, and Asana during the historical engagement.</p><p className="vertical-safety">This is a historical client implementation and does not imply all eight venues are active today. No confidential venue, staff, or financial details are shown.</p><Link className="studio-btn studio-btn-outline" to="/work/barpulse">See the BarPulse case study <ArrowRight aria-hidden size={15}/></Link></div><div className="vertical-hospitality-system" aria-label="Historical BarPulse capabilities"><span>Marketing hub</span><span>Manager tasks</span><strong>BarPulse</strong><span>Team workflows</span><span>Growth insights</span><span>Owner reporting</span></div></div></section>}
      {slug === "tacos" && <section className="vertical-hospitality-proof studio-section"><div className="studio-container vertical-hospitality-proof-grid"><div><p className="studio-eyebrow">{copy.proofEyebrow}</p><h2 className="studio-display">{copy.proofTitle}</h2><p>{copy.proofBody}</p><p className="vertical-safety">{copy.proofCaveat}</p><Link className="studio-btn studio-btn-outline" to="/work/barpulse">{copy.proofLink} <ArrowRight aria-hidden size={15}/></Link></div><div className="vertical-hospitality-system" aria-label="BarPulse"><span>{language === "es" ? "Marca + sitio" : "Brand + web"}</span><span>{language === "es" ? "Demanda" : "Demand"}</span><strong>BarPulse</strong><span>{language === "es" ? "Seguimiento" : "Follow-up"}</span><span>{language === "es" ? "Flujos de trabajo" : "Workflows"}</span><span>{language === "es" ? "Reportes" : "Reporting"}</span></div></div></section>}

      <VerticalProof config={config} biz={biz} language={language}/>

      <section id="inquiry" className="vertical-inquiry studio-section"><div className="studio-container vertical-inquiry-layout"><div><p className="studio-eyebrow">{copy.inquiryEyebrow}</p><h2 className="studio-display">{copy.inquiryTitle}</h2><p>{copy.inquiryBody}</p><Link to={freeAudit} className="vertical-text-link">{slug === "tacos" ? copy.selfGuided : `Prefer a self-guided start? Run the free ${config.name.toLowerCase()} check`} <ArrowRight aria-hidden size={15}/></Link><Link to={contact} className="vertical-text-link">{copy.mainForm} <ArrowRight aria-hidden size={15}/></Link></div><VerticalInquiry config={config} segment={segment} initialNeeds={needs} biz={biz} language={language}/></div></section>

      <section className="vertical-faq studio-section"><div className="studio-container"><p className="studio-eyebrow">{copy.faqEyebrow}</p><h2 className="studio-display">{copy.faqTitle}</h2><div className="vertical-faq-list">{config.faqs.map((faq) => <details key={faq.q}><summary>{faq.q}</summary><p>{faq.a}</p></details>)}</div></div></section>

      <section className="vertical-final"><div className="studio-container"><p className="studio-eyebrow">{copy.finalEyebrow}</p><h2 className="studio-display">{copy.finalTitle}</h2><div><a className="studio-btn studio-btn-primary" href="#inquiry">{copy.finalButton}</a><Link className="studio-btn studio-btn-outline" to={freeAudit}>{config.secondaryLabel}</Link></div></div></section>
    </main><StudioFooter language={slug === "tacos" ? language : "en"} />
  </div>;
}
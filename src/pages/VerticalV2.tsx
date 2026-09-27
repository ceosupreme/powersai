import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { VerticalInquiry } from "@/components/marketing/vertical-flagship/VerticalInquiry";
import { MathCalculator } from "@/components/marketing/vertical/MathCalculator";
import { CheckoutButton } from "@/components/marketing/offer/CheckoutButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { sanitizeBiz } from "@/pages/VerticalLanding";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { useCheckoutEnabled } from "@/hooks/useCheckoutEnabled";
import { getStudioMedia } from "@/config/studioMedia";
import { BrowserScene, PhoneScene, IndustryInteraction, type Interaction } from "@/components/marketing/vertical-v2/IndustryInteraction";

const SITE = "https://supremeteammedia.com";
const DEFAULT_NEEDS = ["A new website", "The site I have is not bringing work", "Follow-up, reviews and reminders", "The whole system"];
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown) => (typeof v === "string" ? v : "");

function useJsonLd(id: string, data: unknown | null) {
  useEffect(() => {
    if (!data) return;
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    el.text = JSON.stringify(data);
    document.head.appendChild(el);
    return () => el.remove();
  }, [id, JSON.stringify(data)]);
}

function useOgImage(url: string | null) {
  useEffect(() => {
    if (!url) return;
    let el = document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    const created = !el;
    if (!el) { el = document.createElement("meta"); el.setAttribute("property", "og:image"); document.head.appendChild(el); }
    const prev = el.getAttribute("content");
    el.setAttribute("content", url);
    return () => { if (created) el?.remove(); else if (prev) el?.setAttribute("content", prev); };
  }, [url]);
}

const LABELS_EN = {
  who: "Who this is for", not_for: "Who this is not for", why: "Why this and not the agencies", does: "What the site does for this trade",
  local: "The local plan", market: "What the market says", faq: "Common questions", inquiry_title: "Tell me about the business.",
  inquiry_sub: "You will get a confirmation right away and a personal reply within one business day.", free_check: "Run the free check",
  deposit: "Start with the deposit", monthly: "Start monthly", care: "Get the care seat", business_quote: "Get a Business Site quote",
  growth: "Ask about Growth", estimate: "Every figure above is an estimate.", proof_form: "The inquiry form", proof_email: "The confirmation email",
  proof_alert: "The owner alert", case: "Case study", see_case: "See the case study", checking_for: "Checking for", language_switch: "Español",
  launch_inquiry: "Start a Launch Site", care_inquiry: "Ask about Care", proof_heading: "What you can see before you buy", price_heading: "What it costs",
};

function useHtmlLang(lang: "en" | "es") {
  useEffect(() => {
    document.documentElement.lang = lang;
    return () => { document.documentElement.lang = "en"; };
  }, [lang]);
}

function useHreflang(slug: string, on: boolean) {
  useEffect(() => {
    if (!on) return;
    const els = [["en", `${SITE}/for/${slug}`], ["es", `${SITE}/for/${slug}?lang=es`], ["x-default", `${SITE}/for/${slug}`]].map(([hl, href]) => {
      const el = document.createElement("link");
      el.rel = "alternate"; el.hreflang = hl; el.href = href;
      document.head.appendChild(el);
      return el;
    });
    return () => els.forEach((e) => e.remove());
  }, [slug, on]);
}

export default function VerticalV2({ row: baseRow, slug }: { row: any; slug: string }) {
  const location = useLocation();
  const [params] = useSearchParams();
  const esData = baseRow?.lang && typeof baseRow.lang === "object" ? baseRow.lang.es : null;
  const hasEs = !!esData && typeof esData === "object";
  const lang: "en" | "es" = hasEs && params.get("lang") === "es" ? "es" : "en";
  const row = useMemo(() => (lang === "es" ? { ...baseRow, ...esData } : baseRow), [baseRow, esData, lang]);
  const L = useMemo(() => {
    const over = row.labels && typeof row.labels === "object" ? row.labels : {};
    const merged: Record<string, string> = { ...LABELS_EN };
    if (lang === "es") merged.language_switch = "English";
    for (const [k, v] of Object.entries(over)) if (typeof v === "string" && v.trim()) merged[k] = v;
    return merged as typeof LABELS_EN;
  }, [row, lang]);
  useHtmlLang(lang);
  useHreflang(slug, hasEs);
  const switchHref = useMemo(() => {
    const q = new URLSearchParams(params);
    if (lang === "es") q.delete("lang"); else q.set("lang", "es");
    const qs = q.toString();
    return `${location.pathname}${qs ? `?${qs}` : ""}`;
  }, [params, lang, location.pathname]);
  const biz = useMemo(() => sanitizeBiz(params.get("biz")), [params]);
  const bizQ = biz ? `&biz=${encodeURIComponent(biz)}` : "";
  const src = `for-${slug}`;
  const langQ = lang === "es" ? "&lang=es" : "";
  const { enabled: checkout } = useCheckoutEnabled();
  const track = (label: string) => trackSiteEvent({ event_type: "cta_click", label, vertical: slug, src });

  useStudioHead({ title: str(row.meta_title) || str(row.display_name), description: str(row.meta_description), path: location.pathname, canonicalPath: `/for/${slug}` });
  useOgImage(str(row.og_image_url) || null);

  const faq = arr<{ q: string; a: string }>(row.faq);
  const layout = row.layout && typeof row.layout === "object" ? row.layout : null;
  const sequence = layout?.sequence && Array.isArray(layout.sequence) ? layout.sequence : null;
  useJsonLd("ld-faq", (!sequence || sequence.some((s: any) => s.key === "questions")) && faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null);
  useJsonLd("ld-service", { "@context": "https://schema.org", "@type": "Service", name: `${row.display_name} website`, url: `${SITE}/for/${slug}`, provider: { "@type": "Organization", name: "Supreme Team Media", url: SITE }, areaServed: [{ "@type": "AdministrativeArea", name: "San Diego County" }, { "@type": "Country", name: "United States" }] });

  const headline = str(row.headline);
  const word = str(row.headline_accent_word);
  const idx = word ? headline.toLowerCase().indexOf(word.toLowerCase()) : -1;
  const withBiz = (url: string) => (!biz || !url || url.startsWith("#") ? url : `${url}${url.includes("?") ? "&" : "?"}biz=${encodeURIComponent(biz)}`);
  const Cta = ({ url, label, primary, name }: { url: string; label: string; primary?: boolean; name: string }) => {
    const cls = `industry-cta ${primary ? "home-btn-amber" : "home-btn-ghost"}`;
    if (!url || !label) return null;
    if (url === "#pricing") return <a className={cls} href="#pricing" onClick={(e) => { e.preventDefault(); track(name); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}>{label}</a>;
    if (url.startsWith("http")) return <a className={cls} href={url} onClick={() => track(name)}>{label}</a>;
    return <Link className={cls} to={withBiz(url)} onClick={() => track(name)}>{label}</Link>;
  };
  const freeCheck = `/free-audit?src=${src}${bizQ}${langQ}`;
  const inquiry = (offer: string) => `/?intent=websites&offer=${offer}&src=${src}${bizQ}${langQ}#contact`;

  const audience = row.audience ?? {};
  const proof = row.proof ?? {};
  const price = row.price_block ?? {};
  const spanishNeeds = ["Un sitio web nuevo", "Mi sitio no está generando trabajo", "Seguimiento, reseñas y recordatorios", "El sistema completo"];
  const needsList: string[] = Array.isArray(row.needs) && row.needs.every((n: unknown) => typeof n === "string") && row.needs.length ? row.needs : lang === "es" ? spanishNeeds : DEFAULT_NEEDS;
  const inquiryConfig = { slug, name: row.display_name, needs: needsList.map((l) => ({ id: l, label: l, detail: "" })) } as any;

  const interaction: Interaction | null = layout?.interaction?.kind === "walkthrough" || layout?.interaction?.kind === "selector" ? layout.interaction : null;
  const heroTone = layout?.hero?.tone === "charcoal" ? "charcoal" : "ivory";
  const art = typeof layout?.hero?.media === "string" ? getStudioMedia(layout.hero.media) : null;
  const [failedArt, setFailedArt] = useState<string | null>(null);
  const sectionOrder = sequence ?? ["local-audience", "leaks", "differentiators", "features", "local-plan", "owner", "offer", "facts", "questions", "contact"].map(key => ({ key, tone: "ivory" }));
  const heading = (text: string) => <h2 className="industry-title">{text}</h2>;
  const cards = (items: any[], cols = "three") => <div className={`industry-list industry-list-${cols}`}>{items.map((item, i) => <article key={i}><span className="industry-number">0{i + 1}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>;
  const PriceRow = ({ text, children }: { text: string; children: React.ReactNode }) => text ? <div className="industry-price-row"><p>{text}</p><div className="industry-price-actions">{children}</div></div> : null;
  const renderSection = (key: string) => {
    switch (key) {
      case "interaction": return interaction && <IndustryInteraction interaction={interaction}/>;
      case "leaks": return <>{arr(row.leaks).length > 0 && <>{heading(row.leaks_heading || "Where the opportunities go")}<div className="industry-list industry-list-two">{arr<any>(row.leaks).map((l, i) => <article key={i}><span className="industry-number">0{i + 1}</span><h3>{l.title}</h3><p>{l.line}</p>{l.dollar_note && <small>{l.dollar_note}</small>}</article>)}</div></>}{row.math_config && <div className="industry-math"><MathCalculator config={row.math_config} language={lang}/><p className="industry-small">{L.estimate}</p></div>}{row.free_check_line && <p className="industry-lede">{row.free_check_line}</p>}{(row.math_config || row.free_check_line) && <Link className="home-btn-amber" to={freeCheck} onClick={() => track("v2_math_free_check")}>{L.free_check} <ArrowRight size={16} aria-hidden/></Link>}</>;
      case "differentiators": return arr(row.differentiators).length > 0 && <>{heading(L.why)}{cards(arr(row.differentiators))}</>;
      case "local-audience": return (audience.who || audience.not_for) && <div className="industry-audience"><div><span className="home-eyebrow">{L.who}</span><p>{audience.who}</p></div><div><span className="home-eyebrow">{L.not_for}</span><p>{audience.not_for}</p></div></div>;
      case "local-plan": return arr(row.local_plan).length > 0 && <>{heading(L.local)}{cards(arr(row.local_plan))}</>;
      case "local": return <>{renderSection("local-audience")}{renderSection("local-plan")}</>;
      case "features": return <>{heading(L.does)}<ul className="industry-feature-list">{arr<any>(row.tour_features).map((t, i) => <li key={i}><Check size={18} aria-hidden/>{typeof t === "string" ? t : t?.title}</li>)}</ul><div className="industry-included">{arr<string>(row.included_features).map((p, i) => <p key={i}>{p}</p>)}</div>{row.live_in_line && <p className="industry-lede">{row.live_in_line}</p>}</>;
      case "owner": {
        const alert = interaction?.steps?.find(s => s.screen === "alert");
        return <>{heading(proof.heading || L.proof_heading)}<div className="industry-owner-grid"><article className="industry-owner-panel"><span className="home-eyebrow">{L.proof_alert}</span><h3>{alert?.heading || L.proof_alert}</h3>{alert?.body && <p>{alert.body}</p>}<div className="industry-owner-fields">{["Name", "Email", "Business", "Request", "Source"].map(f => <span key={f}>{f}</span>)}</div></article><article className="industry-owner-panel"><span className="home-eyebrow">{lang === "es" ? "Informe mensual" : "Monthly report"}</span><h3>{interaction?.business || row.display_name}</h3><dl>{arr<{label: string; value: string}>(layout?.report).map((r, i) => <div key={i}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}</dl></article></div>{proof.case && <Link to="/work/barpulse" onClick={() => track("v2_proof_barpulse")} className="industry-case"><span className="home-eyebrow">{L.case}</span><h3>{proof.case.name}</h3><p>{proof.case.line}</p><span>{L.see_case} <ArrowRight size={16} aria-hidden /></span></Link>}</>;
      }
      case "offer": return <><span className="home-eyebrow">{L.price_heading}</span>{heading(price.heading || L.price_heading)}<div className="industry-prices"><PriceRow text={str(price.launch)}>{checkout ? <><CheckoutButton product="launch_site_deposit" label={L.deposit} sourceVertical={slug} originPath={location.pathname}/><CheckoutButton product="launch_site_monthly" label={L.monthly} sourceVertical={slug} originPath={location.pathname}/></> : <Link className="home-btn-amber" to={inquiry("launch-site")} onClick={() => track("v2_offer_launch_site")}>{L.launch_inquiry}</Link>}</PriceRow><PriceRow text={str(price.care)}>{checkout ? <CheckoutButton product="care_seat" label={L.care} sourceVertical={slug} originPath={location.pathname}/> : <Link className="home-btn-ghost" to={inquiry("care")} onClick={() => track("v2_offer_care")}>{L.care_inquiry}</Link>}</PriceRow><PriceRow text={str(price.business)}><Link className="home-btn-ghost" to={inquiry("business-site")} onClick={() => track("v2_offer_business_site")}>{L.business_quote}</Link><Link className="home-btn-ghost" to={freeCheck} onClick={() => track("v2_offer_free_check")}>{L.free_check}</Link></PriceRow><PriceRow text={str(price.growth)}><Link className="home-btn-ghost" to={`/?intent=marketing&offer=growth&src=${src}${bizQ}${langQ}#contact`} onClick={() => track("v2_offer_growth")}>{L.growth}</Link></PriceRow></div>{row.guarantee_line && <p className="industry-lede">{row.guarantee_line}</p>}{arr(row.how_it_works).length > 0 && <ol className="industry-steps">{arr<any>(row.how_it_works).map((step, i) => <li key={i}><span>0{i + 1}</span><h3>{typeof step === "string" ? `${lang === "es" ? "Paso" : "Step"} ${i + 1}` : step?.title}</h3><p>{typeof step === "string" ? step : step?.body}</p></li>)}</ol>}</>;
      case "facts": return arr(row.market_facts).length > 0 && <>{heading(L.market)}<ul className="industry-facts">{arr<any>(row.market_facts).map((m, i) => <li key={i}><p>{m.fact}</p><small>{m.publisher}{m.year ? `, ${m.year}` : ""}{m.label ? ` · ${m.label}` : ""}{m.url && <> · <a href={m.url} target="_blank" rel="noopener noreferrer">{m.label || m.publisher || m.url}</a></>}</small></li>)}</ul></>;
      case "questions": return faq.length > 0 && <div className="industry-questions">{heading(L.faq)}<Accordion type="single" collapsible>{faq.map((f, i) => <AccordionItem key={i} value={`f${i}`}><AccordionTrigger>{f.q}</AccordionTrigger><AccordionContent>{f.a}</AccordionContent></AccordionItem>)}</Accordion></div>;
      case "contact": return <div className="industry-contact">{heading(L.inquiry_title)}<p>{L.inquiry_sub}</p><VerticalInquiry config={inquiryConfig} biz={biz} language={lang}/></div>;
      default: return null;
    }
  };
  return <div className="stm-studio industry-v2"><StudioHeader language={lang}/><main>
    <section className={`industry-hero industry-tone-${heroTone}`}><div className="studio-container industry-hero-grid"><div className="industry-hero-copy"><span className="home-eyebrow">{row.display_name}</span>{hasEs && <Link className="industry-language" to={switchHref} hrefLang={lang === "es" ? "en" : "es"} onClick={() => track(`v2_lang_${lang === "es" ? "en" : "es"}`)}>{L.language_switch}</Link>}<h1>{idx >= 0 ? <>{headline.slice(0, idx)}<em>{headline.slice(idx, idx + word.length)}</em>{headline.slice(idx + word.length)}</> : headline}</h1><p className="industry-hero-subline">{row.subline}</p>{row.stat_value && <p className="industry-stat"><strong>{row.stat_value}</strong><span>{row.stat_label}</span></p>}<div className="industry-hero-actions"><Cta url={row.cta_primary_url} label={row.cta_primary_label} primary name="v2_hero_primary"/><Cta url={row.cta_secondary_url} label={row.cta_secondary_label} name="v2_hero_secondary"/></div>{biz && <p className="industry-biz-note">{L.checking_for} {biz}</p>}</div><div className="industry-hero-art">{art?.src && failedArt !== art.src ? <img src={art.src} alt={art.alt} width={art.width} height={art.height} fetchPriority="high" onError={() => setFailedArt(art.src)}/> : interaction && <div className="industry-device-pair"><BrowserScene interaction={interaction} screen={interaction.kind === "walkthrough" ? interaction.steps?.[0] : interaction.options?.[0]}/><PhoneScene interaction={interaction} screen={interaction.kind === "walkthrough" ? interaction.steps?.find(s => s.screen === "phone") : interaction.options?.[1]}/></div>}</div></div></section>
    {sectionOrder.map((item: any, i: number) => <section key={`${item.key}-${i}`} id={item.key === "offer" ? "pricing" : item.key === "contact" ? "inquiry" : undefined} className={`industry-section industry-tone-${item.tone === "charcoal" ? "charcoal" : "ivory"}`}><div className="studio-container">{renderSection(item.key)}</div></section>)}
  </main><StudioFooter language={lang}/></div>;
}

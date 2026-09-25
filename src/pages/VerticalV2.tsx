import { useEffect, useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { StudioReveal } from "@/components/marketing/studio/StudioReveal";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { VerticalInquiry } from "@/components/marketing/vertical-flagship/VerticalInquiry";
import { MathCalculator } from "@/components/marketing/vertical/MathCalculator";
import { CheckoutButton } from "@/components/marketing/offer/CheckoutButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { sanitizeBiz } from "@/pages/VerticalLanding";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { useCheckoutEnabled } from "@/hooks/useCheckoutEnabled";
import { ackEnglishBody, ackSpanishBody, ackSubject } from "../../supabase/functions/_shared/prospectAckCopy";

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
  // Reuse FlagshipVertical's accent color map (VerticalHero). The raw --rust/--gold/--green
  // CSS variables are scoped to .stm-marketing and do not resolve inside .stm-studio,
  // so fall back to the literal hex values with hsl(var(--primary)) as the fallback.
  const accent = ({ rust: "#E15C4A", gold: "#465CFF", green: "#198A5A" } as Record<string, string>)[
    String(row.accent_color ?? "").toLowerCase()
  ] ?? "hsl(var(--primary))";
  const track = (label: string) => trackSiteEvent({ event_type: "cta_click", label, vertical: slug, src });

  useStudioHead({ title: str(row.meta_title) || str(row.display_name), description: str(row.meta_description), path: location.pathname, canonicalPath: `/for/${slug}` });
  useOgImage(str(row.og_image_url) || null);

  const faq = arr<{ q: string; a: string }>(row.faq);
  useJsonLd("ld-faq", faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null);
  useJsonLd("ld-service", { "@context": "https://schema.org", "@type": "Service", name: `${row.display_name} website`, url: `${SITE}/for/${slug}`, provider: { "@type": "Organization", name: "Supreme Team Media", url: SITE }, areaServed: [{ "@type": "AdministrativeArea", name: "San Diego County" }, { "@type": "Country", name: "United States" }] });

  const headline = str(row.headline);
  const word = str(row.headline_accent_word);
  const idx = word ? headline.toLowerCase().indexOf(word.toLowerCase()) : -1;
  const withBiz = (url: string) => (!biz || !url || url.startsWith("#") ? url : `${url}${url.includes("?") ? "&" : "?"}biz=${encodeURIComponent(biz)}`);
  const Cta = ({ url, label, primary, name }: { url: string; label: string; primary?: boolean; name: string }) => {
    const cls = `studio-btn ${primary ? "studio-btn-primary" : "studio-btn-outline"}`;
    if (!url || !label) return null;
    if (url === "#pricing") return <a className={cls} href="#pricing" onClick={(e) => { e.preventDefault(); track(name); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}>{label}</a>;
    if (url.startsWith("http")) return <a className={cls} href={url} onClick={() => track(name)}>{label}</a>;
    return <Link className={cls} to={withBiz(url)} onClick={() => track(name)}>{label}</Link>;
  };
  const freeCheck = `/free-audit?src=${src}${bizQ}${langQ}`;
  const inquiry = (offer: string) => `/?intent=websites&offer=${offer}&src=${src}${bizQ}${langQ}#contact`;

  const audience = row.audience ?? {};
  const proof = row.proof ?? {};
  const screens = arr<string>(proof.screens);
  const price = row.price_block ?? {};
  const ackBusiness = biz ?? (lang === "es" ? "tu negocio" : `your ${String(row.display_name).toLowerCase()} business`);
  const inquiryConfig = { slug, name: row.display_name, needs: DEFAULT_NEEDS.map((l) => ({ id: l, label: l, detail: "" })) } as any;

  const section = "studio-section border-t border-border";
  const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="studio-display text-3xl md:text-5xl">{children}</h2>;
  const Card = ({ title, body }: { title: string; body: string }) => <div className="rounded-xl border border-border bg-card p-5"><h3 className="text-lg font-semibold text-foreground">{title}</h3><p className="mt-2 leading-relaxed text-muted-foreground">{body}</p></div>;
  const Caption = ({ i }: { i: number }) => (screens[i] ? <p className="mt-3 text-xs text-muted-foreground">{screens[i]}</p> : null);
  const PriceRow = ({ text, children }: { text: string; children: React.ReactNode }) => text ? <div className="flex flex-col gap-4 border-b border-border py-6 md:flex-row md:items-center md:justify-between"><p className="max-w-2xl text-foreground">{text}</p><div className="flex flex-wrap gap-2">{children}</div></div> : null;

  return (
    <div className={`stm-studio flagship-vertical vertical-${slug}`}>
      <StudioHeader />
      <main>
        <section className="pt-36 pb-16"><div className="studio-container">
          {hasEs && <p className="mb-4"><Link className="text-sm underline text-foreground" to={switchHref} hrefLang={lang === "es" ? "en" : "es"} onClick={() => track(`v2_lang_${lang === "es" ? "en" : "es"}`)}>{L.language_switch}</Link></p>}
          {biz && <p className="vertical-biz-note">{L.checking_for} {biz}</p>}
          <h1 className="studio-display text-4xl md:text-7xl">{idx >= 0 ? <>{headline.slice(0, idx)}<span style={{ color: accent }}>{headline.slice(idx, idx + word.length)}</span>{headline.slice(idx + word.length)}</> : headline}</h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{row.subline}</p>
          {row.stat_value && <p className="mt-8"><span className="studio-display text-5xl" style={{ color: accent }}>{row.stat_value}</span><span className="ml-3 text-sm text-muted-foreground">{row.stat_label}</span></p>}
          <div className="mt-8 flex flex-wrap gap-3"><Cta url={row.cta_primary_url} label={row.cta_primary_label} primary name="v2_hero_primary" /><Cta url={row.cta_secondary_url} label={row.cta_secondary_label} name="v2_hero_secondary" /></div>
        </div></section>

        {(audience.who || audience.not_for) && <section className={section}><div className="studio-container grid gap-8 md:grid-cols-2">
          <StudioReveal><p className="studio-eyebrow">{L.who}</p><p className="mt-3 text-lg text-foreground">{audience.who}</p></StudioReveal>
          <StudioReveal><p className="studio-eyebrow">{L.not_for}</p><p className="mt-3 text-lg text-muted-foreground">{audience.not_for}</p></StudioReveal>
        </div></section>}

        {arr(row.leaks).length > 0 && <section className={section}><div className="studio-container"><StudioReveal><H2>{row.leaks_heading}</H2></StudioReveal>
          <div className="mt-8 grid gap-4 md:grid-cols-2">{arr<any>(row.leaks).map((l) => <div key={l.title} className="rounded-xl border border-border bg-card p-5"><h3 className="text-lg font-semibold text-foreground">{l.title}</h3><p className="mt-2 text-muted-foreground">{l.line}</p>{l.dollar_note && <p className="mt-3 text-xs" style={{ color: accent }}>{l.dollar_note}</p>}</div>)}</div>
        </div></section>}

        {row.math_config && <><MathCalculator config={row.math_config} /><div className="studio-container pb-12"><p className="text-xs text-muted-foreground">{L.estimate}</p>{row.free_check_line && <p className="mt-4 max-w-2xl text-foreground">{row.free_check_line}</p>}<Link className="studio-btn studio-btn-primary mt-4" to={freeCheck} onClick={() => track("v2_math_free_check")}>{L.free_check}</Link></div></>}

        {arr(row.differentiators).length > 0 && <section className={section}><div className="studio-container"><StudioReveal><H2>{L.why}</H2></StudioReveal>
          <div className="mt-8 grid gap-4 md:grid-cols-3">{arr<any>(row.differentiators).map((d) => <Card key={d.title} title={d.title} body={d.body} />)}</div></div></section>}

        <section className={section}><div className="studio-container"><StudioReveal><H2>{L.does}</H2></StudioReveal>
          <ul className="mt-8 grid gap-3 md:grid-cols-2">{arr<any>(row.tour_features).map((t, i) => { const label = typeof t === "string" ? t : t?.title; return <li key={i} className="flex gap-3 text-foreground"><Check aria-hidden size={18} style={{ color: accent }} className="mt-1 shrink-0" />{label}</li>; })}</ul>
          <div className="mt-8 space-y-4">{arr<string>(row.included_features).map((p, i) => <p key={i} className="max-w-3xl leading-relaxed text-muted-foreground">{p}</p>)}</div>
          {row.live_in_line && <p className="mt-6 font-semibold text-foreground">{row.live_in_line}</p>}
        </div></section>

        {arr(row.local_plan).length > 0 && <section className={section}><div className="studio-container"><StudioReveal><H2>{L.local}</H2></StudioReveal>
          <div className="mt-8 grid gap-4 md:grid-cols-3">{arr<any>(row.local_plan).map((d) => <Card key={d.title} title={d.title} body={d.body} />)}</div></div></section>}

        <section className={section}><div className="studio-container"><StudioReveal><H2>{proof.heading || L.proof_heading}</H2></StudioReveal>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5"><p className="studio-label">{L.proof_form}</p>
              <div className="mt-3 space-y-2 text-sm" aria-hidden>{["Name", "Email", "Business"].map((f) => <div key={f} className="rounded-md border border-border bg-background px-3 py-2 text-muted-foreground">{f}</div>)}
                <div className="flex flex-wrap gap-2">{DEFAULT_NEEDS.map((n) => <span key={n} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{n}</span>)}</div>
                <div className="rounded-md border border-border bg-background px-3 py-6 text-muted-foreground">Optional note</div></div><Caption i={1} /></div>
            <div className="rounded-xl border border-border bg-card p-5"><p className="studio-label">{L.proof_email}</p><p className="mt-3 text-sm font-semibold text-foreground">Subject: {ackSubject(ackBusiness, lang)}</p><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">{lang === "es" ? ackSpanishBody("", ackBusiness, "") : ackEnglishBody("", ackBusiness, "")}</pre><Caption i={2} /></div>
            <div className="rounded-xl border border-border bg-card p-5"><p className="studio-label">{L.proof_alert}</p><p className="mt-3 text-sm font-semibold text-foreground">Subject: New website inquiry — [customer name]</p><ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">{["Name", "Email", "Phone", "Company", "Interested in", "Timing", "Source", "Submitted", "Project note"].map((f) => <li key={f}>{f}</li>)}</ul><Caption i={3} /></div>
            {proof.case && <Link to="/work/barpulse" onClick={() => track("v2_proof_barpulse")} className="block rounded-xl border border-border bg-card p-5"><p className="studio-label">{L.case}</p><h3 className="mt-3 text-xl font-semibold text-foreground">{proof.case.name}</h3><p className="mt-2 text-muted-foreground">{proof.case.line}</p><span className="mt-3 inline-flex items-center gap-1 text-sm text-foreground">{L.see_case} <ArrowRight aria-hidden size={14} /></span></Link>}
          </div>
          {screens.length > 0 && <ul className="mt-6 space-y-1 text-xs text-muted-foreground">{screens.filter((_, i) => i === 0 || i > 3).map((s) => <li key={s}>{s}</li>)}</ul>}
          {proof.honesty_line && <p className="mt-4 text-xs text-muted-foreground">{proof.honesty_line}</p>}
        </div></section>

        <section id="pricing" className={section}><div className="studio-container"><StudioReveal><H2>{price.heading || L.price_heading}</H2></StudioReveal>
          <div className="mt-6">
            <PriceRow text={str(price.launch)}>{checkout ? <><CheckoutButton product="launch_site_deposit" label={L.deposit} sourceVertical={slug} originPath={location.pathname} /><CheckoutButton product="launch_site_monthly" label={L.monthly} sourceVertical={slug} originPath={location.pathname} /></> : <Link className="studio-btn studio-btn-primary" to={inquiry("launch-site")} onClick={() => track("v2_offer_launch_site")}>{L.launch_inquiry}</Link>}</PriceRow>
            <PriceRow text={str(price.care)}>{checkout ? <CheckoutButton product="care_seat" label={L.care} sourceVertical={slug} originPath={location.pathname} /> : <Link className="studio-btn studio-btn-outline" to={inquiry("care")} onClick={() => track("v2_offer_care")}>{L.care_inquiry}</Link>}</PriceRow>
            <PriceRow text={str(price.business)}><Link className="studio-btn studio-btn-outline" to={inquiry("business-site")} onClick={() => track("v2_offer_business_site")}>{L.business_quote}</Link><Link className="studio-btn studio-btn-outline" to={freeCheck} onClick={() => track("v2_offer_free_check")}>{L.free_check}</Link></PriceRow>
            <PriceRow text={str(price.growth)}><Link className="studio-btn studio-btn-outline" to={`/?intent=marketing&offer=growth&src=${src}${bizQ}${langQ}#contact`} onClick={() => track("v2_offer_growth")}>{L.growth}</Link></PriceRow>
          </div>
          {row.guarantee_line && <p className="mt-6 max-w-3xl text-foreground">{row.guarantee_line}</p>}
          {arr(row.how_it_works).length > 0 && <ol className="mt-10 grid gap-4 md:grid-cols-3">{arr<any>(row.how_it_works).slice(0, 3).map((s, i) => <li key={i} className="rounded-xl border border-border bg-card p-5"><span className="studio-display text-3xl" style={{ color: accent }}>{i + 1}</span><h3 className="mt-2 font-semibold text-foreground">{typeof s === "string" ? `${lang === "es" ? "Paso" : "Step"} ${i + 1}` : s?.title}</h3>{(typeof s === "string" ? s : s?.body) && <p className="mt-1 text-muted-foreground">{typeof s === "string" ? s : s.body}</p>}</li>)}</ol>}
        </div></section>

        {arr(row.market_facts).length > 0 && <section className={section}><div className="studio-container"><StudioReveal><H2>{L.market}</H2></StudioReveal>
          <ul className="mt-8 space-y-5">{arr<any>(row.market_facts).map((m, i) => <li key={i} className="max-w-3xl"><p className="text-foreground">{m.fact}</p><p className="mt-1 text-xs text-muted-foreground">{m.publisher}{m.year ? `, ${m.year}` : ""}{m.label ? ` · ${m.label}` : ""}{m.url && <> · <a className="underline" href={m.url} target="_blank" rel="noopener noreferrer">{m.url}</a></>}</p></li>)}</ul></div></section>}

        {faq.length > 0 && <section className={section}><div className="studio-container max-w-3xl"><H2>{L.faq}</H2>
          <Accordion type="single" collapsible className="mt-6">{faq.map((f, i) => <AccordionItem key={i} value={`f${i}`}><AccordionTrigger className="text-left">{f.q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{f.a}</AccordionContent></AccordionItem>)}</Accordion></div></section>}

        <section id="inquiry" className={section}><div className="studio-container max-w-3xl"><H2>{L.inquiry_title}</H2><p className="mt-3 text-muted-foreground">{L.inquiry_sub}</p><div className="mt-8"><VerticalInquiry config={inquiryConfig} biz={biz} language={lang} /></div></div></section>
      </main>
      <StudioFooter />
    </div>
  );
}

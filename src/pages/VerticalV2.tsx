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
import { ackEnglishBody, ackSubject } from "../../supabase/functions/_shared/prospectAckCopy";

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

export default function VerticalV2({ row, slug }: { row: any; slug: string }) {
  const location = useLocation();
  const [params] = useSearchParams();
  const biz = useMemo(() => sanitizeBiz(params.get("biz")), [params]);
  const bizQ = biz ? `&biz=${encodeURIComponent(biz)}` : "";
  const src = `for-${slug}`;
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
  const freeCheck = `/free-audit?src=${src}${bizQ}`;
  const inquiry = (offer: string) => `/?intent=websites&offer=${offer}&src=${src}${bizQ}#contact`;

  const audience = row.audience ?? {};
  const proof = row.proof ?? {};
  const screens = arr<string>(proof.screens);
  const price = row.price_block ?? {};
  const ackBusiness = biz ?? `your ${String(row.display_name).toLowerCase()} business`;
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
          {biz && <p className="vertical-biz-note">Checking for {biz}</p>}
          <h1 className="studio-display text-4xl md:text-7xl">{idx >= 0 ? <>{headline.slice(0, idx)}<span style={{ color: accent }}>{headline.slice(idx, idx + word.length)}</span>{headline.slice(idx + word.length)}</> : headline}</h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{row.subline}</p>
          {row.stat_value && <p className="mt-8"><span className="studio-display text-5xl" style={{ color: accent }}>{row.stat_value}</span><span className="ml-3 text-sm text-muted-foreground">{row.stat_label}</span></p>}
          <div className="mt-8 flex flex-wrap gap-3"><Cta url={row.cta_primary_url} label={row.cta_primary_label} primary name="v2_hero_primary" /><Cta url={row.cta_secondary_url} label={row.cta_secondary_label} name="v2_hero_secondary" /></div>
        </div></section>

        {(audience.who || audience.not_for) && <section className={section}><div className="studio-container grid gap-8 md:grid-cols-2">
          <StudioReveal><p className="studio-eyebrow">Who this is for</p><p className="mt-3 text-lg text-foreground">{audience.who}</p></StudioReveal>
          <StudioReveal><p className="studio-eyebrow">Who this is not for</p><p className="mt-3 text-lg text-muted-foreground">{audience.not_for}</p></StudioReveal>
        </div></section>}

        {arr(row.leaks).length > 0 && <section className={section}><div className="studio-container"><StudioReveal><H2>{row.leaks_heading}</H2></StudioReveal>
          <div className="mt-8 grid gap-4 md:grid-cols-2">{arr<any>(row.leaks).map((l) => <div key={l.title} className="rounded-xl border border-border bg-card p-5"><h3 className="text-lg font-semibold text-foreground">{l.title}</h3><p className="mt-2 text-muted-foreground">{l.line}</p>{l.dollar_note && <p className="mt-3 text-xs" style={{ color: accent }}>{l.dollar_note}</p>}</div>)}</div>
        </div></section>}

        {row.math_config && <><MathCalculator config={row.math_config} /><div className="studio-container pb-12"><p className="text-xs text-muted-foreground">Every figure above is an estimate.</p>{row.free_check_line && <p className="mt-4 max-w-2xl text-foreground">{row.free_check_line}</p>}<Link className="studio-btn studio-btn-primary mt-4" to={freeCheck} onClick={() => track("v2_math_free_check")}>Run the free check</Link></div></>}

        {arr(row.differentiators).length > 0 && <section className={section}><div className="studio-container"><StudioReveal><H2>Why this and not the agencies</H2></StudioReveal>
          <div className="mt-8 grid gap-4 md:grid-cols-3">{arr<any>(row.differentiators).map((d) => <Card key={d.title} title={d.title} body={d.body} />)}</div></div></section>}

        <section className={section}><div className="studio-container"><StudioReveal><H2>What the site does for this trade</H2></StudioReveal>
          <ul className="mt-8 grid gap-3 md:grid-cols-2">{arr<any>(row.tour_features).map((t, i) => { const label = typeof t === "string" ? t : t?.title; return <li key={i} className="flex gap-3 text-foreground"><Check aria-hidden size={18} style={{ color: accent }} className="mt-1 shrink-0" />{label}</li>; })}</ul>
          <div className="mt-8 space-y-4">{arr<string>(row.included_features).map((p, i) => <p key={i} className="max-w-3xl leading-relaxed text-muted-foreground">{p}</p>)}</div>
          {row.live_in_line && <p className="mt-6 font-semibold text-foreground">{row.live_in_line}</p>}
        </div></section>

        {arr(row.local_plan).length > 0 && <section className={section}><div className="studio-container"><StudioReveal><H2>The local plan</H2></StudioReveal>
          <div className="mt-8 grid gap-4 md:grid-cols-3">{arr<any>(row.local_plan).map((d) => <Card key={d.title} title={d.title} body={d.body} />)}</div></div></section>}

        <section className={section}><div className="studio-container"><StudioReveal><H2>{proof.heading || "What you can see before you buy"}</H2></StudioReveal>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5"><p className="studio-label">The inquiry form</p>
              <div className="mt-3 space-y-2 text-sm" aria-hidden>{["Name", "Email", "Business"].map((f) => <div key={f} className="rounded-md border border-border bg-background px-3 py-2 text-muted-foreground">{f}</div>)}
                <div className="flex flex-wrap gap-2">{DEFAULT_NEEDS.map((n) => <span key={n} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{n}</span>)}</div>
                <div className="rounded-md border border-border bg-background px-3 py-6 text-muted-foreground">Optional note</div></div><Caption i={1} /></div>
            <div className="rounded-xl border border-border bg-card p-5"><p className="studio-label">The confirmation email</p><p className="mt-3 text-sm font-semibold text-foreground">Subject: {ackSubject(ackBusiness)}</p><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">{ackEnglishBody("", ackBusiness, "")}</pre><Caption i={2} /></div>
            <div className="rounded-xl border border-border bg-card p-5"><p className="studio-label">The owner alert</p><p className="mt-3 text-sm font-semibold text-foreground">Subject: New website inquiry — [customer name]</p><ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">{["Name", "Email", "Phone", "Company", "Interested in", "Timing", "Source", "Submitted", "Project note"].map((f) => <li key={f}>{f}</li>)}</ul><Caption i={3} /></div>
            {proof.case && <Link to="/work/barpulse" onClick={() => track("v2_proof_barpulse")} className="block rounded-xl border border-border bg-card p-5"><p className="studio-label">Case study</p><h3 className="mt-3 text-xl font-semibold text-foreground">{proof.case.name}</h3><p className="mt-2 text-muted-foreground">{proof.case.line}</p><span className="mt-3 inline-flex items-center gap-1 text-sm text-foreground">See the case study <ArrowRight aria-hidden size={14} /></span></Link>}
          </div>
          {screens.length > 0 && <ul className="mt-6 space-y-1 text-xs text-muted-foreground">{screens.filter((_, i) => i === 0 || i > 3).map((s) => <li key={s}>{s}</li>)}</ul>}
          {proof.honesty_line && <p className="mt-4 text-xs text-muted-foreground">{proof.honesty_line}</p>}
        </div></section>

        <section id="pricing" className={section}><div className="studio-container"><StudioReveal><H2>{price.heading || "What it costs"}</H2></StudioReveal>
          <div className="mt-6">
            <PriceRow text={str(price.launch)}>{checkout ? <><CheckoutButton product="launch_site_deposit" label="Start with the deposit" /><CheckoutButton product="launch_site_monthly" label="Start monthly" /></> : <Link className="studio-btn studio-btn-primary" to={inquiry("launch-site")} onClick={() => track("v2_offer_launch_site")}>Start a Launch Site</Link>}</PriceRow>
            <PriceRow text={str(price.care)}>{checkout ? <CheckoutButton product="care_seat" label="Get the care seat" /> : <Link className="studio-btn studio-btn-outline" to={inquiry("care")} onClick={() => track("v2_offer_care")}>Ask about Care</Link>}</PriceRow>
            <PriceRow text={str(price.business)}><Link className="studio-btn studio-btn-outline" to={inquiry("business-site")} onClick={() => track("v2_offer_business_site")}>Get a Business Site quote</Link><Link className="studio-btn studio-btn-outline" to={freeCheck} onClick={() => track("v2_offer_free_check")}>Run the free check</Link></PriceRow>
            <PriceRow text={str(price.growth)}><Link className="studio-btn studio-btn-outline" to={`/?intent=marketing&offer=growth&src=${src}${bizQ}#contact`} onClick={() => track("v2_offer_growth")}>Ask about Growth</Link></PriceRow>
          </div>
          {row.guarantee_line && <p className="mt-6 max-w-3xl text-foreground">{row.guarantee_line}</p>}
          {arr(row.how_it_works).length > 0 && <ol className="mt-10 grid gap-4 md:grid-cols-3">{arr<any>(row.how_it_works).slice(0, 3).map((s, i) => <li key={i} className="rounded-xl border border-border bg-card p-5"><span className="studio-display text-3xl" style={{ color: accent }}>{i + 1}</span><h3 className="mt-2 font-semibold text-foreground">{s.title}</h3>{s.body && <p className="mt-1 text-muted-foreground">{s.body}</p>}</li>)}</ol>}
        </div></section>

        {arr(row.market_facts).length > 0 && <section className={section}><div className="studio-container"><StudioReveal><H2>What the market says</H2></StudioReveal>
          <ul className="mt-8 space-y-5">{arr<any>(row.market_facts).map((m, i) => <li key={i} className="max-w-3xl"><p className="text-foreground">{m.fact}</p><p className="mt-1 text-xs text-muted-foreground">{m.publisher}{m.year ? `, ${m.year}` : ""}{m.label ? ` · ${m.label}` : ""}{m.url && <> · <a className="underline" href={m.url} target="_blank" rel="noopener noreferrer">{m.url}</a></>}</p></li>)}</ul></div></section>}

        {faq.length > 0 && <section className={section}><div className="studio-container max-w-3xl"><H2>Common questions</H2>
          <Accordion type="single" collapsible className="mt-6">{faq.map((f, i) => <AccordionItem key={i} value={`f${i}`}><AccordionTrigger className="text-left">{f.q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{f.a}</AccordionContent></AccordionItem>)}</Accordion></div></section>}

        <section id="inquiry" className={section}><div className="studio-container max-w-3xl"><H2>Tell me about the business.</H2><p className="mt-3 text-muted-foreground">You will get a confirmation right away and a personal reply within one business day.</p><div className="mt-8"><VerticalInquiry config={inquiryConfig} biz={biz} /></div></div></section>
      </main>
      <StudioFooter />
    </div>
  );
}

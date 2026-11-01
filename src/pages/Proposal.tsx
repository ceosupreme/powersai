import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, FileDown, Mail, Printer, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { getStudioMedia } from "@/config/studioMedia";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { getProposal, isVideoFile, toEmbedUrl, type ProposalRecord } from "@/content/proposals";
import NotFound from "./NotFound";
import "@/styles/proposal.css";

/** Unlisted proposal. An agreement request is NOT recorded as a signed acceptance. */
export default function Proposal() {
  const { slug } = useParams<{ slug: string }>();
  const proposal = getProposal(slug);
  return proposal ? <ProposalView proposal={proposal} /> : <NotFound />;
}

function ProposalView({ proposal: p }: { proposal: ProposalRecord }) {
  useStudioHead({ title: `${p.title} for ${p.client.company} | ${p.preparedBy.company}`, description: p.subtitle, path: `/proposal/${p.slug}` });
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);
  useEffect(() => { trackSiteEvent({ event_type: "page_view" }); }, [p.slug]);
  const mark = getStudioMedia("home-opening-mark");
  const videoFile = isVideoFile(p.videoUrl) ? p.videoUrl : null;
  const embed = toEmbedUrl(p.videoUrl);
  const track = (label: string) => trackSiteEvent({ event_type: "cta_click", label });
  const reviewMail = `mailto:${p.preparedBy.email}?subject=${encodeURIComponent(`${p.client.company}: proposal review`)}&body=${encodeURIComponent("I would like to review the growth program together. Please send a few available times.")}`;

  return (
    <div className="stm-studio proposal-page min-h-screen">
      <header className="proposal-topbar">
        <div className="proposal-wrap proposal-topbar-in">
          <Link to="/" className="proposal-brand" aria-label={`${p.preparedBy.company} home`}>
            {mark?.src && <img src={mark.src} alt="" width={mark.width} height={mark.height} />}
            <span>{p.preparedBy.company}</span>
          </Link>
          <a className="proposal-top-cta" href="#accept" onClick={() => track("proposal_header_request")}>Let's get started <ArrowRight size={16} aria-hidden /></a>
        </div>
      </header>
      <main>
        <section className="proposal-hero">
          <div className="proposal-wrap">
            <p className="proposal-eyebrow">Prepared for {p.client.contact} · {p.client.company}</p>
            <p className="proposal-program-name">{p.title}</p>
            <h1 className="proposal-title">{(p.heroHeadline ?? p.title).split("\n").map((line, i, lines) => <span key={i} className={i === lines.length - 1 && lines.length > 1 ? "proposal-title-accent" : undefined}>{line}</span>)}</h1>
            <p className="proposal-subtitle">{p.subtitle}</p>
            <div className="proposal-actions">
              <a href="#how-it-works" className="proposal-btn" onClick={() => track("proposal_see_system")}>See how the system works <ArrowRight size={18} aria-hidden /></a>
              <a href="#what-it-costs" className="proposal-text-link" onClick={() => track("proposal_view_investment")}>View the investment</a>
              {(videoFile || embed) && <a href="#proposal-video" className="proposal-text-link"><Play size={16} aria-hidden /> Watch the proposal</a>}
            </div>
            <ul className="proposal-facts" aria-label="The business outcomes">
              {p.headlineFacts.map(f => <li key={f.label}><span>{f.label}</span><strong>{f.value}</strong></li>)}
            </ul>
            <p className="proposal-facts-note">{p.factsNote}</p>
          </div>
        </section>
        {(videoFile || embed) && <section className="proposal-video-section" id="proposal-video"><div className="proposal-wrap"><div className="proposal-video">
          {videoFile ? <video controls playsInline preload="metadata" aria-label={`${p.title}: proposal overview`}><source src={videoFile} /><a href={videoFile}>Open the proposal video</a></video> : <iframe src={embed ?? undefined} title={`${p.title}: proposal overview`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />}
        </div></div></section>}

        <section className="proposal-opening">
          <div className="proposal-wrap proposal-opening-grid">
            <div><span className="proposal-eyebrow">Add to what already works</span><h2 className="proposal-h2">Keep the mail.<br />Add a channel you control.</h2>{p.opening.map((line, i) => <p key={i}>{line}</p>)}</div>
            <div className="proposal-outcomes">{p.outcomes.map(o => <article className="proposal-outcome" key={o.label}><span className="proposal-eyebrow">{o.label}</span><h3>{o.title}</h3><p>{o.body}</p></article>)}</div>
          </div>
        </section>
        <section className="proposal-journey" id="how-it-works">
          <div className="proposal-wrap"><span className="proposal-eyebrow">The growth system</span><h2 className="proposal-h2">{p.journey.title}</h2>
            <ol className="proposal-journey-steps">{p.journey.steps.map((st, i) => <li key={st.label}><span className="proposal-journey-num">0{i + 1}</span><h3>{st.label}</h3><p>{st.body}</p></li>)}</ol>
          </div>
        </section>
        <section className="proposal-blocks">
          <div className="proposal-wrap"><span className="proposal-eyebrow">Your managed program</span><h2 className="proposal-h2">Marketing, automation and follow-up.<br />Working together.</h2>
            <div className="proposal-block-grid">{p.blocks.map(b => <article className="proposal-block" key={b.number}><span className="proposal-block-num">{b.number}</span><div><h3>{b.title}</h3><p>{b.body}</p>{b.note && <p className="proposal-block-note">{b.note}</p>}</div></article>)}</div>
          </div>
        </section>
        {p.growthLoop && <section className="proposal-growth-loop" id="ongoing-management"><div className="proposal-wrap">
          <span className="proposal-eyebrow">What you're paying us to do every month</span><h2 className="proposal-h2">{p.growthLoop.title}</h2><p className="proposal-section-intro">{p.growthLoop.body}</p>
          <div className="proposal-loop-steps">{p.growthLoop.steps.map((step, i) => <article key={step.title}><span className="proposal-loop-num">0{i + 1}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div>
          <ul className="proposal-monthly" aria-label="Included monthly production and reporting">{p.monthly.map(m => <li key={m.label}><strong>{m.value}</strong><span>{m.label}</span></li>)}</ul>
        </div></section>}
        <section className="proposal-markets"><div className="proposal-wrap proposal-markets-grid"><div><span className="proposal-eyebrow">Around your presentation calendar</span><h2 className="proposal-h2">{p.markets.title}</h2><p>{p.markets.body}</p><p><strong>{p.markets.home}</strong> {p.markets.travelNote}</p><p className="proposal-scope">{p.markets.scopeNote}</p></div>
          <figure className="proposal-calendar" aria-label="Campaign scheduling: ongoing Boston coverage with travel-market windows around presentation dates">
            <figcaption>Your calendar drives the campaigns</figcaption>
            <div className="proposal-cal-weeks" aria-hidden>{Array.from({ length: 8 }, (_, i) => <span key={i}>W{i + 1}</span>)}</div>
            <div className="proposal-cal-row"><span className="proposal-cal-name">Boston</span><div className="proposal-cal-track"><i className="proposal-cal-bar is-home" style={{ gridColumn: "1 / 9" }}>Home market</i></div></div>
            {[{ name: "Travel market A", start: 2, end: 5, day: 4 }, { name: "Travel market B", start: 4, end: 7, day: 6 }, { name: "Travel market C", start: 6, end: 9, day: 8 }].map(m => <div className="proposal-cal-row" key={m.name}><span className="proposal-cal-name">{m.name}</span><div className="proposal-cal-track"><i className="proposal-cal-bar" style={{ gridColumn: `${m.start} / ${m.end}` }}>Campaign</i><b className="proposal-cal-dot" style={{ gridColumn: String(m.day) }} aria-label="Presentation" /></div></div>)}
            <p className="proposal-cal-key"><span><i /> Campaign window</span><span><b /> Presentation</span></p>
          </figure>
        </div></section>
        <section className="proposal-who" id="who-does-what"><div className="proposal-wrap"><span className="proposal-eyebrow">A clear division of work</span><h2 className="proposal-h2">{p.whoDoesWhat.title}</h2><div className="proposal-who-grid">
          <div className="proposal-who-col"><h3>{p.preparedBy.company}</h3><ul>{p.whoDoesWhat.us.map(t => <li key={t}><Check size={18} aria-hidden /><span>{t}</span></li>)}</ul></div>
          <div className="proposal-who-col is-client"><h3>Your team</h3><ul>{p.whoDoesWhat.them.map(t => <li key={t}><Check size={18} aria-hidden /><span>{t}</span></li>)}</ul></div>
        </div></div></section>
        <section className="proposal-pricing" id="what-it-costs"><div className="proposal-wrap"><span className="proposal-eyebrow">{p.pricing.title}</span><h2 className="proposal-h2">Build the foundation.<br />Then put it to work.</h2><div className="proposal-price-grid">{p.pricing.lines.map(l => <article className="proposal-price" key={l.label}><span className="proposal-price-label">{l.label}</span><strong className="proposal-price-amount">{l.amount}</strong><p>{l.body}</p></article>)}</div><ul className="proposal-rules">{p.pricing.plainRules.map(r => <li key={r}><Check size={18} aria-hidden />{r}</li>)}</ul>{p.pricing.summary && <p className="proposal-budget-summary">{p.pricing.summary}</p>}<a href="#accept" className="proposal-btn" onClick={() => track("proposal_investment_request")}>Approve the plan <ArrowRight size={18} aria-hidden /></a></div></section>
        <section className="proposal-pilot" id="the-pilot"><div className="proposal-wrap"><span className="proposal-eyebrow">{p.pilot.title}</span><h2 className="proposal-h2">60 live days.<br />A real decision at day 30.</h2><ol className="proposal-phases">{p.pilot.phases.map((ph, i) => <li key={ph.when}><span className="proposal-phase-step">{i + 1}</span><span className="proposal-phase-when">{ph.when}</span><h3>{ph.title}</h3><p>{ph.body}</p></li>)}</ol>
          <div className="proposal-assurance"><Check size={22} aria-hidden /><div><h3>{p.pilot.assurance.title}</h3><p>{p.pilot.assurance.body}</p></div></div>
          <details className="proposal-definition"><summary>{p.pilot.definition.title}</summary><p>{p.pilot.definition.body}</p><p>{p.pilot.after}</p></details>
        </div></section>
        <section className="proposal-after"><div className="proposal-wrap proposal-after-grid"><div><span className="proposal-eyebrow">Getting started</span><h2 className="proposal-h2">{p.afterAccept.title}</h2><p>{p.afterAccept.intro}</p></div><ol className="proposal-after-list">{p.afterAccept.items.map((t, i) => <li key={i}><span>{i + 1}</span><p>{t}</p></li>)}</ol></div></section>
        <section className="proposal-accept" id="accept"><div className="proposal-wrap proposal-accept-grid"><div><span className="proposal-eyebrow">Your next step</span><h2 className="proposal-h2">{p.accept.title}</h2><p className="proposal-section-intro">{p.accept.body}</p><div className="proposal-side-actions">
          <a href={reviewMail} onClick={() => track("proposal_review_request")}><Mail size={18} aria-hidden />Arrange a quick proposal review</a>
          {p.pdfUrl && <a href={p.pdfUrl} download><FileDown size={18} aria-hidden />Download the proposal</a>}
          <button type="button" onClick={() => { track("proposal_print"); window.print(); }}><Printer size={18} aria-hidden />Print or save as PDF</button>
        </div><address className="proposal-signature"><strong>{p.preparedBy.name}</strong><span>{p.preparedBy.company}</span><a href={`mailto:${p.preparedBy.email}`}>{p.preparedBy.email}</a></address></div><AgreementRequestForm proposal={p} /></div></section>
      </main>
      <footer className="proposal-footer"><div className="proposal-wrap"><span>{p.preparedBy.company}</span><span>Prepared for {p.client.company} · {p.preparedOn}</span></div></footer>
      <nav className="proposal-mobile-actions" aria-label="Proposal actions"><a href="#what-it-costs">View investment</a><a href="#accept">Request agreement <ArrowRight size={16} aria-hidden /></a></nav>
    </div>
  );
}

type Status = "idle" | "submitting" | "success" | "error";
function AgreementRequestForm({ proposal: p }: { proposal: ProposalRecord }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inFlight.current) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    if (String(form.get("company_website") ?? "")) { setStatus("success"); return; }
    const name = String(form.get("name") ?? "").trim();
    const company = String(form.get("company") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    if (name.length < 2) return setError("Please enter your full name.");
    if (company.length < 2) return setError("Please enter your company name.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Please enter your best contact number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Please enter a valid email address.");
    const requestedAt = new Date().toISOString();
    const terms = p.pricing.lines.map(l => `${l.label}: ${l.amount}`).join("; ");
    const note = [
      `AGREEMENT REQUESTED: ${p.internalLabel}`,
      `Requested by: ${name}`,
      `Company: ${company}`,
      `Phone: ${phone}`,
      `Email for the agreement: ${email}`,
      `Requested at: ${requestedAt}`,
      `Plan reviewed: ${terms}. ${p.pricing.plainRules.join(" ")}`,
      "The visitor approved the direction and requested an agreement. This is not a signed agreement or payment authorization.",
      `Page: ${window.location.href}`,
    ].join("\n");
    inFlight.current = true;
    setStatus("submitting");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("submit-inbound-lead", {
        body: {
          name, business_name: company, phone,
          // The existing intake sends a generic acknowledgment when email is set.
          // Preserve the original behavior: agreement_email and the note carry the email.
          message: note,
          project_type: "proposal_agreement_request",
          conversation_channel: "form",
          qualifier_data: {
            proposal: p.slug, proposal_title: p.title,
            intent: `Agreement requested: ${p.title}`,
            services: [p.title], agreement_email: email,
            proposal_status: "agreement_requested", accepted_terms: false,
            requested_at: requestedAt, page_url: window.location.href,
          },
          company_website: "",
        },
      });
      const result = data as { ok?: boolean; id?: string } | null;
      if (fnError || result?.ok !== true || typeof result.id !== "string") throw new Error("Request was not saved");
      setStatus("success");
      // Analytics must not turn a successfully saved request into a visible failure.
      try { trackSiteEvent({ event_type: "form_success", label: "proposal_agreement_request" }); } catch { /* non-blocking analytics */ }
    } catch {
      setStatus("error");
      setError(`Your request could not be saved. Please try again or email ${p.preparedBy.email}.`);
    } finally { inFlight.current = false; }
  };
  if (status === "success") return <div className="proposal-form proposal-form-done" role="status"><span className="proposal-done-mark"><Check size={24} aria-hidden /></span><h3>{p.accept.confirmationTitle}</h3><p>{p.accept.confirmationBody}</p><a href={`mailto:${p.preparedBy.email}`}>Contact {p.preparedBy.name.split(" ")[0]}</a></div>;
  return <form className="proposal-form" onSubmit={onSubmit} noValidate aria-busy={status === "submitting"}>
    <div className="proposal-honeypot" aria-hidden><label>Company website<input type="text" name="company_website" tabIndex={-1} autoComplete="off" /></label></div>
    <h3>Request your agreement</h3>
    <label><span>Your full name</span><input name="name" type="text" autoComplete="name" maxLength={200} required /></label>
    <label><span>Company</span><input name="company" type="text" autoComplete="organization" maxLength={200} defaultValue={p.client.company} required /></label>
    <div className="proposal-form-row"><label><span>Email address</span><input name="email" type="email" autoComplete="email" maxLength={255} required /></label><label><span>Best phone number</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} required /></label></div>
    {error && <p className="proposal-form-error" role="alert">{error}</p>}
    <button type="submit" className="proposal-btn" disabled={status === "submitting"}>{status === "submitting" ? "Sending…" : p.accept.buttonLabel}<ArrowRight size={18} aria-hidden /></button>
    <p className="proposal-form-fine">We'll send the agreement for your review. Nothing is charged on this page.</p>
  </form>;
}

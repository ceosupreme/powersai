import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, FileDown, Mail, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { getStudioMedia } from "@/config/studioMedia";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { getProposal, toEmbedUrl, type ProposalRecord } from "@/content/proposals";
import NotFound from "./NotFound";
import "@/styles/proposal.css";

/**
 * Unlisted client proposal page: /proposal/:slug
 *
 * Content comes from src/content/proposals.ts. Views are logged to site_events
 * (path = this page), and an agreement request goes through the live
 * submit-inbound-lead intake, which emails the owner and files the lead in the
 * CRM. The lead's email column is left empty on purpose: the intake sends the
 * generic "got your note" acknowledgment to any lead that carries an email,
 * and that message promises an initial recommendation, not an agreement. The
 * requester's email travels in the note and in qualifier_data instead, and the
 * page shows the confirmation on screen.
 */
export default function Proposal() {
  const { slug } = useParams<{ slug: string }>();
  const proposal = getProposal(slug);
  if (!proposal) return <NotFound />;
  return <ProposalView proposal={proposal} />;
}

function ProposalView({ proposal: p }: { proposal: ProposalRecord }) {
  useStudioHead({
    title: `${p.title} for ${p.client.company} | ${p.preparedBy.company}`,
    description: p.subtitle,
    path: `/proposal/${p.slug}`,
  });

  // Discourage search indexing. This is an unlisted page, not access control.
  useEffect(() => {
    const existing = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const meta = existing ?? document.createElement("meta");
    const previous = meta.getAttribute("content");
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", "noindex, nofollow");
    if (!existing) document.head.appendChild(meta);
    return () => {
      if (!existing) meta.remove();
      else if (previous === null) meta.removeAttribute("content");
      else meta.setAttribute("content", previous);
    };
  }, []);

  useEffect(() => {
    trackSiteEvent({ event_type: "page_view" });
  }, [p.slug]);

  const mark = getStudioMedia("home-opening-mark");
  const video = getStudioMedia(p.videoMediaKey);
  const embed = toEmbedUrl(p.videoUrl);
  const track = (label: string) => trackSiteEvent({ event_type: "cta_click", label });

  return (
    <div className="stm-studio proposal-page min-h-screen">
      <a href="#proposal-main" className="proposal-skip-link">Skip to the proposal</a>
      <header className="proposal-topbar">
        <div className="proposal-wrap proposal-topbar-in">
          <Link to="/" className="proposal-brand" aria-label={`${p.preparedBy.company} home`} onClick={() => track("proposal_brand")}>
            {mark?.src && <img src={mark.src} alt="" width={mark.width} height={mark.height} onError={(event) => { event.currentTarget.style.display = "none"; }} />}
            <span>{p.preparedBy.company}</span>
          </Link>
          <nav className="proposal-jump-nav" aria-label="Proposal sections">
            <a href="#investment">Investment</a>
            <a href="#pilot">Pilot</a>
            <a href="#request-agreement">Request agreement <ArrowRight size={15} aria-hidden /></a>
          </nav>
        </div>
      </header>

      <main id="proposal-main">
        <section className="proposal-hero">
          <div className="proposal-wrap">
            <div className="proposal-hero-grid">
              <div className="proposal-hero-copy">
                <p className="proposal-eyebrow">Prepared for {p.client.contact} · {p.client.company}</p>
                <h1 className="proposal-title">{p.title}</h1>
                <p className="proposal-subtitle">{p.subtitle}</p>
                <div className="proposal-hero-actions">
                  <a className="proposal-btn" href="#investment" onClick={() => track("proposal_view_investment")}>
                    Explore the proposal <ArrowRight size={18} aria-hidden />
                  </a>
                  <a className="proposal-text-link" href="#request-agreement">Request the agreement</a>
                </div>
              </div>
              <ProposalJourney journey={p.journey} />
            </div>

            {(video?.videoSrc || embed) && (
              <div className="proposal-video-section">
                <h2 className="proposal-video-heading">Watch the program overview</h2>
                <div className="proposal-video">
                  {video?.videoSrc ? (
                    <video controls playsInline preload="metadata" poster={video.posterSrc ?? undefined} aria-label="Overview of the proposed appointment program">
                      <source src={video.videoSrc} type="video/mp4" />
                      {video.captionsSrc && <track kind="captions" src={video.captionsSrc} srcLang="en" label="English" default />}
                      <a href={video.videoSrc}>Open the proposal video</a>
                    </video>
                  ) : (
                    <iframe src={embed!} loading="lazy" title={`Overview of the ${p.title}`} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
                  )}
                </div>
                {p.videoTranscript && <details className="proposal-transcript"><summary>Read the narration</summary><p>{p.videoTranscript}</p></details>}
              </div>
            )}

            <ul className="proposal-facts" aria-label="Key terms">
              {p.headlineFacts.map((f) => (
                <li key={f.label}>
                  <span className="proposal-fact-label">{f.label}</span>
                  <strong className="proposal-fact-value">{f.value}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="proposal-opening">
          <div className="proposal-wrap proposal-opening-grid">
            <div className="proposal-opening-note">
              {p.opening.map((line, i) => <p key={i}>{line}</p>)}
              <p className="proposal-sign">{p.preparedBy.name}, {p.preparedBy.company}</p>
            </div>
            <div className="proposal-outcomes">
              {p.outcomes.map((o) => (
                <article key={o.label} className="proposal-outcome">
                  <span className="proposal-eyebrow">{o.label}</span>
                  <h2>{o.title}</h2>
                  <p>{o.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="proposal-blocks">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">What is in the program</span>
            <h2 className="proposal-h2">A clear path from interest to attendance.</h2>
            <div className="proposal-block-grid">
              {p.blocks.map((b) => (
                <article key={b.number} className="proposal-block">
                  <span className="proposal-block-num">{b.number}</span>
                  <h3>{b.title}</h3>
                  <p>{b.body}</p>
                  {b.note && <p className="proposal-block-note">{b.note}</p>}
                </article>
              ))}
            </div>
            <div className="proposal-monthly-strip" aria-label="Included each month">
              {p.monthly.map((item) => <div key={item.value}><strong>{item.value}</strong><span>{item.label}</span></div>)}
            </div>
          </div>
        </section>

        <section className="proposal-markets">
          <div className="proposal-wrap proposal-markets-grid">
            <div>
              <span className="proposal-eyebrow">Where it runs</span>
              <h2 className="proposal-h2">{p.markets.title}</h2>
              <p>{p.markets.body}</p>
              <p><strong>{p.markets.home}</strong> {p.markets.travelNote}</p>
              <p className="proposal-scope">{p.markets.scopeNote}</p>
            </div>
            <figure className="proposal-calendar" aria-label="Illustrative market schedule: Boston and three travel markets across eight weeks. Actual timing is agreed at kickoff.">
              <figcaption>One program. Up to four active markets.</figcaption>
              <div className="proposal-cal-weeks" aria-hidden>
                {Array.from({ length: 8 }, (_, i) => <span key={i}>W{i + 1}</span>)}
              </div>
              <div className="proposal-cal-row">
                <span className="proposal-cal-name">Boston, home market</span>
                <div className="proposal-cal-track"><i className="proposal-cal-bar is-home" style={{ gridColumn: "1 / 9" }}>Home market</i></div>
              </div>
              <div className="proposal-cal-row">
                <span className="proposal-cal-name">Travel market A</span>
                <div className="proposal-cal-track"><i className="proposal-cal-bar" style={{ gridColumn: "2 / 5" }}>Window</i><b className="proposal-cal-dot" style={{ gridColumn: "4" }} aria-label="Presentations" /></div>
              </div>
              <div className="proposal-cal-row">
                <span className="proposal-cal-name">Travel market B</span>
                <div className="proposal-cal-track"><i className="proposal-cal-bar" style={{ gridColumn: "4 / 7" }}>Window</i><b className="proposal-cal-dot" style={{ gridColumn: "6" }} aria-label="Presentations" /></div>
              </div>
              <div className="proposal-cal-row">
                <span className="proposal-cal-name">Travel market C</span>
                <div className="proposal-cal-track"><i className="proposal-cal-bar" style={{ gridColumn: "6 / 9" }}>Window</i><b className="proposal-cal-dot" style={{ gridColumn: "8" }} aria-label="Presentations" /></div>
              </div>
              <p className="proposal-cal-key">Illustrative schedule. Timing and budget follow your agreed presentation calendar.</p>
            </figure>
          </div>
        </section>

        <section className="proposal-pricing" id="investment">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">{p.pricing.title}</span>
            <h2 className="proposal-h2">Clear setup. Managed monthly. Your advertising budget.</h2>
            <div className="proposal-price-grid">
              {p.pricing.lines.map((l) => (
                <article key={l.label} className="proposal-price">
                  <span className="proposal-price-label">{l.label}</span>
                  <strong className="proposal-price-amount">{l.amount}</strong>
                  <span className="proposal-price-cadence">{l.cadence}</span>
                  <p>{l.body}</p>
                </article>
              ))}
            </div>
            <ul className="proposal-rules">
              {p.pricing.plainRules.map((r) => (
                <li key={r}><Check aria-hidden size={18} /> {r}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="proposal-pilot" id="pilot">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">{p.pilot.title}</span>
            <h2 className="proposal-h2">Sixty live days, with a decision point at thirty.</h2>
            <ol className="proposal-phases">
              {p.pilot.phases.map((ph, i) => (
                <li key={ph.when}>
                  <span className="proposal-phase-step">{i + 1}</span>
                  <span className="proposal-phase-when">{ph.when}</span>
                  <h3>{ph.title}</h3>
                  <p>{ph.body}</p>
                </li>
              ))}
            </ol>
            <div className="proposal-assurance-grid">
              <article className="proposal-assurance">
                <h3>{p.pilot.assurance.title}</h3>
                <p>{p.pilot.assurance.body}</p>
              </article>
              <article className="proposal-definition">
                <h3>{p.pilot.definition.title}</h3>
                <p>{p.pilot.definition.body}</p>
                <p>{p.pilot.after}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="proposal-after">
          <div className="proposal-wrap proposal-after-grid">
            <div>
              <span className="proposal-eyebrow">Next</span>
              <h2 className="proposal-h2">{p.afterAccept.title}</h2>
              <p>{p.afterAccept.intro}</p>
            </div>
            <ol className="proposal-after-list">
              {p.afterAccept.items.map((item, i) => (
                <li key={i}><span>{i + 1}</span>{item}</li>
              ))}
            </ol>
          </div>
        </section>

        <section className="proposal-accept" id="request-agreement">
          <div className="proposal-wrap proposal-accept-grid">
            <div className="proposal-accept-intro">
              <span className="proposal-eyebrow">The next step</span>
              <h2 className="proposal-h2">{p.accept.title}</h2>
              <p>{p.accept.body}</p>
              <div className="proposal-side-actions">
                <a href={`mailto:${p.preparedBy.email}?subject=${encodeURIComponent(`${p.title}: a question`)}`} onClick={() => track("proposal_question")}>
                  <Mail aria-hidden size={18} /> Ask {p.preparedBy.name.split(" ")[0]} a question
                </a>
                {p.pdfUrl && (
                  <a href={p.pdfUrl} download onClick={() => track("proposal_pdf")}>
                    <FileDown aria-hidden size={18} /> Download the two-page PDF
                  </a>
                )}
                <button type="button" onClick={() => { track("proposal_print"); window.print(); }}>
                  <Printer aria-hidden size={18} /> Print or save this page as a PDF
                </button>
              </div>
              <address className="proposal-signature">
                <strong>{p.preparedBy.name}</strong>
                <span>{p.preparedBy.company}</span>
                <a href={`mailto:${p.preparedBy.email}`}>{p.preparedBy.email}</a>
                <a href={`https://${p.preparedBy.site}`}>{p.preparedBy.site}</a>
              </address>
            </div>
            <AgreementRequestForm proposal={p} />
          </div>
        </section>
      </main>

      <footer className="proposal-footer">
        <div className="proposal-wrap proposal-footer-in">
          <p className="proposal-footer-more">
            <span>Other ways {p.preparedBy.company} helps:</span>
            <Link to="/services/websites" onClick={() => track("proposal_footer_websites")}>Websites</Link>
            <Link to="/services/marketing" onClick={() => track("proposal_footer_marketing")}>Marketing</Link>
            <Link to="/services/ai-systems" onClick={() => track("proposal_footer_systems")}>Business systems and automation</Link>
            <Link to="/work" onClick={() => track("proposal_footer_work")}>Our work</Link>
            <Link to="/about" onClick={() => track("proposal_footer_about")}>About STM</Link>
          </p>
          <p className="proposal-footer-legal">Prepared {p.preparedOn} for {p.client.company}. © {new Date().getFullYear()} {p.preparedBy.company}.</p>
        </div>
      </footer>
    </div>
  );
}

function ProposalJourney({ journey }: { journey: ProposalRecord["journey"] }) {
  const [active, setActive] = useState(0);
  const step = journey.steps[active];
  return (
    <aside className="proposal-journey" aria-label="Explore the appointment journey">
      <p className="proposal-journey-eyebrow">How the program works</p>
      <h2>{journey.title}</h2>
      <div className="proposal-journey-steps" role="group" aria-label="Choose a step">
        {journey.steps.map((item, i) => (
          <button type="button" key={item.label} aria-pressed={active === i} aria-controls="proposal-journey-detail" aria-label={`Step ${i + 1}: ${item.label}`} onClick={() => setActive(i)}>
            <span aria-hidden>{String(i + 1).padStart(2, "0")}</span>{item.label}
          </button>
        ))}
      </div>
      <div className="proposal-journey-detail" id="proposal-journey-detail" aria-live="polite" aria-atomic="true">
        <span className="proposal-journey-count">{String(active + 1).padStart(2, "0")} / {String(journey.steps.length).padStart(2, "0")}</span>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <p className="proposal-journey-handoff">{step.handoff}</p>
      </div>
      <p className="proposal-journey-footnote">Select a step to explore the proposed process.</p>
    </aside>
  );
}

type Status = "idle" | "submitting" | "success" | "error";

function AgreementRequestForm({ proposal: p }: { proposal: ProposalRecord }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting.current) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    if (String(form.get("company_website") ?? "")) { setStatus("success"); return; }

    const name = String(form.get("name") ?? "").trim();
    const company = String(form.get("company") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();

    if (name.length < 2 || name.length > 200) return setError("Please enter your full name, up to 200 characters.");
    if (company.length < 2 || company.length > 200) return setError("Please enter the company name, up to 200 characters.");
    if (phone.replace(/\D/g, "").length < 10 || phone.length > 40) return setError("Please enter the best phone number to reach you.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return setError("Please enter the email the agreement and invoice should go to.");

    const requestedAt = new Date();
    const terms = p.pricing.lines.map((l) => `${l.label}: ${l.amount} (${l.cadence})`).join("; ");
    const note = [
      `AGREEMENT REQUEST: ${p.internalLabel}`,
      `Requested by: ${name}`,
      `Company: ${company}`,
      `Phone: ${phone}`,
      `Email for the agreement and invoice: ${email}`,
      `Requested on: ${requestedAt.toISOString()}`,
      `Proposal prepared: ${p.preparedOn}`,
      `Investment shown: ${terms}.`,
      "This is a request for the agreement and starting invoice, not a signed acceptance or payment.",
      `Page: ${window.location.origin}${window.location.pathname}`,
    ].join("\n");

    submitting.current = true;
    setStatus("submitting");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("submit-inbound-lead", {
        body: {
          name,
          business_name: company,
          phone,
          // Suppress the generic first-inquiry email; agreement_email is in the owner note.
          message: note,
          project_type: "proposal_request",
          conversation_channel: "form",
          qualifier_data: {
            proposal: p.slug,
            proposal_title: p.title,
            intent: `Agreement requested: ${p.title}`,
            services: [p.title],
            agreement_email: email,
            requested_at: requestedAt.toISOString(),
            proposal_prepared_on: p.preparedOn,
            page_url: `${window.location.origin}${window.location.pathname}`,
          },
          company_website: "",
        },
      });
      if (fnError || data?.ok !== true || typeof data?.id !== "string" || !data.id.trim()) {
        throw new Error("The request was not confirmed saved.");
      }
      trackSiteEvent({ event_type: "form_success", label: "proposal_agreement_request" });
      setStatus("success");
    } catch {
      setStatus("error");
      setError(`We could not confirm your request was saved. Your details are still here. Please try again or email ${p.preparedBy.email} to request the agreement.`);
    } finally {
      submitting.current = false;
    }
  };

  if (status === "success") {
    return (
      <div className="proposal-form proposal-form-done" role="status">
        <span className="proposal-done-mark"><Check aria-hidden size={22} /></span>
        <h3>{p.accept.confirmationTitle}</h3>
        <p>{p.accept.confirmationBody}</p>
        <p>Questions in the meantime: <a href={`mailto:${p.preparedBy.email}`}>{p.preparedBy.email}</a></p>
      </div>
    );
  }

  return (
    <form className="proposal-form" onSubmit={onSubmit} noValidate aria-label="Request the agreement" aria-busy={status === "submitting"}>
      <div aria-hidden className="proposal-honeypot">
        <label>Company website<input type="text" name="company_website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label>
        <span>Your full name</span>
        <input name="name" type="text" autoComplete="name" maxLength={200} required />
      </label>
      <label>
        <span>Company</span>
        <input name="company" type="text" autoComplete="organization" defaultValue={p.client.company} maxLength={200} required />
      </label>
      <div className="proposal-form-row">
        <label>
          <span>Best phone number</span>
          <input name="phone" type="tel" autoComplete="tel" maxLength={40} required />
        </label>
        <label>
          <span>Email for the agreement</span>
          <input name="email" type="email" autoComplete="email" maxLength={255} required />
        </label>
      </div>
      {error && <p className="proposal-form-error" role="alert">{error}</p>}
      <button type="submit" className="proposal-btn" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : p.accept.buttonLabel} <ArrowRight aria-hidden size={18} />
      </button>
      <p className="proposal-form-fine">This requests the agreement for review. You are not signing an agreement or making a payment here.</p>
    </form>
  );
}

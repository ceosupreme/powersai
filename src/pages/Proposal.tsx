import { useEffect, useState, type FormEvent } from "react";
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
 * (path = this page), and an acceptance goes through the live
 * submit-inbound-lead intake, which emails the owner and files the lead in the
 * CRM. The lead's email column is left empty on purpose: the intake sends the
 * generic "got your note" acknowledgment to any lead that carries an email,
 * and that message is wrong for someone who just accepted a program. The
 * signer's email travels in the note and in qualifier_data instead, and the
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

  // Keep the page out of search engines; it is a private link, not a public page.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", "noindex, nofollow");
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  useEffect(() => {
    trackSiteEvent({ event_type: "page_view" });
  }, [p.slug]);

  const mark = getStudioMedia("home-opening-mark");
  const embed = toEmbedUrl(p.videoUrl);
  const track = (label: string) => trackSiteEvent({ event_type: "cta_click", label });

  return (
    <div className="stm-studio proposal-page min-h-screen">
      <header className="proposal-topbar">
        <div className="proposal-wrap proposal-topbar-in">
          <Link to="/" className="proposal-brand" aria-label={`${p.preparedBy.company} home`} onClick={() => track("proposal_brand")}>
            {mark?.src && <img src={mark.src} alt="" width={mark.width} height={mark.height} />}
            <span>{p.preparedBy.company}</span>
          </Link>
          <span className="proposal-topbar-for">Proposal for {p.client.company}</span>
        </div>
      </header>

      <main>
        <section className="proposal-hero">
          <div className="proposal-wrap">
            <p className="proposal-eyebrow">
              Prepared for {p.client.contact}, {p.client.company} · {p.preparedOn}
            </p>
            <h1 className="proposal-title">{p.title}</h1>
            <p className="proposal-subtitle">{p.subtitle}</p>

            {embed && (
              <div className="proposal-video">
                <iframe
                  src={embed}
                  title={`${p.preparedBy.name} walks through the ${p.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
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
            <h2 className="proposal-h2">Six parts, one system, run for you every month.</h2>
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
            <figure className="proposal-calendar" aria-label="Example of eight live weeks: the home market runs the whole time and each travel market gets its own window">
              <figcaption>Example: eight live weeks</figcaption>
              <div className="proposal-cal-weeks" aria-hidden>
                {Array.from({ length: 8 }, (_, i) => <span key={i}>W{i + 1}</span>)}
              </div>
              <div className="proposal-cal-row">
                <span className="proposal-cal-name">Boston, home market</span>
                <div className="proposal-cal-track"><i className="proposal-cal-bar is-home" style={{ gridColumn: "1 / 9" }}>Runs continuously</i></div>
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
              <p className="proposal-cal-key">
                <span><i className="proposal-cal-bar is-home" /> Always on</span>
                <span><i className="proposal-cal-bar" /> Opens two to three weeks before the presentations, closes the day after</span>
                <span><b className="proposal-cal-dot" /> Presentation days</span>
              </p>
            </figure>
          </div>
        </section>

        <section className="proposal-pricing">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">{p.pricing.title}</span>
            <h2 className="proposal-h2">One fee for the work. The advertising budget is yours to set.</h2>
            <div className="proposal-price-grid">
              {p.pricing.lines.map((l) => (
                <article key={l.label} className="proposal-price">
                  <span className="proposal-price-label">{l.label}</span>
                  <strong className="proposal-price-amount">{l.amount}</strong>
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

        <section className="proposal-pilot">
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

        <section className="proposal-accept" id="accept">
          <div className="proposal-wrap proposal-accept-grid">
            <div className="proposal-accept-intro">
              <span className="proposal-eyebrow">Accept</span>
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
            <AcceptForm proposal={p} />
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
          </p>
          <p className="proposal-footer-legal">© {new Date().getFullYear()} {p.preparedBy.company}. This proposal was prepared for {p.client.company} and is not an offer to the public.</p>
        </div>
      </footer>
    </div>
  );
}

type Status = "idle" | "submitting" | "success" | "error";

function AcceptForm({ proposal: p }: { proposal: ProposalRecord }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    if (String(form.get("company_website") ?? "")) { setStatus("success"); return; } // honeypot: a bot filled it

    const name = String(form.get("name") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();
    const company = String(form.get("company") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();

    if (name.length < 2) return setError("Please enter your full name.");
    if (company.length < 2) return setError("Please enter the company name.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Please enter the best phone number to reach you.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Please enter the email the agreement and invoice should go to.");
    if (!agreed) return setError("Please tick the box to accept the program as described on this page.");

    const acceptedAt = new Date();
    const terms = p.pricing.lines.map((l) => `${l.label}: ${l.amount}`).join("; ");
    const note = [
      `PROPOSAL ACCEPTED: ${p.internalLabel}`,
      `Accepted by: ${name}${title ? `, ${title}` : ""}`,
      `Company: ${company}`,
      `Phone: ${phone}`,
      `Email for the agreement and invoice: ${email}`,
      `Accepted on: ${acceptedAt.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} Pacific`,
      `Terms shown on the page: ${terms}. ${p.pricing.plainRules.join(" ")}`,
      `Page: ${window.location.href}`,
    ].join("\n");

    setStatus("submitting");
    const { error: fnError } = await supabase.functions.invoke("submit-inbound-lead", {
      body: {
        name,
        business_name: company,
        phone,
        // email intentionally not set here; see the note at the top of this file.
        message: note,
        project_type: "proposal_acceptance",
        conversation_channel: "form",
        qualifier_data: {
          proposal: p.slug,
          proposal_title: p.title,
          intent: `Proposal accepted: ${p.title}`,
          services: [p.title],
          signer_title: title || null,
          agreement_email: email,
          accepted_terms: true,
          accepted_at: acceptedAt.toISOString(),
          page_url: window.location.href,
        },
        company_website: "",
      },
    });

    if (fnError) {
      setStatus("error");
      setError(`Something went wrong on our side. Please email ${p.preparedBy.email} with the word ACCEPT and we will take it from there.`);
      return;
    }
    trackSiteEvent({ event_type: "form_success", label: "proposal_accept" });
    setStatus("success");
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
    <form className="proposal-form" onSubmit={onSubmit} noValidate>
      <div aria-hidden className="proposal-honeypot">
        <label>Company website<input type="text" name="company_website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="proposal-form-row">
        <label>
          <span>Your full name</span>
          <input name="name" type="text" autoComplete="name" required />
        </label>
        <label>
          <span>Title</span>
          <input name="title" type="text" autoComplete="organization-title" placeholder="Optional" />
        </label>
      </div>
      <label>
        <span>Company</span>
        <input name="company" type="text" autoComplete="organization" defaultValue={p.client.company} required />
      </label>
      <div className="proposal-form-row">
        <label>
          <span>Best phone number</span>
          <input name="phone" type="tel" autoComplete="tel" required />
        </label>
        <label>
          <span>Email for the agreement and invoice</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
      </div>
      <label className="proposal-check">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>I accept the {p.title} for {p.client.company} as described on this page, and I understand the agreement and the foundation invoice will follow by email.</span>
      </label>
      {error && <p className="proposal-form-error" role="alert">{error}</p>}
      <button type="submit" className="proposal-btn" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : p.accept.buttonLabel} <ArrowRight aria-hidden size={18} />
      </button>
      <p className="proposal-form-fine">Your typed name and the date are recorded as your acceptance. Nothing is charged on this page.</p>
    </form>
  );
}

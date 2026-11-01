import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, FileDown, Mail, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { getStudioMedia } from "@/config/studioMedia";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { getProposal, isVideoFile, toEmbedUrl, type ProposalRecord } from "@/content/proposals";
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
 * and that message is wrong for someone who just requested an agreement. The
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
  const videoFile = isVideoFile(p.videoUrl) ? p.videoUrl : null;
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
            <p className="proposal-program-name">{p.title}</p>
            <h1 className="proposal-title">{p.headline.map((line, i) => <span key={i} className={i === p.headline.length - 1 ? "proposal-title-accent" : undefined}>{line}</span>)}</h1>
            <p className="proposal-subtitle">{p.subtitle}</p>

            {(embed || videoFile) && (
              <div className="proposal-video">
                {videoFile ? (
                  <video controls playsInline preload="metadata" poster={videoFile.replace(/\.mp4$/, "-poster.jpg")} aria-label={`${p.preparedBy.name} walks through the ${p.title}`}>
                    <source src={videoFile} />
                    <a href={videoFile}>Open the walkthrough video</a>
                  </video>
                ) : (
                  <iframe
                    src={embed ?? undefined}
                    title={`${p.preparedBy.name} walks through the ${p.title}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}
              </div>
            )}

            <ul className="proposal-facts" aria-label="What the program does">
              {p.headlineFacts.map((f) => (
                <li key={f.label}>
                  <span className="proposal-fact-label">{f.label}</span>
                  <strong className="proposal-fact-value">{f.value}</strong>
                </li>
              ))}
            </ul>
            <p className="proposal-facts-note">{p.factsNote}</p>
            <nav className="proposal-jump" aria-label="Jump to a section">
              <a href="#how-it-works">How it works</a>
              <a href="#who-does-what">Who does what</a>
              <a href="#what-it-costs">Your investment</a>
              <a href="#the-pilot">The pilot</a>
              <a href="#accept">Get started</a>
            </nav>
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

        <section className="proposal-journey" id="how-it-works">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">How it works</span>
            <h2 className="proposal-h2">{p.journey.title}</h2>
            <ol className="proposal-journey-steps">
              {p.journey.steps.map((st, i) => (
                <li key={st.label}>
                  <span className="proposal-journey-num">{i + 1}</span>
                  <strong>{st.label}</strong>
                  <p>{st.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="proposal-blocks">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">Your managed program</span>
            <h2 className="proposal-h2">Marketing, automation and follow-up, working together.</h2>
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

        <section className="proposal-growth-loop" id="ongoing-management">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">What you're paying us to do every month</span>
            <h2 className="proposal-h2">{p.growthLoop.title}</h2>
            <p className="proposal-section-intro">{p.growthLoop.intro}</p>
            <div className="proposal-loop-steps">
              {p.growthLoop.steps.map((st, i) => (
                <article key={st.title}>
                  <span className="proposal-loop-num">0{i + 1}</span>
                  <h3>{st.title}</h3>
                  <p>{st.body}</p>
                </article>
              ))}
            </div>
            <ul className="proposal-monthly" aria-label="Included monthly production and reporting">
              {p.monthly.map((m) => (
                <li key={m.label}>
                  <strong>{m.value}</strong>
                  <span>{m.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="proposal-who" id="who-does-what">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">{p.whoDoesWhat.title}</span>
            <h2 className="proposal-h2">We run the marketing. You run the presentations.</h2>
            <div className="proposal-who-grid">
              <div className="proposal-who-col">
                <h3>{p.preparedBy.company}</h3>
                <ul>{p.whoDoesWhat.us.map((item) => <li key={item}><Check aria-hidden size={18} /> {item}</li>)}</ul>
              </div>
              <div className="proposal-who-col is-client">
                <h3>{p.client.company}</h3>
                <ul>{p.whoDoesWhat.them.map((item) => <li key={item}><Check aria-hidden size={18} /> {item}</li>)}</ul>
              </div>
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

        <section className="proposal-pricing" id="what-it-costs">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">{p.pricing.title}</span>
            <h2 className="proposal-h2">Build the foundation. Then put it to work.</h2>
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
            <p className="proposal-budget-summary">{p.pricing.summary}</p>
            <a href="#accept" className="proposal-btn proposal-pricing-cta" onClick={() => track("proposal_pricing_cta")}>Approve the plan <ArrowRight aria-hidden size={18} /></a>
          </div>
        </section>

        <section className="proposal-pilot" id="the-pilot">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">{p.pilot.title}</span>
            <h2 className="proposal-h2">Sixty live days. A real decision at day thirty.</h2>
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

        <section className="proposal-accept" id="accept">
          <div className="proposal-wrap proposal-accept-grid">
            <div className="proposal-accept-intro">
              <span className="proposal-eyebrow">Getting started</span>
              <h2 className="proposal-h2">{p.afterAccept.title}</h2>
              <p>{p.afterAccept.intro}</p>
              <ol className="proposal-after-list">
                {p.afterAccept.items.map((item, i) => (
                  <li key={i}><span>{i + 1}</span>{item}</li>
                ))}
              </ol>
              <div className="proposal-side-actions">
                <a href={`mailto:${p.preparedBy.email}?subject=${encodeURIComponent(`${p.client.company}: proposal review`)}&body=${encodeURIComponent("I would like to review the program together. Please send a few available times.")}`} onClick={() => track("proposal_review")}>
                  <Mail aria-hidden size={18} /> Arrange a quick proposal review
                </a>
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

      <nav className="proposal-mobile-actions" aria-label="Proposal actions">
        <a href="#what-it-costs" onClick={() => track("proposal_mobile_investment")}>Your investment</a>
        <a href="#agreement-form" onClick={() => track("proposal_mobile_accept")}>Request the agreement <ArrowRight aria-hidden size={16} /></a>
      </nav>

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

    const requestedAt = new Date();
    const terms = p.pricing.lines.map((l) => `${l.label}: ${l.amount}`).join("; ");
    const note = [
      `PLAN APPROVED, AGREEMENT REQUESTED: ${p.internalLabel}`,
      `Requested by: ${name}${title ? `, ${title}` : ""}`,
      `Company: ${company}`,
      `Phone: ${phone}`,
      `Email for the agreement and invoice: ${email}`,
      `Requested on: ${requestedAt.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} Pacific`,
      `Terms shown on the page: ${terms}. ${p.pricing.plainRules.join(" ")}`,
      `Page: ${window.location.href}`,
    ].join("\n");

    setStatus("submitting");
    const { data, error: fnError } = await supabase.functions.invoke("submit-inbound-lead", {
      body: {
        name,
        business_name: company,
        phone,
        // email intentionally not set here; see the note at the top of this file.
        message: note,
        project_type: "agreement_request",
        conversation_channel: "form",
        qualifier_data: {
          proposal: p.slug,
          proposal_title: p.title,
          intent: `Plan approved, agreement requested: ${p.title}`,
          services: [p.title],
          signer_title: title || null,
          agreement_email: email,
          agreement_requested: true,
          requested_at: requestedAt.toISOString(),
          page_url: window.location.href,
        },
        company_website: "",
      },
    });

    const saved = !fnError && data && (data as { ok?: boolean; id?: string }).ok === true && typeof (data as { id?: string }).id === "string";
    if (!saved) {
      setStatus("error");
      setError(`Something went wrong on our side. Please email ${p.preparedBy.email} and we will send the agreement the same business day.`);
      return;
    }
    trackSiteEvent({ event_type: "form_success", label: "proposal_agreement_request" });
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
    <form className="proposal-form" id="agreement-form" onSubmit={onSubmit} noValidate>
      <div aria-hidden className="proposal-honeypot">
        <label>Company website<input type="text" name="company_website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <h3 className="proposal-form-title">Request your agreement</h3>
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
      {error && <p className="proposal-form-error" role="alert">{error}</p>}
      <button type="submit" className="proposal-btn" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : p.accept.buttonLabel} <ArrowRight aria-hidden size={18} />
      </button>
      <p className="proposal-form-fine">We send the agreement for your review. Nothing is charged on this page.</p>
    </form>
  );
}

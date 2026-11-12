import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, Mail, Minus, Plus, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { getStudioMedia } from "@/config/studioMedia";
import { BookingCta } from "@/components/marketing/BookingCta";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import type { CompareCell, PackagePlan, PackageProposalRecord, PlanId } from "@/content/packageProposals";
import { hlsFor, isVideoFile, toEmbedUrl } from "@/content/proposals";
import "@/styles/proposal.css";
import "@/styles/package-proposal.css";

/**
 * Unlisted package proposal page: /proposal/:slug for records in
 * src/content/packageProposals.ts.
 *
 * The page runs as a sales presentation: the promise and video, the opportunity,
 * the plan, the calendar, who does what, the results, then the investment, the
 * risk terms, the first 90 days, room to grow, questions and the next step.
 * Deeper detail sits in drop-downs. Printing opens every drop-down so the saved
 * PDF is complete.
 *
 * The agreement request goes through the live submit-inbound-lead intake, like
 * the single-program proposal page. The lead's email column stays empty on
 * purpose (the intake would otherwise send its generic acknowledgment); the
 * signer's email travels in the note and in qualifier_data.
 */
export default function PackageProposalView({ proposal: p }: { proposal: PackageProposalRecord }) {
  useStudioHead({
    title: `${p.programName} for ${p.client.company} | ${p.preparedBy.company}`,
    description: p.subtitle,
    path: `/proposal/${p.slug}`,
  });

  // Private link: keep it out of search engines.
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

  // Printing or saving as PDF opens every drop-down, then restores what was closed.
  useEffect(() => {
    let opened: HTMLDetailsElement[] = [];
    const before = () => {
      opened = Array.from(document.querySelectorAll<HTMLDetailsElement>(".pp-page details:not([open])"));
      opened.forEach((d) => { d.open = true; });
    };
    const after = () => { opened.forEach((d) => { d.open = false; }); opened = []; };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  const recommended = p.plans.find((pl) => pl.recommended)?.id ?? p.plans[0].id;
  // The card and target grids size themselves to the number of packages (two or three).
  const cols = { "--pp-cols": String(p.plans.length) } as CSSProperties;
  const [selected, setSelected] = useState<PlanId>(recommended);
  const [view, setView] = useState<"all" | PlanId>("all");
  const [compareOpen, setCompareOpen] = useState(false);

  // On a phone, open the compare table on one package so it fits; the full comparison is one tap away.
  useEffect(() => {
    if (window.matchMedia("(max-width: 640px)").matches) setView(recommended);
  }, [recommended]);

  const mark = getStudioMedia("home-opening-mark");
  const track = (label: string) => trackSiteEvent({ event_type: "cta_click", label });
  const embed = toEmbedUrl(p.videoUrl);
  const videoFile = isVideoFile(p.videoUrl) ? p.videoUrl : null;
  const samples = p.samples.items.filter((it) => isVideoFile(it.src));

  // Three explain items get slides of their own; the rest stay in the detail drop-downs.
  const explainItem = (id: string) => p.explain.items.find((it) => it.id === id);
  const markets = explainItem("markets");
  const team = explainItem("who-does-what");
  const improve = explainItem("improve");
  const detailItems = p.explain.items.filter((it) => !["markets", "who-does-what", "improve"].includes(it.id));

  const choose = (id: PlanId) => {
    setSelected(id);
    track(`proposal_choose_${id}`);
    document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // From a card's drop-down: open the comparison under the cards on that package alone.
  const compareOne = (id: PlanId) => {
    setView(id);
    setCompareOpen(true);
    track(`proposal_card_compare_${id}`);
    window.setTimeout(() => document.getElementById("compare")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <div className="stm-studio proposal-page pp-page min-h-screen">
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
        {/* 01 Title: the promise and the video. */}
        <section className="pp-hero" id="top">
          <div className="proposal-wrap">
            <p className="proposal-eyebrow">Prepared for {p.client.contacts}, {p.client.company} · {p.preparedOn}</p>
            <p className="pp-program">{p.programName}</p>
            <h1 className="proposal-title">
              {p.headline.map((line, i) => (
                <span key={i} className={i === p.headline.length - 1 ? "proposal-title-accent" : undefined}>{line}</span>
              ))}
            </h1>
            <p className="proposal-subtitle">{p.subtitle}</p>
            <p className="pp-promise">{p.promise}</p>
            <div className="proposal-booking-cta">
              <BookingCta src="package-proposal-intro-call" biz={p.client.company} className="proposal-booking-btn" />
            </div>
            {(embed || videoFile) && (
              <div className="proposal-video pp-video">
                {videoFile ? (
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    poster={videoFile.replace(/\.mp4$/, "-poster.jpg")}
                    aria-label={`${p.programName}: the proposal video`}
                    onPlay={() => track("proposal_video_play")}
                    onEnded={() => track("proposal_video_complete")}
                  >
                    {hlsFor(videoFile) && <source src={hlsFor(videoFile) ?? undefined} type="application/vnd.apple.mpegurl" />}
                    <source src={videoFile} type={/\.mp4$/i.test(videoFile) ? "video/mp4" : undefined} />
                    <a href={videoFile}>Open the video</a>
                  </video>
                ) : (
                  <iframe
                    src={embed ?? undefined}
                    title={`${p.programName}: the packages explained`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}
              </div>
            )}
            <nav className="proposal-jump" aria-label="Jump to a section">
              <a href="#opportunity">The opportunity</a>
              <a href="#how-it-works">The plan</a>
              {samples.length > 0 && <a href="#samples">Sample ads</a>}
              <a href="#results">The results</a>
              <a href="#packages">Packages</a>
              <a href="#terms">The terms</a>
              <a href="#get-started">Get started</a>
            </nav>
          </div>
        </section>

        {/* 02 The opportunity: keep what works, add what's missing. */}
        <section className="pp-opportunity" id="opportunity">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">The opportunity</span>
            <h2 className="proposal-h2 pp-slide-title">{p.story.opportunity.title}</h2>
            <p className="pp-intro">{p.story.opportunity.body}</p>
            <div className="pp-keep-add">
              <div className="pp-keep">
                <h3>{p.story.opportunity.keep.title}</h3>
                <ul>{p.story.opportunity.keep.items.map((it) => <li key={it}><Check aria-hidden size={18} /> <span>{it}</span></li>)}</ul>
              </div>
              <span className="pp-plus" aria-hidden><Plus size={26} /></span>
              <div className="pp-add">
                <h3>{p.story.opportunity.add.title}</h3>
                <ul>{p.story.opportunity.add.items.map((it) => <li key={it}><Check aria-hidden size={18} /> <span>{it}</span></li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        {/* 03 The plan: five steps from first look to a counted arrival, each with a "how we do it" drop-down. */}
        <section className="pp-journey" id="how-it-works">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">The plan</span>
            <h2 className="proposal-h2 pp-slide-title">{p.journey.title}</h2>
            <p className="pp-intro">{p.journey.body}</p>
            <ol className="pp-steps">
              {p.journey.steps.map((st, i) => (
                <li key={st.title}>
                  <span className="pp-step-num">{i + 1}</span>
                  <h3>{st.title}</h3>
                  <p>{st.body}</p>
                  <details className="pp-mini" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && track(`proposal_step_${i + 1}`)}>
                    <summary>How we do it <ChevronDown aria-hidden size={16} /></summary>
                    <p>{st.detail}</p>
                  </details>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 04 Built around the presentation calendar. */}
        {markets && (
          <section className="pp-cal-slide" id="calendar">
            <div className="proposal-wrap pp-cal-grid">
              <div>
                <span className="proposal-eyebrow">Your calendar</span>
                <h2 className="proposal-h2 pp-slide-title">{p.story.calendar.title}</h2>
                {markets.paragraphs.map((para, i) => (
                  <p key={i} className={i === markets.paragraphs.length - 1 ? "pp-cal-note" : "pp-cal-text"}>{para}</p>
                ))}
              </div>
              <MarketCalendar />
            </div>
          </section>
        )}

        {/* 05 Who does what. */}
        {team && (
          <section className="pp-team" id="who-does-what">
            <div className="proposal-wrap">
              <span className="proposal-eyebrow">Who does what</span>
              <h2 className="proposal-h2 pp-slide-title">{p.story.team.title}</h2>
              {team.paragraphs.map((para, i) => <p key={i} className="pp-intro">{para}</p>)}
              {team.columns && (
                <div className="pp-team-cols">
                  {team.columns.map((col, i) => (
                    <div key={col.heading} className={i === 0 ? "is-us" : "is-you"}>
                      <h3>{col.heading}</h3>
                      <ul>{col.items.map((it) => <li key={it}><Check aria-hidden size={18} /> <span>{it}</span></li>)}</ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 06 Sample campaign creative in phone frames; hidden until a sample file exists. */}
        {samples.length > 0 && (
          <section className="pp-samples" id="samples">
            <div className="proposal-wrap">
              <span className="proposal-eyebrow">{p.samples.eyebrow}</span>
              <h2 className="proposal-h2 pp-slide-title">{p.samples.title}</h2>
              <p className="pp-intro">{p.samples.body}</p>
              <div className="pp-sample-grid">
                {samples.map((it) => (
                  <figure className="pp-sample" key={it.src}>
                    <div className="pp-phone">
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        poster={it.src.replace(/\.mp4$/i, "-poster.jpg")}
                        aria-label={`Sample ad: ${it.title}`}
                        onPlay={() => track(`proposal_sample_${it.title.toLowerCase().replace(/[^a-z]+/g, "_")}`)}
                      >
                        {hlsFor(it.src) && <source src={hlsFor(it.src) ?? undefined} type="application/vnd.apple.mpegurl" />}
                        <source src={it.src} type="video/mp4" />
                      </video>
                    </div>
                    <figcaption><strong>{it.title}</strong><span>{it.job}</span></figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 07 The results: the targets, the funnel behind them, one example, and the full math in a drop-down. */}
        <section className="pp-results-slide" id="results">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">The results</span>
            <h2 className="proposal-h2 pp-slide-title">{p.story.results.title}</h2>
            <p className="pp-intro">{p.story.results.body}</p>
            <div className="pp-kpis" style={cols}>
              {p.plans.map((plan) => (
                <div key={plan.id} className={`pp-kpi${plan.recommended ? " is-recommended" : ""}`}>
                  <span className="pp-kpi-name">{plan.shortName}{plan.recommended && <em>Recommended</em>}</span>
                  <strong>{plan.target.range}</strong>
                  <span className="pp-kpi-label">more qualified households a week</span>
                  <span className="pp-lift">{plan.target.lift}</span>
                </div>
              ))}
            </div>
            <div className="pp-funnel">
              <span className="pp-funnel-title">{p.story.results.funnelTitle}</span>
              <ol>
                {p.story.results.funnel.map((f) => <li key={f.label}><strong>{f.value}</strong><span>{f.label}</span></li>)}
              </ol>
            </div>
            {p.math.example && (
              <p className="pp-example-slide"><span>One example</span>{p.math.example}{p.math.exampleNote && <small>{p.math.exampleNote}</small>}</p>
            )}
            <div className="pp-accordion">
              <Drop title={p.math.title} onOpen={() => track("proposal_math")}>
                <p>{p.math.summary}</p>
                <p className="pp-callout">{p.math.funnel}</p>
                <div className="pp-table-scroll">
                  <table className="pp-math-table">
                    <caption className="sr-only">Every four weeks, by package</caption>
                    <thead>
                      <tr>
                        <th scope="col">Every four weeks</th>
                        {p.math.table.columns.map((c) => <th scope="col" key={c}>{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {p.math.table.rows.map((r, i) => (
                        <tr key={`${r.label}-${i}`} className={r.total ? "is-total" : undefined}>
                          <th scope="row">{r.label}</th>
                          {r.values.map((v, j) => <td key={j}>{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>{p.math.complete}</p>
                <p>{p.math.definition}</p>
                <p>{p.math.sales}</p>
              </Drop>
            </div>
          </div>
        </section>

        {/* 08 Your investment: the packages, with the full comparison folded underneath. */}
        <section className="pp-packages" id="packages">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">Your investment</span>
            <h2 className="proposal-h2 pp-slide-title">{p.packagesIntro.title}</h2>
            <p className="pp-intro">{p.packagesIntro.body}</p>
            <div className="pp-cards" style={cols}>
              {p.plans.map((plan, i) => (
                <PlanCard key={plan.id} plan={plan} index={i} onChoose={choose} onCompare={compareOne} />
              ))}
            </div>
            <p className="pp-cards-note">
              {p.packagesIntro.footnote} <a href="#terms">What's included with every package</a>
            </p>
            <details
              className="pp-compare-drop"
              id="compare"
              open={compareOpen}
              onToggle={(e) => {
                const isOpen = (e.currentTarget as HTMLDetailsElement).open;
                setCompareOpen(isOpen);
                if (isOpen) track("proposal_compare_open");
              }}
            >
              <summary><span>{p.compare.title}</span><ChevronDown aria-hidden size={20} /></summary>
              <div className="pp-compare-body">
                <p className="pp-intro">{p.compare.body}</p>
                <div className="pp-filter" role="group" aria-label="Show packages">
                  <button type="button" aria-pressed={view === "all"} onClick={() => { setView("all"); track("proposal_compare_all"); }}>{p.plans.length === 2 ? "Both" : "All three"}</button>
                  {p.plans.map((plan) => (
                    <button key={plan.id} type="button" aria-pressed={view === plan.id} onClick={() => { setView(plan.id); track(`proposal_compare_${plan.id}`); }}>
                      {plan.shortName}
                    </button>
                  ))}
                </div>
                <CompareTable proposal={p} view={view} />
                <p className="pp-footnote">{p.compare.footnote}</p>
              </div>
            </details>
          </div>
        </section>

        {/* 09 The risk is on us: the terms as big tiles, everything else in the fine print. */}
        <section className="pp-risk" id="terms">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">The risk is on us</span>
            <h2 className="proposal-h2 pp-slide-title">{p.story.risk.title}</h2>
            <p className="pp-intro">{p.story.risk.body}</p>
            <ul className="pp-risk-tiles">
              {p.story.risk.tiles.map((t) => <li key={t.big}><strong>{t.big}</strong><span>{t.label}</span></li>)}
            </ul>
            <div className="pp-accordion">
              <Drop title="Read the full terms and fine print" onOpen={() => track("proposal_fineprint")}>
                <ul className="pp-points">
                  {p.terms.points.map((pt) => <li key={pt}><Check aria-hidden size={18} /> <span>{pt}</span></li>)}
                </ul>
                <dl className="pp-fine">
                  {p.terms.fineprint.map((f) => (
                    <div key={f.title}>
                      <dt>{f.title}</dt>
                      <dd>{f.body}</dd>
                    </div>
                  ))}
                </dl>
              </Drop>
            </div>
          </div>
        </section>

        {/* 10 The first 90 days, then how it improves every month. */}
        <section className="pp-timeline" id="timeline">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">The first 90 days</span>
            <h2 className="proposal-h2 pp-slide-title">{p.timeline.title}</h2>
            <ol className="pp-time">
              {p.timeline.steps.map((st, i) => (
                <li key={st.when}>
                  <span className="pp-time-dot">{i + 1}</span>
                  <span className="pp-time-when">{st.when}</span>
                  <h3>{st.title}</h3>
                  <p>{st.body}</p>
                </li>
              ))}
            </ol>
            {improve && (
              <div className="pp-improve">
                <h3>{p.story.improve.title}</h3>
                {improve.paragraphs.map((para, i) => <p key={i}>{para}</p>)}
                {improve.steps && (
                  <ol className="pp-loop">
                    {improve.steps.map((st, i) => (
                      <li key={st.title}><span>0{i + 1}</span><strong>{st.title}</strong><p>{st.body}</p></li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 11 Room to grow across CPN. */}
        <section className="pp-national" id="national">
          <div className="proposal-wrap pp-national-in">
            <div>
              <span className="proposal-eyebrow">Room to grow</span>
              <h2 className="proposal-h2">{p.national.title}</h2>
            </div>
            <div>
              <p>{p.national.body}</p>
              <p className="pp-national-note">{p.national.note}</p>
            </div>
          </div>
        </section>

        {/* 12 Questions, then every detail for anyone who wants it. */}
        <section className="pp-faq" id="faq">
          <div className="proposal-wrap">
            <span className="proposal-eyebrow">Questions</span>
            <h2 className="proposal-h2 pp-slide-title">{p.faq.title}</h2>
            <div className="pp-accordion">
              {p.faq.items.map((item, i) => (
                <Drop key={item.q} title={item.q} onOpen={() => track(`proposal_faq_${i + 1}`)}>
                  <p>{item.a}</p>
                </Drop>
              ))}
            </div>
            <h3 className="pp-sub-h" id="how-we-do-it">{p.explain.title}</h3>
            <p className="pp-intro">{p.explain.body}</p>
            <div className="pp-accordion">
              {detailItems.map((item) => (
                <Drop key={item.id} title={item.title} onOpen={() => track(`proposal_explain_${item.id}`)}>
                  {item.paragraphs.map((para, i) => <p key={i}>{para}</p>)}
                  {item.steps && (
                    <ol className="pp-loop">
                      {item.steps.map((st, i) => (
                        <li key={st.title}><span>0{i + 1}</span><strong>{st.title}</strong><p>{st.body}</p></li>
                      ))}
                    </ol>
                  )}
                  {item.columns && (
                    <div className="pp-columns">
                      {item.columns.map((col) => (
                        <div key={col.heading}>
                          <h4>{col.heading}</h4>
                          <ul>{col.items.map((it) => <li key={it}><Check aria-hidden size={17} /> {it}</li>)}</ul>
                        </div>
                      ))}
                    </div>
                  )}
                  {item.calendar && <MarketCalendar />}
                </Drop>
              ))}
            </div>
          </div>
        </section>

        {/* 13 Next step: package picker and agreement request. */}
        <section className="proposal-accept pp-start" id="get-started">
          <div className="proposal-wrap proposal-accept-grid">
            <div className="proposal-accept-intro">
              <span className="proposal-eyebrow">Next step</span>
              <h2 className="proposal-h2">{p.start.title}</h2>
              <p>{p.start.intro}</p>
              <ol className="proposal-after-list">
                {p.start.items.map((item, i) => <li key={i}><span>{i + 1}</span>{item}</li>)}
              </ol>
              <div className="proposal-side-actions">
                <BookingCta src="package-proposal-review" biz={p.client.company} className="proposal-booking-btn" />
                <a href={`mailto:${p.preparedBy.email}?subject=${encodeURIComponent(`${p.client.company}: review the plan`)}&body=${encodeURIComponent("I would like to review the packages together. Please send a few available times.")}`} onClick={() => track("proposal_review")}>
                  <Mail aria-hidden size={18} /> Review the plan with us
                </a>
                <a href={`mailto:${p.preparedBy.email}?subject=${encodeURIComponent(`${p.programName}: a question`)}`} onClick={() => track("proposal_question")}>
                  <Mail aria-hidden size={18} /> Ask {p.preparedBy.name.split(" ")[0]} a question
                </a>
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
            <AgreementForm proposal={p} selected={selected} onSelect={setSelected} />
          </div>
        </section>
      </main>

      <nav className="proposal-mobile-actions" aria-label="Proposal actions">
        <a href="#packages" onClick={() => track("proposal_mobile_packages")}>Packages</a>
        <a href="#get-started" onClick={() => track("proposal_mobile_start")}>Get started <ArrowRight aria-hidden size={16} /></a>
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

function PlanCard({ plan, index, onChoose, onCompare }: { plan: PackagePlan; index: number; onChoose: (id: PlanId) => void; onCompare: (id: PlanId) => void }) {
  return (
    <article className={`pp-card${plan.recommended ? " is-recommended" : ""}`} aria-labelledby={`plan-${plan.id}`}>
      {plan.recommended && <span className="pp-badge">Recommended</span>}
      <span className="pp-card-num">Package {index + 1}</span>
      <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
      <p className="pp-tagline">{plan.tagline}</p>

      <div className="pp-target">
        <span className="pp-target-label">Target by month 3</span>
        <strong className="pp-target-range">{plan.target.range}</strong>
        <span className="pp-target-text">{plan.target.label}</span>
        <span className="pp-lift">{plan.target.lift}</span>
        {plan.target.note && <span className="pp-target-note">{plan.target.note}</span>}
        <div className="pp-results">
          <span className="pp-signed">{plan.signedClients}</span>
          <span className="pp-handled">{plan.handled}</span>
        </div>
      </div>

      <div className="pp-price">
        <strong>{plan.monthly}<span> a month</span></strong>
        <span>{plan.foundation} setup · start with $1,500</span>
      </div>

      <ul className="pp-highlights">
        {plan.highlights.map((h) => <li key={h}><Check aria-hidden size={17} /> <span>{h}</span></li>)}
      </ul>

      <details className="pp-mini pp-included">
        <summary>What this package does for you <ChevronDown aria-hidden size={16} /></summary>
        <div className="pp-details">
          {plan.details.map((d) => (
            <p key={d.lead}><strong>{d.lead}</strong> {d.text}</p>
          ))}
          {plan.detailsNote && <p className="pp-details-note">{plan.detailsNote}</p>}
          <button type="button" className="pp-see-all" onClick={() => onCompare(plan.id)}>
            See every item in this package <ArrowRight aria-hidden size={16} />
          </button>
        </div>
      </details>

      <button type="button" className={`proposal-btn pp-choose${plan.recommended ? "" : " is-quiet"}`} onClick={() => onChoose(plan.id)}>
        Choose this package <ArrowRight aria-hidden size={18} />
      </button>
    </article>
  );
}

function CompareTable({ proposal: p, view }: { proposal: PackageProposalRecord; view: "all" | PlanId }) {
  const cols = view === "all" ? p.plans.map((_, i) => i) : [p.plans.findIndex((pl) => pl.id === view)];
  return (
    <div className={`pp-table-scroll${view === "all" ? " is-all" : ""}`}>
      <table className="pp-compare">
        <caption className="sr-only">What each package includes</caption>
        <thead>
          <tr>
            <th scope="col">What you get</th>
            {cols.map((i) => (
              <th scope="col" key={p.plans[i].id} className={p.plans[i].recommended ? "is-recommended" : undefined}>
                {p.plans[i].shortName}
                <span>{p.plans[i].monthly} a month</span>
              </th>
            ))}
          </tr>
        </thead>
        {p.compare.groups.map((g) => (
          <tbody key={g.title}>
            <tr className="pp-compare-group">
              <th scope="colgroup" colSpan={cols.length + 1}>{g.title}</th>
            </tr>
            {g.rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                {cols.map((i) => <td key={i} className={p.plans[i].recommended ? "is-recommended" : undefined}><Cell value={r.values[i]} /></td>)}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function Cell({ value }: { value: CompareCell }) {
  if (value === "yes") return <span className="pp-yes"><Check aria-hidden size={18} /><span className="sr-only">Included</span></span>;
  if (value === "no") return <span className="pp-no"><Minus aria-hidden size={18} /><span className="sr-only">Not included</span></span>;
  return <>{value}</>;
}

function Drop({ title, children, onOpen }: { title: string; children: ReactNode; onOpen?: () => void }) {
  return (
    <details className="pp-drop" onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) onOpen?.(); }}>
      <summary>
        <span>{title}</span>
        <ChevronDown aria-hidden size={20} />
      </summary>
      <div className="pp-drop-body">{children}</div>
    </details>
  );
}

function MarketCalendar() {
  return (
    <figure className="proposal-calendar pp-calendar" aria-label="Example of eight live weeks: the home market runs the whole time and each travel market gets its own window">
      <figcaption>Example: eight live weeks</figcaption>
      <div className="proposal-cal-weeks" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => <span key={i}>W{i + 1}</span>)}
      </div>
      <div className="proposal-cal-row">
        <span className="proposal-cal-name">Boston, home market</span>
        <div className="proposal-cal-track"><i className="proposal-cal-bar is-home" style={{ gridColumn: "1 / 9" }}>Runs continuously</i></div>
      </div>
      {[["Travel market A", "2 / 5", "4"], ["Travel market B", "4 / 7", "6"], ["Travel market C", "6 / 9", "8"]].map(([name, span, dot]) => (
        <div className="proposal-cal-row" key={name}>
          <span className="proposal-cal-name">{name}</span>
          <div className="proposal-cal-track"><i className="proposal-cal-bar" style={{ gridColumn: span }}>Window</i><b className="proposal-cal-dot" style={{ gridColumn: dot }} aria-label="Presentations" /></div>
        </div>
      ))}
      <p className="proposal-cal-key">
        <span><i className="proposal-cal-bar is-home" /> Always on</span>
        <span><i className="proposal-cal-bar" /> Opens two to three weeks before the presentations, closes the day after</span>
        <span><b className="proposal-cal-dot" /> Presentation days</span>
      </p>
    </figure>
  );
}

type Status = "idle" | "submitting" | "success" | "error";

function AgreementForm({ proposal: p, selected, onSelect }: { proposal: PackageProposalRecord; selected: PlanId; onSelect: (id: PlanId) => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [chosenName, setChosenName] = useState("");
  const plan = p.plans.find((pl) => pl.id === selected) ?? p.plans[0];

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
    const terms = `${plan.foundation} setup ($1,500 to begin, ${plan.balance} when the launch deliverables are ready), then ${plan.monthly} a month from go-live`;
    const note = [
      `PACKAGE CHOSEN, AGREEMENT REQUESTED: ${plan.name}`,
      `Proposal: ${p.internalLabel}`,
      `Requested by: ${name}${title ? `, ${title}` : ""}`,
      `Company: ${company}`,
      `Phone: ${phone}`,
      `Email for the agreement and invoice: ${email}`,
      `Requested on: ${requestedAt.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} Pacific`,
      `Package terms shown on the page: ${terms}. Target by month 3: ${plan.target.range} ${plan.target.label}.`,
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
          proposal_title: p.programName,
          package_id: plan.id,
          package_name: plan.name,
          package_terms: terms,
          intent: `Package chosen, agreement requested: ${plan.name}`,
          services: [plan.name],
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
      setError(`Something went wrong on our side. Please email ${p.preparedBy.email} with the package you chose and we will send the agreement the same business day.`);
      return;
    }
    trackSiteEvent({ event_type: "form_success", label: `proposal_agreement_request_${plan.id}` });
    setChosenName(plan.name);
    setStatus("success");
  };

  if (status === "success") {
    return (
      <div className="proposal-form proposal-form-done" role="status">
        <span className="proposal-done-mark"><Check aria-hidden size={22} /></span>
        <h3>{p.accept.confirmationTitle}</h3>
        <p>{p.accept.confirmationBody.replace("{package}", chosenName || plan.name)}</p>
        <p>Questions in the meantime: <a href={`mailto:${p.preparedBy.email}`}>{p.preparedBy.email}</a></p>
      </div>
    );
  }

  return (
    <form className="proposal-form" id="agreement-form" onSubmit={onSubmit} onInput={() => { if (error) setError(null); }} noValidate>
      <div aria-hidden className="proposal-honeypot">
        <label>Company website<input type="text" name="company_website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <h3 className="proposal-form-title">Request your agreement</h3>
      <fieldset className="pp-pick">
        <legend>Your package</legend>
        {p.plans.map((pl) => (
          <label key={pl.id} className={`pp-pick-option${selected === pl.id ? " is-selected" : ""}`}>
            <input type="radio" name="package" value={pl.id} checked={selected === pl.id} onChange={() => onSelect(pl.id)} />
            <span className="pp-pick-text">
              <strong>{pl.name}{pl.recommended ? <em>Recommended</em> : null}</strong>
              <span className="pp-pick-target">{pl.target.range} more qualified households a week by month 3</span>
              <span>{pl.monthly} a month · {pl.foundation} setup · start with $1,500</span>
            </span>
          </label>
        ))}
      </fieldset>
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

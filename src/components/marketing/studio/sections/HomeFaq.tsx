import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import "./homeFaq.css";

/** The site doesn't reset scroll between pages; a link to another page opens it at its top. */
const openAtTop = () => requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }));

/**
 * Homepage questions, after the blog: what owners ask right before they reach
 * out. Every answer repeats what the pricing page, the checkup and the
 * contact section already say, so the site tells one story. The last
 * question carries what used to be the How we work section.
 */
const QUESTIONS: Array<{ q: string; a: ReactNode }> = [
  {
    q: "How much does it cost?",
    a: <p>It depends on what your business needs. Tell us where you are, and we'll put together a package with a clear price before anything starts. For reference, our websites start at $2,500, or $0 down at $297 a month. <a href="#contact" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "home_faq_price_contact" })}>Tell us what you need</a>.</p>,
  },
  {
    q: "Do I have to sign a long contract?",
    a: <p>No. You can pay for the website up front. The $0-down plan spreads the $2,500 over 12 months at $297 a month, and if you stop early, the rest of the build price is due before we hand everything over. Care, our ongoing help plan, is month to month.</p>,
  },
  {
    q: "Do I own my website?",
    a: <p>It depends on the plan, and you'll know before anything starts. A website you buy outright, including on the $0-down payment plan, is yours once it's paid in full. Sites on a monthly plan run on our platform while you're subscribed.</p>,
  },
  {
    q: "How long does it take?",
    a: <p>It depends on the size of the site and how quickly the words and photos come together. Before any work starts, you get a written proposal with the price, what's included and the milestones, so you know the timeline up front.</p>,
  },
  {
    q: "Can you fix the website I already have?",
    a: <p>Yes. We start by looking at what you have and agreeing on what to keep, improve or rebuild. If you only need ongoing help and updates, our Care plan starts at $149 a month.</p>,
  },
  {
    q: "Do you only work with businesses in San Diego?",
    a: <p>No. We're based in San Diego County and work with businesses anywhere, so you don't need to be local.</p>,
  },
  {
    q: "Is the free business checkup really free?",
    a: <p>Yes. Type in your business name and city, and in about two minutes the report shows up on screen: how your Google listing, your reviews and your website check out, and the top things to fix. No phone call needed. You only add your email if you want the full list. <Link to="/free-audit?src=home-faq" onClick={() => { trackSiteEvent({ event_type: "cta_click", label: "home_faq_checkup" }); openAtTop(); }}>Run the free checkup</Link>.</p>,
  },
  {
    q: "What happens after I reach out?",
    a: <p>Sean reads your message and replies personally within one business day. If it's a fit, you get a written proposal with the price, what's included and the timeline before anything starts.</p>,
  },
  {
    q: "How does a project work?",
    a: (
      <>
        <p>Three steps, so you always know where things stand:</p>
        <ol>
          <li><strong>Clarify.</strong> We agree on the goal, the audience and the scope before work starts, so you know what's being built and why.</li>
          <li><strong>Build.</strong> The words, design and working parts come together around a clear path for your customers, and you review the direction as it takes shape.</li>
          <li><strong>Launch and support.</strong> We check the agreed work, launch it and hand it over. Ongoing care is there when your business needs it.</li>
        </ol>
      </>
    ),
  },
];

export function HomeFaq() {
  return (
    <section id="faq" className="stm-faq" aria-labelledby="home-faq-title">
      <div className="stm-faq-wrap">
        <div className="stm-faq-head">
          <div className="stm-faq-eyebrow">Questions</div>
          <h2 id="home-faq-title">Questions owners ask <em>before they call.</em></h2>
          <p>Straight answers about price, timing and how working with us goes.</p>
          <a href="#contact" className="stm-faq-ask" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "home_faq_ask" })}>
            Ask us something else <ArrowRight aria-hidden />
          </a>
        </div>
        <div className="stm-faq-list">
          {QUESTIONS.map(({ q, a }, i) => (
            // One open at a time where the browser supports grouped details (name).
            <details key={q} className="stm-faq-item" name="stm-home-faq" open={i === 0}>
              <summary>
                <span>{q}</span>
                <i aria-hidden="true" />
              </summary>
              <div className="stm-faq-a">{a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

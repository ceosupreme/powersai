import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { BookingCta } from "@/components/marketing/BookingCta";
import { CheckoutButton } from "@/components/marketing/offer/CheckoutButton";
import { Container, Eyebrow } from "@/components/marketing/studio/primitives";
import { useCheckoutEnabled } from "@/hooks/useCheckoutEnabled";
import { trackSiteEvent } from "@/lib/studioAnalytics";

type OfferKey = "launch-site" | "business-site" | "care" | "growth" | "custom-systems";

const offerHref = (offer: OfferKey, source: "home" | "services-websites") => {
  const intent = offer === "growth" ? "marketing" : offer === "custom-systems" ? "ai-systems" : "websites";
  return `/?intent=${intent}&offer=${offer}&src=${source}#contact`;
};

function OfferLink({ offer, source, children, primary = false }: { offer: OfferKey; source: "home" | "services-websites"; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      to={offerHref(offer, source)}
      onClick={() => trackSiteEvent({ event_type: "cta_click", label: `offer_${offer.replace(/-/g, "_")}` })}
      className={`studio-btn ${primary ? "studio-btn-primary" : "studio-btn-outline"}`}
    >
      {children} <ArrowRight aria-hidden size={15} />
    </Link>
  );
}

const LAUNCH_SCOPE = [
  "Strategy, audience, and offer clarification",
  "Website and landing-page copy support",
  "Responsive UX, design, and build",
  "A clear contact and conversion path",
  "Launch QA and handoff",
];

export function OfferSection({ source = "home" }: { source?: "home" | "services-websites" }) {
  const isServicePage = source === "services-websites";
  const { enabled: checkout } = useCheckoutEnabled();
  return (
    <section id="website-options" className="website-options studio-section bg-[hsl(var(--surface))]">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <Eyebrow>{isServicePage ? "Website options" : "Websites that run your business"}</Eyebrow>
            <h2 className="studio-display mt-4 max-w-5xl text-balance text-[2.65rem] md:text-[4.7rem]">
              {isServicePage ? "Choose the starting point that fits the business." : "Start with the website. Build the right support behind it."}
            </h2>
          </div>
          <p className="max-w-xl text-[1.05rem] leading-relaxed text-muted-foreground lg:col-span-4">
            Exact integrations, page count, third-party costs, and responsibilities are confirmed before work begins. You see the scope before you commit.
          </p>
        </div>

        <div className="website-options-grid mt-14">
          <article className="website-option website-option-launch">
            <div>
              <span className="studio-label">A strong, credible starting point</span>
              <h3 className="studio-display mt-3 text-[2.2rem] md:text-[3rem]">Launch Site</h3>
              <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-muted-foreground">For businesses that need a clear website, useful messaging, and a direct path from interest to inquiry.</p>
            </div>
            <div className="website-option-price">
              <strong>$2,500</strong>
              <span>$1,250 to start + $1,250 at launch</span>
              <p>Or $0 down at $297/month with a 12-month minimum, then $149/month.</p>
            </div>
            <ul className="website-option-list">
              {LAUNCH_SCOPE.map((item) => <li key={item}><Check aria-hidden size={16} />{item}</li>)}
            </ul>
            <div className="flex flex-col items-start gap-3">
              {checkout && (
                <div className="flex flex-wrap gap-3">
                  <CheckoutButton product="launch_site_deposit" label="Start with the deposit" />
                  <CheckoutButton product="launch_site_monthly" label="Start monthly" />
                </div>
              )}
              <OfferLink offer="launch-site" source={source} primary={!checkout}>{checkout ? "Ask a question first" : "Start a Launch Site"}</OfferLink>
            </div>
          </article>

          <article className="website-option website-option-business">
            <div>
              <span className="studio-label">Connected business website</span>
              <h3 className="studio-display mt-3 text-[2rem] md:text-[2.55rem]">Business Site</h3>
              <p className="mt-5 text-[1.02rem] leading-relaxed text-muted-foreground">For businesses that need the website connected to customer capture, email follow-up, reporting, workflows, or selected business tools. The exact stack and integrations are confirmed during discovery; existing tools can often stay.</p>
            </div>
            <div className="website-option-price">
              <strong>From $3,500 setup + $297/month</strong>
              <span>Quoted after the free check or scoped review</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <OfferLink offer="business-site" source={source} primary>Get a scoped Business Site quote</OfferLink>
              <Link to="/free-audit?src=services-websites" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "run_free_check" })} className="studio-btn studio-btn-outline">Run the free business checkup</Link>
            </div>
          </article>

          <article className="website-option website-option-care">
            <div>
              <span className="studio-label">Ongoing support</span>
              <h3 className="studio-display mt-3 text-[2rem]">Care</h3>
              <p className="mt-4 text-muted-foreground">Ongoing website care and support, with exact responsibilities confirmed in the agreement.</p>
            </div>
            <div className="website-option-price">
              <strong>$149/month founding rate</strong>
              <span>For the first 10 Care seats; $199/month after.</span>
            </div>
            <div className="flex flex-col items-start gap-3">
              {checkout && <CheckoutButton product="care_seat" label="Get the care seat" />}
              <OfferLink offer="care" source={source}>Ask about Care</OfferLink>
            </div>
          </article>
        </div>

        <div className="website-expansion mt-10">
          <div>
            <span className="studio-label">Expand when the job calls for it</span>
            <p className="mt-3 max-w-2xl text-muted-foreground">These can support a website or stand alone. They are not mandatory website costs.</p>
          </div>
          <article>
            <h3 className="studio-display text-[1.55rem]">Growth</h3>
            <p className="mt-2 font-semibold">From $497/month</p>
            <p className="mt-2 text-sm text-muted-foreground">Quoted based on scope.</p>
            <OfferLink offer="growth" source={source}>Discuss Growth</OfferLink>
          </article>
          <article>
            <h3 className="studio-display text-[1.55rem]">Custom Systems</h3>
            <p className="mt-2 font-semibold">Starts at $10,000</p>
            <p className="mt-2 text-sm text-muted-foreground">Custom scope.</p>
            <OfferLink offer="custom-systems" source={source}>Discuss a Custom System</OfferLink>
          </article>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-border pt-8">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">Not sure where to start? Share what is happening now and Sean will recommend the smallest sensible scope.</p>
          <BookingCta src={source} />
          <Link to="/industries" className="studio-btn studio-btn-outline">See what this looks like for your industry</Link>
        </div>
      </Container>
    </section>
  );
}
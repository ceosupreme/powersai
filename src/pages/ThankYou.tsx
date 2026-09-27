import { Link } from "react-router-dom";
import { BookingCta } from "@/components/marketing/BookingCta";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { Container, Eyebrow } from "@/components/marketing/studio/primitives";
import { CONTACT_EMAIL } from "@/lib/siteContact";
import { useCheckoutEnabled } from "@/hooks/useCheckoutEnabled";
import CheckoutThankYou from "./CheckoutThankYou";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { ROUTE_META } from "@/config/routeMeta";

export default function ThankYou() {
  useStudioHead({ ...ROUTE_META["/thank-you"], path: "/thank-you" });
  const { enabled, loading } = useCheckoutEnabled();
  if (loading) return <div className="stm-studio checkout-page min-h-screen"><StudioHeader /><main className="checkout-main"><Container><p role="status">Loading…</p></Container></main><StudioFooter /></div>;
  if (enabled) return <CheckoutThankYou />;
  return (
    <div className="stm-studio checkout-page min-h-screen">
      <StudioHeader />
      <main className="checkout-main">
        <Container>
          <section className="checkout-content max-w-3xl">
            <Eyebrow>Website options</Eyebrow>
            <h1 className="home-section-title">Online payment is <em>not available yet.</em></h1>
            <p className="checkout-copy">
              Start with a scoped inquiry and Sean will confirm the work, responsibilities, and next step in writing. Questions any time: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
            <div className="checkout-actions flex flex-wrap gap-3">
              <Link className="home-btn-amber" to="/?intent=websites&offer=launch-site&src=website-options#contact">Start a Launch Site →</Link>
              <BookingCta src="website-options" />
            </div>
          </section>
        </Container>
      </main>
      <StudioFooter />
    </div>
  );
}

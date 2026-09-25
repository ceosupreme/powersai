import { Link } from "react-router-dom";
import { BookingCta } from "@/components/marketing/BookingCta";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { Container, Eyebrow } from "@/components/marketing/studio/primitives";
import { CONTACT_EMAIL } from "@/lib/siteContact";
import { useCheckoutEnabled } from "@/hooks/useCheckoutEnabled";
import CheckoutThankYou from "./CheckoutThankYou";

export default function ThankYou() {
  const { enabled, loading } = useCheckoutEnabled();
  if (loading) return <div className="stm-studio min-h-screen"><StudioHeader /><main className="pt-40"><Container><p role="status">Loading…</p></Container></main></div>;
  if (enabled) return <CheckoutThankYou />;
  return (
    <div className="stm-studio min-h-screen">
      <StudioHeader />
      <main className="pt-40">
        <Container>
          <section className="min-h-[55vh] max-w-3xl">
            <Eyebrow>Website options</Eyebrow>
            <h1 className="studio-display mt-4 text-5xl md:text-7xl">Online payment is not available yet.</h1>
            <p className="mt-7 text-lg leading-relaxed text-muted-foreground">
              Start with a scoped inquiry and Sean will confirm the work, responsibilities, and next step in writing. Questions any time: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="studio-btn studio-btn-primary" to="/?intent=websites&offer=launch-site&src=website-options#contact">Start a Launch Site</Link>
              <BookingCta src="website-options" />
            </div>
          </section>
        </Container>
      </main>
      <StudioFooter />
    </div>
  );
}

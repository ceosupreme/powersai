import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { z } from "zod";
import { ArrowRight, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CONTACT_EMAIL } from "@/lib/siteContact";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { packageCart, usePackageCart } from "@/lib/packageCart";
import type { ServicePageRow, StarterPackageRow } from "@/hooks/useSitePages";
import type { ServiceId } from "@/components/marketing/studio/serviceIntent";
import { LegalConsent } from "@/components/marketing/studio/LegalConsent";
import "./packages.css";

/** Server hard limit on `message` (submit-inbound-lead). */
const SERVER_MESSAGE_LIMIT = 4000;

/** Each service family's contact-form choice, so the lead shows the same "Interested in" labels as any other inquiry. */
const FAMILY_INTENT: Record<string, ServiceId> = {
  "/services/websites": "websites-apps",
  "/services/brand": "brand-creative",
  "/services/marketing": "marketing-growth",
  "/services/ai-systems": "ai-systems",
  "/publishing": "publishing-launch",
  "/startups": "publishing-launch",
};

const schema = z.object({
  name: z.string().trim().min(1, "Add your name so we know who to reply to.").max(200, "Please keep your name under 200 characters."),
  email: z.string().trim().email("Add an email address so your price has somewhere to go.").max(255),
  business: z.string().trim().max(200, "Please keep the business name under 200 characters."),
  note: z.string().trim().max(2500, "Please keep the note under 2,500 characters."),
});

type Sent = { first: string; labels: string[] };

/**
 * The send step: the visitor checks their package, adds a name and email, and
 * sends it. It goes through the same lead intake as the contact form
 * (submit-inbound-lead), so they get the usual confirmation email, the owner gets
 * the usual new-lead alert, and the lead lands in HQ with the list at the top
 * of the message and saved with the lead (qualifier_data).
 */
export function PackageSend({ open, onOpenChange, services, starters, src }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: ServicePageRow[];
  starters: StarterPackageRow[];
  src: string | null;
}) {
  const cart = usePackageCart();
  const starter = starters.find((s) => s.slug === cart.starter) ?? null;
  const picked = cart.services.map((slug) => services.find((s) => s.slug === slug)).filter((s): s is ServicePageRow => !!s);
  const empty = !starter && picked.length === 0;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);

  const change = (next: boolean) => {
    onOpenChange(next);
    if (!next && sent) {
      // A sent package starts fresh next time.
      setSent(null);
      setNote("");
      setError(null);
    }
  };

  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    setError(null);
    if (String(new FormData(e.currentTarget).get("company_website") ?? "")) return; // honeypot: drop silently
    if (empty) { setError("Pick a starter package or switch on at least one service first."); return; }
    const parsed = schema.safeParse({ name, email, business, note });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Please check your entries."); return; }

    const lines = ["Package request"];
    if (starter) lines.push(`Starting point: ${starter.name}`);
    if (picked.length) lines.push(`Services: ${picked.map((s) => s.name).join("; ")}`);
    const message = `${lines.join("\n")}${parsed.data.note ? `\n\n${parsed.data.note}` : ""}`;
    if (message.length > SERVER_MESSAGE_LIMIT) { setError("Your note is a little too long to send. Please shorten it."); return; }
    if (typeof navigator !== "undefined" && navigator.onLine === false) { setError("You appear to be offline. Your package is still here. Reconnect and send again."); return; }

    setSending(true);
    let data: unknown = null;
    let fnError: unknown = null;
    try {
      const res = await supabase.functions.invoke("submit-inbound-lead", {
        body: {
          name: parsed.data.name,
          email: parsed.data.email,
          business_name: parsed.data.business || null,
          message,
          conversation_channel: "form",
          route_to: "self",
          qualifier_data: {
            site_section: "packages",
            starter_package: starter?.slug ?? null,
            starter_package_name: starter?.name ?? null,
            package_services: picked.map((s) => s.slug),
            package_service_names: picked.map((s) => s.name),
            services: Array.from(new Set(picked.map((s) => FAMILY_INTENT[s.family_path]).filter(Boolean))),
            source_path: window.location.pathname,
            src,
          },
          company_website: "",
        },
      });
      data = res.data;
      fnError = res.error;
    } catch (thrown) {
      fnError = thrown;
    }
    setSending(false);

    const payload = data as { ok?: unknown; id?: unknown } | null;
    const saved = !fnError && payload?.ok === true && typeof payload?.id === "string" && payload.id.length > 0;
    if (!saved) {
      const msg = String((fnError as { message?: string } | null)?.message ?? "");
      setError(/429|too many/i.test(msg)
        ? "That's a few sends in a row. Please wait a minute and send again."
        : `Your package wasn't sent, so nothing has reached us yet. Please try again, or email ${CONTACT_EMAIL}.`);
      return;
    }

    trackSiteEvent({ event_type: "form_success", label: "package_send", src: src ?? undefined });
    setSent({ first: parsed.data.name.split(/\s+/)[0] ?? "", labels: [...(starter ? [starter.name] : []), ...picked.map((s) => s.name)] });
    packageCart.clear();
  };

  return (
    <Dialog.Root open={open} onOpenChange={change}>
      <Dialog.Portal>
        <Dialog.Overlay className="pk-send-overlay" />
        <Dialog.Content className="pk-send" aria-describedby={undefined}>
          <div className="pk-send-handle" aria-hidden="true" />
          {sent ? (
            <div className="pk-sent" role="status">
              <span className="pk-sent-ok"><Check aria-hidden /></span>
              <Dialog.Title asChild><h2>Got it{sent.first ? `, ${sent.first}` : ""}.</h2></Dialog.Title>
              <p>Your package is in. We’ll look over your picks, put together your package and a clear price, and reply within one business day. We just sent you an email to confirm.</p>
              <ul className="pk-mini is-centered">{sent.labels.map((l) => <li key={l}><span className="pk-led-s" aria-hidden="true" />{l}</li>)}</ul>
              <Dialog.Close asChild><button type="button" className="pk-send-btn">Back to the page</button></Dialog.Close>
              <Link className="pk-sent-alt" to="/free-audit?src=packages-sent" onClick={() => { change(false); trackSiteEvent({ event_type: "cta_click", label: "package_sent_checkup" }); }}>
                While you wait, run your free business checkup
              </Link>
            </div>
          ) : (
            <form onSubmit={send} noValidate>
              <div className="pk-send-top">
                <Dialog.Title asChild><h2>Your package</h2></Dialog.Title>
                <Dialog.Close className="pk-send-x" aria-label="Close"><X aria-hidden /></Dialog.Close>
              </div>
              {empty ? (
                <p className="pk-send-empty">Nothing in it yet. Pick a starter package or switch on a few services, then come back here.</p>
              ) : (
                <ul className="pk-mini">
                  {starter && (
                    <li className="is-starter"><span className="pk-led-s" aria-hidden="true" />{starter.name}
                      <button type="button" aria-label={`Take out ${starter.name}`} onClick={() => packageCart.setStarter(null)}><X aria-hidden /></button>
                    </li>
                  )}
                  {picked.map((s) => (
                    <li key={s.slug}><span className="pk-led-s" aria-hidden="true" />{s.name}
                      <button type="button" aria-label={`Take out ${s.name}`} onClick={() => packageCart.remove(s.slug)}><X aria-hidden /></button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="pk-send-q">Where should we send your price?</p>
              <label className="pk-field"><span>Your name</span><input name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required /></label>
              <label className="pk-field"><span>Email</span><input name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required /></label>
              <label className="pk-field"><span>Business name (optional)</span><input name="business" autoComplete="organization" value={business} onChange={(e) => setBusiness(e.target.value)} maxLength={200} /></label>
              <label className="pk-field"><span>Anything we should know? (optional)</span><textarea name="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2500} placeholder="Like your timing, or what's not working now" /></label>
              <div className="pk-hp" aria-hidden="true"><label>Company website<input name="company_website" tabIndex={-1} autoComplete="off" /></label></div>
              {error && <p className="pk-send-error" role="alert">{error}</p>}
              <button type="submit" className="pk-send-btn" disabled={sending || empty}>
                {sending ? "Sending…" : <>Send my package <ArrowRight aria-hidden /></>}
              </button>
              <p className="pk-send-fine">No payment now. We reply within one business day.</p>
              <LegalConsent />
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

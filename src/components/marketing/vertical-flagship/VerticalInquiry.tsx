import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { Check } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/siteContact";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import type { VerticalConfig } from "./config";

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(200),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  business: z.string().trim().min(1, "Please enter your business name").max(200),
  note: z.string().trim().max(3000, "Please keep your note under 3,000 characters"),
});

type Status = "idle" | "submitting" | "success" | "error";

export function VerticalInquiry({ config, segment, initialNeeds = [], biz, language = "en" }: { config: VerticalConfig; segment?: string; initialNeeds?: string[]; biz?: string | null; language?: "en" | "es" }) {
  const location = useLocation();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState(biz ?? "");
  const [note, setNote] = useState("");
  const [needs, setNeeds] = useState<string[]>(initialNeeds);

  useEffect(() => {
    if (!initialNeeds.length) return;
    setNeeds((current) => Array.from(new Set([...current, ...initialNeeds])));
  }, [initialNeeds]);

  const toggle = (id: string) => setNeeds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting") return;
    setError("");
    const honeypot = String(new FormData(event.currentTarget).get("company_website") ?? "");
    if (honeypot) return;
    const parsed = schema.safeParse({ name, email, business, note });
    if (!parsed.success) { setStatus("error"); setError(language === "es" ? "Revisa tu nombre, correo y negocio antes de enviar." : (parsed.error.issues[0]?.message ?? "Please check your details")); return; }
    if (!needs.length) { setStatus("error"); setError(language === "es" ? "Elige por lo menos un área que necesite atención." : "Choose at least one area that needs attention"); return; }
    if (typeof navigator !== "undefined" && navigator.onLine === false) { setStatus("error"); setError(language === "es" ? "Parece que no tienes conexión. Tus datos siguen aquí; vuelve a conectarte e inténtalo de nuevo." : "You appear to be offline. Your details are still here—reconnect and try again."); return; }
    setStatus("submitting");
    let result: { data: unknown; error: unknown };
    try {
      result = await supabase.functions.invoke("submit-inbound-lead", { body: {
        name: parsed.data.name,
        email: parsed.data.email,
        business_name: parsed.data.business,
        message: parsed.data.note || `${config.name} growth inquiry from ${parsed.data.business}.`,
        conversation_channel: "form",
        route_to: "self",
        qualifier_data: {
          site_section: "vertical_flagship_inquiry",
          vertical_slug: config.slug,
          source_vertical: config.slug,
          source_path: location.pathname,
          selected_needs: needs,
          business_type: segment || null,
          language,
          biz: biz || null,
        },
        company_website: "",
      } });
    } catch (caught) { result = { data: null, error: caught }; }
    const payload = result.data as { ok?: unknown; id?: unknown } | null;
    if (result.error || payload?.ok !== true || typeof payload.id !== "string" || !payload.id) {
      setStatus("error");
      const invokeError = result.error as { message?: string; context?: { status?: number } } | null;
      const message = String(invokeError?.message ?? "");
      const rateLimited = invokeError?.context?.status === 429 || /429|too many/i.test(message);
      setError(rateLimited ? (language === "es" ? "Espera un minuto antes de intentarlo de nuevo." : "Please wait a minute before trying again.") : (language === "es" ? `No se guardó tu consulta. Inténtalo de nuevo o escribe a ${CONTACT_EMAIL}.` : `Your inquiry was not saved. Please try again or email ${CONTACT_EMAIL}.`));
      return;
    }
    trackSiteEvent({ event_type: "form_success", label: "vertical_inquiry", vertical: config.slug, src: `for-${config.slug}` });
    setStatus("success");
  };

  const es = language === "es";
  if (status === "success") return <div className="vertical-inquiry-success" role="status"><Check aria-hidden /><h3>{es ? "Gracias, guardamos tu consulta." : "Thanks, your inquiry is saved."}</h3><p>{es ? "Una confirmación va en camino a tu correo y Sean responderá personalmente dentro de un día hábil." : "A confirmation is on its way to your inbox and Sean will reply within one business day."}</p></div>;

  return (
    <form className="vertical-inquiry-form" onSubmit={onSubmit} noValidate>
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden"><label>Company website<input name="company_website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="vertical-form-grid">
        <Field label={es ? "Nombre" : "Name"} value={name} setValue={setName} autoComplete="name" />
        <Field label={es ? "Correo electrónico" : "Email"} value={email} setValue={setEmail} type="email" autoComplete="email" />
      </div>
      <Field label={es ? "Negocio" : config.slug === "legal" ? "Firm" : config.slug === "medspa" ? "Practice" : "Business"} value={business} setValue={setBusiness} autoComplete="organization" />
      <fieldset><legend>{es ? "¿Qué necesita más atención?" : "What needs the most attention?"}</legend><div className="vertical-needs-grid">{config.needs.map((need) => <Button key={need.id} type="button" variant="outline" aria-pressed={needs.includes(need.id)} onClick={() => toggle(need.id)}>{need.label}</Button>)}</div></fieldset>
      <label><span>{es ? "Nota opcional" : "Optional note"}</span><textarea rows={5} maxLength={3000} value={note} onChange={(event) => setNote(event.target.value)} placeholder={es ? "¿Qué está pasando ahora y qué te gustaría mejorar?" : "What is happening now, and what would you like to improve?"} /></label>
      {error && <p className="vertical-form-error" role="alert">{error}</p>}
      <Button type="submit" disabled={status === "submitting"} className="studio-btn studio-btn-primary w-full">{status === "submitting" ? (es ? "Enviando…" : "Sending…") : (es ? "Envía mis prioridades" : "Send my priorities")}</Button>
      <p className="vertical-form-note">{es ? "Recibirás una confirmación en cuanto llegue y una respuesta personal de Sean dentro de un día hábil." : "You will get a confirmation the moment this lands, and a personal reply from Sean within one business day."}</p>
    </form>
  );
}

function Field({ label, value, setValue, type = "text", autoComplete }: { label: string; value: string; setValue: (value: string) => void; type?: string; autoComplete: string }) {
  return <label><span>{label}</span><input type={type} required maxLength={255} autoComplete={autoComplete} value={value} onChange={(event) => setValue(event.target.value)} /></label>;
}
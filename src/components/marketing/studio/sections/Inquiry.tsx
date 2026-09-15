import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Container, Eyebrow } from "../primitives";
import { trackStudioEvent } from "@/lib/studioAnalytics";
import {
  CONTEXT_OPTIONS,
  SERVICE_INTENT_EVENT,
  SERVICE_LABEL,
  SERVICE_OPTIONS,
  type ServiceId,
} from "../serviceIntent";

/** Server hard limit on `message` (submit-inbound-lead). Never exceeded, never silently trimmed. */
const SERVER_MESSAGE_LIMIT = 4000;

const TIMING_OPTIONS = ["As soon as possible", "Next 1–3 months", "Later this year", "Just exploring"] as const;
const BUDGET_OPTIONS = [
  "Not sure yet",
  "Under $2,500",
  "$2,500 – $7,500",
  "$7,500 – $20,000",
  "$20,000+",
  "Ongoing monthly",
] as const;

const schema = z.object({
  name: z.string().trim().min(1, "Your name is required").max(200, "Please keep your name under 200 characters"),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  business_name: z.string().trim().max(200, "Please keep this under 200 characters").optional().or(z.literal("")),
  message: z.string().trim().min(1, "Please tell me about the project"),
});

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Real intake for the public studio site.
 *
 * Contract (re-inspected): POST to `submit-inbound-lead` with name,
 * business_name, email, message, company_website (honeypot, must be empty) and
 * optional conversation_channel / route_to / qualifier_data. Success response is
 * `{ ok: true, id }`. `project_type` and `captured_for_project_id` stay unset —
 * a general site inquiry is not a client enrollment. Nothing is written to
 * inbound_leads from the browser and no service-role key is used here.
 *
 * Behaviour rules: service selection is independent of the message text (a chip
 * or a `?intent=` value never writes into, clears or overwrites typed text); all
 * fields survive an error; duplicate submits are blocked; success is shown only
 * when the invoke succeeds AND the server confirms a saved record.
 */
export function Inquiry() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceId[]>([]);
  const [showContext, setShowContext] = useState(false);

  // Controlled fields so nothing is lost on an error re-render.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [message, setMessage] = useState("");
  const [budget, setBudget] = useState("");
  const [timing, setTiming] = useState("");

  const startedRef = useRef(false);
  const convertedRef = useRef(false);

  /** First real interaction with the form — fired once per page view. */
  const noteStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackStudioEvent("inquiry_started", { id: "studio_home_inquiry" });
  };

  // Capability CTA → preselect a service only.
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<ServiceId>).detail;
      if (!id) return;
      setServices((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };
    window.addEventListener(SERVICE_INTENT_EVENT, handler as EventListener);
    return () => window.removeEventListener(SERVICE_INTENT_EVENT, handler as EventListener);
  }, []);

  // Backwards compatibility with older marketing links that carried a prefill
  // string. It fills the note ONLY while the note is still empty — a visitor's
  // typed text is never replaced.
  useEffect(() => {
    const applyPrefill = (text: string) => {
      if (!text) return;
      setMessage((prev) => (prev.trim().length ? prev : text.slice(0, SERVER_MESSAGE_LIMIT)));
    };
    try {
      const stored = sessionStorage.getItem("stm.contact.prefill");
      if (stored) {
        applyPrefill(stored);
        sessionStorage.removeItem("stm.contact.prefill");
      }
    } catch {
      /* storage unavailable — ignore */
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") applyPrefill(detail);
    };
    window.addEventListener("stm:contact-prefill", handler as EventListener);
    return () => window.removeEventListener("stm:contact-prefill", handler as EventListener);
  }, []);

  // Allowlisted intent values only; anything else is ignored.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const intent = params.get("intent");
    if (intent === "hiring") {
      setShowContext(true);
      setServices((prev) => (prev.includes("hiring-contract") ? prev : [...prev, "hiring-contract"]));
    } else if (intent === "agency") {
      setShowContext(true);
      setServices((prev) => (prev.includes("agency-collaboration") ? prev : [...prev, "agency-collaboration"]));
    }
  }, []);

  const toggleService = (id: ServiceId) => {
    noteStarted();
    setServices((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    trackStudioEvent("service_selected", { category: id });
  };

  /** Readable context header for the existing inbox view. */
  const buildExtras = () => {
    const extras: string[] = [];
    if (services.length) extras.push(`Interested in: ${services.map((s) => SERVICE_LABEL[s]).join(", ")}`);
    if (budget) extras.push(`Budget range: ${budget}`);
    if (timing) extras.push(`Timing: ${timing}`);
    return extras.length ? `\n\n---\n${extras.join("\n")}` : "";
  };

  const extrasLength = buildExtras().length;
  const messageBudget = SERVER_MESSAGE_LIMIT - extrasLength;
  const messageOver = message.trim().length > messageBudget;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "submitting") return; // block duplicate submits
    setError(null);

    const form = new FormData(e.currentTarget);
    if (String(form.get("company_website") ?? "")) {
      // Honeypot hit: drop silently. Not a submission, not a conversion.
      setStatus("idle");
      return;
    }

    const parsed = schema.safeParse({ name, email, business_name: businessName, message });
    if (!parsed.success) {
      setStatus("error");
      setError(parsed.error.issues[0]?.message ?? "Please check your entries");
      return;
    }

    const extras = buildExtras();
    if (parsed.data.message.length + extras.length > SERVER_MESSAGE_LIMIT) {
      // Show the limit instead of quietly cutting the visitor's words.
      setStatus("error");
      setError(
        `Your note is a little too long to send. Please shorten it to about ${messageBudget.toLocaleString()} characters.`,
      );
      return;
    }

    const finalMessage = `${parsed.data.message}${extras}`;

    setStatus("submitting");

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus("error");
      setError("You appear to be offline. Your note is still here — reconnect and send again.");
      return;
    }

    let data: unknown = null;
    let fnError: unknown = null;
    try {
      const res = await supabase.functions.invoke("submit-inbound-lead", {
        body: {
          name: parsed.data.name,
          email: parsed.data.email,
          business_name: parsed.data.business_name || null,
          message: finalMessage,
          conversation_channel: "form",
          route_to: "self",
          qualifier_data: {
            site_section: "studio_home_inquiry",
            services,
            budget_range: budget || null,
            timing: timing || null,
          },
          company_website: "",
        },
      });
      data = res.data;
      fnError = res.error;
    } catch (thrown) {
      fnError = thrown;
    }

    const payload = data as { ok?: unknown; id?: unknown } | null;
    const saved = !fnError && payload?.ok === true && typeof payload?.id === "string" && payload.id.length > 0;

    if (!saved) {
      setStatus("error");
      const msg = String((fnError as { message?: string } | null)?.message ?? "");
      if (/429|too many/i.test(msg)) {
        setError("That's a few submissions in a row. Please wait a minute and send again.");
      } else {
        setError(
          "Your note wasn't saved, so nothing has reached me yet. Please try again, or email hello@supremeteammedia.com.",
        );
      }
      return;
    }

    if (!convertedRef.current) {
      convertedRef.current = true;
      trackStudioEvent("inquiry_submitted", { id: "studio_home_inquiry" });
    }
    setStatus("success");
  };

  return (
    <section id="contact" className="studio-band studio-section">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Eyebrow style={{ color: "hsl(var(--band-text) / 0.75)" }}>Let&apos;s make the next thing happen</Eyebrow>
            <h2 className="studio-display mt-5 text-balance" style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.9rem)" }}>
              What are you looking to create, improve, or simplify?
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-relaxed text-muted-foreground">
              Tell me a little about the project, where things stand, and what you want to accomplish. I&apos;ll review
              your note and reply with a useful next step.
            </p>
            <a href="mailto:hello@supremeteammedia.com" className="mt-7 inline-block text-[0.95rem] hover:underline">
              hello@supremeteammedia.com
            </a>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-xl bg-[hsl(var(--surface))] p-6 text-[hsl(var(--ink))] md:p-9">
              {status === "success" ? (
                <div className="py-6" role="status">
                  <span className="inline-flex items-center justify-center rounded-full bg-[hsl(var(--cobalt-pale))] p-3 text-[hsl(var(--cobalt))]">
                    <Check size={20} />
                  </span>
                  <h3 className="studio-display mt-5 text-[1.4rem]">
                    Thanks—your note is in. Sean will review it and reply by email.
                  </h3>
                  <p className="mt-3 text-[0.95rem] text-[hsl(var(--ink-muted))]">
                    Your inquiry is saved. If you don&apos;t hear back, email hello@supremeteammedia.com directly.
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} onFocus={noteStarted} noValidate className="grid grid-cols-1 gap-5">
                  <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                    <label>
                      Company website
                      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field label="Name" name="name" value={name} onChange={setName} required autoComplete="name" />
                    <Field
                      label="Email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <Field
                    label="Company or brand (optional)"
                    name="business_name"
                    value={businessName}
                    onChange={setBusinessName}
                    autoComplete="organization"
                  />

                  <fieldset className="border-0 p-0">
                    <legend className="studio-label">What can I help with? (optional)</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[...SERVICE_OPTIONS, ...(showContext ? CONTEXT_OPTIONS : [])].map((o) => {
                        const on = services.includes(o.id);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleService(o.id)}
                            className={`min-h-[44px] rounded-lg border px-3.5 text-[0.9rem] ${
                              on
                                ? "border-[hsl(var(--cobalt))] bg-[hsl(var(--cobalt-pale))] text-[hsl(var(--cobalt))]"
                                : "border-[hsl(var(--rule))] text-[hsl(var(--ink))]"
                            }`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[0.82rem] text-[hsl(var(--ink-muted))]">
                      Choosing a service never changes what you&apos;ve typed below.
                    </p>
                  </fieldset>

                  <label className="block" htmlFor="inquiry-message">
                    <span className="studio-label">Tell me about the project</span>
                    <textarea
                      id="inquiry-message"
                      name="message"
                      required
                      rows={6}
                      aria-describedby="inquiry-message-count"
                      aria-invalid={messageOver || undefined}
                      value={message}
                      onChange={(e) => {
                        noteStarted();
                        setMessage(e.target.value);
                      }}
                      placeholder="Where things stand and what you want to accomplish."
                      className="mt-2 w-full resize-y rounded-lg border border-[hsl(var(--rule))] bg-white px-4 py-3 text-[0.98rem]"
                    />
                    <span
                      id="inquiry-message-count"
                      className={`mt-1 block text-[0.8rem] ${messageOver ? "text-[hsl(0_60%_40%)]" : "text-[hsl(var(--ink-muted))]"}`}
                    >
                      {message.trim().length.toLocaleString()} of {messageBudget.toLocaleString()} characters
                      {messageOver ? " — please shorten your note so it can be sent in full." : ""}
                    </span>
                  </label>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Select
                      label="Budget range (optional)"
                      name="budget_range"
                      value={budget}
                      options={[...BUDGET_OPTIONS]}
                      onChange={(v) => {
                        noteStarted();
                        setBudget(v);
                      }}
                    />
                    <Select
                      label="Timing (optional)"
                      name="timing"
                      value={timing}
                      options={[...TIMING_OPTIONS]}
                      onChange={(v) => {
                        noteStarted();
                        setTiming(v);
                      }}
                    />
                  </div>

                  <p role="status" aria-live="polite" className="sr-only">
                    {status === "submitting" ? "Sending your inquiry" : ""}
                  </p>

                  {error && (
                    <p role="alert" className="text-[0.92rem] text-[hsl(0_60%_40%)]">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="studio-btn studio-btn-primary mt-1 w-full disabled:opacity-60"
                  >
                    {status === "submitting" ? "Sending…" : "Send project details"}
                  </button>

                  <p className="text-[0.88rem] text-[hsl(var(--ink-muted))]">
                    A clear next step. No obligation to proceed.
                  </p>
                  <p className="text-[0.82rem] text-[hsl(var(--ink-muted))]">
                    Please leave out passwords, customer records, and other sensitive information.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="studio-label">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        required={required}
        autoComplete={autoComplete}
        maxLength={255}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 min-h-[44px] w-full rounded-lg border border-[hsl(var(--rule))] bg-white px-4 py-2.5 text-[0.98rem]"
      />
    </label>
  );
}

function Select({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="studio-label">{label}</span>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 min-h-[44px] w-full rounded-lg border border-[hsl(var(--rule))] bg-white px-3 py-2.5 text-[0.98rem]"
      >
        <option value="">No preference</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

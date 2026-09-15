import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Container, Eyebrow } from "../primitives";
import {
  CONTEXT_OPTIONS,
  SERVICE_INTENT_EVENT,
  SERVICE_LABEL,
  SERVICE_OPTIONS,
  type ServiceId,
} from "../serviceIntent";

const schema = z.object({
  name: z.string().trim().min(1, "Your name is required").max(200),
  email: z.string().trim().email("Please enter a valid email").max(255),
  business_name: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().min(1, "Please tell me about the project").max(3600, "Please keep this under 3600 characters"),
  budget_note: z.string().trim().max(200).optional().or(z.literal("")),
});

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Real intake. Uses the existing `submit-inbound-lead` function; success is
 * only declared when there is no invocation error AND the server confirms the
 * saved record (ok === true with an id).
 *
 * Service selection is independent of the message text: selecting or clearing a
 * service never writes to, clears or overwrites what the visitor typed. All
 * fields and selections survive a validation or submission error.
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
  const [budgetNote, setBudgetNote] = useState("");

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

  // Context controls appear only when the visitor arrived from those paths.
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

  const toggleService = (id: ServiceId) =>
    setServices((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "submitting") return; // block duplicate clicks
    setError(null);

    const form = new FormData(e.currentTarget);
    if (String(form.get("company_website") ?? "")) {
      // Honeypot hit: drop silently, and never count it as a conversion.
      setStatus("idle");
      return;
    }

    const parsed = schema.safeParse({ name, email, business_name: businessName, message, budget_note: budgetNote });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your entries");
      return;
    }

    // Human-readable context appended to (never substituted for) the message.
    const extras: string[] = [];
    if (services.length) extras.push(`Interested in: ${services.map((s) => SERVICE_LABEL[s]).join(", ")}`);
    if (parsed.data.budget_note) extras.push(`Budget or timing: ${parsed.data.budget_note}`);
    const composed = extras.length ? `${parsed.data.message}\n\n---\n${extras.join("\n")}` : parsed.data.message;
    const finalMessage = composed.length > 4000 ? parsed.data.message.slice(0, 4000) : composed;

    setStatus("submitting");
    const { data, error: fnError } = await supabase.functions.invoke("submit-inbound-lead", {
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        business_name: parsed.data.business_name || null,
        message: finalMessage,
        conversation_channel: "form",
        route_to: "self",
        qualifier_data: {
          site_section: "studio_home_inquiry",
          services: services,
          budget_note: parsed.data.budget_note || null,
        },
        company_website: "",
      },
    });

    const saved = !fnError && (data as any)?.ok === true && Boolean((data as any)?.id);
    if (!saved) {
      setStatus("error");
      setError("Your note wasn't submitted. Please try again or email hello@supremeteammedia.com.");
      return;
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
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-5">
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
                  </fieldset>

                  <label className="block">
                    <span className="studio-label">Tell me about the project</span>
                    <textarea
                      name="message"
                      required
                      rows={6}
                      maxLength={3600}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Where things stand and what you want to accomplish."
                      className="mt-2 w-full resize-y rounded-lg border border-[hsl(var(--rule))] bg-white px-4 py-3 text-[0.98rem]"
                    />
                  </label>

                  <Field
                    label="Budget or timing to keep in mind? (optional)"
                    name="budget_note"
                    value={budgetNote}
                    onChange={setBudgetNote}
                  />

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

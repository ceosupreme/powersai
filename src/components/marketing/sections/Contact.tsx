import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { ArrowRight, Check, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Container } from "@/components/marketing/site/primitives";

const schema = z.object({
  name: z.string().trim().min(1, "Your name is required").max(200),
  business_name: z.string().trim().max(200).optional().or(z.literal("")),
  email: z.string().trim().email("Please enter a valid email").max(255),
  message: z.string().trim().min(1, "Tell me what you'd like to improve").max(4000, "Please keep this under 4000 characters"),
});

type Status = "idle" | "submitting" | "success" | "error";

export function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("stm.contact.prefill");
      if (stored) {
        setMessage(stored);
        sessionStorage.removeItem("stm.contact.prefill");
      }
    } catch { /* ignore */ }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail ?? "";
      setMessage(detail);
      try { sessionStorage.removeItem("stm.contact.prefill"); } catch { /* ignore */ }
      // Focus after paint so the scroll lands first.
      window.setTimeout(() => messageRef.current?.focus(), 400);
    };
    window.addEventListener("stm:contact-prefill", handler as EventListener);
    return () => window.removeEventListener("stm:contact-prefill", handler as EventListener);
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const honeypot = String(form.get("company_website") ?? "");
    if (honeypot) {
      // Bot. Pretend success, drop silently.
      setStatus("success");
      return;
    }

    const parsed = schema.safeParse({
      name: form.get("name"),
      business_name: form.get("business_name"),
      email: form.get("email"),
      message: form.get("message"),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your entries");
      return;
    }

    setStatus("submitting");
    const { error: fnError } = await supabase.functions.invoke("submit-inbound-lead", {
      body: {
        name: parsed.data.name,
        business_name: parsed.data.business_name || null,
        email: parsed.data.email,
        message: parsed.data.message,
        company_website: "",
      },
    });

    if (fnError) {
      setStatus("error");
      setError("Something went wrong. Please email hello@supremeteammedia.com.");
      return;
    }
    setStatus("success");
  };

  return (
    <section id="contact" className="relative overflow-hidden border-t border-[hsl(var(--line))] py-24 md:py-32">
      <div aria-hidden className="radial-gold pointer-events-none absolute inset-x-0 top-0 h-[300px]" />
      <Container className="relative">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="eyebrow">Start the conversation</span>
            <h2 className="font-display mt-5 text-balance text-foreground" style={{ fontSize: "clamp(2rem,4.5vw,3.4rem)", lineHeight: 1.05 }}>
              See what this could be worth to your business
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[hsl(var(--ink-soft))] md:text-lg">
              Share a bit about your operation. I&apos;ll follow up to set up a call and walk you through the smallest first step that would move your numbers.
            </p>
            <ul className="mt-8 space-y-3">
              {["Reply within 24h", "15-minute first call", "No obligation, ever"].map((l) => (
                <li key={l} className="flex items-center gap-3">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--gold))]" />
                  <span className="font-mono-label" style={{ color: "hsl(var(--ink-soft))" }}>{l}</span>
                </li>
              ))}
            </ul>
            <a href="mailto:hello@supremeteammedia.com" className="mt-8 inline-flex items-center gap-2 text-sm text-[hsl(var(--ink-soft))] transition-colors hover:text-foreground">
              <Mail size={14} /> hello@supremeteammedia.com
            </a>
          </div>

          <div className="card-lift p-7 md:p-9">
          {status === "success" ? (
            <div className="flex flex-col items-start gap-4 py-6">
              <span className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--green)/0.3)] bg-[hsl(var(--green)/0.1)] p-3 text-[hsl(var(--green))]">
                <Check size={20} />
              </span>
              <h3 className="font-display text-2xl text-foreground">
                Thanks — I&apos;ll review this and follow up to set up a call.
              </h3>
              <p className="text-sm text-[hsl(var(--ink-soft))]">
                In the meantime, feel free to email me directly at{" "}
                <a href="mailto:hello@supremeteammedia.com" className="text-foreground underline-offset-4 hover:underline">
                  hello@supremeteammedia.com
                </a>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-5">
              {/* Honeypot — must be invisible to humans, ignored by browsers. */}
              <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                <label>
                  Company website
                  <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Name" name="name" placeholder="Your name" required />
                <Field label="Business name" name="business_name" placeholder="Optional" />
              </div>
              <Field label="Email" name="email" type="email" placeholder="you@company.com" required />
              <FieldTextarea
                label="What do you want to improve?"
                name="message"
                placeholder="A few sentences about your operation, your tools, and what's slowing you down."
                required
                value={message}
                onChange={setMessage}
                textareaRef={messageRef}
              />

              {error && (
                <p className="text-sm text-[hsl(var(--rust))]" role="alert">{error}</p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--green))] px-6 py-3.5 text-sm font-medium text-[hsl(var(--bone))] transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
              >
                {status === "submitting" ? "Sending…" : "Send"}
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          )}
          </div>
        </div>
      </Container>
    </section>
  );
}

function Field({ label, name, type = "text", placeholder, required }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean; }) {
  return (
    <label className="block">
      <span className="font-mono-label" style={{ fontSize: "0.7rem", color: "hsl(var(--ink-soft))" }}>{label}</span>
      <input type={type} name={name} required={required} placeholder={placeholder} maxLength={255}
        className="mt-2 w-full rounded-md border border-[hsl(var(--line))] bg-[hsl(var(--bone))] px-4 py-3 text-[0.95rem] text-foreground placeholder:text-[hsl(var(--ink-soft)/0.5)] focus:border-[hsl(var(--green))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--green)/0.2)]" />
    </label>
  );
}

function FieldTextarea({ label, name, placeholder, required, value, onChange, textareaRef }: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
}) {
  return (
    <label className="block">
      <span className="font-mono-label" style={{ fontSize: "0.7rem", color: "hsl(var(--ink-soft))" }}>{label}</span>
      <textarea
        ref={textareaRef}
        name={name}
        required={required}
        rows={5}
        maxLength={4000}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full resize-y rounded-md border border-[hsl(var(--line))] bg-[hsl(var(--bone))] px-4 py-3 text-[0.95rem] text-foreground placeholder:text-[hsl(var(--ink-soft)/0.5)] focus:border-[hsl(var(--green))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--green)/0.2)]" />
    </label>
  );
}